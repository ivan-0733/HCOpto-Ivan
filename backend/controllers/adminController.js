const adminService = require('../services/adminService');
const { catchAsync } = require('../utils/errorHandler');

const adminController = {
  /**
   * Obtener todas las historias clínicas
   */
  obtenerTodasHistorias: catchAsync(async (req, res) => {
    const historias = await adminService.obtenerTodasHistorias();

    res.status(200).json({
      status: 'success',
      data: { historias }
    });
  }),

  /**
   * Obtener estadísticas globales
   */
  obtenerEstadisticasGlobales: catchAsync(async (req, res) => {
    const estadisticas = await adminService.obtenerEstadisticasGlobales();

    res.status(200).json({
      status: 'success',
      data: { estadisticas }
    });
  }),

  /**
   * Obtener todas las materias
   */
  obtenerTodasMaterias: catchAsync(async (req, res) => {
    const materias = await adminService.obtenerTodasMaterias();

    res.status(200).json({
      status: 'success',
      data: { materias }
    });
  }),

  /**
   * Actualizar estado de historia
   */
  actualizarEstadoHistoria: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const resultado = await adminService.actualizarEstadoHistoria(id, estado);

    res.status(200).json({
      status: 'success',
      data: resultado
    });
  }),

  /**
   * Archivar/Desarchivar historia
   */
  toggleArchivarHistoria: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { archivar } = req.body;

    const resultado = await adminService.toggleArchivarHistoria(id, archivar);

    res.status(200).json({
      status: 'success',
      data: resultado
    });
  }),

  /**
   * Eliminar historia
   */
  eliminarHistoria: catchAsync(async (req, res) => {
    const { id } = req.params;

    const resultado = await adminService.eliminarHistoria(id);

    res.status(200).json({
      status: 'success',
      data: resultado
    });
  }),

  /**
   * Obtener comentarios de una historia
   */
  obtenerComentarios: catchAsync(async (req, res) => {
    const { id } = req.params;

    const comentarios = await adminService.obtenerComentariosHistoria(id);

    res.status(200).json({
      status: 'success',
      data: { comentarios }
    });
  }),

  /**
   * Agregar comentario
   */
  agregarComentario: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { comentario } = req.body;
    const usuarioId = req.usuario.UsuarioID;
    const userRole = req.role; // El rol viene del middleware auth

    console.log('Agregando comentario - Usuario:', usuarioId, 'Rol:', userRole);

    const nuevoComentario = await adminService.agregarComentario(id, usuarioId, comentario, userRole);

    res.status(201).json({
      status: 'success',
      data: { comentario: nuevoComentario }
    });
  }),

  /**
   * Obtener el período escolar actual
   */
  obtenerPeriodoEscolar: catchAsync(async (req, res) => {
    const periodo = await adminService.obtenerPeriodoEscolarActual();

    if (!periodo) {
      return res.status(404).json({
        status: 'error',
        message: 'No hay un período escolar activo actualmente'
      });
    }

    res.status(200).json({
      status: 'success',
      data: periodo
    });
  }),

  // En backend/controllers/adminController.js - AGREGAR:
  obtenerHistoriaDetalle: catchAsync(async (req, res) => {
    const { id } = req.params;

    const historia = await adminService.obtenerHistoriaDetalle(id);

    res.status(200).json({
      status: 'success',
      data: { historia }
    });
  }),

  obtenerTodosProfesores: catchAsync(async (req, res) => {
    const profesores = await adminService.obtenerTodosProfesores();

    res.status(200).json({
      status: 'success',
      data: { profesores }
    });
  }),

  crearProfesor: catchAsync(async (req, res) => {
    const nuevoProfesor = await adminService.crearProfesor(req.body);

    res.status(201).json({
      status: 'success',
      data: { profesor: nuevoProfesor }
    });
  }),

  verificarEmpleadoExistente: catchAsync(async (req, res) => {
    const { numeroEmpleado } = req.query;

    console.log('Controller - Verificando empleado:', numeroEmpleado);

    const existe = await adminService.verificarEmpleadoExistente(numeroEmpleado);

    console.log('Controller - Resultado:', existe);

    res.status(200).json({
      status: 'success',
      data: existe
    });
  }),

  verificarCorreoProfesorExistente: catchAsync(async (req, res) => {
    const { correoElectronico } = req.query;

    console.log('🔍 Controller - Verificando correo:', correoElectronico);

    const existe = await adminService.verificarCorreoProfesorExistente(correoElectronico);

    console.log('📊 Controller - Resultado:', existe);

    res.status(200).json({
      status: 'success',
      data: existe
    });
  }),

  eliminarProfesor: catchAsync(async (req, res) => {
    const { id } = req.params;
    const resultado = await adminService.eliminarProfesor(id);

    res.status(200).json({
      status: 'success',
      message: 'Profesor eliminado correctamente',
      data: resultado
    });
  }),

  verificarProfesorTieneHistorias: catchAsync(async (req, res) => {
    const { id } = req.params;
    const resultado = await adminService.verificarProfesorTieneHistorias(id);

    res.status(200).json({
      status: 'success',
      data: resultado
    });
  }),

  // ==================== GESTIÓN DE ALUMNOS ====================

obtenerTodosAlumnos: catchAsync(async (req, res) => {
  const alumnos = await adminService.obtenerTodosAlumnos();

  res.status(200).json({
    status: 'success',
    data: { alumnos }
  });
}),

