// backend/src/services/alertService.js
// RF07 — Sistema de Alertas Automáticas

const { query } = require('../config/db');

/**
 * Crea una alerta si no existe ya una activa del mismo tipo para el proyecto.
 * Evita duplicados de alertas activas.
 */
async function createAlert({ projectId, type, message }) {
  const { rows } = await query(
    `SELECT id FROM alerts
     WHERE project_id = $1 AND type = $2 AND status = 'activa'`,
    [projectId, type]
  );
  if (rows.length > 0) return null; // ya existe alerta activa de este tipo

  const { rows: [alert] } = await query(
    `INSERT INTO alerts (project_id, type, message)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [projectId, type, message]
  );
  return alert;
}

/**
 * Lista alertas de un proyecto con filtros opcionales.
 */
async function getAlertsByProject(projectId, status = null) {
  const params = [projectId];
  let statusFilter = '';
  if (status) {
    statusFilter = 'AND status = $2';
    params.push(status);
  }
  const { rows } = await query(
    `SELECT * FROM alerts
     WHERE project_id = $1 ${statusFilter}
     ORDER BY created_at DESC`,
    params
  );
  return rows;
}

/**
 * Lista todas las alertas activas de los proyectos de un usuario.
 */
async function getAlertsByUser(userId, role) {
  let sql;
  if (role === 'operador') {
    sql = `SELECT a.*, p.name AS project_name
           FROM alerts a
           JOIN projects p ON p.id = a.project_id
           WHERE p.owner_id = $1
           ORDER BY a.created_at DESC`;
  } else if (role === 'empresa') {
    sql = `SELECT a.*, p.name AS project_name
           FROM alerts a
           JOIN projects p ON p.id = a.project_id
           WHERE p.company_id = $1
           ORDER BY a.created_at DESC`;
  } else {
    // auditor ve todas
    sql = `SELECT a.*, p.name AS project_name
           FROM alerts a
           JOIN projects p ON p.id = a.project_id
           ORDER BY a.created_at DESC`;
  }
  const { rows } = await query(sql, role === 'auditor' ? [] : [userId]);
  return rows;
}

/**
 * Marca una alerta como revisada (RF07, Escenario 4).
 */
async function markAsReviewed(alertId, userId) {
  const { rows: [alert] } = await query(
    `UPDATE alerts
     SET status = 'revisada', reviewed_by = $2, reviewed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [alertId, userId]
  );
  return alert;
}

/**
 * Genera alerta de inactividad: si no hay indicadores en N días (RF07).
 * Llamar desde un cron job o verificar al cargar el proyecto.
 */
async function checkInactivity(projectId, inactivityDays = 7) {
  const { rows: [last] } = await query(
    `SELECT recorded_at FROM indicators
     WHERE project_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [projectId]
  );

  const now = new Date();
  const lastDate = last ? new Date(last.recorded_at) : null;
  const daysDiff = lastDate
    ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
    : inactivityDays + 1;

  if (daysDiff >= inactivityDays) {
    await createAlert({
      projectId,
      type: 'inactividad',
      message: `Sin registros de indicadores hace ${daysDiff} días (umbral: ${inactivityDays} días)`,
    });
  }
}

module.exports = { createAlert, getAlertsByProject, getAlertsByUser, markAsReviewed, checkInactivity };
