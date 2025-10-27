// config/database.js
const mysql = require('mysql2/promise');
// const dotenv = require('dotenv');
const path = require('path');

//const envPath = path.join(__dirname, '..', '.env');
// dotenv.config({ path: envPath });

// Crear conexión pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hcopto',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  pool
};
