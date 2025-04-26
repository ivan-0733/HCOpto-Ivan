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

// Ruta para actualizar contraseña - ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ PRESENTE
router.patch('/password', alumnoController.actualizarPassword);

// Rutas para obtener profesores asignados
router.get('/profesores', alumnoController.obtenerProfesoresAsignados);

// Rutas para obtener información del semestre actual
router.get('/semestre-actual', alumnoController.obtenerSemestreActual);

// Rutas para obtener consultorios
router.get('/consultorios', alumnoController.obtenerConsultorios);

// Rutas para obtener catálogos
router.get('/catalogos/:tipo', alumnoController.obtenerCatalogo);

// Ruta para buscar pacientes
router.get('/pacientes/buscar', alumnoController.buscarPacientes);

module.exports = router;