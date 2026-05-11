# 🌱 Nexus Eco — Plataforma de Monitoreo Ambiental

Universidad Manuela Beltrán · Sprint 1 y Sprint 2

---

## 🗂 Estructura del repositorio

```
nexuseco/
├── backend/                  # API REST — Node.js + Express + PostgreSQL
│   ├── src/
│   │   ├── config/           # DB, migración, seed
│   │   ├── controllers/      # auth, projects, indicators, alerts, evidence, audit
│   │   ├── middleware/       # auth JWT, authorize, validate, errorHandler
│   │   ├── routes/           # index.js — todas las rutas
│   │   ├── services/         # iviService, alertService, auditService
│   │   └── index.js          # Entry point
│   └── package.json
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # Navbar, Layout, ProtectedRoute, paneles
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # Login, Register, Dashboard, Projects, Alerts, Audit
│   │   └── services/         # api.js (axios)
│   └── package.json
├── .github/workflows/ci.yml  # GitHub Actions
├── railway.toml              # Config Railway (backend)
└── README.md
```

---

## ✅ Requisitos cubiertos

| Sprint | RF / RNF | Descripción |
|--------|----------|-------------|
| 1 | RF01 | Registro y autenticación con JWT y bcrypt |
| 1 | RF02 | Gestión de proyectos (CRUD con control de acceso por rol) |
| 1 | RF03 | Definición geográfica con cálculo automático de área |
| 1 | RF04 | Registro de indicadores (append-only, validación de rangos) |
| 1 | RNF02 | HTTPS obligatorio (configurado en Railway) |
| 1 | RNF06 | Integridad de datos (restricciones en BD, anti-duplicados) |
| 1 | RNF07 | Escalabilidad (separación frontend/backend por API) |
| 1 | RNF09 | Mantenibilidad (código modular, control de versiones) |
| 2 | RF05 | Cálculo automático del IVI al guardar indicadores |
| 2 | RF06 | Nivel de cumplimiento con alerta si < 70% |
| 2 | RF07 | Alertas automáticas (IVI, supervivencia, temperatura, inactividad) |
| 2 | RF08 | Carga y visualización de evidencias fotográficas |
| 2 | RF09 | Historial de cambios inmutable (auditor) |
| 2 | RNF01 | Tiempo de respuesta < 3s (índices en BD) |
| 2 | RNF03 | Diseño responsive con Tailwind (Mobile First) |
| 2 | RNF05 | Log de auditoría inmutable con filtros |
| 2 | RNF11 | Control de acceso por rol validado en el backend |

---

## 🚀 Paso a paso: GitHub + Railway

### 1. Crear el repositorio en GitHub

```bash
# Desde la carpeta raíz del proyecto
git init
git add .
git commit -m "feat: Sprint 1 y 2 completos — Nexus Eco"

# Crear repositorio en github.com y conectar
git remote add origin https://github.com/TU_USUARIO/nexuseco.git
git push -u origin main
```

### 2. Desplegar base de datos en Railway

1. Ir a [railway.app](https://railway.app) → **New Project**
2. Elegir **Provision PostgreSQL**
3. En la pestaña **Variables** del servicio PostgreSQL, copiar `DATABASE_URL`

### 3. Desplegar el backend en Railway

1. En el mismo proyecto → **New Service → GitHub Repo**
2. Seleccionar tu repositorio `nexuseco`
3. Railway detectará el `railway.toml` automáticamente
4. En la pestaña **Variables** del servicio backend, agregar:

```
DATABASE_URL       = (pegar la URL copiada del paso 2)
JWT_SECRET         = un_secreto_largo_y_aleatorio_aqui
JWT_EXPIRES_IN     = 7d
NODE_ENV           = production
FRONTEND_URL       = https://tu-frontend.vercel.app   ← completar después
UPLOAD_DIR         = uploads
MAX_FILE_SIZE_MB   = 10
```

5. En **Settings → Networking** → generar un dominio público (ej. `nexuseco-backend.up.railway.app`)

### 4. Ejecutar migración y seed en Railway

En la terminal de Railway (o con Railway CLI):

```bash
# Instalar Railway CLI
npm install -g @railway/cli
railway login
railway link   # seleccionar el proyecto y el servicio backend

# Correr migración
railway run node backend/src/config/migrate.js

# Correr seed (usuarios de prueba)
railway run node backend/src/config/seed.js
```

### 5. Desplegar el frontend en Vercel (gratuito)

1. Ir a [vercel.com](https://vercel.com) → **New Project → Import Git Repository**
2. Seleccionar `nexuseco`
3. Configurar:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. En **Environment Variables** agregar:
   ```
   VITE_API_URL = https://nexuseco-backend.up.railway.app
   ```
5. Deploy → copiar la URL del frontend
6. Volver a Railway y actualizar `FRONTEND_URL` con esa URL

### 6. Conectar Railway con GitHub (auto-deploy)

En Railway → **Settings → Source** → activar **Auto Deploy on Push** desde `main`.  
Cada `git push origin main` desplegará automáticamente.

---

## 💻 Desarrollo local

### Backend

```bash
cd backend
cp .env.example .env        # editar con tu PostgreSQL local
npm install
node src/config/migrate.js  # crear tablas
node src/config/seed.js     # usuarios de prueba
npm run dev                 # inicia en http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm install
npm run dev                 # inicia en http://localhost:5173
```

---

## 👥 Usuarios de prueba (seed)

| Rol      | Email                      | Contraseña    |
|----------|----------------------------|---------------|
| Empresa  | empresa@nexuseco.com       | Empresa123!   |
| Operador | operador@nexuseco.com      | Operador123!  |
| Auditor  | auditor@nexuseco.com       | Auditor123!   |

---

## 🔌 Endpoints principales de la API

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/projects
POST   /api/projects                          (operador)
GET    /api/projects/:id
PUT    /api/projects/:id                      (operador)
PUT    /api/projects/:id/geo                  (operador)
GET    /api/projects/:id/geo

POST   /api/projects/:id/indicators           (operador)
GET    /api/projects/:id/indicators
GET    /api/projects/:id/indicators/latest

GET    /api/alerts
GET    /api/projects/:id/alerts
PATCH  /api/alerts/:id/review

POST   /api/projects/:id/evidence             (operador)
GET    /api/projects/:id/evidence

GET    /api/projects/:id/history              (auditor)
GET    /api/audit/logs                        (auditor)

GET    /api/health
```

---

## 🛠 Stack tecnológico

| Capa       | Tecnología |
|------------|------------|
| Backend    | Node.js 20 · Express 4 · pg (PostgreSQL) |
| Seguridad  | bcryptjs · jsonwebtoken · helmet · express-rate-limit |
| Base datos | PostgreSQL (Railway) |
| Frontend   | React 18 · Vite · Tailwind CSS · Recharts |
| HTTP       | Axios con interceptor JWT |
| CI/CD      | GitHub Actions · Railway (auto-deploy) |
| Hosting BD | Railway PostgreSQL |
| Hosting FE | Vercel |
