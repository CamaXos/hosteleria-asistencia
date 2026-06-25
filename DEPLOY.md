# Despliegue: Git, Supabase y Vercel

Checklist y estado de integraciones para **hosteleria-asistencia**.

**Proyecto Supabase:** `vmubthxbchrrutwdbfed` (Control Personal)  
**Dashboard:** https://supabase.com/dashboard/project/vmubthxbchrrutwdbfed

**Producción Vercel:** https://hosteleria-asistencia.vercel.app  
**Proyecto Vercel:** https://vercel.com/casa-joaquin/hosteleria-asistencia

---

## 1. Git y GitHub

- Repositorio: https://github.com/CamaXos/hosteleria-asistencia (privado, rama `main`)
- `.gitignore` excluye `.env.local`, `.next/` y `node_modules/`
- Plantilla de variables: `.env.local.example`
- Migración en remoto: `supabase/migrations/001_initial_schema.sql`

---

## 2. Integración GitHub en Supabase (migraciones)

### 2.1 Verificación desde CLI (2026-06-25)

| Comprobación | Resultado |
|--------------|-----------|
| `SUPABASE_ACCESS_TOKEN` en `.env.local` | Presente (no mostrar en logs) |
| `npx supabase projects list` | Proyecto `vmubthxbchrrutwdbfed` con `"linked": true` |
| `npx supabase migration list --linked` | Local `001` = Remote `001` |
| `npx supabase db push --dry-run --linked` | *Remote database is up to date* |
| `npx supabase branches list` | Rama Git `main` asociada al proyecto (`git_branch: main`, estado `FUNCTIONS_DEPLOYED`) |

**Conclusión:** el CLI confirma enlace local ↔ remoto y migraciones sincronizadas. La rama `main` en Supabase indica que la integración Git del dashboard está activa.

### 2.2 Qué no se puede verificar solo con `gh` / CLI

| Aspecto | CLI / `gh` | Panel Supabase |
|---------|------------|----------------|
| Repo conectado en Integrations | No (API de instalaciones de apps requiere permisos de GitHub App) | **Settings → Integrations → GitHub** |
| Permisos de la app Supabase en el repo | No con token `repo` estándar | GitHub → Settings → Applications |
| Despliegue automático de migraciones en cada push | Indirecto (rama `main` en `branches list`) | Integrations → historial de migraciones |
| Contraseña de BD / rotación | `supabase link` | Database settings |

Comandos útiles en local:

```powershell
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npx supabase branches list
```

Documentación: https://supabase.com/docs/guides/cli/managing-environments

**Estructura:**

```
supabase/
  config.toml
  migrations/
    001_initial_schema.sql
  seed.sql
```

---

## 3. Vercel

### 3.1 Estado del deploy

| Item | Estado |
|------|--------|
| Cuenta CLI | Sesión iniciada (equipo **casa-joaquin**) |
| Proyecto | `hosteleria-asistencia` |
| URL producción | https://hosteleria-asistencia.vercel.app |
| Variables en Vercel | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` en Production, Preview y Development |

El primer deploy se hizo con `npx vercel --yes`; producción actual con `npx vercel --prod --yes`.

### 3.2 Conectar GitHub en Vercel (pendiente manual)

El CLI mostró error al enlazar el repo: hace falta **Login Connection** con GitHub en la cuenta Vercel.

1. Abre https://vercel.com/account/settings/authentication
2. En **Login Connections**, conecta **GitHub** (la misma cuenta que posee el repo).
3. En el proyecto: https://vercel.com/casa-joaquin/hosteleria-asistencia/settings/git → **Connect Git Repository** → `CamaXos/hosteleria-asistencia`.

Así cada `git push` a `main` desplegará automáticamente.

### 3.3 Variables de entorno

Ya configuradas vía CLI desde `.env.local`. Para revisar o editar:

https://vercel.com/casa-joaquin/hosteleria-asistencia/settings/environment-variables

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente browser (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor (API routes admin) |

Tras cambiar variables: **Redeploy** en Vercel o `npx vercel --prod --yes`.

### 3.4 Importar desde cero (alternativa web)

1. https://vercel.com/new
2. Importa `CamaXos/hosteleria-asistencia`
3. Framework: **Next.js**
4. Añade las mismas variables de entorno antes del primer deploy

---

## 4. Supabase Auth (obligatorio tras Vercel)

En https://supabase.com/dashboard/project/vmubthxbchrrutwdbfed/auth/url-configuration:

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://hosteleria-asistencia.vercel.app` |
| **Redirect URLs** | `https://hosteleria-asistencia.vercel.app/**` |

Opcional (previews de Vercel): añade también `https://*-casa-joaquin.vercel.app/**` si usas login en entornos preview.

Sin estos valores, el login por magic link / OAuth puede fallar o redirigir a `localhost`.

---

## 5. Enlaces útiles

| Recurso | URL |
|---------|-----|
| Repo GitHub | https://github.com/CamaXos/hosteleria-asistencia |
| Supabase proyecto | https://supabase.com/dashboard/project/vmubthxbchrrutwdbfed |
| Tokens Supabase | https://supabase.com/dashboard/account/tokens |
| App en producción | https://hosteleria-asistencia.vercel.app |
| Vercel proyecto | https://vercel.com/casa-joaquin/hosteleria-asistencia |
