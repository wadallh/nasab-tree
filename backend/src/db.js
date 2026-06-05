// backend/src/db.js
const mysql = require('mysql2/promise');

// 🔍 تحديد البيئة تلقائياً
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔌 Attempting database connection...');
console.log('📊 Environment:', isProduction ? '🟢 PRODUCTION' : '🔧 DEVELOPMENT');
console.log('   Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || (isProduction ? undefined : '127.0.0.1'),
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (isProduction ? undefined : 3307),
  user: process.env.DB_USER || (isProduction ? undefined : 'root'),
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || (isProduction ? undefined : 'nasab_db'),
  
  // ✅ إعدادات SSL ذكية: تختلف حسب البيئة
  ssl: isProduction 
    ? { rejectUnauthorized: true }  // 🟢 الإنتاج: شهادات موثوقة فقط
    : { rejectUnauthorized: false }, // 🔧 التطوير: نسمح بالشهادات المحلية
  
  waitForConnections: true,
  connectionLimit: isProduction ? 20 : 10, // زيادة الاتصالات في الإنتاج
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: isProduction ? 5000 : 10000 // مهلة أقصر في الإنتاج
});

// 🔁 دالة اختبار الاتصال مع إعادة المحاولة
async function testConnection(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Connected to MySQL database successfully!');
      
      // اختبار بسيط لقراءة البيانات
      const [rows] = await connection.execute('SELECT DATABASE() as db, VERSION() as version');
      console.log('📊 Database info:', rows[0]);
      
      connection.release();
      return true;
    } catch (err) {
      console.error(`❌ Connection attempt ${attempt}/${retries} FAILED:`);
      console.error('   ├─ Code:', err.code || 'N/A');
      console.error('   ├─ Message:', err.message || 'N/A');
      
      if (attempt === retries) {
        // نصائح سريعة حسب نوع الخطأ
        if (err.code === 'ECONNREFUSED') {
          console.error('\n💡 Hint: MySQL is not listening. Check:');
          console.error('   • Docker: docker ps | findstr nasab-db');
          console.error('   • Port: is 3307 available? netstat -ano | findstr 3307');
          console.error('   • .env file: DB_HOST, DB_PORT, DB_PASSWORD');
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
          console.error('\n💡 Hint: Wrong credentials. Check .env file');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
          console.error('\n💡 Hint: Database not found. Run init.sql in phpMyAdmin');
        } else if (err.code === 'HANDSHAKE_SSL_ERROR') {
          console.error('\n💡 Hint: SSL certificate issue. Check NODE_ENV and ssl config');
        }
        return false;
      }
      
      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// تشغيل اختبار الاتصال عند بدء التشغيل
testConnection();

module.exports = pool;