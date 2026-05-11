// backend/src/middleware/auth.js
// RF01 — Autenticación JWT
// RNF11 — Control de Acceso por Rol (validado en backend)

const jwt = require('jsonwebtoken');
const { logAction } = require('../services/auditService');

/**
 * Middleware: verifica el JWT en el header Authorization.
 * Adjunta req.user con { id, email, role }.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logAction({
      action: 'auth_token_invalid',
      metadata: { error: err.message },
      ipAddress: req.ip,
    }).catch(() => {});

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Por favor, inicia sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Middleware factory: restringe el acceso a uno o varios roles.
 * Uso: authorize('auditor')  |  authorize('empresa','auditor')
 * RNF11: la validación de rol ocurre SIEMPRE en el backend.
 */
function authorize(...roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      // Registrar intento de acceso no autorizado (RNF11, Escenario 2)
      await logAction({
        userId:    req.user.id,
        role:      req.user.role,
        action:    'unauthorized_access_attempt',
        entity:    req.originalUrl,
        metadata:  { required_roles: roles, method: req.method },
        ipAddress: req.ip,
      });

      return res.status(403).json({
        error: `Acceso denegado. Esta funcionalidad requiere rol: ${roles.join(' o ')}`,
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
