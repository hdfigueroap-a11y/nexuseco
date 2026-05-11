// backend/src/routes/index.js
// Centraliza todas las rutas de la API

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const authCtrl       = require('../controllers/authController');
const projectsCtrl   = require('../controllers/projectsController');
const indicatorsCtrl = require('../controllers/indicatorsController');
const alertsCtrl     = require('../controllers/alertsController');
const evidenceCtrl   = require('../controllers/evidenceController');
const auditCtrl      = require('../controllers/auditController');

const router = Router();

// ─────────────────────────────────────────────────────────
// RF01 — Autenticación
// ─────────────────────────────────────────────────────────
router.post('/auth/register',
  [
    body('email').isEmail().withMessage('Correo inválido'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('role').isIn(['empresa', 'operador', 'auditor']).withMessage('Rol inválido'),
    body('full_name').notEmpty().withMessage('El nombre completo es requerido'),
    validate,
  ],
  authCtrl.register
);

router.post('/auth/login',
  [
    body('email').isEmail().withMessage('Correo inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
    validate,
  ],
  authCtrl.login
);

router.get('/auth/me', authenticate, authCtrl.me);

// ─────────────────────────────────────────────────────────
// RF02 — Gestión de Proyectos
// ─────────────────────────────────────────────────────────
router.post('/projects',
  authenticate,
  authorize('operador'),
  [
    body('name').notEmpty().withMessage('El nombre del proyecto es requerido'),
    body('tree_goal').optional().isInt({ min: 0 }).withMessage('La meta de árboles debe ser un entero positivo'),
    validate,
  ],
  projectsCtrl.create
);

router.get('/projects',    authenticate, projectsCtrl.list);
router.get('/projects/:id', authenticate, projectsCtrl.getOne);

router.put('/projects/:id',
  authenticate,
  authorize('operador'),
  projectsCtrl.update
);

// ─────────────────────────────────────────────────────────
// RF03 — Definición Geográfica
// ─────────────────────────────────────────────────────────
router.put('/projects/:id/geo',
  authenticate,
  authorize('operador'),
  [
    body('north').isFloat({ min: -90,  max: 90  }).withMessage('Latitud norte inválida'),
    body('south').isFloat({ min: -90,  max: 90  }).withMessage('Latitud sur inválida'),
    body('east').isFloat({ min: -180, max: 180 }).withMessage('Longitud este inválida'),
    body('west').isFloat({ min: -180, max: 180 }).withMessage('Longitud oeste inválida'),
    validate,
  ],
  projectsCtrl.setGeo
);

router.get('/projects/:id/geo', authenticate, projectsCtrl.getGeo);

router.get('/projects/explore/available',
  authenticate,
  authorize('empresa'),
  projectsCtrl.listAvailable
);

router.post('/projects/:id/invest',
  authenticate,
  authorize('empresa'),
  projectsCtrl.invest
);

// ─────────────────────────────────────────────────────────
// RF04 — Registro de Indicadores  (RF05 y RF06 son automáticos)
// ─────────────────────────────────────────────────────────
router.post('/projects/:projectId/indicators',
  authenticate,
  authorize('operador'),
  [
    body('trees_planted').isInt({ min: 0 }).withMessage('Árboles sembrados debe ser entero positivo'),
    body('trees_survived').isInt({ min: 0 }).withMessage('Árboles sobrevivientes debe ser entero positivo'),
    body('temperature').optional().isFloat().withMessage('Temperatura inválida'),
    body('humidity').optional().isFloat({ min: 0, max: 100 }).withMessage('Humedad debe estar entre 0 y 100'),
    validate,
  ],
  indicatorsCtrl.create
);

router.get('/projects/:projectId/indicators',       authenticate, indicatorsCtrl.list);
router.get('/projects/:projectId/indicators/latest', authenticate, indicatorsCtrl.getLatest);

// ─────────────────────────────────────────────────────────
// RF07 — Sistema de Alertas
// ─────────────────────────────────────────────────────────
router.get('/alerts',                            authenticate, alertsCtrl.listMyAlerts);
router.get('/projects/:projectId/alerts',        authenticate, alertsCtrl.listByProject);
router.patch('/alerts/:alertId/review',
  authenticate,
  authorize('operador', 'auditor'),
  alertsCtrl.markReviewed
);

// ─────────────────────────────────────────────────────────
// RF08 — Gestión de Evidencias
// ─────────────────────────────────────────────────────────
router.post('/projects/:projectId/evidence',
  authenticate,
  authorize('operador'),
  evidenceCtrl.upload.single('photo'),
  evidenceCtrl.uploadEvidence
);

router.get('/projects/:projectId/evidence',
  authenticate,
  authorize('operador', 'empresa', 'auditor'),
  evidenceCtrl.listEvidence
);

// ─────────────────────────────────────────────────────────
// RF09 — Historial de Cambios (solo auditor puede ver)
// ─────────────────────────────────────────────────────────
router.get('/projects/:projectId/history',
  authenticate,
  authorize('auditor'),
  auditCtrl.getProjectHistory
);

// ─────────────────────────────────────────────────────────
// RNF05 — Logs de Auditoría (solo auditor)
// ─────────────────────────────────────────────────────────
router.get('/audit/logs',
  authenticate,
  authorize('auditor'),
  auditCtrl.getSystemLogs
);

// ─────────────────────────────────────────────────────────
// Health check (Railway lo usa para verificar el servicio)
// ─────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
