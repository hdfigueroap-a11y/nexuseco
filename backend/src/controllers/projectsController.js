// backend/src/controllers/projectsController.js
// RF02 — Gestión de Proyectos
// RF03 — Definición Geográfica

const { query }    = require('../config/db');
const { logAction, logChange } = require('../services/auditService');

// ── RF02 ────────────────────────────────────────────────

/**
 * POST /api/projects
 * RF02 Escenario 1: Creación exitosa de un proyecto
 */
async function create(req, res, next) {
  try {
    const { name, description, tree_goal, start_date, end_date } = req.body;
    const ownerId = req.user.id;

    const { rows: [project] } = await query(
      `INSERT INTO projects (name, description, tree_goal, start_date, end_date, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, tree_goal || 0, start_date || null, end_date || null, ownerId]
    );

    // Inicializar caché de métricas
    await query(
      `INSERT INTO project_metrics (project_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [project.id]
    );

    await logChange({
      projectId: project.id,
      userId:    ownerId,
      entity:    'projects',
      action:    'create',
      newValues: project,
      ipAddress: req.ip,
    });
    await logAction({
      userId:    ownerId,
      role:      req.user.role,
      action:    'project_created',
      entity:    'projects',
      entityId:  project.id,
      ipAddress: req.ip,
    });

    return res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects
 * Lista proyectos según el rol:
 *   - operador → sus propios proyectos
 *   - empresa  → proyectos donde es financiadora
 *   - auditor  → todos los proyectos
 */
async function list(req, res, next) {
  try {
    const { id: userId, role } = req.user;
    let rows;

    if (role === 'operador') {
      ({ rows } = await query(
        `SELECT p.*, pm.current_ivi, pm.compliance_pct
         FROM projects p
         LEFT JOIN project_metrics pm ON pm.project_id = p.id
         WHERE p.owner_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
      ));
    } else if (role === 'empresa') {
      ({ rows } = await query(
        `SELECT p.*, pm.current_ivi, pm.compliance_pct
         FROM projects p
         LEFT JOIN project_metrics pm ON pm.project_id = p.id
         WHERE p.company_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
      ));
    } else {
      // auditor
      ({ rows } = await query(
        `SELECT p.*, pm.current_ivi, pm.compliance_pct,
                u.full_name AS owner_name, u.email AS owner_email
         FROM projects p
         LEFT JOIN project_metrics pm ON pm.project_id = p.id
         LEFT JOIN users u ON u.id = p.owner_id
         ORDER BY p.created_at DESC`
      ));
    }

    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id
 * RF02: cualquier rol puede ver el detalle si tiene acceso al proyecto.
 */
async function getOne(req, res, next) {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const { rows: [project] } = await query(
      `SELECT p.*, pm.current_ivi, pm.compliance_pct,
              geo.north, geo.south, geo.east, geo.west, geo.area_km2
       FROM projects p
       LEFT JOIN project_metrics pm ON pm.project_id = p.id
       LEFT JOIN project_geo geo ON geo.project_id = p.id
       WHERE p.id = $1`,
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    // Validar acceso según rol (RF02 Escenario 3 / RNF11)
    if (role === 'operador' && project.owner_id !== userId) {
      return res.status(403).json({ error: 'Acceso denegado a este proyecto.' });
    }
    if (role === 'empresa' && project.company_id !== userId) {
      return res.status(403).json({ error: 'Acceso denegado a este proyecto.' });
    }

    return res.json(project);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/projects/:id
 * RF02 Escenario 2: Edición de un proyecto existente
 * RF02 Escenario 3: Bloquear edición por usuario no autorizado
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { rows: [existing] } = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    if (!existing) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    // Solo el operador creador puede editar (RF02 Escenario 3)
    if (existing.owner_id !== userId) {
      return res.status(403).json({ error: 'Acceso denegado. Solo el operador creador puede editar este proyecto.' });
    }

    const { name, description, tree_goal, start_date, end_date, status } = req.body;

    const { rows: [updated] } = await query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           tree_goal = COALESCE($3, tree_goal),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, tree_goal, start_date, end_date, status, id]
    );

    await logChange({
      projectId: id,
      userId,
      entity:    'projects',
      action:    'update',
      oldValues: existing,
      newValues: updated,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ── RF03 Definición Geográfica ───────────────────────────

/**
 * Fórmula aproximada de área rectangular en km²
 * dada la diferencia de grados lat/lon.
 */
function calculateAreaKm2(north, south, east, west) {
  const KM_PER_DEGREE_LAT = 111.32;
  const avgLat = ((parseFloat(north) + parseFloat(south)) / 2) * (Math.PI / 180);
  const kmLat  = Math.abs(parseFloat(north) - parseFloat(south)) * KM_PER_DEGREE_LAT;
  const kmLon  = Math.abs(parseFloat(east)  - parseFloat(west))  * KM_PER_DEGREE_LAT * Math.cos(avgLat);
  return Math.round(kmLat * kmLon * 10000) / 10000;
}

/**
 * PUT /api/projects/:id/geo
 * RF03 Escenario 1: Definición geográfica con coordenadas válidas
 */
async function setGeo(req, res, next) {
  try {
    const { id } = req.params;
    const { north, south, east, west } = req.body;
    const userId = req.user.id;

    const { rows: [project] } = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (project.owner_id !== userId) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const area_km2 = calculateAreaKm2(north, south, east, west);

    const { rows: [geo] } = await query(
      `INSERT INTO project_geo (project_id, north, south, east, west, area_km2)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (project_id)
       DO UPDATE SET north = $2, south = $3, east = $4, west = $5, area_km2 = $6, updated_at = NOW()
       RETURNING *`,
      [id, north, south, east, west, area_km2]
    );

    await logChange({
      projectId: id,
      userId,
      entity:    'project_geo',
      action:    'upsert',
      newValues: geo,
      ipAddress: req.ip,
    });

    return res.json({ ...geo, area_km2 });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/geo
 */
async function getGeo(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: [geo] } = await query(
      'SELECT * FROM project_geo WHERE project_id = $1',
      [id]
    );
    if (!geo) return res.status(404).json({ error: 'Área geográfica no definida.' });
    return res.json(geo);
  } catch (err) {
    next(err);
  }
}


// ── RF02 Explorar y financiar proyectos ─────────────────

async function listAvailable(req, res, next) {
  try {
    const companyId = req.user.id;
    const { rows } = await query(
      `SELECT p.*, pm.current_ivi, pm.compliance_pct,
              u.full_name AS owner_name,
              pg.area_km2
       FROM projects p
       LEFT JOIN project_metrics pm ON pm.project_id = p.id
       LEFT JOIN users u ON u.id = p.owner_id
       LEFT JOIN project_geo pg ON pg.project_id = p.id
       WHERE p.status = 'activo'
         AND (p.company_id IS NULL OR p.company_id != $1)
       ORDER BY p.created_at DESC`,
      [companyId]
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function invest(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = req.user.id;

    const { rows: [project] } = await query(
      'SELECT * FROM projects WHERE id = $1', [id]
    );
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (project.company_id === companyId) {
      return res.status(409).json({ error: 'Ya estás invirtiendo en este proyecto.' });
    }

    const { rows: [updated] } = await query(
      `UPDATE projects SET company_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [companyId, id]
    );

    await logChange({
      projectId: id,
      userId: companyId,
      entity: 'projects',
      action: 'invest',
      oldValues: { company_id: project.company_id },
      newValues: { company_id: companyId },
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, setGeo, getGeo, listAvailable, invest };
