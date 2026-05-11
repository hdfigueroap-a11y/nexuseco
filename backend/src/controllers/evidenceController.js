// backend/src/controllers/evidenceController.js
// RF08 — Gestión de Evidencias Fotográficas

const path   = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { logChange, logAction } = require('../services/auditService');

// Formatos permitidos (RF08 Escenario 2)
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = process.env.UPLOAD_DIR || 'uploads';
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato no permitido. Formatos aceptados: ${ALLOWED_MIME.join(', ')}`));
    }
  },
});

/**
 * POST /api/projects/:projectId/evidence
 * RF08 Escenario 1: Carga exitosa de fotografía
 */
async function uploadEvidence(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const { rows: [project] } = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const fileUrl = `/uploads/${req.file.filename}`;

    const { rows: [ev] } = await query(
      `INSERT INTO evidence (project_id, user_id, filename, original_name, mimetype, size_bytes, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        projectId,
        userId,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        fileUrl,
      ]
    );

    await logChange({
      projectId,
      userId,
      entity:    'evidence',
      action:    'create',
      newValues: ev,
      ipAddress: req.ip,
    });
    await logAction({
      userId,
      role:      req.user.role,
      action:    'evidence_uploaded',
      entity:    'evidence',
      entityId:  ev.id,
      ipAddress: req.ip,
    });

    return res.status(201).json(ev);
  } catch (err) {
    // Multer file filter error
    if (err.message && err.message.includes('Formato no permitido')) {
      return res.status(422).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * GET /api/projects/:projectId/evidence
 * RF08: Lista evidencias del proyecto (empresa y auditor también pueden verlas).
 */
async function listEvidence(req, res, next) {
  try {
    const { projectId } = req.params;
    const { from, to } = req.query;

    const conditions = ['e.project_id = $1'];
    const params = [projectId];
    let i = 2;
    if (from) { conditions.push(`e.uploaded_at >= $${i++}`); params.push(from); }
    if (to)   { conditions.push(`e.uploaded_at <= $${i++}`); params.push(to); }

    const { rows } = await query(
      `SELECT e.*, u.full_name AS uploaded_by
       FROM evidence e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.uploaded_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadEvidence, listEvidence };
