require('dotenv').config();

module.exports = {
server: {
port: process.env.PORT || 3000,
environment: process.env.NODE_ENV || 'development'
},
database: {
host: process.env.DB_HOST || 'localhost',
user: process.env.DB_USER || 'root',
password: process.env.DB_PASSWORD || '',
database: process.env.DB_NAME || 'hcopto'
},
jwt: {
secret: process.env.JWT_SECRET || 'hcopto_secret_key',
expiresIn: process.env.JWT_EXPIRES_IN || '7d'
},
cors: {
origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
credentials: true  // ← CRÍTICO para que envíe cookies/headers de auth
}
};
