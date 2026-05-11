// backend/src/middleware/errorHandler.js

const logger = require('../utils/logger');

/**
 * Middleware global de manejo de errores.
 * Nunca expone stack traces en producción.
 */
function errorHandler(err, req, res, _next) {
  logger.error(err.message, {
    stack:  process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path:   req.path,
    method: req.method,
    userId: req.user?.id,
  });

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Error interno del servidor'
      : err.message || 'Error interno del servidor';

  res.status(status).json({ error: message });
}

/**
 * Middleware de logging de peticiones HTTP.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} — ${ms}ms`, {
      ip:   req.ip,
      user: req.user?.id,
    });
  });
  next();
}

module.exports = { errorHandler, requestLogger };
