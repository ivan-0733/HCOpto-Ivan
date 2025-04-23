const historiaClinicaService = require('../services/historiaClinicaService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Controlador para manejar las operaciones de historias clínicas
 */
const historiaClinicaController = {
/**
 * Obtener todas las historias clínicas del alumno logueado
 */
obtenerHistoriasClinicas: catchAsync(async (req, res) => {
const alumnoId = req.usuario.AlumnoInfoID;

const historias = await historiaClinicaService.obtenerHistoriasClinicasPorAlumno(alumnoId);

res.status(200).json({
    status: 'success',
    results: historias.length,
    data: historias
});
}),

/**
 * Obtener una historia clínica específica por ID
 */
obtenerHistoriaClinica: catchAsync(async (req, res) => {
const { id } = req.params;
const alumnoId = req.usuario.AlumnoInfoID;

const historia = await historiaClinicaService.obtenerHistoriaClinicaPorId(id, alumnoId);

if (!historia) {
    return res.status(404).json({
    status: 'error',
    message: 'Historia clínica no encontrada'
    });
}

res.status(200).json({
    status: 'success',
    data: historia
});
}),

/**
 * Crear una nueva historia clínica
 */
crearHistoriaClinica: catchAsync(async (req, res) => {
const alumnoId = req.usuario.AlumnoInfoID;

const datosHistoria = {
    ...req.body,
    alumnoID: alumnoId
};

const nuevaHistoria = await historiaClinicaService.crearHistoriaClinica(datosHistoria);

res.status(201).json({
    status: 'success',
    data: nuevaHistoria
});
}),

/**
 * Actualizar una sección específica de una historia clínica
 */
actualizarSeccion: catchAsync(async (req, res) => {
const { id, seccion } = req.params;
const alumnoId = req.usuario.AlumnoInfoID;

const seccionesValidas = [
    'interrogatorio', 'agudezaVisual', 'lensometria', 'diagnostico',
    'planTratamiento', 'pronostico', 'recetaFinal'
];

if (!seccionesValidas.includes(seccion)) {
    return res.status(400).json({
    status: 'error',
    message: `Sección no válida. Las secciones válidas son: ${seccionesValidas.join(', ')}`
    });
}

const resultado = await historiaClinicaService.actualizarSeccion(id, seccion, req.body);

res.status(200).json({
    status: 'success',
    message: `Sección "${seccion}" actualizada correctamente`,
    data: resultado
});
}),

/**
 * Responder a un comentario de un profesor
 */
responderComentario: catchAsync(async (req, res) => {
const { id, comentarioId } = req.params;
const { respuesta } = req.body;
const alumnoId = req.usuario.AlumnoInfoID;

if (!respuesta?.trim()) {
    return res.status(400).json({
    status: 'error',
    message: 'La respuesta es obligatoria'
    });
}

const respuestaCreada = await historiaClinicaService.responderComentario(
    comentarioId,
    alumnoId,
    respuesta.trim()
);

res.status(201).json({
    status: 'success',
    data: respuestaCreada
});
}),

/**
 * Obtener estadísticas de las historias clínicas del alumno
 */
obtenerEstadisticas: catchAsync(async (req, res) => {
const alumnoId = req.usuario.AlumnoInfoID;

const estadisticas = await historiaClinicaService.obtenerEstadisticas(alumnoId);

res.status(200).json({
    status: 'success',
    data: estadisticas
});
}),

/**
 * Cambiar el estado de una historia clínica
 */
cambiarEstado: catchAsync(async (req, res) => {
const { id } = req.params;
const { estadoId } = req.body;
const alumnoId = req.usuario.AlumnoInfoID;

if (!estadoId) {
    return res.status(400).json({
    status: 'error',
    message: 'El ID del estado es obligatorio'
    });
}

await historiaClinicaService.cambiarEstado(id, estadoId, alumnoId);

res.status(200).json({
    status: 'success',
    message: 'Estado de la historia clínica actualizado correctamente'
});
})
};

module.exports = historiaClinicaController;
