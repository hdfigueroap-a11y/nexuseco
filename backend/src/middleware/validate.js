// backend/src/middleware/validate.js
// Centraliza la validación con express-validator

const { validationResult } = require('express-validator');

/**
 * Ejecuta las validaciones y retorna 422 si hay errores.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Errores de validación',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validate };
