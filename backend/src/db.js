// backend/src/db.js
const mysql = require('mysql2/promise');

console.log('🔌 Attempting database connection...');
console.log('   Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nasab_db',
  
  // ✅ إضافة SSL للاتصال الآمن مع TiDB Cloud (مهم جداً!):
  ssl: { rejectUnauthorized: true },
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000 // 10 ثوانٍ مهلة الاتصال
});

// اختبار الاتصال مع تفاصيل كاملة
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database successfully!');
    
    // اختبار بسيط لقراءة البيانات
    const [rows] = await connection.execute('SELECT DATABASE() as db, VERSION() as version');
    console.log('📊 Database info:', rows[0]);
    
    connection.release();
  } catch (err) {
    console.error('❌ Database connection FAILED:');
    console.error('   ├─ Code:', err.code || 'N/A');
    console.error('   ├─ Errno:', err.errno || 'N/A');
    console.error('   ├─ Message:', err.message || 'N/A');
    console.error('   ├─ SQL State:', err.sqlState || 'N/A');
    console.error('   └─ Stack:', err.stack?.split('\n')[1]?.trim() || 'N/A');
    
    // نصائح سريعة حسب نوع الخطأ
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 Hint: MySQL is not listening on this port. Check:');
      console.error('   • Docker container is running: docker ps | findstr nasab-db');
      console.error('   • Port mapping is correct: docker-compose.yml has "3307:3306"');
      console.error('   • No other MySQL is blocking port 3307');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Hint: Wrong username or password. Check .env file');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Hint: Database "nasab_db" does not exist. Run init.sql in phpMyAdmin');
    }
  }
})();

module.exports = pool;