// backend/src/config/migrate.js
// Ejecutar con:  node src/config/migrate.js
// Crea todas las tablas necesarias para Sprint 1 y Sprint 2

require('dotenv').config();
const { pool } = require('./db');

const SCHEMA = `
-- ─────────────────────────────────────────────────────────
-- RF01  Usuarios y Roles
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,         -- bcrypt hash
  role        VARCHAR(20)  NOT NULL CHECK (role IN ('empresa','operador','auditor')),
  full_name   VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- RF02  Proyectos Ambientales
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  tree_goal       INTEGER NOT NULL DEFAULT 0,    -- meta de árboles
  start_date      DATE,
  end_date        DATE,
  status          VARCHAR(20) DEFAULT 'activo' CHECK (status IN ('activo','inactivo','finalizado')),
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  company_id      UUID REFERENCES users(id) ON DELETE SET NULL, -- empresa financiadora
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- RF03  Definición Geográfica
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_geo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  north       NUMERIC(10,6) NOT NULL,
  south       NUMERIC(10,6) NOT NULL,
  east        NUMERIC(10,6) NOT NULL,
  west        NUMERIC(10,6) NOT NULL,
  area_km2    NUMERIC(12,4),                -- calculado automáticamente
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- RF04  Indicadores Ambientales (inmutables, append-only)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS indicators (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  temperature         NUMERIC(5,2),           -- °C
  humidity            NUMERIC(5,2),           -- %
  trees_planted       INTEGER NOT NULL DEFAULT 0,
  trees_survived      INTEGER NOT NULL DEFAULT 0,
  ivi                 NUMERIC(5,2),           -- calculado por el sistema (RF05)
  compliance_pct      NUMERIC(5,2),           -- calculado por el sistema (RF06)
  is_suspicious       BOOLEAN DEFAULT FALSE,  -- marcado por antifraude (RF10)
  recorded_at         TIMESTAMPTZ DEFAULT NOW()
  -- No hay updated_at: los indicadores NO se editan
);

-- ─────────────────────────────────────────────────────────
-- RF05/RF06  Valores calculados por proyecto (caché)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_metrics (
  project_id      UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  current_ivi     NUMERIC(5,2) DEFAULT 0,
  compliance_pct  NUMERIC(5,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- RF07  Alertas
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL CHECK (type IN (
                  'ivi_critico','cumplimiento_bajo','baja_supervivencia',
                  'temperatura_critica','inactividad'
                )),
  message       TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'activa' CHECK (status IN ('activa','revisada')),
  reviewed_by   UUID REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- RF08  Evidencias Fotográficas
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mimetype      VARCHAR(100),
  size_bytes    INTEGER,
  url           TEXT,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- RF09  Historial de Cambios (inmutable)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  entity        VARCHAR(100) NOT NULL,   -- 'project','indicator','evidence',...
  action        VARCHAR(50)  NOT NULL,   -- 'create','update','delete','login',...
  old_values    JSONB,
  new_values    JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- RNF05  Log de Auditoría (todas las acciones del sistema)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  role        VARCHAR(20),
  action      VARCHAR(255) NOT NULL,
  entity      VARCHAR(100),
  entity_id   UUID,
  metadata    JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- Índices para optimizar consultas frecuentes (RNF01)
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_owner       ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_company     ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_indicators_project   ON indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_indicators_recorded  ON indicators(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_project       ON alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status        ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_evidence_project     ON evidence(project_id);
CREATE INDEX IF NOT EXISTS idx_change_log_project   ON change_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created    ON audit_log(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- Restricción única: previene indicadores duplicados (RNF06)
-- ─────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_indicators_unique_day
  ON indicators(project_id, user_id, DATE(recorded_at));
`;

async function migrate() {
  console.log('[Migrate] Iniciando migración de base de datos...');
  try {
    await pool.query(SCHEMA);
    console.log('[Migrate] ✅ Todas las tablas creadas correctamente.');
  } catch (err) {
    console.error('[Migrate] ❌ Error en migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
