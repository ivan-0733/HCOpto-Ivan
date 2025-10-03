const express = require('express');
const profesorController = require('../controllers/profesorController');
const authController = require('../controllers/authController');

const router = express.Router();

// Proteger todas las rutas de este router
router.use(authController.verificarAuth);
router.use(authController.verificarRol('profesor'));

// Rutas para el perfil del profesor
router.get('/perfil', profesorController.obtenerPerfil);
router.put('/perfil', profesorController.actualizarPerfil);

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

// Rutas de materias con alumnos
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

// Eliminar alumno de materia
router.delete('/alumnos/eliminar-de-materia', profesorController.eliminarAlumnoDeMateria);

// Inscribir alumno existente a materia
router.post('/alumnos/inscribir', profesorController.inscribirAlumnoMateria);

// PUT - Cambiar estado de historia
router.put('/historias/:id/estado', profesorController.cambiarEstadoHistoria);

// PUT - Archivar/Desarchivar historia ✅ AGREGAR ESTA LÍNEA
router.put('/historias/:id/archivar', profesorController.archivarHistoria);

// ==========================================
// RUTAS DE COMENTARIOS Y RESPUESTAS
// ==========================================

// POST - Agregar comentario
router.post('/comentarios', profesorController.agregarComentario);

// GET - Obtener comentarios con respuestas (hilos)
router.get('/comentarios/:historiaId/con-respuestas', profesorController.obtenerComentariosConRespuestas);

// POST - Agregar respuesta a un comentario
router.post('/comentarios/:comentarioId/responder', profesorController.agregarRespuesta);

// GET - Obtener estado de historia
router.get('/historias/:historiaId/estado', profesorController.obtenerEstadoHistoria);

// PUT - Cambiar estado de historia
router.put('/historias/:historiaId/estado', profesorController.cambiarEstadoHistoria);

module.exports = router;