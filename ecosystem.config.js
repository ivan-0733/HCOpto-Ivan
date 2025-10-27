// ARCHIVO DE CONFIGURACIÓN PARA PRODUCCIÓN

// Cargar variables del .env compartido
require('dotenv').config({ path: '/var/www/HCOpto/shared/.env' });

module.exports = {
  apps: [{
    name: 'HCOpto-API',
    script: './current/backend/index.js',
    cwd: '/var/www/HCOpto',
    
    // Configuración de proceso
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Logs en carpeta compartida
    error_file: '/var/www/HCOpto/shared/logs/HCOpto-API-error.log',
    out_file: '/var/www/HCOpto/shared/logs/HCOpto-API-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // ✅ Variables de entorno cargadas explícitamente
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_HOST: process.env.DB_HOST,
      DB_NAME: process.env.DB_NAME,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      IMAGE_UPLOAD_PATH: process.env.IMAGE_UPLOAD_PATH,
      CORS_ORIGIN: process.env.CORS_ORIGIN
    }
  }]
};