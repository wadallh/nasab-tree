// backend/src/db.js
const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';

console.log('🔌 Attempting database connection...');
console.log('📊 Environment:', isProduction ? '🟢 PRODUCTION' : '🔧 DEVELOPMENT');

// طباعة الإعدادات (بدون كلمة المرور للأمان)
console.log('📦 Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  ssl: false
});

// =============================
// ✅ إعداد الاتصال (مع خيارات قوية)
// =============================
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'sql12827422',
  password: process.env.DB_PASSWORD || 'GTfa7Xtnjs',
  database: process.env.DB_NAME || 'sql12827422',

  // 🔥 تعطيل SSL بشكل قاطع
  ssl: false,
  sslMode: 'DISABLED', // لدعم الإصدارات الحديثة من mysql2
  
  // ⚙️ تحسينات الاستقرار
  waitForConnections: true,
  connectionLimit: isProduction ? 10 : 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // ⏱️ مهلات زمنية قصيرة لمنع التعليق
  connectTimeout: 8000,   // 8 ثواني فقط
  acquireTimeout: 8000,
  timeout: 8000,
});

// =============================
// 🔁 دالة اختبار الاتصال (غير متزامنة ولا توقف السيرفر)
// =============================
async function testConnection() {
  let connection;
  try {
    // نحاول الحصول على اتصال بـ مهلة قصيرة
    connection = await pool.getConnection();
    console.log('✅ Connected to MySQL successfully!');
    
    const [rows] = await connection.execute('SELECT 1 + 1 as solution');
    console.log('🧪 DB Test Query Result:', rows[0]);
    
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection test FAILED');
    console.error('Code:', err.code);
    console.error('Message:', err.message);
    
    // رسائل مساعدة للأخطاء الشائعة
    if (err.message.includes('SSL')) {
      console.error('👉 SSL Error: تأكد أن ssl: false و sslMode: DISABLED');
    }
    
    if (connection) connection.release();
    return false;
  }
}

// تشغيل الاختبار في الخلفية (لا ننتظر نتيجته لبدء السيرفر)
// هذا يضمن أن السيرفر يشتغل حتى لو كانت القاعدة متوقفة مؤقتاً
testConnection();

module.exports = pool;