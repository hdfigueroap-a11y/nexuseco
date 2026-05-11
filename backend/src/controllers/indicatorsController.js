// backend/src/controllers/indicatorsController.js
// RF04 — Registro de Indicadores (append-only, inmutables)
// RF05 — Cálculo IVI (llamado automáticamente al guardar)
// RF06 — Nivel de Cumplimiento (calculado automáticamente)

const { query }    = require('../config/db');
const { logChange, logAction } = require('../services/auditService');
const iviService   = require('../services/iviService');

// Rangos razonables para advertencia (RF04 Escenario 2)
const RANGES = {
  temperature:    { min: -10, max: 55 },
  humidity:       { min: 0,   max: 100 },
  trees_planted:  { min: 0,   max: 100_000 },
  trees_survived: { min: 0,   max: 100_000 },
};

function outOfRange(field, value) {
  if (value === null || value === undefined) return false;
  const r = RANGES[field];
  return r && (value < r.min || value > r.max);
}

/**
 * POST /api/projects/:projectId/indicators
 * RF04 Escenario 1: Registro exitoso
 * RF04 Escenario 2: Advertencia por valor fuera de rango
 * Dispara cálculo de IVI y cumplimiento (RF05/RF06) automáticamente.
 */
async function create(req, res, next) {
  try {
    const { projectId } = req.params;
    const { temperature, humidity, trees_planted, trees_survived, force_save } = req.body;
    const userId = req.user.id;

    // Verificar que el proyecto existe y que el operador tiene acceso
    const { rows: [project] } = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    if (req.user.role === 'operador' && project.owner_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para registrar indicadores en este proyecto.' });
    }

    // Detectar valores fuera de rango (RF04 Escenario 2)
    const warnings = [];
    for (const [field, value] of Object.entries({ temperature, humidity, trees_planted, trees_survived })) {
      if (outOfRange(field, value)) {
        warnings.push(`El valor de "${field}" (${value}) parece estar fuera del rango razonable.`);
      }
    }

    // Si hay advertencias y no se confirmó el guardado, pedir confirmación
    if (warnings.length > 0 && !force_save) {
      return res.status(200).json({
        requires_confirmation: true,
        warnings,
        message: 'Se detectaron valores fuera de rango. Envía force_save: true para confirmar.',
      });
    }

    // Verificar unicidad por día (RNF06)
    const { rows: dup } = await query(
      `SELECT id FROM indicators
       WHERE project_id = $1 AND user_id = $2 AND DATE(recorded_at) = CURRENT_DATE`,
      [projectId, userId]
    );
    if (dup.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un registro de indicadores para hoy en este proyecto. Cada operador solo puede registrar una vez por día.',
      });
    }

    // Insertar indicador (append-only, sin UPDATE posterior)
    const { rows: [indicator] } = await query(
      `INSERT INTO indicators
         (project_id, user_id, temperature, humidity, trees_planted, trees_survived)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [projectId, userId, temperature ?? null, humidity ?? null,
       trees_planted ?? 0, trees_survived ?? 0]
    );

    // ── Calcular IVI + cumplimiento + generar alertas (RF05/RF06/RF07)
    const { ivi, compliance } = await iviService.processIndicator(indicator);

    await logChange({
      projectId,
      userId,
      entity:    'indicators',
      action:    'create',
      newValues: { ...indicator, ivi, compliance },
      ipAddress: req.ip,
    });
    await logAction({
      userId,
      role:      req.user.role,
      action:    'indicator_created',
      entity:    'indicators',
      entityId:  indicator.id,
      metadata:  { ivi, compliance },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      ...indicator,
      ivi,
      compliance_pct: compliance,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:projectId/indicators
 * Historial de indicadores con IVI calculado.
 */
async function list(req, res, next) {
  try {
    const { projectId } = req.params;
    const { from, to, limit = 50, offset = 0 } = req.query;

    const conditions = ['project_id = $1'];
    const params = [projectId];
    let i = 2;

    if (from) { conditions.push(`recorded_at >= $${i++}`); params.push(from); }
    if (to)   { conditions.push(`recorded_at <= $${i++}`); params.push(to); }

    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(
      `SELECT ind.*, u.full_name AS recorded_by
       FROM indicators ind
       LEFT JOIN users u ON u.id = ind.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ind.recorded_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      params
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:projectId/indicators/latest
 * Último indicador registrado con métricas calculadas.
 */
async function getLatest(req, res, next) {
  try {
    const { projectId } = req.params;
    const { rows: [indicator] } = await query(
      `SELECT ind.*, u.full_name AS recorded_by
       FROM indicators ind
       LEFT JOIN users u ON u.id = ind.user_id
       WHERE project_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [projectId]
    );
    if (!indicator) return res.status(404).json({ error: 'Sin indicadores registrados.' });
    return res.json(indicator);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getLatest };
