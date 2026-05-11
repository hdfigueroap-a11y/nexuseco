// backend/src/index.js
// Punto de entrada del servidor Nexus Eco

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');

const routes                     = require('./routes');
const { errorHandler, requestLogger } = require('./middleware/errorHandler');
const logger                     = require('./utils/logger');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Crear directorio de uploads si no existe ─────────────
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Seguridad (RNF02 — HTTPS se configura en Railway/proxy) ─
app.set('trust proxy', 1); // necesario detrás de Railway/Nginx

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite servir imágenes al frontend
}));

// ── CORS ─────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.railway.app')
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS bloqueado para origen: ${origin}`));
  },
  credentials: true,
}));

// ── Rate limiting (protección básica contra abuso) ───────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
}));

app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
}));

// ── Body parsers ─────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Servir uploads estáticos (evidencias) ────────────────
app.use('/uploads', express.static(path.resolve(uploadDir)));

// ── Logger de peticiones ─────────────────────────────────
app.use(requestLogger);

// ── Rutas API ─────────────────────────────────────────────
app.use('/api', routes);

// ── 404 handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ── Error handler global ─────────────────────────────────
app.use(errorHandler);

// ── Iniciar servidor ──────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🌿 Nexus Eco Backend corriendo en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
