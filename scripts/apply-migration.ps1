# Aplica migracion, seed y admin de prueba usando SUPABASE_DB_PASSWORD
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root ".env.local"
$RunSql = Join-Path $Root "scripts/run-sql.js"
$PoolerHost = "aws-0-eu-west-3.pooler.supabase.com"
$AdminEmail = "admin@hosteleria.test"
$AdminSeedPassword = "Hosteleria-Admin-Test-2026!"

function Read-DotEnvFile {
    param([string]$Path)
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    foreach ($line in Get-Content $Path -Encoding UTF8) {
        $t = $line.Trim()
        if ($t -eq "" -or $t.StartsWith("#")) { continue }
        $idx = $t.IndexOf("=")
        if ($idx -lt 1) { continue }
        $name = $t.Substring(0, $idx).Trim()
        $value = $t.Substring($idx + 1).Trim()
        if ($value.Length -ge 2) {
            if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
            if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length - 2) }
        }
        $map[$name] = $value
    }
    return $map
}

function Test-PlaceholderValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    $lower = $Value.ToLowerInvariant()
    return ($lower -match '^https://tu-proyecto\.supabase\.co$') -or
           ($lower -match '^tu-clave') -or
           ($lower -match 'tu-contrase') -or
           ($Value -match 'xxxxxxxx')
}

function Encode-PostgresPassword {
    param([string]$Password)
    [Uri]::EscapeDataString($Password)
}

function New-ServiceHeaders {
    param([string]$ServiceKey)
    @{
        apikey = $ServiceKey
        Authorization = "Bearer $ServiceKey"
    }
}

function New-DbConnectionUrls {
    param(
        [string]$ProjectRef,
        [string]$EncodedPassword
    )
    @{
        Pooler = "postgresql://postgres.${ProjectRef}:${EncodedPassword}@${PoolerHost}:5432/postgres"
        Direct = "postgresql://postgres:${EncodedPassword}@db.${ProjectRef}.supabase.co:5432/postgres"
    }
}

