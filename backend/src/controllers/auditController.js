// backend/src/controllers/auditController.js
// RF09 — Historial de Cambios (inmutable)
// RNF05 — Auditoría de Logs

const { query }        = require('../config/db');
const { getAuditLogs } = require('../services/auditService');

/**
 * GET /api/projects/:projectId/history
 * RF09 Escenario 2: El auditor consulta el historial de un proyecto.
 * Inmutable: no expone endpoints de DELETE o UPDATE.
 */
async function getProjectHistory(req, res, next) {
  try {
    const { projectId } = req.params;
    const { limit = 200, offset = 0 } = req.query;

    const { rows } = await query(
      `SELECT cl.*, u.email, u.full_name, u.role
       FROM change_log cl
       LEFT JOIN users u ON u.id = cl.user_id
       WHERE cl.project_id = $1
       ORDER BY cl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, parseInt(limit), parseInt(offset)]
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/audit/logs
 * RNF05 Escenario 2: El auditor consulta los logs con filtros.
 * Solo accesible para rol auditor (protejer en el router).
 */
async function getSystemLogs(req, res, next) {
  try {
    const { userId, role, action, from, to, limit, offset } = req.query;

    const logs = await getAuditLogs({
      userId: userId || null,
      role:   role   || null,
      action: action || null,
      from:   from   || null,
      to:     to     || null,
      limit:  parseInt(limit  || 100),
      offset: parseInt(offset || 0),
    });

    return res.json(logs);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProjectHistory, getSystemLogs };
