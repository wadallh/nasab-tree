// backend/src/app.js
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? './.env' : '../.env' });

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

// الثقة في البروكسي العكسي (مهم لـ Vercel/Nginx)
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
        // ✅ أضفنا نطاق Netlify للسماح بالاتصال
        connectSrc: ["'self'", 'https://*.vercel.app', 'https://nasab-tree.onrender.com', 'https://*.netlify.app'],
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
// 🛡️ تحديد معدل الطلبات (مهم للإنتاج)
// =========================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: isProduction ? 100 : 1000, // عدد الطلبات المسموحة
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isProduction // تعطيل في التطوير
});
app.use('/api', limiter);

// =========================
// 🔒 CORS Configuration (محدّث للإنتاج والتطوير)
// =========================

// النطاقات المسموح بها في الإنتاج
const productionOrigins = [
  'https://yourdomain.com',
  'https://*.vercel.app',
  'https://nasab-tree.vercel.app',
  'https://nasab-tree.onrender.com',
  // ✅ أضفنا نطاق Netlify للسماح بالاتصال من الواجهة الجديدة
  'https://*.netlify.app',
  'https://dapper-gelato-5fca5b.netlify.app',
].filter(Boolean);

// دالة ذكية للتحقق من النطاقات
const isOriginAllowed = (origin) => {
  // ✅ السماح بالطلبات بدون origin (مثل التطبيقات المحمولة أو Postman)
  if (!origin) return true;
  
  // ✅ في التطوير: السماح بأي localhost بأي منفذ (5173, 5174, 5175, إلخ)
  if (!isProduction && /^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }
  
  // ✅ في الإنتاج: التحقق من القائمة المسموحة مع دعم wildcards
  return productionOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
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
      console.error('❌ CORS blocked:', origin, '| Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// =========================
// 📋 Middlewares الأساسية
// =========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// تسجيل الطلبات في التطوير فقط
if (!isProduction) {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// =========================
// 📁 ملفات الـ Uploads (مع حماية)
// =========================
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filepath) => {
    // منع تنفيذ ملفات سكربت في مجلد الـ uploads
    if (/\.(js|php|exe|sh)$/i.test(filepath)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// =========================
// 🛣️ Routes (مع معالجة الأخطاء)
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
    if (isProduction) {
      // في الإنتاج، لا نوقف السيرفر بسبب روت واحد
      return false;
    }
    throw err; // في التطوير، نوقف لمعرفة الخطأ فوراً
  }
};

// تحميل الروتات
loadRoute('./routes/auth', 'auth');
loadRoute('./routes/tree', 'tree');
loadRoute('./routes/requests', 'requests');
loadRoute('./routes/notifications', 'notifications');
loadRoute('./routes/backup', 'backup');
loadRoute('./routes/users', 'users');
loadRoute('./routes/sessions', 'sessions');

// =========================
// 🔍 Debug: عرض المسارات (تطوير فقط)
// =========================
if (!isProduction) {
  console.log('\n🗺️  Registered API Routes:');
  app._router.stack.forEach(r => {
    if (r.route && r.route.path) {
      const methods = Object.keys(r.route.methods).join('|').toUpperCase();
      console.log(`   ${methods} ${r.route.path}`);
    }
  });
  console.log('');
}

// =========================
// 🏥 Health Check (موسّع)
// =========================
app.get('/api/health', async (req, res) => {
  try {
    const [dbRows] = await pool.query('SELECT DATABASE() as db, VERSION() as version');
    const poolStats = pool._pool ? {
      active: pool._pool._allConnections.length - pool._pool._freeConnections.length,
      idle: pool._pool._freeConnections?.length || 0,
      waiting: pool._pool._connectionQueue?.length || 0
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
  console.warn(`⚠️  404 - Endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint not found', 
    path: req.originalUrl,
    method: req.method,
    hint: isProduction ? undefined : 'تأكد من أن المسار صحيح وأن الـ Route مسجل في app.js'
  });
});

// =========================
// 🌍 Global Error Handler (محسّن)
// =========================
app.use((err, req, res, next) => {
  // أخطاء CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  // أخطاء حجم الطلب
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request entity too large' });
  }

  // أخطاء تحليل JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  console.error('💥 Unhandled error:', {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({ 
    error: 'Internal server error', 
    message: isProduction ? 'Something went wrong' : err.message,
    requestId: req.id || Date.now().toString(36)
  });
});

// =========================
// 🚀 Start Server مع إغلاق آمن
// =========================
let server;

const startServer = () => {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || 'nasab_db'}`);
    if (!isProduction) {
      console.log(`🔒 CORS enabled for: localhost:* (dev) + ${productionOrigins.join(', ')}`);
    }
    console.log('');
  });

  // معالجة الأخطاء على مستوى السيرفر
  server.on('error', (err) => {
    console.error('💥 Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    }
  });
};

// =========================
// 🔄 إغلاق آمن للسيرفر والـ Pool
// =========================
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      console.log('🔌 HTTP server closed');
      try {
        await pool.end();
        console.log('🗄️  Database pool closed');
      } catch (err) {
        console.error('❌ Error closing database pool:', err);
      }
      process.exit(0);
    });

    // إغلاق قسري بعد 10 ثواني إذا لم يغلق بشكل طبيعي
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// بدء التشغيل
startServer();

module.exports = app;