// backend/src/app.js
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../.env' });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('./db');

const app = express();

// =========================
// 🌍 بيئة التشغيل والإعدادات العامة
// =========================
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

if (isProduction) {
  app.set('trust proxy', 1);
}

// =========================
// 🔒 أمان التطبيق (Production Only)
// =========================
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://*.vercel.app', 'http://localhost:*'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
}

// =========================
// 🛡️ تحديد معدل الطلبات
// =========================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isProduction,
  validate: { xForwardedForHeader: false, ip: false }
});
app.use('/api', limiter);

// =========================
// 🔒 CORS Configuration
// =========================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL || 'https://nasab-tree.vercel.app',
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const regex = new RegExp(allowed.replace(/\*/g, '.*'));
      return regex.test(origin);
    }
    return allowed === origin;
  });
};

const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.error('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  maxAge: 86400
};

if (!isProduction) {
  corsOptions.origin = true;
}

app.use(cors(corsOptions));

// =========================
// 📋 Middlewares الأساسية
// =========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (!isProduction) {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// =========================
// 📁 ملفات الـ Uploads
// =========================
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filepath) => {
    if (/\.(js|php|exe|sh)$/i.test(filepath)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// =========================
// 🛣️ Routes
// =========================
const loadRoute = (path, name) => {
  try {
    console.log(`📦 Loading ${name} routes...`);
    const route = require(path);
    app.use(`/api/${name}`, route);
    console.log(`✅ ${name} routes loaded successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to load ${name} routes:`, err.message);
    if (isProduction) return false;
    throw err;
  }
};

loadRoute('./routes/auth', 'auth');
loadRoute('./routes/tree', 'tree');
loadRoute('./routes/requests', 'requests');
loadRoute('./routes/notifications', 'notifications');
loadRoute('./routes/backup', 'backup');
loadRoute('./routes/users', 'users');
loadRoute('./routes/sessions', 'sessions');

// =========================
// 🏥 Health Check (معدل لـ PostgreSQL)
// =========================
app.get('/api/health', async (req, res) => {
  try {
    // ✅ استعلام متوافق مع PostgreSQL
    const dbResult = await pool.query('SELECT current_database() as db, version() as version');
    const dbRows = dbResult.rows;
    
    const poolStats = pool.totalCount ? {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    } : {};

    res.json({ 
      status: 'ok', 
      environment: process.env.NODE_ENV || 'development',
      database: {
        name: dbRows[0].db,
        version: dbRows[0].version,
        pool: poolStats
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('💥 Health check failed:', err);
    res.status(503).json({ 
      status: 'error', 
      error: 'Database connection failed', 
      details: isProduction ? 'Service unavailable' : err.message 
    });
  }
});

// =========================
// ❌ 404 Handler
// =========================
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found', 
    path: req.originalUrl
  });
});

// =========================
// 🌍 Global Error Handler
// =========================
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  console.error('💥 Unhandled error:', {
    message: err.message,
    path: req.path
  });

  res.status(500).json({ 
    error: 'Internal server error', 
    message: isProduction ? 'Something went wrong' : err.message
  });
});

// =========================
// 🚀 Start Server
// =========================
let server;

const startServer = () => {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
  });
};

// =========================
// 🔄 إغلاق آمن
// =========================
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('🔌 HTTP server closed');
      try {
        await pool.end();
        console.log('🗄️ Database pool closed');
      } catch (err) {
        console.error('❌ Error closing database pool:', err);
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

module.exports = app;