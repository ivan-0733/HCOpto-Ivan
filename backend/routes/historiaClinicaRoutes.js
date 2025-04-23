const express = require('express');
const historiaClinicaController = require('../controllers/historiaClinicaController');
const { verifyToken, checkRole, checkHistoriaOwnership } = require('../middleware/auth');
const { 
crearHistoriaClinicaRules, 
actualizarSeccionRules,
responderComentarioRules,
cambiarEstadoRules,
validateResults 
} = require('../middleware/validator');

const router = express.Router();

// Proteger todas las rutas de este router
router.use(verifyToken);
router.use(checkRole('alumno'));

// Obtener todas las historias clínicas del alumno logueado
router.get('/', historiaClinicaController.obtenerHistoriasClinicas);

// Obtener estadísticas de historias clínicas
router.get('/estadisticas', historiaClinicaController.obtenerEstadisticas);

// Crear una nueva historia clínica
router.post('/', crearHistoriaClinicaRules, validateResults, historiaClinicaController.crearHistoriaClinica);

// Obtener una historia clínica específica
router.get('/:id', checkHistoriaOwnership, historiaClinicaController.obtenerHistoriaClinica);

// Actualizar una sección específica de la historia clínica
router.patch(
'/:id/secciones/:seccion', 
actualizarSeccionRules, 
validateResults, 
checkHistoriaOwnership,
historiaClinicaController.actualizarSeccion
);

// Cambiar el estado de una historia clínica
router.patch(
'/:id/estado', 
cambiarEstadoRules, 
validateResults, 
checkHistoriaOwnership,
historiaClinicaController.cambiarEstado
);

// Responder a un comentario
router.post(
'/:id/comentarios/:comentarioId/respuestas', 
responderComentarioRules, 
validateResults, 
checkHistoriaOwnership,
historiaClinicaController.responderComentario
);

module.exports = router;