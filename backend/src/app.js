require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? './.env' : '../.env'
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path'); // ✅ التعديل الأول: إضافة path
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

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = allowedOrigins.some(o => {
      if (o.includes('*')) {
        return new RegExp('^' + o.replace(/\*/g, '.*') + '$').test(origin);
      }
      return o === origin;
    });
    if (allowed) return cb(null, true);
    console.log('❌ CORS blocked:', origin);
    return cb(null, false);
  },
  credentials: true
}));

app.options('*', cors());

// =========================
// Body Parser
// =========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =========================
// ✅ التعديل الثاني: عرض ملفات الفرونت إند الثابتة
// =========================
// هذا السطر هو المسؤول عن تشغيل الواجهة بدلاً من الشاشة البيضاء
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// =========================
// Static Files (Uploads)
// =========================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =========================
// Routes (API)
// =========================
// تأكد من تحميل جميع الـ Routes هنا
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tree', require('./routes/tree'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/users', require('./routes/users'));
app.use('/api/sessions', require('./routes/sessions'));

// =========================
// ✅ التعديل الثالث: التعامل مع React Router
// =========================
// أي طلب غير موجود في الـ API سيتم توجيهه لملف index.html
// ليعمل التنقل بين الصفحات بشكل صحيح
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist', 'index.html'));
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