function Invoke-NodePg {
    param(
        [string]$DbUrl,
        [string]$File = $null,
        [string]$Sql = $null
    )
    if (-not (Test-Path $RunSql)) {
        throw "No se encuentra scripts/run-sql.js"
    }
    $queryTempFile = $null
    $nodeArgs = @($RunSql)
    if ($File) {
        $nodeArgs += $File
    } elseif ($Sql) {
        $sqlFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($sqlFile, $Sql, (New-Object System.Text.UTF8Encoding $false))
        $nodeArgs += @("--query-file", $sqlFile)
        $queryTempFile = $sqlFile
    } else {
        throw "Se requiere Sql o File"
    }

    $savedUrl = $env:DATABASE_URL
    $env:DATABASE_URL = $DbUrl
    $outFile = [System.IO.Path]::GetTempFileName()
    $errFile = [System.IO.Path]::GetTempFileName()
    try {
        $proc = Start-Process -FilePath "node" -ArgumentList $nodeArgs -Wait -PassThru -NoNewWindow `
            -RedirectStandardOutput $outFile -RedirectStandardError $errFile
        $stdout = Get-Content $outFile -Raw -ErrorAction SilentlyContinue
        $stderr = Get-Content $errFile -Raw -ErrorAction SilentlyContinue
        $output = ($stdout + $stderr)
        $code = $proc.ExitCode
    } finally {
        $env:DATABASE_URL = $savedUrl
        Remove-Item $outFile, $errFile -ErrorAction SilentlyContinue
        if ($queryTempFile) { Remove-Item $queryTempFile -ErrorAction SilentlyContinue }
    }
    return @{ Output = ($output | Out-String); ExitCode = $code }
}

function Resolve-WorkingDbUrl {
    param(
        [string]$ProjectRef,
        [string]$EncodedPassword
    )
    $urls = New-DbConnectionUrls -ProjectRef $ProjectRef -EncodedPassword $EncodedPassword
    $probeSql = "SELECT 1 AS ok;"

    Write-Host "Probando session pooler ($PoolerHost)..." -ForegroundColor Gray
    $poolerTry = Invoke-NodePg -DbUrl $urls.Pooler -Sql $probeSql
    if ($poolerTry.ExitCode -eq 0) {
        Write-Host "Conexion OK via session pooler (eu-west-3)." -ForegroundColor Green
        return $urls.Pooler
    }

    Write-Host "Pooler no disponible; probando conexion directa db.*.supabase.co..." -ForegroundColor Yellow
    $directTry = Invoke-NodePg -DbUrl $urls.Direct -Sql $probeSql
    if ($directTry.ExitCode -eq 0) {
        Write-Host "Conexion OK via host directo." -ForegroundColor Green
        return $urls.Direct
    }

    Write-Host "Error pooler:" -ForegroundColor Red
    Write-Host ($poolerTry.Output.Trim())
    Write-Host "Error directo:" -ForegroundColor Red
    Write-Host ($directTry.Output.Trim())
    throw "No se pudo conectar a PostgreSQL (pooler ni directo)."
}

function Test-MigrationApplied {
    param([string]$DbUrl)
    $sql = "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS migrated;"
    $result = Invoke-NodePg -DbUrl $DbUrl -Sql $sql
    if ($result.ExitCode -ne 0) { return $false }
    try {
        $rows = ($result.Output.Trim() | ConvertFrom-Json)
        if ($rows -is [array] -and $rows.Count -gt 0) {
            return [bool]$rows[0].migrated
        }
        if ($rows.migrated -ne $null) {
            return [bool]$rows.migrated
        }
    } catch { }
    return $false
}

function Get-AdminUserIdFromDb {
    param([string]$DbUrl, [string]$Email)
    $escaped = $Email.Replace("'", "''")
    $sql = "SELECT id::text FROM auth.users WHERE email = '$escaped' LIMIT 1;"
    $result = Invoke-NodePg -DbUrl $DbUrl -Sql $sql
    if ($result.ExitCode -ne 0) { return $null }
    $text = $result.Output.Trim()
    try {
        $rows = $text | ConvertFrom-Json
        if ($rows -is [array] -and $rows.Count -gt 0 -and $rows[0].id) {
            return $rows[0].id
        }
        if ($rows.id) { return $rows.id }
    } catch { }
    if ($text -match '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}') {
        return $Matches[0]
    }
    return $null
}

function Ensure-AdminUser {
    param(
        [string]$BaseUrl,
        [string]$ServiceKey,
        [string]$DbUrl,
        [string]$Email
    )
    $headers = New-ServiceHeaders $ServiceKey
    $userId = Get-AdminUserIdFromDb -DbUrl $DbUrl -Email $Email

    if (-not $userId) {
        $body = @{
            email = $Email
            password = $AdminSeedPassword
            email_confirm = $true
            user_metadata = @{ full_name = "Administrador Principal" }
        } | ConvertTo-Json -Depth 3
        $createHeaders = $headers.Clone()
        $createHeaders["Content-Type"] = "application/json"
        try {
            $created = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/v1/admin/users" -Headers $createHeaders -Body $body
            if ($created.id) { $userId = $created.id }
        } catch {
            $userId = Get-AdminUserIdFromDb -DbUrl $DbUrl -Email $Email
            if (-not $userId) {
                throw "No se pudo crear ni localizar el usuario admin en Auth."
            }
        }
    }

    if (-not $userId) { throw "No se obtuvo el UUID del usuario admin." }

    $patchHeaders = New-ServiceHeaders $ServiceKey
    $patchHeaders["Content-Type"] = "application/json"
    $patchHeaders["Prefer"] = "return=minimal"
    $profileBody = @{
        full_name = "Administrador Principal"
        role = "admin"
        active = $true
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Method Patch -Uri "$BaseUrl/rest/v1/profiles?id=eq.$userId" -Headers $patchHeaders -Body $profileBody | Out-Null
    } catch {
        $escapedId = $userId.Replace("'", "''")
        $sql = "UPDATE public.profiles SET full_name = 'Administrador Principal', role = 'admin', active = true WHERE id = '$escapedId';"
        $upd = Invoke-NodePg -DbUrl $DbUrl -Sql $sql
        if ($upd.ExitCode -ne 0) {
            throw "No se pudo actualizar el perfil admin."
        }
    }
    return $userId
}

Write-Host "=== Aplicar migracion Supabase ===" -ForegroundColor Cyan

if (-not (Test-Path $RunSql)) {
    Write-Host "Error: falta scripts/run-sql.js. Ejecuta npm install en el proyecto." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $EnvFile)) {
    Write-Host "Error: no existe .env.local (copia desde .env.local.example)." -ForegroundColor Red
    exit 1
}

$envMap = Read-DotEnvFile $EnvFile
$url = $envMap["NEXT_PUBLIC_SUPABASE_URL"]
$service = $envMap["SUPABASE_SERVICE_ROLE_KEY"]
$dbPassword = $envMap["SUPABASE_DB_PASSWORD"]

$missing = @()
if (Test-PlaceholderValue $url) { $missing += "NEXT_PUBLIC_SUPABASE_URL" }
if (Test-PlaceholderValue $service) { $missing += "SUPABASE_SERVICE_ROLE_KEY" }
if (Test-PlaceholderValue $dbPassword) { $missing += "SUPABASE_DB_PASSWORD" }

if ($missing.Count -gt 0) {
    Write-Host "Error: faltan o son placeholder: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "Anade SUPABASE_DB_PASSWORD en Supabase -> Project Settings -> Database." -ForegroundColor Yellow
    exit 1
}

if ($url -notmatch '^https://([a-z0-9-]+)\.supabase\.co') {
    Write-Host "Error: NEXT_PUBLIC_SUPABASE_URL no tiene un formato valido." -ForegroundColor Red
    exit 1
}
$projectRef = $Matches[1]
$encodedPw = Encode-PostgresPassword $dbPassword
$baseUrl = $url.TrimEnd("/")

try {
    $dbUrl = Resolve-WorkingDbUrl -ProjectRef $projectRef -EncodedPassword $encodedPw
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

$migrationFile = Join-Path $Root "supabase/migrations/001_initial_schema.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: no se encuentra la migracion inicial." -ForegroundColor Red
    exit 1
}

if (Test-MigrationApplied -DbUrl $dbUrl) {
    Write-Host "ya migrado: tablas publicas presentes; omitiendo DDL." -ForegroundColor Green
} else {
    Write-Host "Ejecutando migracion SQL (pg + session pooler)..." -ForegroundColor Gray
    $mig = Invoke-NodePg -DbUrl $dbUrl -File $migrationFile
    if ($mig.ExitCode -ne 0) {
        $outLower = $mig.Output.ToLowerInvariant()
        if ($outLower -match 'already exists|duplicate') {
            Write-Host "Aviso: la migracion parece ya aplicada (objetos existentes). Continuando..." -ForegroundColor Yellow
        } else {
            Write-Host "Error al aplicar la migracion. Revisa la salida (sin credenciales)." -ForegroundColor Red
            Write-Host $mig.Output
            exit 1
        }
    } else {
        Write-Host "Migracion aplicada correctamente." -ForegroundColor Green
    }
}

Write-Host "Verificando tabla profiles via REST..." -ForegroundColor Gray
$restHeaders = New-ServiceHeaders $service
try {
    $profiles = Invoke-RestMethod -Method Get -Uri "$baseUrl/rest/v1/profiles?select=id&limit=1" -Headers $restHeaders
    if ($null -eq $profiles) { throw "Respuesta vacia" }
    Write-Host "REST OK: tabla profiles accesible." -ForegroundColor Green
} catch {
    Write-Host "Error: no se pudo consultar profiles por REST. Comprueba claves y migracion." -ForegroundColor Red
    exit 1
}

Write-Host "Comprobando centros de prueba..." -ForegroundColor Gray
$centers = Invoke-RestMethod -Method Get -Uri "$baseUrl/rest/v1/centers?select=id&limit=1" -Headers $restHeaders
if (@($centers).Count -eq 0) {
    $seedFile = Join-Path $Root "supabase/seed.sql"
    if (Test-Path $seedFile) {
        Write-Host "Centros vacios: ejecutando seed.sql..." -ForegroundColor Yellow
        $seed = Invoke-NodePg -DbUrl $dbUrl -File $seedFile
        if ($seed.ExitCode -ne 0) {
            Write-Host "Aviso: seed.sql termino con errores (puede ser parcial). Revisa la salida." -ForegroundColor Yellow
        } else {
            Write-Host "Seed aplicado." -ForegroundColor Green
        }
    } else {
        Write-Host "Aviso: no hay seed.sql; centros siguen vacios." -ForegroundColor Yellow
    }
} else {
    Write-Host "Centros ya presentes; seed omitido." -ForegroundColor Green
}

Write-Host "Configurando usuario administrador ($AdminEmail)..." -ForegroundColor Gray
try {
    $null = Ensure-AdminUser -BaseUrl $baseUrl -ServiceKey $service -DbUrl $dbUrl -Email $AdminEmail
    Write-Host "Perfil admin listo para $AdminEmail." -ForegroundColor Green
} catch {
    Write-Host "Error al configurar el admin: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Listo: base de datos migrada y verificada." -ForegroundColor Cyan
Write-Host "Inicia la app con npm run dev y entra en /login." -ForegroundColor Cyan
exit 0
