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

module.exports = router;