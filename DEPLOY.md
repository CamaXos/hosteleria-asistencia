# Despliegue: Git, Supabase y Vercel

Checklist para conectar el repositorio con Supabase y, más adelante, importar en Vercel.

**Proyecto Supabase:** `vmubthxbchrrutwdbfed`  
**Dashboard:** https://supabase.com/dashboard/project/vmubthxbchrrutwdbfed

---

## 1. Git y GitHub

- El código vive en GitHub (repositorio privado recomendado).
- `.gitignore` excluye `.env.local`, `.next/` y `node_modules/`.
- Plantilla de variables: `.env.local.example`.

---

## 2. Integración GitHub en Supabase (migraciones)

Supabase puede seguir las migraciones en `supabase/migrations/` cuando el repo está enlazado.

### 2.1 Token de acceso (CLI y API)

1. Abre https://supabase.com/dashboard/account/tokens
2. **Generate new token** → copia el valor (solo se muestra una vez).
3. En local (PowerShell, sesión actual):

   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "tu-token"
   ```

   Opcional: guarda el token en el gestor de secretos; **no** lo subas a Git.

### 2.2 Enlazar el proyecto local (CLI)

Desde la raíz del repo:

```powershell
npx supabase login
# o usa SUPABASE_ACCESS_TOKEN como arriba

npx supabase link --project-ref vmubthxbchrrutwdbfed --yes
# Te pedirá la contraseña de la BD si no usas -p
```

Comprueba: `npx supabase migration list`

### 2.3 Conectar el repositorio en el panel (recomendado para CI de migraciones)

1. https://supabase.com/dashboard/project/vmubthxbchrrutwdbfed/settings/general
2. **Integrations** → **GitHub** → **Authorize GitHub** (si no lo hiciste antes).
3. **Connect repository** → elige `CamaXos/hosteleria-asistencia` (o tu org/repo).
4. Rama por defecto: `main`.
5. Directorio de migraciones: `supabase/migrations` (por defecto del CLI).

Documentación: https://supabase.com/docs/guides/cli/managing-environments

**Estructura actual:**

```
supabase/
  config.toml
  migrations/
    001_initial_schema.sql
  seed.sql
```

---

## 3. Vercel (importar más adelante — no desplegar aún)

### 3.1 Importar desde GitHub

1. https://vercel.com/new
2. Importa el repo `hosteleria-asistencia`.
3. Framework: **Next.js** (detección automática).
4. No hace falta `vercel.json` para un App Router estándar.

### 3.2 Variables de entorno en Vercel

Añade en **Settings → Environment Variables** (Production, Preview y Development):

| Variable | Dónde obtenerla |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role (solo servidor) |

Opcional para scripts locales / futuros jobs:

| Variable | Notas |
|----------|--------|
| `SUPABASE_DB_PASSWORD` | Project Settings → Database; no suele hacer falta en runtime de Next en Vercel |

### 3.3 Después del primer deploy

En Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://tu-dominio.vercel.app`
- **Redirect URLs:** `https://tu-dominio.vercel.app/**`

---

## 4. Enlaces útiles

| Recurso | URL |
|---------|-----|
| Repo GitHub | https://github.com/CamaXos/hosteleria-asistencia |
| Supabase proyecto | https://supabase.com/dashboard/project/vmubthxbchrrutwdbfed |
| Tokens Supabase | https://supabase.com/dashboard/account/tokens |
| Vercel nuevo proyecto | https://vercel.com/new |
