// backend/test-db.js
require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

(async () => {
  console.log('🚀 Starting standalone DB test...\n');
  
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });
    
    console.log('✅ Connection successful!');
    
    const [rows] = await connection.execute('SELECT 1 + 1 as result, DATABASE() as db, NOW() as now');
    console.log('📊 Query result:', rows[0]);
    
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📋 Found ${tables.length} tables in database`);
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('   Details:', { code: err.code, errno: err.errno, sqlState: err.sqlState });
  } finally {
    if (connection) await connection.end();
    console.log('\n🔚 Test completed');
    process.exit(0);
  }
})();