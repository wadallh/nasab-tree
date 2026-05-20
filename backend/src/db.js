// backend/src/db.js

const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';

console.log('🔌 Attempting database connection...');
console.log('📊 Environment:', isProduction ? '🟢 PRODUCTION' : '🔧 DEVELOPMENT');

// =============================
// 📦 طباعة الإعدادات (بدون كلمة المرور)
// =============================
console.log('📦 Config:', {
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'sql12827422',
  database: process.env.DB_NAME || 'sql12827422',
  ssl: false
});

// =============================
// ✅ إنشاء Pool الاتصال
// =============================
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'sql12827422',
  password: process.env.DB_PASSWORD || 'GTfa7Xtnjs',
  database: process.env.DB_NAME || 'sql12827422',

  // ❌ تعطيل SSL بالكامل
  ssl: undefined,

  // ⚙️ إعدادات الاستقرار
  waitForConnections: true,
  connectionLimit: isProduction ? 10 : 5,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // ⏱️ مهلات زمنية
  connectTimeout: 10000,
});

// =============================
// 🔍 اختبار الاتصال
// =============================
async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();

    console.log('✅ Connected to MySQL successfully!');

    const [rows] = await connection.query('SELECT NOW() AS time');

    console.log('🧪 Database Test Result:', rows[0]);

    connection.release();

    return true;

  } catch (err) {

    console.error('❌ Database connection FAILED');
    console.error('📌 Error Code:', err.code);
    console.error('📌 Error Message:', err.message);

    if (err.code === 'HANDSHAKE_NO_SSL_SUPPORT') {
      console.error('👉 المشكلة من SSL وتم تعطيله الآن');
    }

    if (connection) {
      connection.release();
    }

    return false;
  }
}

// تشغيل اختبار الاتصال بالخلفية
testConnection();

module.exports = pool;