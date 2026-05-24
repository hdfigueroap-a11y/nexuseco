// backend/src/controllers/fraudController.js
// RF10 — Sistema Antifraude
// RF11 — Índice de Confiabilidad

const { query }    = require('../config/db');
const { logAction, logChange } = require('../services/auditService');

// ── RF10 Detección de valores atípicos ───────────────────

/**
 * Analiza los últimos N registros de un indicador y detecta
 * si el nuevo valor se desvía más de 2 desviaciones estándar.
 */
async function detectAnomalies(projectId) {
  const fields = ['temperature', 'humidity', 'trees_planted', 'trees_survived'];
  const suspicious = [];

  // Obtener el último registro
  const { rows: [latest] } = await query(
    `SELECT * FROM indicators
     WHERE project_id = $1
     ORDER BY recorded_at DESC LIMIT 1`,
    [projectId]
  );
  if (!latest) return suspicious;

  // Historial previo (últimos 30 registros, excluyendo el último)
  const { rows: history } = await query(
    `SELECT * FROM indicators
     WHERE project_id = $1
     ORDER BY recorded_at DESC
     LIMIT 31 OFFSET 1`,
    [projectId]
  );
  if (history.length < 5) return suspicious; // no hay suficiente historial

  for (const field of fields) {
    const values = history
      .map((r) => parseFloat(r[field]))
      .filter((v) => !isNaN(v));
    if (values.length < 5) continue;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std  = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    const current = parseFloat(latest[field]);

    if (!isNaN(current) && std > 0 && Math.abs(current - mean) > 2 * std) {
      suspicious.push({
        field,
        value:    current,
        mean:     Math.round(mean * 100) / 100,
        std:      Math.round(std  * 100) / 100,
        deviation: Math.round(Math.abs(current - mean) / std * 100) / 100,
      });
    }
  }

  return suspicious;
}

/**
 * POST /api/projects/:projectId/fraud/analyze
 * RF10 Esc 1: Detección automática de valores atípicos.
 * Marca el último indicador como sospechoso si corresponde.
 */
