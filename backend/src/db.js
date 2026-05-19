const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';

console.log('🔌 Attempting database connection...');
console.log('📊 Environment:', isProduction ? '🟢 PRODUCTION' : '🔧 DEVELOPMENT');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // ❌ مهم جداً: لا تستخدم SSL نهائياً
  ssl: undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000
});

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
  }
}

testConnection();

module.exports = pool;