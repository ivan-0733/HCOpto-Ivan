const authService = require('../services/authService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Controlador para manejar las operaciones de autenticación
 */
const authController = {
  /**
   * Iniciar sesión como alumno
   */
  loginAlumno: catchAsync(async (req, res) => {
    const { boleta, correo, password } = req.body;

    // Validar datos de entrada
    if (!boleta || !correo || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Por favor proporciona boleta, correo y contraseña'
      });
    }

    // Verificar si existe el alumno con la boleta proporcionada
    const alumnoExiste = await authService.verificarExistenciaAlumno(boleta);
    if (!alumnoExiste) {
      return res.status(401).json({
        status: 'error',
        message: 'La boleta ingresada no existe en el sistema'
      });
    }

    // Verificar si el correo corresponde a la boleta
    const correoCorresponde = await authService.verificarCorreoBoleta(boleta, correo);
    if (!correoCorresponde) {
      // Verificar si el correo existe pero con otra boleta
      const existeCorreo = await authService.verificarExistenciaCorreo(correo);
      if (existeCorreo) {
        return res.status(401).json({
          status: 'error',
          message: 'El correo no corresponde a esta boleta'
        });
      } else {
        return res.status(401).json({
          status: 'error',
          message: 'El correo electrónico ingresado no existe en el sistema'
        });
      }
    }

    // Verificar si la cuenta está activa
    const cuentaActiva = await authService.verificarCuentaActiva(boleta);
    if (!cuentaActiva) {
      return res.status(401).json({
        status: 'error',
        message: 'Cuenta desactivada. Por favor, contacte al administrador.'
      });
    }

    // Verificar la contraseña
    const passwordCorrecta = await authService.verificarPasswordAlumno(boleta, correo, password);
    if (!passwordCorrecta) {
      return res.status(401).json({
        status: 'error',
        message: 'La contraseña es incorrecta'
      });
    }

    // Obtener datos del alumno
    const alumno = await authService.obtenerDatosAlumno(boleta, correo);

    // Actualizar fecha de último acceso
    await authService.actualizarUltimoAcceso(alumno.UsuarioID);

    // Generar token
    const token = authService.generarToken(alumno.UsuarioID, 'alumno');

    // ✅ CORREGIDO: Incluir ROL en la respuesta
    res.status(200).json({
      status: 'success',
      token,
      data: {
        id: alumno.AlumnoInfoID,
        usuarioId: alumno.UsuarioID,
        nombreUsuario: alumno.NombreUsuario,
        correo: alumno.CorreoElectronico,
        boleta: alumno.NumeroBoleta,
        semestre: alumno.SemestreActual,
        rol: 'alumno'  // ← AGREGADO
      }
    });
  }),

  /**
   * Iniciar sesión como profesor
   */
  loginProfesor: catchAsync(async (req, res) => {
    const { numeroEmpleado, correo, password } = req.body;

    if (!numeroEmpleado || !correo || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Por favor proporciona número de empleado, correo y contraseña'
      });
    }

    // ✅ VERIFICAR SI ES ADMIN PRIMERO
    if (numeroEmpleado === 'admin' && correo === 'admin@admin.ipn' && password === 'admin') {
      // Buscar o crear usuario admin
      let adminUser = await authService.verificarExistenciaAdmin();

      if (!adminUser) {
        adminUser = await authService.crearUsuarioAdmin();
      }

      const token = authService.generarToken(adminUser.id, 'admin');

      return res.status(200).json({
        status: 'success',
        token,
        data: {
          usuario: {
            id: adminUser.id,
            usuarioId: adminUser.usuarioId,
            nombreUsuario: adminUser.nombreUsuario,
            correo: adminUser.correo,
            numeroEmpleado: 'admin',
            rol: 'admin'  // ← Ya estaba correcto
          }
        }
      });
    }

    // Verificar si existe el profesor con el número de empleado proporcionado
    const profesorExiste = await authService.verificarExistenciaProfesor(numeroEmpleado);
    if (!profesorExiste) {
      return res.status(401).json({
        status: 'error',
        message: 'El número de empleado ingresado no existe en el sistema'
      });
    }

    // Verificar si el correo corresponde al número de empleado
    const correoCorresponde = await authService.verificarCorreoNumeroEmpleado(numeroEmpleado, correo);
    if (!correoCorresponde) {
      // Verificar si el correo existe pero con otro número de empleado
      const existeCorreo = await authService.verificarExistenciaCorreo(correo);
      if (existeCorreo) {
        return res.status(401).json({
          status: 'error',
          message: 'El correo no corresponde a este número de empleado'
        });
      } else {
        return res.status(401).json({
          status: 'error',
          message: 'El correo electrónico ingresado no existe en el sistema'
        });
      }
    }

    // Verificar si la cuenta está activa
    const cuentaActiva = await authService.verificarCuentaActivaProfesor(numeroEmpleado);
    if (!cuentaActiva) {
      return res.status(401).json({
        status: 'error',
        message: 'Cuenta desactivada. Por favor, contacte al administrador.'
      });
    }

    // Verificar la contraseña
    const passwordCorrecta = await authService.verificarPasswordProfesor(numeroEmpleado, correo, password);
    if (!passwordCorrecta) {
      return res.status(401).json({
        status: 'error',
        message: 'La contraseña es incorrecta'
      });
    }

    // Obtener datos del profesor
    const profesor = await authService.obtenerDatosProfesor(numeroEmpleado, correo);

    // Actualizar fecha de último acceso
    await authService.actualizarUltimoAcceso(profesor.UsuarioID);

    // Generar token
    const token = authService.generarToken(profesor.UsuarioID, 'profesor');

    // ✅ CORREGIDO: Incluir ROL en la respuesta
    res.status(200).json({
      status: 'success',
      token,
      data: {
        id: profesor.ProfesorInfoID,
        usuarioId: profesor.UsuarioID,
        nombreUsuario: profesor.NombreUsuario,
        correo: profesor.CorreoElectronico,
        numeroEmpleado: profesor.NumeroEmpleado,
        rol: 'profesor'  // ← AGREGADO
      }
    });
  }),

  /**
   * Verificar si un usuario está autenticado (middleware)
   */
  verificarAuth: catchAsync(async (req, res, next) => {
    // Obtener token del header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No has iniciado sesión. Por favor inicia sesión para obtener acceso.'
      });
    }

    // Verificar token
    const decoded = await authService.verificarToken(token);
    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Token no válido o expirado'
      });
    }

    // Obtener datos del usuario
    const usuario = await authService.obtenerUsuarioPorId(decoded.id, decoded.role);
    if (!usuario) {
      return res.status(401).json({
        status: 'error',
        message: 'El usuario al que pertenece este token ya no existe.'
      });
    }

    // Agregar usuario a la request
    req.usuario = usuario;
    req.role = decoded.role;

    next();
  }),

  /**
   * Verificar si el usuario tiene el rol especificado (middleware)
   */
  verificarRol: (roles) => {
    return (req, res, next) => {
      // roles puede ser un string o un array de strings
      const rolesPermitidos = Array.isArray(roles) ? roles : [roles];

      if (!rolesPermitidos.includes(req.role)) {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes permiso para acceder a este recurso'
        });
      }

      next();
    };
  }
};

module.exports = authController;