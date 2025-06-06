// config/database.js
const mysql = require('mysql2/promise'); // ¡Usa la versión promisificada directamente!
const dotenv = require('dotenv');

dotenv.config();

// Crear conexión pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Saulivan1$',
  database: process.env.DB_NAME || 'HCOpto',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  pool
};