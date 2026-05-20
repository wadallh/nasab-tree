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
// Security (خفيف ومستقر)
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
// CORS (🔥 التعديل الحاسم هنا)
// =========================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://nasab-tree.vercel.app',
  'https://nasab-tree-1.onrender.com',
  'https://*.netlify.app'
];

// ✅ دالة مساعدة للتحقق من الأصل
const checkOrigin = (origin) => {
  if (!origin) return true; // السماح للطلبات بدون origin (مثل Postman)
  
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

// ✅ تطبيق CORS
app.use(cors(corsOptions));

// ✅ معالجة صريحة لطلبات OPTIONS (Preflight) - هذا هو الحل!
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
// Root Test
// =========================
app.get('/', (req, res) => {
  res.json({
    message: 'NASAB API Running 🚀',
    status: 'OK',
    env: process.env.NODE_ENV || 'development'
  });
});

// =========================
// Safe Route Loader
// =========================
function loadRoute(file, name) {
  try {
    const route = require(file);
    if (!route || typeof route !== 'function' && !route.stack) {
      console.log(`❌ ${name} invalid export`);
      return;
    }
    app.use(`/api/${name}`, route);
    console.log(`✅ ${name} loaded`);
  } catch (e) {
    console.log(`❌ ${name} failed:`, e.message);
  }
}

// =========================
// Routes
// =========================
loadRoute('./routes/auth', 'auth');
loadRoute('./routes/tree', 'tree');
loadRoute('./requests', 'requests'); // ⚠️ تأكد من المسار: هل هو './routes/requests'؟
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
// 404 API
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
// Start Server (Render Safe)
// =========================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Env: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;