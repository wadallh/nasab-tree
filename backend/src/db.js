// backend/src/db.js
const mysql = require('mysql2/promise');

// 🔍 تحديد البيئة تلقائياً
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔌 Attempting database connection...');
console.log('📊 Environment:', isProduction ? '🟢 PRODUCTION' : '🔧 DEVELOPMENT');

const pool = mysql.createPool({
  host: 'sql12.freesqldatabase.com',
  port: 3306,
  user: 'sql12827422',
  password: 'GTfa7Xtnjs',
  database: 'sql12827422',

  // ❌ تعطيل SSL لأنه يسبب مشاكل مع الاستضافات المجانية
  ssl: false,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000
});

// 🔁 اختبار الاتصال
async function testConnection() {
  try {
    const connection = await pool.getConnection();

    console.log('✅ Connected to MySQL database successfully!');

    const [rows] = await connection.execute(
      'SELECT DATABASE() as db, VERSION() as version'
    );

    console.log('📊 Database info:', rows[0]);

    connection.release();

  } catch (err) {

    console.error('❌ Database connection FAILED');
    console.error('Code:', err.code);
    console.error('Message:', err.message);

    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('❌ Wrong database username or password');
    }

    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('❌ Database does not exist');
    }

    if (err.code === 'ECONNREFUSED') {
      console.error('❌ Server refused connection');
    }
  }
}

// تشغيل اختبار الاتصال
testConnection();

module.exports = pool;