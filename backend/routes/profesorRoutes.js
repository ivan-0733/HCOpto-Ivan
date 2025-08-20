const express = require('express');
const profesorController = require('../controllers/profesorController');
const authController = require('../controllers/authController');

const router = express.Router();

// Proteger todas las rutas de este router
router.use(authController.verificarAuth);
router.use(authController.verificarRol('profesor'));

// Rutas para el perfil del profesor
router.get('/perfil', profesorController.obtenerPerfil);
router.patch('/perfil', profesorController.actualizarPerfil);

// Ruta para actualizar contraseña
router.patch('/password', profesorController.actualizarPassword);

// Ruta para verificar contraseña
router.post('/verificar-password', profesorController.verificarPassword);

// Rutas para historias clínicas
router.get('/historias-clinicas', profesorController.obtenerHistoriasClinicas);
router.get('/historias-clinicas/estadisticas', profesorController.obtenerEstadisticasHistorias);

// Rutas para obtener alumnos asignados
router.get('/alumnos', profesorController.obtenerAlumnosAsignados);

// Rutas para obtener materias
router.get('/materias', profesorController.obtenerMaterias);
router.get('/todas-materias', profesorController.obtenerTodasMaterias);

// Ruta para obtener período escolar actual
router.get('/periodo-actual', profesorController.obtenerPeriodoEscolar);

// Obtener una historia clínica específica por ID
router.get('/historias-clinicas/:id', authController.verificarAuth, authController.verificarRol('profesor'), profesorController.obtenerHistoriaClinica);

module.exports = router;