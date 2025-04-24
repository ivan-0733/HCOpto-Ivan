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

  // Verificar credenciales
  const alumno = await authService.verificarCredencialesAlumno(boleta, correo, password);
  if (!alumno) {
    return res.status(401).json({
    status: 'error',
    message: 'Credenciales incorrectas'
    });
  }

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