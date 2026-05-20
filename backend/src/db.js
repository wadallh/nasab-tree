// backend/src/db.js
const mysql = require('mysql2/promise');

// 🔍 تحديد البيئة
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔌 Attempting database connection...');
console.log('📊 Environment:', isProduction ? '🟢 PRODUCTION' : '🔧 DEVELOPMENT');
console.log('📦 Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

// =============================
// ✅ إعداد الاتصال النهائي (مع تعطيل SSL بشكل قاطع)
// =============================
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'sql12827422',
  password: process.env.DB_PASSWORD || 'GTfa7Xtnjs',
  database: process.env.DB_NAME || 'sql12827422',

  // 🔥 الحل الجذري: تعطيل SSL بشكل صريح وقاطع
  ssl: false,
  
  // ✅ خيارات إضافية لضمان استقرار الاتصال
  waitForConnections: true,
  connectionLimit: isProduction ? 20 : 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 15000,    // زيادة وقت الانتظار للاتصال
  acquireTimeout: 15000,    // زيادة وقت انتظار الحصول على اتصال من الـ pool
  timeout: 15000,           // وقت انتظار الاستعلامات
  enableKeepAlive: true,    // الحفاظ على الاتصال نشطاً
  keepAliveInitialDelay: 0, // بدء الحفاظ على الاتصال فوراً
  
  // ✅ منع أي محاولة لإعادة التفاوض على SSL
  sslMode: 'DISABLED' // إذا كانت نسخة mysql2 تدعمها
});

// =============================
// 🔁 اختبار الاتصال مع إعادة المحاولة
// =============================
async function testConnection(retryCount = 0) {
  const maxRetries = 3;
  let connection;

  try {
    connection = await pool.getConnection();
    console.log('✅ Connected to MySQL successfully!');

    const [rows] = await connection.execute(
      'SELECT DATABASE() as db, VERSION() as version, NOW() as now'
    );

    console.log('📊 Database Info:', rows[0]);
    connection.release();
    
    return true;
  } catch (err) {
    console.error(`❌ Database connection FAILED (attempt ${retryCount + 1}/${maxRetries})`);
    console.error('Code:', err.code);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);

    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('👉 خطأ: بيانات الدخول (user/password) غير صحيحة');
    }
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('👉 خطأ: قاعدة البيانات غير موجودة');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('👉 خطأ: السيرفر غير متاح أو منفذ الاتصال مغلوق');
    }
    if (err.code === 'HANDSHAKE_NO_SSL_SUPPORT' || err.message?.includes('SSL')) {
      console.error('👉 خطأ: مشكلة في تفاوض SSL - تم تعطيله في الكود، تأكد من إعادة النشر');
    }
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('👉 خطأ: انقطع الاتصال أثناء المصافحة');
    }

    // إعادة المحاولة تلقائياً
    if (retryCount < maxRetries - 1) {
      const delay = 2000 * (retryCount + 1); // تأخير متزايد
      console.log(`🔄 إعادة المحاولة بعد ${delay}مللي ثانية...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return testConnection(retryCount + 1);
    }

    if (connection) connection.release();
    return false;
  }
}

// تشغيل الفحص عند بدء التشغيل
if (isProduction) {
  testConnection().then(connected => {
    if (!connected) {
      console.error('🚨 Failed to connect to database after retries');
    }
  });
} else {
  // في التطوير: نفحص لكن لا نوقف السيرفر إذا فشل
  testConnection();
}

module.exports = pool;