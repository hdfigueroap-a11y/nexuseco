// backend/src/controllers/authController.js
// RF01 — Registro y Autenticación

const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { query } = require('../config/db');
const { logAction } = require('../services/auditService');

/**
 * POST /api/auth/register
 * RF01 — Escenario 1: Registro exitoso de un nuevo usuario
 */
async function register(req, res, next) {
  try {
    const { email, password, role, full_name } = req.body;

    // Verificar si ya existe
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado en el sistema.' });
    }

    // Cifrar contraseña (RNF — buenas prácticas de seguridad)
    const hash = await bcrypt.hash(password, 12);

    const { rows: [user] } = await query(
      `INSERT INTO users (email, password, role, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, full_name, created_at`,
      [email, hash, role, full_name]
    );

    await logAction({
      userId:    user.id,
      role:      user.role,
      action:    'user_registered',
      entity:    'users',
      entityId:  user.id,
      ipAddress: req.ip,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Cuenta creada exitosamente.',
      token,
      user: sanitize(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * RF01 — Escenario 2: Inicio de sesión con credenciales correctas
 * RF01 — Escenario 3: Credenciales incorrectas → error + log
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { rows: [user] } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const valid = user && (await bcrypt.compare(password, user.password));

    if (!valid) {
      // Registrar intento fallido (RF01 Escenario 3)
      await logAction({
        userId:    user?.id || null,
        role:      user?.role || null,
        action:    'login_failed',
        entity:    'users',
        metadata:  { email },
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const token = generateToken(user);

    await logAction({
      userId:    user.id,
      role:      user.role,
      action:    'login_success',
      entity:    'users',
      entityId:  user.id,
      ipAddress: req.ip,
    });

    return res.json({
      token,
      user: sanitize(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Devuelve el perfil del usuario autenticado.
 */
async function me(req, res, next) {
  try {
    const { rows: [user] } = await query(
      'SELECT id, email, role, full_name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    return res.json(user);
  } catch (err) {
    next(err);
  }
}

// ── Helpers ─────────────────────────────────────────────

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}

module.exports = { register, login, me };
