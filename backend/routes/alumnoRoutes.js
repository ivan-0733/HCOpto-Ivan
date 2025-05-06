const express = require('express');
const alumnoController = require('../controllers/alumnoController');
const authController = require('../controllers/authController');

const router = express.Router();

// Proteger todas las rutas de este router
router.use(authController.verificarAuth);
router.use(authController.verificarRol('alumno'));

// Rutas para el perfil del alumno
router.get('/perfil', alumnoController.obtenerPerfil);
router.patch('/perfil', alumnoController.actualizarPerfil);

// Ruta para actualizar contraseña
router.patch('/password', alumnoController.actualizarPassword);

// Ruta para verificar contraseña - USAR SOLO UNA VEZ
router.post('/verificar-password', alumnoController.verificarPassword);

// Rutas para obtener profesores asignados
router.get('/profesores', alumnoController.obtenerProfesoresAsignados);

// Cambiar ruta de semestre-actual a periodo-actual
router.get('/periodo-actual', alumnoController.obtenerPeriodoEscolar);

// Rutas para obtener consultorios
router.get('/consultorios', alumnoController.obtenerConsultorios);

// Rutas para obtener catálogos
router.get('/catalogos/:tipo', alumnoController.obtenerCatalogo);

// Ruta para buscar pacientes
router.get('/pacientes/buscar', alumnoController.buscarPacientes);

// Añadir ruta para materias
router.get('/materias', alumnoController.obtenerMaterias);

module.exports = router;