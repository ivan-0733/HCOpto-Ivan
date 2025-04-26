const alumnoService = require('../services/alumnoService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Controlador para manejar las operaciones de alumnos
 */
const alumnoController = {
  /**
   * Obtener datos del perfil del alumno logueado
   */
  obtenerPerfil: catchAsync(async (req, res) => {
    const alumnoId = req.usuario.AlumnoInfoID;

    const perfil = await alumnoService.obtenerAlumnoPorId(alumnoId);

    if (!perfil) {
      return res.status(404).json({
        status: 'error',
        message: 'Alumno no encontrado'
      });
    }

    // Asegúrate de no enviar información sensible
    if (perfil.ContraseñaHash) {
      delete perfil.ContraseñaHash;
    }

    res.status(200).json({
      status: 'success',
      data: perfil
    });
  }),

  /**
   * Obtener profesores asignados al alumno
   */
  obtenerProfesoresAsignados: catchAsync(async (req, res) => {
    const alumnoId = req.usuario.AlumnoInfoID;

    const profesores = await alumnoService.obtenerProfesoresAsignados(alumnoId);

    res.status(200).json({
      status: 'success',
      results: profesores.length,
      data: profesores
    });
  }),

  /**
   * Obtener información del semestre actual
   */
  obtenerSemestreActual: catchAsync(async (req, res) => {
    const semestre = await alumnoService.obtenerSemestreActual();

    if (!semestre) {
      return res.status(404).json({
        status: 'error',
        message: 'No hay un semestre activo actualmente'
      });
    }

    res.status(200).json({
      status: 'success',
      data: semestre
    });
  }),

  /**
   * Obtener todos los consultorios disponibles
   */
  obtenerConsultorios: catchAsync(async (req, res) => {
    const consultorios = await alumnoService.obtenerConsultorios();

    res.status(200).json({
      status: 'success',
      results: consultorios.length,
      data: consultorios
    });
  }),

  /**
   * Obtener catálogos generales por tipo
   */
  obtenerCatalogo: catchAsync(async (req, res) => {
    const { tipo } = req.params;

    const tiposValidos = [
      'GENERO', 'ESTADO_CIVIL', 'ESCOLARIDAD', 'TIPO_LENTE',
      'METODO_MEDICION', 'DOMINANCIA_OCULAR', 'TIPO_TONOMETRIA',
      'TIPO_TEST_BINOCULAR', 'TIPO_VISION_ESTEREO', 'ESTADO_HISTORIAL'
    ];

    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        status: 'error',
        message: `Tipo de catálogo no válido. Los tipos válidos son: ${tiposValidos.join(', ')}`
      });
    }

    const catalogo = await alumnoService.obtenerCatalogo(tipo);

    res.status(200).json({
      status: 'success',
      results: catalogo.length,
      data: catalogo
    });
  }),

  /**
   * Buscar pacientes por nombre o correo
   */
  buscarPacientes: catchAsync(async (req, res) => {
    const { termino } = req.query;

    if (!termino || termino.length < 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Por favor proporciona un término de búsqueda de al menos 3 caracteres'
      });
    }

    const pacientes = await alumnoService.buscarPacientes(termino);

    res.status(200).json({
      status: 'success',
      results: pacientes.length,
      data: pacientes
    });
  }),

  /**
   * Actualizar datos del perfil
   */
  actualizarPerfil: catchAsync(async (req, res) => {
    const alumnoId = req.usuario.AlumnoInfoID;
    const usuarioId = req.usuario.UsuarioID;

    const { nombreUsuario, telefonoCelular } = req.body;

    if (!nombreUsuario && !telefonoCelular) {
      return res.status(400).json({
        status: 'error',
        message: 'Debes enviar al menos un campo para actualizar'
      });
    }

    await alumnoService.actualizarPerfil(alumnoId, usuarioId, {
      nombreUsuario: nombreUsuario?.trim(),
      telefonoCelular: telefonoCelular?.trim()
    });

    res.status(200).json({
      status: 'success',
      message: 'Perfil actualizado correctamente',
      data: null
    });
  }),

  /**
   * Actualiza la contraseña del alumno
   */
  actualizarPassword: catchAsync(async (req, res) => {
    const { passwordActual, nuevaPassword } = req.body;
    const usuarioId = req.usuario.UsuarioID;

    if (!passwordActual || !nuevaPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Contraseña actual y nueva son requeridas'
      });
    }

    try {
      await alumnoService.actualizarPassword(usuarioId, passwordActual, nuevaPassword);

      res.status(200).json({
        status: 'success',
        message: 'Contraseña actualizada correctamente'
      });
    } catch (error) {
      console.error('Error en actualizarPassword controller:', error);

      // Manejar errores específicos
      if (error.message === 'Contraseña actual incorrecta') {
        return res.status(400).json({
          status: 'error',
          message: 'La contraseña actual es incorrecta'
        });
      }

      // Para otros errores, dejamos que catchAsync los maneje
      throw error;
    }
  })
};

module.exports = alumnoController;