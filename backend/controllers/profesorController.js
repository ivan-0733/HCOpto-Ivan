const profesorService = require('../services/profesorService');
const historiaClinicaService = require('../services/historiaClinicaService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Controlador para manejar las operaciones de profesores
 */
const profesorController = {
  /**
   * Obtener datos del perfil del profesor logueado
   */
  obtenerPerfil: catchAsync(async (req, res) => {
    console.log('🔄 === INICIANDO obtenerPerfil ===');
    console.log('req.usuario:', req.usuario);
    console.log('req.role:', req.role);

    const profesorId = req.usuario.ProfesorInfoID;
    console.log('profesorId extraído:', profesorId);

    if (!profesorId) {
      console.log('❌ ProfesorInfoID no encontrado en req.usuario');
      return res.status(400).json({
        status: 'error',
        message: 'ID de profesor no encontrado'
      });
    }

    console.log('🔄 Llamando a profesorService.obtenerProfesorPorId...');
    const perfil = await profesorService.obtenerProfesorPorId(profesorId);
    console.log('Perfil obtenido del service:', perfil);

    if (!perfil) {
      console.log('❌ Perfil no encontrado en la base de datos');
      return res.status(404).json({
        status: 'error',
        message: 'Profesor no encontrado'
      });
    }

    // Asegurarse de no enviar información sensible
    if (perfil.ContraseñaHash) {
      delete perfil.ContraseñaHash;
    }

    console.log('✅ Enviando respuesta exitosa del perfil');
    res.status(200).json({
      status: 'success',
      data: perfil
    });
  }),

  /**
   * Obtener historias clínicas de los alumnos del profesor
   */
  obtenerHistoriasClinicas: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const historias = await historiaClinicaService.obtenerHistoriasClinicasPorProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      results: historias.length,
      data: historias
    });
  }),

  /**
 * Obtener una historia clínica específica por ID (desde perspectiva del profesor)
 */
obtenerHistoriaClinica: catchAsync(async (req, res) => {
  const { id } = req.params;
  const profesorId = req.usuario.ProfesorInfoID;

  console.log(`Profesor Controller: Obteniendo historia clínica ID=${id} para profesorId=${profesorId}`);

  const historia = await historiaClinicaService.obtenerHistoriaClinicaPorIdProfesor(id, profesorId);

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

  /**
   * Obtener estadísticas de historias clínicas del profesor
   */
  obtenerEstadisticasHistorias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const estadisticas = await historiaClinicaService.obtenerEstadisticasPorProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      data: estadisticas
    });
  }),

  /**
   * Obtener alumnos asignados al profesor
   */
  obtenerAlumnosAsignados: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const alumnos = await profesorService.obtenerAlumnosAsignados(profesorId);

    res.status(200).json({
      status: 'success',
      results: alumnos.length,
      data: alumnos
    });
  }),

  /**
   * Obtener materias del profesor
   */
  obtenerMaterias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const materias = await profesorService.obtenerMateriasProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      results: materias.length,
      data: materias
    });
  }),

  /**
   * Obtener todas las materias del profesor (incluyendo históricas)
   */
  obtenerTodasMaterias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const materias = await profesorService.obtenerTodasMateriasProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      results: materias.length,
      data: materias
    });
  }),

  /**
   * Obtener información del período escolar actual
   */
  obtenerPeriodoEscolar: catchAsync(async (req, res) => {
    const periodo = await profesorService.obtenerPeriodoEscolarActual();

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
   * Actualizar datos del perfil
   */
  actualizarPerfil: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const usuarioId = req.usuario.UsuarioID;

    const { nombreUsuario, correoElectronico, telefonoCelular } = req.body;

    if (!nombreUsuario && !correoElectronico && !telefonoCelular) {
      return res.status(400).json({
        status: 'error',
        message: 'Debes enviar al menos un campo para actualizar'
      });
    }

    try {
      await profesorService.actualizarPerfil(profesorId, usuarioId, {
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

  /**
   * Verificar contraseña actual
   */
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
      const esValida = await profesorService.verificarPassword(usuarioId, passwordActual);

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
   * Actualiza la contraseña del profesor
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
      await profesorService.actualizarPassword(usuarioId, passwordActual, nuevaPassword);

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

module.exports = profesorController;