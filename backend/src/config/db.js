// backend/src/config/db.js
// Conexión a PostgreSQL mediante pg Pool
// Railway provee DATABASE_URL automáticamente en producción

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DB] Conexión establecida con PostgreSQL');
  }
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool de PostgreSQL:', err.message);
  process.exit(1);
});

/**
 * Ejecuta una query con parámetros opcionales.
 * @param {string} text - SQL query
 * @param {Array}  params - parámetros posicionales ($1, $2, ...)
 */
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
