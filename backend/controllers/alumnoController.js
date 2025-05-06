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
   * Obtener información del período escolar actual
   */
  obtenerPeriodoEscolar: catchAsync(async (req, res) => {
    const periodo = await alumnoService.obtenerPeriodoEscolarActual();

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

  /**
   * Obtener materias del alumno
   */
  obtenerMaterias: catchAsync(async (req, res) => {
    const alumnoId = req.usuario.AlumnoInfoID;

    const materias = await alumnoService.obtenerMateriasAlumno(alumnoId);

    res.status(200).json({
      status: 'success',
      results: materias.length,
      data: materias
    });
  }),

  /**
   * Obtener todas las materias del alumno (incluyendo las de periodos anteriores)
   */
  obtenerTodasMaterias: catchAsync(async (req, res) => {
    const alumnoId = req.usuario.AlumnoInfoID;

    const materias = await alumnoService.obtenerTodasMateriasAlumno(alumnoId);

    res.status(200).json({
      status: 'success',
      results: materias.length,
      data: materias
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

    const { nombreUsuario, correoElectronico, telefonoCelular } = req.body;

    if (!nombreUsuario && !correoElectronico && !telefonoCelular) {
      return res.status(400).json({
        status: 'error',
        message: 'Debes enviar al menos un campo para actualizar'
      });
    }

    try {
      await alumnoService.actualizarPerfil(alumnoId, usuarioId, {
        nombreUsuario: nombreUsuario?.trim(),
        correoElectronico: correoElectronico?.trim().toLowerCase(),
        telefonoCelular: telefonoCelular?.trim()
      });

      res.status(200).json({
        status: 'success',
        message: 'Perfil actualizado correctamente',
        data: null
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);

      // Manejar errores específicos
      if (error.message.includes('nombre de usuario ya existe') ||
          error.message.includes('correo electrónico ya existe') ||
          error.message.includes('número de teléfono ya existe')) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }

      // Para errores de duplicación de MySQL
      if (error.code === 'ER_DUP_ENTRY') {
        let message = 'Ya existe un registro con esos datos.';

        if (error.sqlMessage.includes('idx_telefono')) {
          message = 'El número de teléfono ya está registrado. Por favor, utiliza otro.';
        } else if (error.sqlMessage.includes('idx_correo')) {
          message = 'El correo electrónico ya está registrado. Por favor, utiliza otro.';
        } else if (error.sqlMessage.includes('idx_nombre')) {
          message = 'El nombre de usuario ya está en uso. Por favor, elige otro.';
        }

        return res.status(400).json({
          status: 'error',
          message: message,
          sqlCode: error.code,
          sqlMessage: error.sqlMessage
        });
      }

      // Si es otro tipo de error, lo pasamos al manejador global
      throw error;
    }
  }),

  // Agregar este método a alumnoController.js
  verificarPassword: catchAsync(async (req, res) => {
    const { passwordActual } = req.body;
    const usuarioId = req.usuario.UsuarioID;

    if (!passwordActual) {
      return res.status(400).json({
        status: 'error',
        message: 'La contraseña actual es requerida'
      });
    }

    try {
      const esValida = await alumnoService.verificarPassword(usuarioId, passwordActual);

      res.status(200).json({
        status: 'success',
        data: esValida
      });
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Error al verificar contraseña'
      });
    }
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