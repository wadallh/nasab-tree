require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const compression = require('compression');
const pool = require('./db');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// =========================
// ✅ التحقق من متغيرات البيئة الأساسية
// =========================
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (isProduction && missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// =========================
// ✅ إعدادات الوكيل (لـ Render / Vercel / Netlify)
// =========================
if (isProduction) {
  app.set('trust proxy', 1);
}

// =========================
// ✅ الأمان - Helmet (مع استثناءات للـ API)
// =========================
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    xPoweredBy: false
  })
);

// =========================
// ✅ ضغط الاستجابات (لزيادة الأداء في الإنتاج)
// =========================
if (isProduction) {
  app.use(compression());
}

// =========================
// ✅ تسجيل الطلبات - Morgan
// =========================
const logFormat = isProduction ? 'combined' : 'dev';
app.use(morgan(logFormat, {
  skip: (req) => !isProduction && req.path === '/api/health'
}));

// =========================
// ✅ تتبع معرف الطلب ووقت البدء (Request ID & Timing)
// =========================
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  req.startTime = Date.now();
  
  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// =========================
// ✅ تحديد المعدل - Rate Limit (محسّن)
// =========================
const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message },
  skip: () => !isProduction,
  keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down and try again later',
      retryAfter: Math.ceil((windowMs / 1000) / 60) + ' minutes',
      requestId: req.requestId
    });
  }
});

// ليمت عام للـ API
app.use('/api', createLimiter(15 * 60 * 1000, isProduction ? 120 : 1000, 'Too many requests'));

// ليمت أقوى لمسارات المصادقة
app.use('/api/auth', createLimiter(15 * 60 * 1000, isProduction ? 20 : 100, 'Too many authentication attempts'));

// =========================
// ✅ CORS - إعدادات مُحسّنة وموثوقة
// =========================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://nasab-tree.vercel.app',
  'https://nasab-tree-1.onrender.com'
];

