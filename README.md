# 🌱 Nexus Eco — Plataforma de Monitoreo Ambiental
Universidad Manuela Beltrán · Sprint 1 y Sprint 2

🔗 **Demo en vivo:** [https://nexuseco.vercel.app/dashboard](https://nexuseco.vercel.app/dashboard)

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
