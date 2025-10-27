// ARCHIVO DE CONFIGURACIÓN PARA EL ENTORNO LOCAL

// Cargar variables del .env local
require('dotenv').config({ path: './.env' });

module.exports = {
  apps: [{
    name: 'HCOpto-API-DEV',
    script: './backend/index.js',
    
    // Configuración de proceso
    instances: 1,
    exec_mode: 'fork',
    watch: true, // ✅ En desarrollo, activar watch
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Logs
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Variables de entorno cargadas explícitamente
    env: {
      NODE_ENV: 'development',
      PORT: process.env.PORT || 3000,
      DB_USER: process.env.DB_USER || 'root',
      DB_PASSWORD: process.env.DB_PASSWORD || '',
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_NAME: process.env.DB_NAME || 'hcopto_bd',
      JWT_SECRET: process.env.JWT_SECRET || 'default_dev_secret',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      IMAGE_UPLOAD_PATH: process.env.IMAGE_UPLOAD_PATH || './uploads',
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173'
    }
  }]
};