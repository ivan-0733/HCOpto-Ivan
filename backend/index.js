const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const config = require('./config/config');
const db = require('./config/database.js');
const authRoutes = require('./routes/authRoutes');
const alumnoRoutes = require('./routes/alumnoRoutes');
const historiaClinicaRoutes = require('./routes/historiaClinicaRoutes');
const { errorHandler } = require('./utils/errorHandler');
const multer = require('multer');
const path = require('path');


// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();
const PORT = config.server.port;
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Verificar conexión a la base de datos
db.query('SELECT 1')
.then(() => console.log('✅ Conexión a MySQL establecida'))
.catch(err => console.error('Error al conectar a MySQL:', err));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/alumnos', alumnoRoutes);
app.use('/api/historias-clinicas', historiaClinicaRoutes);

// Ruta de prueba
app.get('/api/saludo', (req, res) => {
res.json({ mensaje: 'Hola desde el backend de HCOpto, SALUDOS A REYES SANDOVAL' });
});

// Ruta para 404 - No encontrado
app.all('*', (req, res, next) => {
const err = new Error(`No se encontró ${req.originalUrl} en este servidor`);
err.status = 'fail';
err.statusCode = 404;
next(err);
});

// Middleware de manejo de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
console.log(`Modo: ${config.server.environment}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
console.error('ERROR NO CAPTURADO! 💥 Cerrando servidor...');
console.error(err.name, err.message);
process.exit(1);
});




