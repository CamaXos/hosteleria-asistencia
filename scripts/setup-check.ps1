# Valida .env.local y muestra los siguientes pasos para Supabase CLI
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root ".env.local"

function Read-DotEnvValue {
    param([string]$Name)
    if (-not (Test-Path $EnvFile)) {
        return $null
    }
    foreach ($line in Get-Content $EnvFile -Encoding UTF8) {
        $t = $line.Trim()
        if ($t -eq "" -or $t.StartsWith("#")) { continue }
        if ($t -match "^\s*$([regex]::Escape($Name))\s*=\s*(.*)$") {
            $v = $Matches[1].Trim()
            if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
            if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
            return $v
        }
    }
    return $null
}

function Test-PlaceholderValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    $lower = $Value.ToLowerInvariant()
    return ($lower -match '^https://tu-proyecto\.supabase\.co$') -or
           ($lower -match '^tu-clave') -or
           ($Value -match 'xxxxxxxx')
}

Write-Host "=== Comprobacion de entorno Supabase ===" -ForegroundColor Cyan

if (-not (Test-Path $EnvFile)) {
    Write-Host "FALTA: .env.local (copia desde .env.local.example)" -ForegroundColor Red
    exit 1
}

$url = Read-DotEnvValue "NEXT_PUBLIC_SUPABASE_URL"
$anon = Read-DotEnvValue "NEXT_PUBLIC_SUPABASE_ANON_KEY"
$service = Read-DotEnvValue "SUPABASE_SERVICE_ROLE_KEY"

$ok = $true
foreach ($pair in @(
    @{ N = "NEXT_PUBLIC_SUPABASE_URL"; V = $url },
    @{ N = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; V = $anon }
)) {
    if (Test-PlaceholderValue $pair.V) {
        Write-Host "FALTA o placeholder: $($pair.N)" -ForegroundColor Yellow
        $ok = $false
    } else {
        Write-Host "OK: $($pair.N)" -ForegroundColor Green
    }
}

if (Test-PlaceholderValue $service) {
    Write-Host "OPCIONAL (recomendado): SUPABASE_SERVICE_ROLE_KEY aun no configurada" -ForegroundColor Yellow
} else {
    Write-Host "OK: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
}

$projectRef = $null
if (-not (Test-PlaceholderValue $url) -and $url -match 'https://([a-z0-9-]+)\.supabase\.co') {
    $projectRef = $Matches[1]
    Write-Host "Project ref detectado: $projectRef" -ForegroundColor Gray
}

if (-not $ok) {
    Write-Host ""
    Write-Host "Rellena .env.local con valores de Supabase > Project Settings > API." -ForegroundColor Yellow
    Write-Host 'Cuando termines, di en el chat: credenciales listas' -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Siguientes pasos (una vez por maquina/proyecto):" -ForegroundColor Cyan
Write-Host "  1. npx supabase login"
if ($projectRef) {
    Write-Host "  2. npx supabase link --project-ref $projectRef"
} else {
    Write-Host "  2. npx supabase link --project-ref TU_PROJECT_REF"
}
Write-Host "  3. npx supabase db push"
Write-Host ""
Write-Host "Alternativa sin CLI: pega supabase/migrations/001_initial_schema.sql en Supabase SQL Editor y ejecuta Run."
Write-Host ""
Write-Host 'Cuando hayas enlazado y aplicado migraciones, di: credenciales listas' -ForegroundColor Cyan
