const express = require('express');
const profesorController = require('../controllers/profesorController');
const authController = require('../controllers/authController');

const router = express.Router();

// Proteger todas las rutas de este router
router.use(authController.verificarAuth);
router.use(authController.verificarRol('profesor'));

// Rutas para el perfil del profesor
router.get('/perfil', profesorController.obtenerPerfil);
router.put('/perfil', profesorController.actualizarPerfil); // ← Cambiado de PATCH a PUT

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
router.get('/historias-clinicas/:id', profesorController.obtenerHistoriaClinica);

// Agregar estas rutas al final del archivo (antes de module.exports):
router.get('/materias/:materiaId/alumnos', profesorController.obtenerAlumnosPorMateria);
router.get('/materias-con-alumnos', profesorController.obtenerMateriasConAlumnos);

// Buscar alumnos existentes
router.get('/alumnos/buscar', profesorController.buscarAlumnos);

// Verificar si boleta existe
router.get('/alumnos/verificar-boleta', profesorController.verificarBoletaExistente);

// Verificar si correo existe
router.get('/alumnos/verificar-correo', profesorController.verificarCorreoExistente);

// Crear nuevo alumno e inscribirlo
router.post('/alumnos/crear-inscribir', profesorController.crearAlumnoEInscribir);

// AGREGAR:
router.delete('/alumnos/eliminar-de-materia', profesorController.eliminarAlumnoDeMateria);

// Inscribir alumno existente a materia
router.post('/alumnos/inscribir', profesorController.inscribirAlumnoMateria);

module.exports = router;