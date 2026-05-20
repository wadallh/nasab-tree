// backend/src/db.js

const mysql = require('mysql2/promise');

console.log('🔌 Attempting database connection...');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  port: 3306,
  user: process.env.DB_USER || 'sql12827422',
  password: process.env.DB_PASSWORD || 'GTfa7Xtnjs',
  database: process.env.DB_NAME || 'sql12827422',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

async function testDB() {
  try {
    const connection = await pool.getConnection();

    console.log('✅ MySQL Connected Successfully');

    const [rows] = await connection.query('SELECT NOW() AS now');

    console.log(rows);

    connection.release();

  } catch (err) {

    console.error('❌ MySQL Error');
    console.error(err);

  }
}

testDB();

module.exports = pool;