// backend/src/app.js
require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();

// =========================
// 🔒 CORS Configuration (محدّث للإنتاج)
// =========================
const allowedOrigins = [
  'http://localhost:5173',           // التطوير المحلي
  'https://yourdomain.com',          // النطاق الرئيسي (سيُستبدل لاحقاً)
  'https://*.vercel.app',            // نطاقات Vercel التجريبية
  'https://nasab-tree.vercel.app',   // نطاق Vercel المحدد (اختياري)
];

// دالة للتحقق من النطاق المسموح به
const corsOptions = {
  origin: function (origin, callback) {
    // السماح بالطلبات بدون origin (مثل التطبيقات المحمولة أو Postman)
    if (!origin) return callback(null, true);
    
    // التحقق من النطاق في قائمة المسموحات
    if (allowedOrigins.indexOf(origin) !== -1 || 
        allowedOrigins.some(allowed => allowed.includes('*') && origin.match(allowed.replace('*', '.*')))) {
      callback(null, true);
    } else {
      console.error('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// تطبيق CORS
app.use(cors(corsOptions));

// =========================
// 📋 Middlewares
// =========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =========================
// 🛣️ Routes
// =========================

// تسجيل الدخول والمصادقة
console.log('📦 Loading auth routes...');
app.use('/api/auth', require('./routes/auth'));

// إدارة شجرة النسب
console.log('📦 Loading tree routes...');
app.use('/api/tree', require('./routes/tree'));

// إدارة الطلبات (إضافة/تعديل/حذف)
console.log('📦 Loading requests routes...');
try {
  const requestsRoutes = require('./routes/requests');
  app.use('/api/requests', requestsRoutes);
  console.log('✅ Requests routes loaded successfully');
} catch (err) {
  console.error('❌ Failed to load requests routes:', err.message);
}

// ✅ إدارة الإشعارات 🔔
console.log('📦 Loading notifications routes...');
try {
  const notificationsRoutes = require('./routes/notifications');
  app.use('/api/notifications', notificationsRoutes);
  console.log('✅ Notifications routes loaded successfully');
} catch (err) {
  console.error('❌ Failed to load notifications routes:', err.message);
}

// النسخ الاحتياطي 💾
console.log('📦 Loading backup routes...');
try {
  const backupRoutes = require('./routes/backup');
  app.use('/api/backup', backupRoutes);
  console.log('✅ Backup routes loaded successfully');
} catch (err) {
  console.error('❌ Failed to load backup routes:', err.message);
}

// إدارة المستخدمين 👥
console.log('📦 Loading users routes...');
app.use('/api/users', require('./routes/users'));

// سجل الجلسات 📊
console.log('📦 Loading sessions routes...');
app.use('/api/sessions', require('./routes/sessions'));

// =========================
// 🔍 Debug: عرض جميع المسارات المسجلة
// =========================
if (process.env.NODE_ENV !== 'production') {
  console.log('\n🗺️  Registered API Routes:');
  app._router.stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`   ${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
    }
  });
  console.log('');
}

// =========================
// 🏥 Health Check
// =========================
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() as db, VERSION() as version');
    res.json({ 
      status: 'ok', 
      database: rows[0].db, 
      mysql_version: rows[0].version,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});

// =========================
// ❌ 404 Handler (مع تسجيل المسار المفقود)
// =========================
app.use('/api/*', (req, res) => {
  console.warn(`⚠️  404 - Endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint not found', 
    path: req.originalUrl,
    method: req.method,
    hint: 'تأكد من أن المسار صحيح وأن الـ Route مسجل في app.js'
  });
});

// =========================
// 🌍 Global Error Handler
// =========================
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// =========================
// 🚀 Start Server
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'nasab_db'}\n`);
  console.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}\n`);
});

module.exports = app;