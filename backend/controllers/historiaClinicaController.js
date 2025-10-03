const historiaClinicaService = require('../services/historiaClinicaService');
const { catchAsync } = require('../utils/errorHandler');
//const { plantilla } = require('../utils/plantillaHistoriaClinica.js');

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

  console.log(`Controller: Obteniendo historia clínica ID=${id} para alumnoId=${alumnoId}`);

  const historia = await historiaClinicaService.obtenerHistoriaClinicaPorId(id, alumnoId);

  if (!historia) {
    return res.status(404).json({
      status: 'error',
      message: 'Historia clínica no encontrada o no tienes permiso para acceder a ella'
    });
  }

  res.status(200).json({
    status: 'success',
    data: historia
  });
}),

crearHistoriaClinicaCompleta: catchAsync(async (req, res) => {
  // 1. Obtener ID del alumno desde el token
  const alumnoId = req.usuario.AlumnoInfoID;

  // 2. Extraer datos del body
  const { datosHistoria, secciones } = req.body;

  // 3. Validaciones básicas
  if (!datosHistoria || typeof datosHistoria !== 'object') {
    return res.status(400).json({
      status: 'error',
      message: 'El formato de datosHistoria es incorrecto'
    });
  }

  // 4. Validar campos obligatorios
  const camposRequeridos = ['NombreMateria', 'PeriodoEscolarID'];
  const faltantes = camposRequeridos.filter(campo => !datosHistoria[campo]);

  if (faltantes.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: `Faltan campos obligatorios: ${faltantes.join(', ')}`,
      requiredFields: camposRequeridos
    });
  }

  // 5. Validar datos del paciente si es nuevo
  if (!datosHistoria.paciente?.id) {
    const camposPacienteRequeridos = ['nombre', 'apellidoPaterno', 'generoID', 'edad', 'curp'];  // ✅ curp es obligatorio, correo y teléfono NO
    const faltantesPaciente = camposPacienteRequeridos.filter(
      campo => !datosHistoria.paciente?.[campo]
    );

    if (faltantesPaciente.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Faltan datos obligatorios del paciente: ${faltantesPaciente.join(', ')}`
      });
    }
  }

  // 6. Asignar alumnoID (seguridad)
  datosHistoria.alumnoID = alumnoId;

  if (datosHistoria.materiaProfesorID) {
    datosHistoria.MateriaProfesorID = datosHistoria.materiaProfesorID;
  }

  // 7. Log para depuración (opcional)
  console.log('Datos recibidos para crear historia:', {
    datosHistoria: {
      ...datosHistoria,
      paciente: datosHistoria.paciente ? { ...datosHistoria.paciente } : null
    },
    secciones: secciones ? Object.keys(secciones) : null
  });

  try {
    // 8. Llamar al servicio
    const historiaCreada = await historiaClinicaService.crearHistoriaClinicaCompleta(
      datosHistoria,
      secciones || {} // Asegurar que secciones siempre sea un objeto
    );

    // 9. Respuesta exitosa
    return res.status(201).json({
      status: 'success',
      message: 'Historia clínica creada exitosamente',
      data: {historiaCreada}
    });

  } catch (error) {
    // 10. Manejo de errores
    console.error('Error detallado:', error);

    const mensajeError = error.message.includes('duplicate')
      ? 'Ya existe una historia clínica con estos datos'
      : error.message || 'Error al crear historia clínica';

    return res.status(500).json({
      status: 'error',
      message: mensajeError,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
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
const usuarioId = req.usuario.UsuarioID;

if (!respuesta?.trim()) {
    return res.status(400).json({
    status: 'error',
    message: 'La respuesta es obligatoria'
    });
}

const respuestaCreada = await historiaClinicaService.responderComentario(
  id,              // ✅ historiaId
  comentarioId,    // ✅ comentarioId
  alumnoId,        // ✅ alumnoId
  respuesta.trim(), // ✅ respuesta
  usuarioId        // ✅ AGREGAR ESTE PARÁMETRO
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
