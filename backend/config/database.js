const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

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

// Promisify pool para usar async/await
const promisePool = pool.promise();

module.exports = {
query: (sql, params) => promisePool.query(sql, params),
pool: promisePool
};