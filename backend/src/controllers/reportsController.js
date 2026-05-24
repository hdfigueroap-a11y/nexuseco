// backend/src/controllers/reportsController.js
// RF12 — Generación de Reporte PDF
// RF13 — Firma Digital

const crypto  = require('crypto');
const { query } = require('../config/db');
const { logAction, logChange } = require('../services/auditService');
const { computeReliabilityIndex } = require('./fraudController');

// ── RF12 Generación de Reporte ───────────────────────────

/**
 * Genera el contenido del reporte como JSON estructurado.
 * El PDF real se genera en el frontend con este JSON.
 */
async function buildReportData(projectId, from, to) {
  // Proyecto
  const { rows: [project] } = await query(
    `SELECT p.*, u.full_name AS owner_name,
            c.full_name AS company_name,
            geo.area_km2, geo.north, geo.south, geo.east, geo.west
     FROM projects p
     LEFT JOIN users u   ON u.id = p.owner_id
     LEFT JOIN users c   ON c.id = p.company_id
     LEFT JOIN project_geo geo ON geo.project_id = p.id
     WHERE p.id = $1`,
    [projectId]
  );
  if (!project) throw new Error('Proyecto no encontrado.');

  // Métricas actuales
  const { rows: [metrics] } = await query(
    'SELECT * FROM project_metrics WHERE project_id = $1',
    [projectId]
  );

  // Indicadores en el período
  const indicatorParams = [projectId];
  let dateFilter = '';
  if (from) { indicatorParams.push(from); dateFilter += ` AND recorded_at >= $${indicatorParams.length}`; }
  if (to)   { indicatorParams.push(to);   dateFilter += ` AND recorded_at <= $${indicatorParams.length}`; }

  const { rows: indicators } = await query(
    `SELECT ind.*, u.full_name AS recorded_by
     FROM indicators ind
     LEFT JOIN users u ON u.id = ind.user_id
     WHERE ind.project_id = $1 ${dateFilter}
     ORDER BY ind.recorded_at DESC`,
    indicatorParams
  );

  // Alertas generadas
  const { rows: alerts } = await query(
    `SELECT * FROM alerts WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId]
  );

  // Evidencias
  const { rows: evidence } = await query(
    `SELECT e.*, u.full_name AS uploaded_by
     FROM evidence e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.project_id = $1 ORDER BY e.uploaded_at DESC`,
    [projectId]
  );

  // Índice de confiabilidad
  const reliabilityIndex = await computeReliabilityIndex(projectId);

  return {
    project,
    metrics:          metrics || { current_ivi: 0, compliance_pct: 0 },
    indicators,
    alerts,
    evidence,
    reliability_index: reliabilityIndex,
    period:           { from, to },
    generated_at:     new Date().toISOString(),
  };
}

/**
 * POST /api/projects/:projectId/reports
 * RF12 Esc 1: Genera y guarda el reporte.
 */
async function generateReport(req, res, next) {
  try {
    const { projectId } = req.params;
    const { from, to }  = req.body;

    const reportData = await buildReportData(projectId, from, to);

    // Generar hash para integridad (RF12 Esc 3)
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(reportData))
      .digest('hex');

    // Guardar reporte en BD
    const { rows: [report] } = await query(
      `INSERT INTO reports
         (project_id, generated_by, period_from, period_to, data, hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
       RETURNING *`,
      [
        projectId,
        req.user.id,
        from || null,
        to   || null,
        JSON.stringify(reportData),
        hash,
      ]
    );

    await logAction({
      userId:    req.user.id,
      role:      req.user.role,
      action:    'report_generated',
      entity:    'reports',
      entityId:  report.id,
      metadata:  { projectId, hash },
      ipAddress: req.ip,
    });

    return res.status(201).json({ ...report, report_data: reportData });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:projectId/reports
 * Lista reportes de un proyecto.
 */
async function listReports(req, res, next) {
  try {
    const { projectId } = req.params;
    const { rows } = await query(
      `SELECT r.id, r.project_id, r.period_from, r.period_to,
              r.hash, r.status, r.signed_by, r.signed_at,
              r.created_at, u.full_name AS generated_by_name
       FROM reports r
       LEFT JOIN users u ON u.id = r.generated_by
       WHERE r.project_id = $1
       ORDER BY r.created_at DESC`,
      [projectId]
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/:reportId
 * Obtiene un reporte completo con sus datos para renderizar el PDF.
 */
async function getReport(req, res, next) {
  try {
    const { reportId } = req.params;
    const { rows: [report] } = await query(
      `SELECT r.*, u.full_name AS generated_by_name,
              s.full_name AS signed_by_name
       FROM reports r
       LEFT JOIN users u ON u.id = r.generated_by
       LEFT JOIN users s ON s.id = r.signed_by
       WHERE r.id = $1`,
      [reportId]
    );
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado.' });

    // Registrar descarga (RF12 Esc 2)
    await logAction({
      userId:    req.user.id,
      role:      req.user.role,
      action:    'report_downloaded',
      entity:    'reports',
      entityId:  reportId,
      ipAddress: req.ip,
    });

    return res.json({
      ...report,
      report_data: typeof report.data === 'string'
        ? JSON.parse(report.data)
        : report.data,
    });
  } catch (err) {
    next(err);
  }
}

// ── RF13 Firma Digital ───────────────────────────────────

/**
 * POST /api/reports/:reportId/sign
 * RF13 Esc 1: Firma digital exitosa — solo auditor.
 */
async function signReport(req, res, next) {
  try {
    const { reportId } = req.params;
    const auditorId    = req.user.id;

    const { rows: [report] } = await query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado.' });
    if (report.status === 'firmado') {
      return res.status(409).json({ error: 'El reporte ya está firmado.' });
    }

    // Generar firma digital: hash del contenido + auditor + timestamp
    const signaturePayload = JSON.stringify({
      report_id:   reportId,
      hash:        report.hash,
      auditor_id:  auditorId,
      signed_at:   new Date().toISOString(),
    });
    const signature = crypto
      .createHash('sha256')
      .update(signaturePayload)
      .digest('hex');

    const { rows: [signed] } = await query(
      `UPDATE reports
       SET status = 'firmado',
           signed_by = $1,
           signed_at = NOW(),
           signature = $2
       WHERE id = $3
       RETURNING *`,
      [auditorId, signature, reportId]
    );

    await logChange({
      projectId: report.project_id,
      userId:    auditorId,
      entity:    'reports',
      action:    'sign',
      oldValues: { status: report.status },
      newValues: { status: 'firmado', signature },
      ipAddress: req.ip,
    });

    return res.json(signed);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reports/:reportId/reject
 * RF13 Esc 2: Auditor rechaza el reporte con observaciones.
 */
async function rejectReport(req, res, next) {
  try {
    const { reportId }    = req.params;
    const { observation } = req.body;

    if (!observation) {
      return res.status(422).json({ error: 'Se requiere una observación para rechazar el reporte.' });
    }

    const { rows: [report] } = await query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado.' });
    if (report.status === 'firmado') {
      return res.status(409).json({ error: 'No se puede rechazar un reporte ya firmado.' });
    }

    const { rows: [rejected] } = await query(
      `UPDATE reports
       SET status = 'rechazado', observation = $1
       WHERE id = $2 RETURNING *`,
      [observation, reportId]
    );

    await logChange({
      projectId: report.project_id,
      userId:    req.user.id,
      entity:    'reports',
      action:    'reject',
      oldValues: { status: report.status },
      newValues: { status: 'rechazado', observation },
      ipAddress: req.ip,
    });

    return res.json(rejected);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateReport,
  listReports,
  getReport,
  signReport,
  rejectReport,
};
