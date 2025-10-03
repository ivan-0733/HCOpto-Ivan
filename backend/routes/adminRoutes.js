const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol de admin
router.use(verifyToken);
router.use(checkRole('admin'));

// Rutas de historias clínicas
router.get('/historias', adminController.obtenerTodasHistorias);
router.get('/estadisticas', adminController.obtenerEstadisticasGlobales);
router.get('/materias', adminController.obtenerTodasMaterias);

// Gestión de historias
router.patch('/historias/:id/estado', adminController.actualizarEstadoHistoria);
router.patch('/historias/:id/archivar', adminController.toggleArchivarHistoria);
router.delete('/historias/:id', adminController.eliminarHistoria);

// Comentarios
router.get('/historias/:id/comentarios', adminController.obtenerComentarios);
router.post('/historias/:id/comentarios', adminController.agregarComentario);

// Perfil
router.get('/perfil', adminController.obtenerPerfil);

// Después de las otras rutas existentes, agrega:
router.get('/periodo-escolar', adminController.obtenerPeriodoEscolar);

// En backend/routes/adminRoutes.js - AGREGAR:
router.get('/historias/:id', adminController.obtenerHistoriaDetalle);

// Rutas de profesores
router.get('/profesores', adminController.obtenerTodosProfesores);
router.post('/profesores/crear', adminController.crearProfesor);
router.get('/profesores/verificar-empleado', adminController.verificarEmpleadoExistente);
router.get('/profesores/verificar-correo', adminController.verificarCorreoProfesorExistente);
router.delete('/profesores/:id', adminController.eliminarProfesor);
router.get('/profesores/:id/verificar-historias', adminController.verificarProfesorTieneHistorias);

// Rutas de alumnos
router.get('/alumnos', adminController.obtenerTodosAlumnos);
router.post('/alumnos/crear', adminController.crearAlumno);
router.get('/alumnos/verificar-boleta', adminController.verificarBoletaExistente);
router.get('/alumnos/verificar-correo', adminController.verificarCorreoAlumnoExistente);
router.delete('/alumnos/:id', adminController.eliminarAlumno);
router.get('/alumnos/:id/verificar-historias', adminController.verificarAlumnoTieneHistorias);

// Rutas de materias
router.get('/materias-admin', adminController.obtenerTodasMateriasAdmin);
router.post('/materias-admin/crear', adminController.crearMateriaProfesor);
router.get('/materias-admin/:id/verificar-historias', adminController.verificarMateriaProfesorTieneHistorias);
router.delete('/materias-admin/:id', adminController.eliminarMateriaProfesor);
router.get('/profesores-disponibles', adminController.buscarProfesoresDisponibles);
router.get('/catalogo-materias', adminController.obtenerCatalogoMaterias);
router.post('/materias-admin/inscribir-alumno', adminController.inscribirAlumnoAMateria);
router.delete('/materias-admin/eliminar-alumno', adminController.eliminarAlumnoDeMateriaAdmin);

// ==================== 10. Backend - adminRoutes.js (AGREGAR esta ruta) ====================

router.get('/alumnos-disponibles', adminController.buscarAlumnosDisponibles);
router.get('/materias-disponibles', adminController.buscarMateriasDisponibles);

module.exports = router;