const isDynamicOriginAllowed = (origin) => {
  if (!origin) return true;
  
  const dynamicPatterns = [
    /^https:\/\/.*\.netlify\.app$/,
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.onrender\.com$/
  ];
  
  return dynamicPatterns.some(pattern => pattern.test(origin));
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!isProduction) {
      return callback(null, true);
    }
    
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    if (isDynamicOriginAllowed(origin)) {
      return callback(null, true);
    }
    
    console.warn(`⚠️ CORS Blocked: ${origin}`);
    callback(new Error(`Origin "${origin}" not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Request-ID',
    'Accept'
  ],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count', 'X-Response-Time'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// =========================
// ✅ معالجة مسبقة لطلبات OPTIONS (Preflight)
// =========================
app.options('*', cors(corsOptions));

// =========================
// ✅ Body Parser (مع حدود للحجم)
// =========================
app.use(express.json({ 
  limit: '10mb',
  strict: true 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// =========================
// ✅ الملفات الثابتة (Uploads)
// =========================
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: isProduction ? '30d' : '0',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf') || filePath.endsWith('.doc') || filePath.endsWith('.docx')) {
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// =========================
// ✅ الصفحة الرئيسية / معلومات الـ API
// =========================
app.get('/', (req, res) => {
  res.json({
    name: '🌳 NASAB Tree API',
    version: '1.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    docs: '/api/health'
  });
});

// =========================
// ✅ دالة تحميل المسارات الآمنة
// =========================
function loadRoute(filePath, routeName) {
  try {
    const absolutePath = path.resolve(__dirname, filePath);
    const route = require(absolutePath);
    
    if (!route || typeof route !== 'function') {
      console.warn(`⚠️ ${routeName}: Invalid route export`);
      return;
    }
    
    app.use(`/api/${routeName}`, route);
    console.log(`✅ Route loaded: /api/${routeName}`);
  } catch (error) {
    console.error(`❌ Failed to load route "${routeName}":`, error.message);
    if (!isProduction) {
      console.error(error.stack);
    }
  }
}

// =========================
// ✅ تسجيل جميع المسارات
// =========================
const routes = [
  { path: './routes/auth', name: 'auth' },
  { path: './routes/tree', name: 'tree' },
  { path: './routes/requests', name: 'requests' },
  { path: './routes/notifications', name: 'notifications' },
  { path: './routes/backup', name: 'backup' },
  { path: './routes/users', name: 'users' },
  { path: './routes/sessions', name: 'sessions' }
];

routes.forEach(({ path, name }) => loadRoute(path, name));

// =========================
// ✅ نقطة الصحة - Health Check (شاملة)
// =========================
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    const [rows] = await pool.query('SELECT 1 as ping');
    health.database = {
      status: 'connected',
      responseTime: `${Date.now() - startTime}ms`
    };

    const memUsage = process.memoryUsage();
    health.memory = {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      usagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) + '%'
    };

    health.system = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuCount: require('os').cpus().length
    };

    res.json(health);
  } catch (err) {
    console.error('🔥 Health check failed:', err.message);
    health.status = 'degraded';
    health.database = { 
      status: 'disconnected', 
      error: isProduction ? 'Check logs' : err.message 
    };
    res.status(503).json(health);
  }
});

// =========================
// ✅ معالجة المسارات غير الموجودة (404)
// =========================
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint Not Found',
    message: `No route matches ${req.method} ${req.path}`,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    suggestion: 'Check the API documentation or contact support'
  });
});

// =========================
// ✅ معالجة الأخطاء الشاملة (Global Error Handler)
// =========================
app.use((err, req, res, next) => {
  // ✅ أخطاء الـ CORS
  if (err.message?.includes('CORS') || err.message?.includes('not allowed')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ أخطاء JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ أخطاء قاعدة البيانات
  if (err.code?.startsWith('ER_') || err.code?.startsWith('SQL')) {
    console.error('🔥 Database Error:', {
      code: err.code,
      message: err.message,
      sql: err.sql
    });
    return res.status(500).json({
      error: 'Database Error',
      message: isProduction ? 'An internal error occurred' : err.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ أخطاء التحقق من Zod أو المدخلات
  if (err.name === 'ZodError' || err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      errors: err.errors || null,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ تسجيل الخطأ
  const responseTime = req.startTime ? `${Date.now() - req.startTime}ms` : 'N/A';
  console.error(`🔥 [${req.requestId}] ${err.name || 'Error'}:`, {
    message: err.message,
    code: err.code,
    path: req.path,
    method: req.method,
    responseTime,
    stack: isProduction ? undefined : err.stack
  });

  // ✅ تحديد كود الحالة
  const statusCode = err.statusCode || err.status || 500;
  
  // ✅ بناء الاستجابة
  const errorResponse = {
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    code: err.code || null,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    responseTime
  };

  if (!isProduction && err.stack) {
    errorResponse.stack = err.stack.split('\n').slice(0, 10);
  }

  res.status(statusCode).json(errorResponse);
});

// =========================
// ✅ بدء الخادم مع الإغلاق الآمن
// =========================
let server;
let isShuttingDown = false;

const startServer = () => {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NASAB API Server running`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🆔 Request ID: enabled`);
    console.log(`🔒 Security: Helmet + Rate Limit + CORS`);
    console.log(`💾 Compression: ${isProduction ? 'enabled' : 'disabled'}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('❌ Server error:', err.message);
    }
    process.exit(1);
  });

  server.timeout = isProduction ? 30000 : 60000;
};

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // إيقاف استقبال طلبات جديدة
  if (server) {
    server.close(async () => {
      console.log('✅ HTTP server closed');
    });
  }

  // إغلاق اتصالات قاعدة البيانات
  try {
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (err) {
    console.error('❌ Error closing database:', err.message);
  }

  // إغلاق قسري بعد مهلة
  setTimeout(() => {
    console.error('❌ Force shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// الاستماع لإشارات الإغلاق
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// معالجة الأخطاء غير الملتقطة
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// بدء الخادم
startServer();

module.exports = app;