// backend/src/controllers/alertsController.js
// RF07 — Sistema de Alertas

const alertService = require('../services/alertService');
const { logAction } = require('../services/auditService');

/**
 * GET /api/alerts
 * Lista alertas del usuario autenticado según su rol.
 */
async function listMyAlerts(req, res, next) {
  try {
    const alerts = await alertService.getAlertsByUser(req.user.id, req.user.role);
    return res.json(alerts);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:projectId/alerts
 * Lista alertas de un proyecto específico.
 */
async function listByProject(req, res, next) {
  try {
    const { projectId } = req.params;
    const { status } = req.query;
    const alerts = await alertService.getAlertsByProject(projectId, status || null);
    return res.json(alerts);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/alerts/:alertId/review
 * RF07 Escenario 4: Marcar alerta como revisada.
 */
async function markReviewed(req, res, next) {
  try {
    const { alertId } = req.params;
    const userId = req.user.id;

    const alert = await alertService.markAsReviewed(alertId, userId);
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada.' });

    await logAction({
      userId,
      role:      req.user.role,
      action:    'alert_marked_reviewed',
      entity:    'alerts',
      entityId:  alertId,
      ipAddress: req.ip,
    });

    return res.json(alert);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyAlerts, listByProject, markReviewed };