crearAlumno: catchAsync(async (req, res) => {
  const nuevoAlumno = await adminService.crearAlumno(req.body);

  res.status(201).json({
    status: 'success',
    data: { alumno: nuevoAlumno }
  });
}),

verificarBoletaExistente: catchAsync(async (req, res) => {
  const { numeroBoleta } = req.query;

  console.log('Controller - Verificando boleta:', numeroBoleta);

  const existe = await adminService.verificarBoletaExistente(numeroBoleta);

  console.log('Controller - Resultado:', existe);

  res.status(200).json({
    status: 'success',
    data: existe
  });
}),

verificarCorreoAlumnoExistente: catchAsync(async (req, res) => {
  const { correoElectronico } = req.query;

  console.log('Controller - Verificando correo alumno:', correoElectronico);

  const existe = await adminService.verificarCorreoAlumnoExistente(correoElectronico);

  console.log('Controller - Resultado:', existe);

  res.status(200).json({
    status: 'success',
    data: existe
  });
}),

eliminarAlumno: catchAsync(async (req, res) => {
  const { id } = req.params;
  const resultado = await adminService.eliminarAlumno(id);

  res.status(200).json({
    status: 'success',
    message: 'Alumno eliminado correctamente',
    data: resultado
  });
}),

verificarAlumnoTieneHistorias: catchAsync(async (req, res) => {
  const { id } = req.params;
  const resultado = await adminService.verificarAlumnoTieneHistorias(id);

  res.status(200).json({
    status: 'success',
    data: resultado
  });
}),

// ==================== GESTIÓN DE MATERIAS ====================

obtenerTodasMateriasAdmin: catchAsync(async (req, res) => {
  const materias = await adminService.obtenerTodasMateriasAdmin();

  res.status(200).json({
    status: 'success',
    data: { materias }
  });
}),

crearMateriaProfesor: catchAsync(async (req, res) => {
  const nuevaMateria = await adminService.crearMateriaProfesor(req.body);

  res.status(201).json({
    status: 'success',
    data: { materia: nuevaMateria }
  });
}),

verificarMateriaProfesorTieneHistorias: catchAsync(async (req, res) => {
  const { id } = req.params;
  const resultado = await adminService.verificarMateriaProfesorTieneHistorias(id);

  res.status(200).json({
    status: 'success',
    data: resultado
  });
}),

eliminarMateriaProfesor: catchAsync(async (req, res) => {
  const { id } = req.params;
  const resultado = await adminService.eliminarMateriaProfesor(id);

  res.status(200).json({
    status: 'success',
    message: 'Materia eliminada correctamente',
    data: resultado
  });
}),

buscarProfesoresDisponibles: catchAsync(async (req, res) => {
  const { termino } = req.query;
  const profesores = await adminService.buscarProfesoresDisponibles(termino);

  res.status(200).json({
    status: 'success',
    data: { profesores }
  });
}),

obtenerCatalogoMaterias: catchAsync(async (req, res) => {
  const materias = await adminService.obtenerCatalogoMaterias();

  res.status(200).json({
    status: 'success',
    data: { materias }
  });
}),

inscribirAlumnoAMateria: catchAsync(async (req, res) => {
  const resultado = await adminService.inscribirAlumnoAMateria(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Alumno inscrito exitosamente',
    data: resultado
  });
}),

buscarMateriasDisponibles: catchAsync(async (req, res) => {
  const { termino } = req.query;
  const materias = await adminService.buscarMateriasDisponibles(termino);

  res.status(200).json({
    status: 'success',
    data: { materias }
  });
}),

// ==================== 9. Backend - adminController.js (AGREGAR este controlador) ====================

buscarAlumnosDisponibles: catchAsync(async (req, res) => {
  const { termino } = req.query;
  const alumnos = await adminService.buscarAlumnosDisponibles(termino);

  res.status(200).json({
    status: 'success',
    data: { alumnos }
  });
}),

eliminarAlumnoDeMateriaAdmin: catchAsync(async (req, res) => {
  const resultado = await adminService.eliminarAlumnoDeMateriaAdmin(req.body);

  res.status(200).json({
    status: 'success',
    message: 'Alumno eliminado de la materia exitosamente',
    data: resultado
  });
}),

/**
 * Actualizar historia completa (para admin)
 */
actualizarHistoriaCompleta: catchAsync(async (req, res) => {
  const { id } = req.params;
  const datosHistoriaCompleta = {
    historiaId: parseInt(id),
    datosGenerales: req.body.datosGenerales,
    secciones: req.body.secciones
  };

  console.log('📝 Admin actualizando historia completa:', id);

  const historiaClinicaService = require('../services/historiaClinicaService');
  const historiaActualizada = await historiaClinicaService.actualizarHistoriaCompleta(datosHistoriaCompleta);

  res.status(200).json({
    status: 'success',
    message: 'Historia clínica actualizada correctamente',
    data: historiaActualizada
  });
}),

  /**
   * Obtener perfil del admin
   */
  obtenerPerfil: catchAsync(async (req, res) => {
    const usuarioId = req.usuario.UsuarioID;

    const perfil = await adminService.obtenerPerfilAdmin(usuarioId);
    const estadisticas = await adminService.obtenerEstadisticasGlobales();

    res.status(200).json({
      status: 'success',
      data: {
        perfil,
        estadisticas
      }
    });
  })
};

module.exports = adminController;