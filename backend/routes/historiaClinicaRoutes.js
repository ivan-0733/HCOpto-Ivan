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
const uploadController = require('../controllers/uploadController');
const multer = require('multer');
const router = express.Router();

// Configuración básica de Multer para la ruta de prueba
const upload = multer({ storage: multer.memoryStorage() });

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

// Ruta para subir imágenes (con middleware de Multer)
router.post(
    '/:id/imagenes', 
    uploadController.upload.single('file'), 
    uploadController.uploadHistoriaClinicaImage
);

//ruta para obtener una imagen por su ID
router.get('/imagenes/:id', uploadController.getImageById);

// Ruta de prueba para imágenes (con Multer configurado directamente)
router.post(
'/:id/imagenes-test', 
upload.single('imagen'), // Middleware Multer para capturar un solo archivo
(req, res) => {
try {
    console.log('=== RUTA DE PRUEBA IMÁGENES ===');
    console.log('Parámetros:', req.params);
    console.log('Headers:', req.headers);
    console.log('Contenido de body:', req.body);
    console.log('Archivo recibido:', {
    originalname: req.file?.originalname,
    mimetype: req.file?.mimetype,
    size: req.file?.size
    });
    
    return res.status(200).json({
    status: 'success',
    message: 'Ruta de prueba funcionando',
    params: req.params,
    body: req.body,
    file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    } : null
    });
} catch (error) {
    console.error('Error en ruta de prueba:', error);
    return res.status(500).json({
    status: 'error',
    message: 'Error en ruta de prueba',
    error: error.message
    });
}
}
);

module.exports = router;