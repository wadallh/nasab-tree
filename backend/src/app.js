require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? './.env' : '../.env'
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('./db');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// =========================
// Proxy (Render / Vercel)
// =========================
if (isProduction) {
  app.set('trust proxy', 1);
}

// =========================
// Security
// =========================
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// =========================
// Rate Limit
// =========================
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 120 : 1000,
    skip: () => !isProduction
  })
);

// =========================
// CORS
// =========================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://nasab-tree.vercel.app',
  'https://nasab-tree-1.onrender.com',
  'https://*.netlify.app'
];

const checkOrigin = (origin) => {
  if (!origin) return true;

  return allowedOrigins.some(o => {
    if (o.includes('*')) {
      const regex = new RegExp('^' + o.replace(/\*/g, '.*') + '$');
      return regex.test(origin);
    }
    return o === origin;
  });
};

const corsOptions = {
  origin: checkOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// =========================
// Body Parser
// =========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =========================
// Static Files
// =========================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =========================
// Root
// =========================
app.get('/', (req, res) => {
  res.json({
    message: 'NASAB API Running 🚀',
    status: 'OK',
    env: process.env.NODE_ENV || 'development'
  });
});

// =========================
// Route Loader (Fixed & safer)
// =========================
function loadRoute(file, name) {
  try {
    const route = require(file);

    if (!route) {
      console.log(`❌ ${name} empty export`);
      return;
    }

    app.use(`/api/${name}`, route);
    console.log(`✅ ${name} loaded`);

  } catch (e) {
    console.log(`❌ ${name} failed:`, e.message);
  }
}

// =========================
// Routes (🔥 FIXED HERE)
// =========================
loadRoute('./routes/auth', 'auth');
loadRoute('./routes/tree', 'tree');
loadRoute('./routes/requests', 'requests'); // ✅ FIXED
loadRoute('./routes/notifications', 'notifications');
loadRoute('./routes/backup', 'backup');
loadRoute('./routes/users', 'users');
loadRoute('./routes/sessions', 'sessions');

// =========================
// Health Check
// =========================
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() as db');

    res.json({
      status: 'ok',
      db: rows[0].db,
      time: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// =========================
// 404
// =========================
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API Not Found' });
});

// =========================
// Error Handler
// =========================
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(500).json({ error: 'Server Error' });
});

// =========================
// Start Server
// =========================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Env: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;