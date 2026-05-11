// backend/src/config/seed.js
// Crea usuarios de prueba para desarrollo
// Ejecutar con:  node src/config/seed.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const USERS = [
  {
    email: 'empresa@nexuseco.com',
    password: 'Empresa123!',
    role: 'empresa',
    full_name: 'EcoFund S.A.S.',
  },
  {
    email: 'operador@nexuseco.com',
    password: 'Operador123!',
    role: 'operador',
    full_name: 'Carlos Martínez',
  },
  {
    email: 'auditor@nexuseco.com',
    password: 'Auditor123!',
    role: 'auditor',
    full_name: 'Ana Rodríguez',
  },
];

async function seed() {
  console.log('[Seed] Insertando usuarios de prueba...');
  try {
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 12);
      await pool.query(
        `INSERT INTO users (email, password, role, full_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [u.email, hash, u.role, u.full_name]
      );
      console.log(`[Seed] ✅ ${u.role}: ${u.email}  /  ${u.password}`);
    }
    console.log('[Seed] Seed completado.');
  } catch (err) {
    console.error('[Seed] ❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
