// backend/src/db.js
const mysql = require('mysql2/promise');

// 🔍 تحديد البيئة
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔌 Attempting database connection...');
console.log('📊 Environment:', isProduction ? '🟢 PRODUCTION' : '🔧 DEVELOPMENT');

// =============================
// ✅ إعداد الاتصال النهائي الصحيح
// =============================
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'sql12827422',
  password: process.env.DB_PASSWORD || 'GTfa7Xtnjs',
  database: process.env.DB_NAME || 'sql12827422',

  // ❌ مهم جداً: تعطيل SSL بالكامل (سبب المشكلة عندك)
  ssl: false,

  waitForConnections: true,
  connectionLimit: isProduction ? 20 : 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000
});

// =============================
// 🔁 اختبار الاتصال
// =============================
async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();

    console.log('✅ Connected to MySQL successfully!');

    const [rows] = await connection.execute(
      'SELECT DATABASE() as db, VERSION() as version'
    );

    console.log('📊 Database Info:', rows[0]);

    connection.release();
  } catch (err) {
    console.error('❌ Database connection FAILED');
    console.error('Code:', err.code);
    console.error('Message:', err.message);

    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('👉 خطأ: بيانات الدخول (user/password) غير صحيحة');
    }

    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('👉 خطأ: قاعدة البيانات غير موجودة');
    }

    if (err.code === 'ECONNREFUSED') {
      console.error('👉 خطأ: السيرفر غير متاح');
    }

    if (err.code === 'HANDSHAKE_NO_SSL_SUPPORT') {
      console.error('👉 الحل: يجب تعطيل SSL (تم حلها في هذا الملف)');
    }
  }
}

// تشغيل الفحص
testConnection();

module.exports = pool;