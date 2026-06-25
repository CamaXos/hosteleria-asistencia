# Control de Asistencia — Hostelería

Aplicación web para gestionar la asistencia diaria del personal en centros de hostelería (restaurantes, hoteles, etc.).

**Stack:** Next.js 16 · TypeScript · Tailwind CSS · Supabase (Auth + PostgreSQL + RLS)

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Crear proyecto en Supabase](#2-crear-proyecto-en-supabase)
3. [Ejecutar la migración SQL](#3-ejecutar-la-migración-sql)
4. [Configurar variables de entorno](#4-configurar-variables-de-entorno)
5. [Instalar y ejecutar en local](#5-instalar-y-ejecutar-en-local)
6. [Crear el primer usuario administrador](#6-crear-el-primer-usuario-administrador)
7. [Datos de prueba (seed)](#7-datos-de-prueba-seed)
8. [Cuentas de prueba recomendadas](#8-cuentas-de-prueba-recomendadas)
9. [Desplegar en Vercel](#9-desplegar-en-vercel)
10. [Estructura del proyecto](#10-estructura-del-proyecto)
11. [Roles y funcionalidades](#11-roles-y-funcionalidades)
12. [Futuras mejoras (email / cron)](#12-futuras-mejoras-email--cron)

---

## 1. Requisitos previos

Antes de empezar, necesitas tener instalado:

| Herramienta | Versión mínima | Cómo comprobarlo |
|-------------|----------------|------------------|
| [Node.js](https://nodejs.org/) | 18 o superior | `node --version` |
| [npm](https://www.npmjs.com/) | 9 o superior | `npm --version` |
| [Git](https://git-scm.com/) | Cualquiera reciente | `git --version` |
| Cuenta en [Supabase](https://supabase.com/) | Gratuita | — |
| Cuenta en [Vercel](https://vercel.com/) | Gratuita (para deploy) | — |

---

## 2. Crear proyecto en Supabase

Sigue estos pasos **uno a uno**:

### Paso 2.1 — Registrarse en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en **Start your project**
3. Inicia sesión con GitHub o email

### Paso 2.2 — Crear un nuevo proyecto

1. En el panel, haz clic en **New project**
2. Elige tu organización (o crea una nueva)
3. Rellena:
   - **Name:** `hosteleria-asistencia` (o el nombre que prefieras)
   - **Database Password:** inventa una contraseña segura y **guárdala** (la necesitarás para acceder a la BD directamente)
   - **Region:** elige la más cercana (ej. `West EU (Ireland)`)
4. Haz clic en **Create new project**
5. Espera 1-2 minutos mientras se crea el proyecto

### Paso 2.3 — Obtener las claves API

1. En el menú lateral, ve a **Project Settings** (icono de engranaje)
2. Haz clic en **API**
3. Copia y guarda estos valores:
   - **Project URL** → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (en API Keys) → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (en API Keys) → será tu `SUPABASE_SERVICE_ROLE_KEY`
     > ⚠️ La clave `service_role` es secreta. **Nunca** la expongas en el navegador ni la subas a GitHub.

---

## 3. Ejecutar la migración SQL

La base de datos necesita tablas, políticas de seguridad (RLS) y funciones. Todo está en un solo archivo.

### Paso 3.1 — Abrir el editor SQL

1. En Supabase, ve a **SQL Editor** (menú lateral)
2. Haz clic en **New query**

### Paso 3.2 — Pegar y ejecutar la migración

1. Abre el archivo `supabase/migrations/001_initial_schema.sql` de este proyecto
2. Copia **todo** el contenido
3. Pégalo en el editor SQL de Supabase
4. Haz clic en **Run** (o Ctrl+Enter)
5. Deberías ver el mensaje `Success. No rows returned`

Si hay algún error, comprueba que no hayas ejecutado la migración dos veces (algunos objetos ya existirían).

---

## 4. Configurar variables de entorno

### Paso 4.1 — Crear el archivo `.env.local`

En la raíz del proyecto (`hosteleria-asistencia/`), copia el archivo de ejemplo:

```bash
# En Windows (PowerShell)
Copy-Item .env.local.example .env.local

# En Mac/Linux
cp .env.local.example .env.local
```

### Paso 4.2 — Rellenar los valores

Abre `.env.local` con un editor de texto y sustituye los valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Importante:** `.env.local` está en `.gitignore` y no se sube a Git. Nunca compartas estas claves públicamente.

---

## 5. Instalar y ejecutar en local

Abre una terminal en la carpeta del proyecto:

```bash
# 1. Instalar dependencias (solo la primera vez)
npm install

# 2. Iniciar el servidor de desarrollo
npm run dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000)

Deberías ver la pantalla de **Iniciar sesión**.

### Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (recarga automática) |
| `npm run build` | Compilar para producción |
| `npm run start` | Ejecutar build de producción |
| `npm run lint` | Revisar errores de código |

---

## 6. Crear el primer usuario administrador

Supabase crea usuarios en **Authentication**. El perfil (rol admin/responsable) se crea automáticamente con un trigger, pero debes asignar el rol de admin manualmente.

### Paso 6.1 — Crear usuario en Supabase Auth

1. En Supabase, ve a **Authentication** → **Users**
2. Haz clic en **Add user** → **Create new user**
3. Rellena:
   - **Email:** `admin@test.com` (o tu email real)
   - **Password:** una contraseña segura (mínimo 6 caracteres)
   - Marca **Auto Confirm User** ✅
4. Haz clic en **Create user**
5. **Copia el UUID** del usuario creado (aparece en la columna UID)

### Paso 6.2 — Asignar rol de administrador

1. Ve a **SQL Editor** → **New query**
2. Ejecuta (sustituye `TU-UUID-AQUI` por el UUID copiado):

```sql
UPDATE public.profiles
SET full_name = 'Administrador Principal',
    role = 'admin',
    active = true
WHERE id = 'TU-UUID-AQUI';
```

3. Haz clic en **Run**

### Paso 6.3 — Probar el login

1. Ve a [http://localhost:3000/login](http://localhost:3000/login)
2. Inicia sesión con el email y contraseña que creaste
3. Deberías ser redirigido al **Panel de administración** (`/admin`)

---

## 7. Datos de prueba (seed)

El archivo `supabase/seed.sql` contiene centros y empleados de ejemplo.

### Paso 7.1 — Ejecutar el seed de centros y empleados

1. Abre `supabase/seed.sql`
2. Copia el bloque de INSERT de centros y empleados (no necesita UUIDs de usuarios)
3. Ejecuta en **SQL Editor**

### Paso 7.2 — Crear responsables de prueba

Repite el proceso del paso 6 para crear dos responsables:

| Email | Rol | Nombre |
|-------|-----|--------|
| `resp1@test.com` | responsible | María García |
| `resp2@test.com` | responsible | Carlos López |

Después de crear cada uno, actualiza su perfil:

```sql
-- Sustituye los UUIDs reales
UPDATE public.profiles SET full_name = 'María García', role = 'responsible' WHERE id = 'UUID-RESP1';
UPDATE public.profiles SET full_name = 'Carlos López', role = 'responsible' WHERE id = 'UUID-RESP2';
```

### Paso 7.3 — Asignar responsables a centros

```sql
-- Sustituye los UUIDs de los responsables
INSERT INTO public.responsible_centers (responsible_id, center_id) VALUES
  ('UUID-RESP1', 'a0000000-0000-4000-8000-000000000001'),
  ('UUID-RESP1', 'a0000000-0000-4000-8000-000000000002'),
  ('UUID-RESP2', 'a0000000-0000-4000-8000-000000000001');
```

> **Regla de negocio:** cada centro debe tener entre **2 y 4 responsables** asignados.

---

## 8. Cuentas de prueba recomendadas

| Email | Contraseña | Rol | Acceso |
|-------|-----------|-----|--------|
| `admin@test.com` | (la que definiste) | Admin | Panel completo |
| `resp1@test.com` | (la que definiste) | Responsable | Restaurante La Plaza + Hotel Costa Azul |
| `resp2@test.com` | (la que definiste) | Responsable | Restaurante La Plaza |

---

## 9. Desplegar en Vercel

### Paso 9.1 — Subir el código a GitHub

Si aún no tienes el repositorio en GitHub:

```bash
# En la carpeta del proyecto
git add .
git commit -m "Initial commit: app de control de asistencia hostelería"
git branch -M main

# Crea un repo vacío en GitHub y luego:
git remote add origin https://github.com/TU-USUARIO/hosteleria-asistencia.git
git push -u origin main
```

### Paso 9.2 — Crear cuenta en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Regístrate con tu cuenta de GitHub

### Paso 9.3 — Importar el proyecto

1. En Vercel, haz clic en **Add New** → **Project**
2. Selecciona el repositorio `hosteleria-asistencia`
3. Vercel detectará automáticamente que es un proyecto Next.js
4. En **Environment Variables**, añade las tres variables de `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Haz clic en **Deploy**
6. Espera 1-2 minutos. Obtendrás una URL como `https://hosteleria-asistencia.vercel.app`

### Paso 9.4 — Configurar Supabase para producción

En Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://tu-app.vercel.app`
- **Redirect URLs:** añade `https://tu-app.vercel.app/**`

---

## 10. Estructura del proyecto

```
hosteleria-asistencia/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Pantalla de login
│   │   ├── (admin)/admin/         # Panel admin (centros, empleados, etc.)
│   │   ├── (responsible)/         # Flujo del responsable
│   │   └── api/export/            # Exportación CSV (API)
│   ├── components/
│   │   ├── ui/                    # Botones, inputs, modales...
│   │   ├── admin/                 # Componentes del panel admin
│   │   ├── responsible/           # Formulario de informe diario
│   │   └── shared/                # Sidebar, badges, logout...
│   ├── lib/
│   │   ├── supabase/              # Cliente browser + server + middleware
│   │   ├── auth/                  # Sesión y roles
│   │   ├── actions/               # Server actions (CRUD, informes)
│   │   ├── types/                 # Tipos TypeScript
│   │   └── utils/                 # Fechas, exportación CSV/Excel
│   └── middleware.ts              # Protección de rutas + refresh sesión
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql
├── .env.local.example
└── README.md
```

---

## 11. Roles y funcionalidades

### Administrador (`/admin`)

- Panel con resumen del día (centros pendientes / enviados)
- CRUD de centros, empleados y responsables
- Asignación de responsables a centros (2-4 por centro)
- Cuadrícula mensual con filtros y exportación CSV/Excel
- Corrección de registros con auditoría

### Responsable (`/responsible`)

- Selección de centro asignado
- Informe diario **solo para hoy**
- Marcar asistencia por empleado (T, L, V, F, E, O)
- Alta y baja de empleados
- Resumen antes de enviar → bloqueo permanente
- **No** puede ver historial personal ni modificar informes enviados

### Códigos de asistencia

| Código | Estado | Descripción |
|--------|--------|-------------|
| T | Trabajado | Ha trabajado hoy |
| L | Libre | Día libre |
| V | Vacaciones | De vacaciones |
| F | Falta | Ausencia injustificada |
| E | Enfermedad | Baja por enfermedad |
| B | Baja | Empleado dado de baja |
| O | Otro | Otro motivo |

---

## 12. Futuras mejoras (email / cron)

La arquitectura está preparada para añadir:

### Recordatorios por email (pendiente de implementar)

- Crear una ruta API en `src/app/api/cron/reminders/route.ts`
- Usar [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) para ejecutar a las 18:00
- Consultar centros sin informe del día y enviar email a responsables asignados
- Servicios recomendados: [Resend](https://resend.com/) o [SendGrid](https://sendgrid.com/)

### Ejemplo de cron en `vercel.json` (futuro):

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 18 * * *"
    }
  ]
}
```

---

## Conexión automática

1. Copia `.env.local.example` a `.env.local` y rellena las claves de Supabase (API).
2. Añade `SUPABASE_DB_PASSWORD` (la contraseña de la base de datos en Supabase → **Project Settings** → **Database**).
3. Ejecuta:

```powershell
powershell -File scripts/apply-migration.ps1
```

El script aplica `supabase/migrations/001_initial_schema.sql`, verifica `profiles`, ejecuta `seed.sql` si hace falta y prepara el admin `admin@hosteleria.test`.

> **Nota (conexion desde local):** `scripts/apply-migration.ps1` usa el **session pooler** de Supabase en la region **eu-west-3** (`aws-0-eu-west-3.pooler.supabase.com`) con el paquete Node `pg`, porque el host directo `db.<ref>.supabase.co` suele ser solo IPv6. Si tu proyecto esta en otra region del pooler, ajusta el host en el script. Si el pooler falla, se intenta la conexion directa como respaldo.


Opcional: `pwsh -File scripts/setup-check.ps1` solo valida variables sin aplicar migración.

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| `Invalid API key` al iniciar sesión | Verifica que `.env.local` tiene las claves correctas de Supabase |
| Redirige a login constantemente | Comprueba que el usuario existe en Auth y tiene perfil en `profiles` |
| `No tienes centros asignados` | Asigna el responsable a centros desde admin o con SQL |
| Error al crear responsable | Necesitas `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` |
| `Ya existe un informe para este centro hoy` | Comportamiento correcto: solo un informe por centro y día |
| Build falla en Vercel | Asegúrate de que las 3 variables de entorno están configuradas |

---

## Licencia

Proyecto privado — uso interno.
