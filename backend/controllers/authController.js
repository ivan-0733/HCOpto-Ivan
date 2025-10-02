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

    // Devolver respuesta exitosa
    res.status(200).json({
      status: 'success',
      token,
      data: {
        id: alumno.AlumnoInfoID,
        usuarioId: alumno.UsuarioID,
        nombreUsuario: alumno.NombreUsuario,
        correo: alumno.CorreoElectronico,
        boleta: alumno.NumeroBoleta,
        semestre: alumno.SemestreActual
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

    // Verificar si es admin
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
            rol: 'admin'
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

    // Devolver respuesta exitosa
    res.status(200).json({
      status: 'success',
      token,
      data: {
        id: profesor.ProfesorInfoID,
        usuarioId: profesor.UsuarioID,
        nombreUsuario: profesor.NombreUsuario,
        correo: profesor.CorreoElectronico,
        numeroEmpleado: profesor.NumeroEmpleado
      }
    });
  }),

  /**
 * Verificar si existe usuario admin
 */
async verificarExistenciaAdmin() {
  try {
    const [usuarios] = await db.query(
      `SELECT u.ID as usuarioId, u.NombreUsuario, u.CorreoElectronico, r.NombreRol as rol
       FROM Usuarios u
       JOIN Roles r ON u.RolID = r.ID
       WHERE u.NombreUsuario = 'admin' AND r.NombreRol = 'admin' AND u.EstaActivo = TRUE`
    );

    if (usuarios.length > 0) {
      return {
        id: usuarios[0].usuarioId,
        usuarioId: usuarios[0].usuarioId,
        nombreUsuario: usuarios[0].NombreUsuario,
        correo: usuarios[0].CorreoElectronico,
        rol: usuarios[0].rol
      };
    }

    return null;
  } catch (error) {
    console.error('Error al verificar existencia de admin:', error);
    throw error;
  }
},

/**
 * Crear usuario admin si no existe
 */
async crearUsuarioAdmin() {
  const connection = await db.pool.getConnection();

  try {
    await connection.beginTransaction();

    // Obtener ID del rol admin
    const [roles] = await connection.query(
      'SELECT ID FROM Roles WHERE NombreRol = "admin"'
    );

    if (roles.length === 0) {
      throw new Error('Rol admin no encontrado en la base de datos');
    }

    const rolAdminID = roles[0].ID;

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('admin', 10);

    const [result] = await connection.query(
      `INSERT INTO Usuarios (NombreUsuario, CorreoElectronico, ContraseñaHash, RolID, EstaActivo)
       VALUES ('admin', 'admin@admin.ipn', ?, ?, TRUE)`,
      [hashedPassword, rolAdminID]
    );

    await connection.commit();

    return {
      id: result.insertId,
      usuarioId: result.insertId,
      nombreUsuario: 'admin',
      correo: 'admin@admin.ipn',
      rol: 'admin'
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear usuario admin:', error);
    throw error;
  } finally {
    connection.release();
  }
},

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