// backend/src/routes/index.js
const { Router } = require('express');
const { body }   = require('express-validator');
const { validate }               = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const authCtrl       = require('../controllers/authController');
const projectsCtrl   = require('../controllers/projectsController');
const indicatorsCtrl = require('../controllers/indicatorsController');
const alertsCtrl     = require('../controllers/alertsController');
const evidenceCtrl   = require('../controllers/evidenceController');
const auditCtrl      = require('../controllers/auditController');
const fraudCtrl      = require('../controllers/fraudController');
const reportsCtrl    = require('../controllers/reportsController');

const router = Router();

// ── RF01 Autenticación ───────────────────────────────────
router.post('/auth/register',
  [
    body('email').isEmail().withMessage('Correo inválido'),
    body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
    body('role').isIn(['empresa','operador','auditor']).withMessage('Rol inválido'),
    body('full_name').notEmpty().withMessage('Nombre requerido'),
    validate,
  ],
  authCtrl.register
);
router.post('/auth/login',
  [
    body('email').isEmail().withMessage('Correo inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
    validate,
  ],
  authCtrl.login
);
router.get('/auth/me', authenticate, authCtrl.me);

// ── RF02 Proyectos ───────────────────────────────────────
router.get('/projects/explore/available', authenticate, authorize('empresa'), projectsCtrl.listAvailable);
router.post('/projects', authenticate, authorize('operador'),
  [body('name').notEmpty().withMessage('Nombre requerido'), validate],
  projectsCtrl.create
);
router.get('/projects',     authenticate, projectsCtrl.list);
router.get('/projects/:id', authenticate, projectsCtrl.getOne);
router.put('/projects/:id', authenticate, authorize('operador'), projectsCtrl.update);
router.post('/projects/:id/invest', authenticate, authorize('empresa'), projectsCtrl.invest);

// ── RF03 Geografía ───────────────────────────────────────
router.put('/projects/:id/geo', authenticate, authorize('operador'),
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

// ── RF04 Indicadores ─────────────────────────────────────
router.post('/projects/:projectId/indicators', authenticate, authorize('operador'),
  [
    body('trees_planted').isInt({ min: 0 }).withMessage('Árboles sembrados inválido'),
    body('trees_survived').isInt({ min: 0 }).withMessage('Árboles sobrevivientes inválido'),
    body('temperature').optional().isFloat().withMessage('Temperatura inválida'),
    body('humidity').optional().isFloat({ min: 0, max: 100 }).withMessage('Humedad inválida'),
    validate,
  ],
  indicatorsCtrl.create
);
router.get('/projects/:projectId/indicators',        authenticate, indicatorsCtrl.list);
router.get('/projects/:projectId/indicators/latest', authenticate, indicatorsCtrl.getLatest);

// ── RF07 Alertas ─────────────────────────────────────────
router.get('/alerts',                      authenticate, alertsCtrl.listMyAlerts);
router.get('/projects/:projectId/alerts',  authenticate, alertsCtrl.listByProject);
router.patch('/alerts/:alertId/review',    authenticate, authorize('operador','auditor'), alertsCtrl.markReviewed);

// ── RF08 Evidencias ──────────────────────────────────────
router.post('/projects/:projectId/evidence',
  authenticate, authorize('operador'),
  evidenceCtrl.upload.single('photo'),
  evidenceCtrl.uploadEvidence
);
router.get('/projects/:projectId/evidence', authenticate, evidenceCtrl.listEvidence);

// ── RF09 Historial ───────────────────────────────────────
router.get('/projects/:projectId/history', authenticate, authorize('auditor'), auditCtrl.getProjectHistory);

// ── RF10 Antifraude ──────────────────────────────────────
router.post('/projects/:projectId/fraud/analyze',  authenticate, authorize('auditor'), fraudCtrl.analyzeLatest);
router.get('/projects/:projectId/fraud/suspicious', authenticate, authorize('auditor'), fraudCtrl.listSuspicious);
router.get('/fraud/suspicious',                    authenticate, authorize('auditor'), fraudCtrl.listAllSuspicious);
router.patch('/fraud/indicators/:indicatorId/validate', authenticate, authorize('auditor'),
  [
    body('action').isIn(['validate','reject']).withMessage('Acción inválida'),
    validate,
  ],
  fraudCtrl.validateSuspicious
);

// ── RF11 Índice de Confiabilidad ─────────────────────────
router.get('/projects/:projectId/reliability', authenticate, authorize('auditor'), fraudCtrl.getReliability);
router.get('/fraud/reliability/all',           authenticate, authorize('auditor'), fraudCtrl.getAllReliability);

// ── RF12 Reportes PDF ────────────────────────────────────
router.post('/projects/:projectId/reports', authenticate, authorize('empresa','auditor'), reportsCtrl.generateReport);
router.get('/projects/:projectId/reports',  authenticate, reportsCtrl.listReports);
router.get('/reports/:reportId',            authenticate, reportsCtrl.getReport);

// ── RF13 Firma Digital ───────────────────────────────────
router.post('/reports/:reportId/sign',   authenticate, authorize('auditor'), reportsCtrl.signReport);
router.post('/reports/:reportId/reject', authenticate, authorize('auditor'),
  [body('observation').notEmpty().withMessage('Observación requerida'), validate],
  reportsCtrl.rejectReport
);

// ── RNF05 Logs de Auditoría ──────────────────────────────
router.get('/audit/logs', authenticate, authorize('auditor'), auditCtrl.getSystemLogs);

// ── Health check ─────────────────────────────────────────
router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

module.exports = router;