async function analyzeLatest(req, res, next) {
  try {
    const { projectId } = req.params;
    const anomalies = await detectAnomalies(projectId);

    if (anomalies.length > 0) {
      // Marcar el último indicador como sospechoso
      await query(
        `UPDATE indicators SET is_suspicious = TRUE
         WHERE id = (
           SELECT id FROM indicators WHERE project_id = $1
           ORDER BY recorded_at DESC LIMIT 1
         )`,
        [projectId]
      );

      await logAction({
        userId:    req.user.id,
        role:      req.user.role,
        action:    'fraud_anomaly_detected',
        entity:    'indicators',
        metadata:  { projectId, anomalies },
        ipAddress: req.ip,
      });
    }

    return res.json({ suspicious: anomalies.length > 0, anomalies });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:projectId/fraud/suspicious
 * Lista todos los indicadores sospechosos del proyecto.
 */
async function listSuspicious(req, res, next) {
  try {
    const { projectId } = req.params;
    const { rows } = await query(
      `SELECT ind.*, u.full_name AS recorded_by
       FROM indicators ind
       LEFT JOIN users u ON u.id = ind.user_id
       WHERE ind.project_id = $1 AND ind.is_suspicious = TRUE
       ORDER BY ind.recorded_at DESC`,
      [projectId]
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fraud/suspicious
 * Lista todos los indicadores sospechosos de todos los proyectos (auditor).
 */
async function listAllSuspicious(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT ind.*, u.full_name AS recorded_by, p.name AS project_name
       FROM indicators ind
       LEFT JOIN users u ON u.id = ind.user_id
       LEFT JOIN projects p ON p.id = ind.project_id
       WHERE ind.is_suspicious = TRUE
       ORDER BY ind.recorded_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/fraud/indicators/:indicatorId/validate
 * RF10 Esc 2: Auditor valida un registro sospechoso.
 * RF10 Esc 4: Solo el auditor puede validar.
 */
async function validateSuspicious(req, res, next) {
  try {
    const { indicatorId } = req.params;
    const { action, observation } = req.body; // action: 'validate' | 'reject'

    if (!['validate', 'reject'].includes(action)) {
      return res.status(422).json({ error: 'Acción inválida. Use validate o reject.' });
    }

    const { rows: [existing] } = await query(
      'SELECT * FROM indicators WHERE id = $1',
      [indicatorId]
    );
    if (!existing) return res.status(404).json({ error: 'Indicador no encontrado.' });

    // Marcar como no sospechoso y agregar observación en metadata
    const { rows: [updated] } = await query(
      `UPDATE indicators
       SET is_suspicious = FALSE
       WHERE id = $1 RETURNING *`,
      [indicatorId]
    );

    await logChange({
      projectId: existing.project_id,
      userId:    req.user.id,
      entity:    'indicators',
      action:    `fraud_${action}`,
      oldValues: { is_suspicious: true },
      newValues: { is_suspicious: false, action, observation },
      ipAddress: req.ip,
    });

    await logAction({
      userId:    req.user.id,
      role:      req.user.role,
      action:    `fraud_indicator_${action}d`,
      entity:    'indicators',
      entityId:  indicatorId,
      metadata:  { observation },
      ipAddress: req.ip,
    });

    return res.json({ ...updated, audit_action: action, observation });
  } catch (err) {
    next(err);
  }
}

// ── RF11 Índice de Confiabilidad ─────────────────────────

/**
 * Calcula el índice de confiabilidad (0-100) de un proyecto.
 *
 * Componentes:
 *   - Sin registros sospechosos     : 40 pts
 *   - Frecuencia de registros       : 30 pts (registros en últimos 30 días)
 *   - Consistencia de datos         : 30 pts (baja desviación estándar)
 */
async function computeReliabilityIndex(projectId) {
  let score = 0;

  // Componente 1: registros sospechosos (40 pts)
  const { rows: [totals] } = await query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN is_suspicious THEN 1 ELSE 0 END) AS suspicious
     FROM indicators WHERE project_id = $1`,
    [projectId]
  );
  const total     = parseInt(totals.total) || 0;
  const susp      = parseInt(totals.suspicious) || 0;
  const suspRatio = total > 0 ? susp / total : 0;
  score += Math.max(0, 40 - suspRatio * 40);

  // Componente 2: frecuencia de registros en últimos 30 días (30 pts)
  const { rows: [recent] } = await query(
    `SELECT COUNT(*) AS cnt FROM indicators
     WHERE project_id = $1 AND recorded_at >= NOW() - INTERVAL '30 days'`,
    [projectId]
  );
  const recentCnt = parseInt(recent.cnt) || 0;
  score += Math.min(30, recentCnt * 2); // 2 pts por registro, máx 30

  // Componente 3: consistencia (30 pts) — baja desviación en IVI
  const { rows: iviRows } = await query(
    `SELECT ivi FROM indicators
     WHERE project_id = $1 AND ivi IS NOT NULL
     ORDER BY recorded_at DESC LIMIT 20`,
    [projectId]
  );
  if (iviRows.length >= 3) {
    const vals = iviRows.map((r) => parseFloat(r.ivi));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std  = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length);
    // Menor desviación → mayor puntaje
    score += Math.max(0, 30 - std);
  } else if (total > 0) {
    score += 15; // puntaje neutro si hay datos pero pocos
  }

  return Math.min(100, Math.round(score));
}

/**
 * GET /api/projects/:projectId/reliability
 * RF11: Índice de confiabilidad — solo visible para auditor.
 */
async function getReliability(req, res, next) {
  try {
    const { projectId } = req.params;

    const { rows: [project] } = await query(
      'SELECT id, name FROM projects WHERE id = $1',
      [projectId]
    );
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const index = await computeReliabilityIndex(projectId);

    await logAction({
      userId:    req.user.id,
      role:      req.user.role,
      action:    'reliability_index_consulted',
      entity:    'projects',
      entityId:  projectId,
      metadata:  { index },
      ipAddress: req.ip,
    });

    return res.json({
      project_id:   projectId,
      project_name: project.name,
      index,
      level: index >= 80 ? 'alto' : index >= 60 ? 'medio' : 'bajo',
      alert: index < 60,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fraud/reliability/all
 * Índice de todos los proyectos (auditor, para priorizar revisiones).
 */
async function getAllReliability(req, res, next) {
  try {
    const { rows: projects } = await query(
      'SELECT id, name FROM projects ORDER BY created_at DESC'
    );

    const results = await Promise.all(
      projects.map(async (p) => {
        const index = await computeReliabilityIndex(p.id);
        return {
          project_id:   p.id,
          project_name: p.name,
          index,
          level: index >= 80 ? 'alto' : index >= 60 ? 'medio' : 'bajo',
          alert: index < 60,
        };
      })
    );

    // Ordenar por índice ascendente (más riesgo primero)
    results.sort((a, b) => a.index - b.index);

    return res.json(results);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  analyzeLatest,
  listSuspicious,
  listAllSuspicious,
  validateSuspicious,
  getReliability,
  getAllReliability,
  detectAnomalies,
  computeReliabilityIndex,
};
