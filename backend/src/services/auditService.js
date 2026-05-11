// backend/src/services/auditService.js
// RNF05 — Logs inmutables de auditoría

const { query } = require('../config/db');

/**
 * Registra una acción en el log de auditoría.
 * Los logs son INSERT-only (inmutables).
 */
async function logAction({ userId, role, action, entity, entityId, metadata, ipAddress }) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, role, action, entity, entity_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId   || null,
        role     || null,
        action,
        entity   || null,
        entityId || null,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress || null,
      ]
    );
  } catch (err) {
    // El log nunca debe romper el flujo principal
    console.error('[AuditLog] Error al registrar acción:', err.message);
  }
}

/**
 * Registra un cambio de entidad en change_log (RF09).
 */
async function logChange({ projectId, userId, entity, action, oldValues, newValues, ipAddress }) {
  try {
    await query(
      `INSERT INTO change_log (project_id, user_id, entity, action, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        projectId  || null,
        userId     || null,
        entity,
        action,
        oldValues  ? JSON.stringify(oldValues)  : null,
        newValues  ? JSON.stringify(newValues)  : null,
        ipAddress  || null,
      ]
    );
  } catch (err) {
    console.error('[ChangeLog] Error al registrar cambio:', err.message);
  }
}

/**
 * Consulta el log de auditoría con filtros opcionales (solo auditor).
 */
async function getAuditLogs({ userId, role, action, from, to, limit = 100, offset = 0 }) {
  const conditions = [];
  const params = [];
  let i = 1;

  if (userId) { conditions.push(`user_id = $${i++}`); params.push(userId); }
  if (role)   { conditions.push(`role = $${i++}`);    params.push(role); }
  if (action) { conditions.push(`action ILIKE $${i++}`); params.push(`%${action}%`); }
  if (from)   { conditions.push(`created_at >= $${i++}`); params.push(from); }
  if (to)     { conditions.push(`created_at <= $${i++}`); params.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT al.*, u.email, u.full_name
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return rows;
}

module.exports = { logAction, logChange, getAuditLogs };
