// backend/src/config/migrate_sprint3.js
// Ejecutar con: node src/config/migrate_sprint3.js
// Agrega las tablas de Sprint 3 sin tocar las existentes

require('dotenv').config();
const { pool } = require('./db');

const SCHEMA_SPRINT3 = `
-- ─────────────────────────────────────────────────────────
-- RF12 / RF13  Reportes y Firma Digital
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  generated_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  period_from   DATE,
  period_to     DATE,
  data          JSONB,
  hash          VARCHAR(64) NOT NULL,
  status        VARCHAR(20) DEFAULT 'pendiente'
                  CHECK (status IN ('pendiente','firmado','rechazado')),
  signed_by     UUID REFERENCES users(id),
  signed_at     TIMESTAMPTZ,
  signature     VARCHAR(64),
  observation   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_status  ON reports(status);
`;

async function migrate() {
  console.log('[Migrate Sprint3] Iniciando...');
  try {
    await pool.query(SCHEMA_SPRINT3);
    console.log('[Migrate Sprint3] ✅ Tabla reports creada correctamente.');
  } catch (err) {
    console.error('[Migrate Sprint3] ❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
