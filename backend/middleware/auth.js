const jwt = require('jsonwebtoken');
const config = require('../config/config');
const authService = require('../services/authService');
const { AppError } = require('../utils/errorHandler');
const db = require('../config/database');

/**
 * Middleware para verificar si un usuario está autenticado
 */
const verifyToken = async (req, res, next) => {
  try {
    // Obtener token del header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('No has iniciado sesión. Por favor inicia sesión para obtener acceso.', 401));
    }

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Obtener datos del usuario
    const usuario = await authService.obtenerUsuarioPorId(decoded.id, decoded.role);
    if (!usuario) {
      return next(new AppError('El usuario al que pertenece este token ya no existe.', 401));
    }

    // Agregar usuario a la request
    req.usuario = usuario;
    req.role = decoded.role;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido. Por favor inicia sesión de nuevo.', 401));
    }

    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Tu sesión ha expirado. Por favor inicia sesión de nuevo.', 401));
    }

    next(error);
  }
};

/**
 * Middleware para verificar si el usuario tiene el rol especificado
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    // Roles puede ser un string o un array de strings
    const rolesPermitidos = Array.isArray(roles) ? roles : [roles];

    if (!req.role || !rolesPermitidos.includes(req.role)) {
      return next(new AppError('No tienes permiso para acceder a este recurso', 403));
    }

    next();
  };
};

// REEMPLAZA el middleware checkHistoriaOwnership en backend/middleware/auth.js

/**
 * Middleware para comprobar si se tiene acceso a una historia clínica
 * - ADMIN: Acceso a todas las historias
 * - PROFESOR: Solo historias de sus alumnos asignados
 * - ALUMNO: Solo sus propias historias
 */
const checkHistoriaOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.role; // El rol viene del middleware verifyToken

    // Normalizar el rol a minúsculas
    const rol = userRole ? userRole.toLowerCase() : '';

    // ✅ ADMIN tiene acceso a TODAS las historias
    if (rol === 'admin') {
      console.log(`Acceso permitido a historia ${id} - Rol: ADMIN (acceso total)`);
      return next();
    }

    // ✅ PROFESOR solo puede acceder a historias de SUS alumnos
    if (rol === 'profesor') {
      const profesorInfoId = req.usuario.ProfesorInfoID;

      if (!profesorInfoId) {
        return next(new AppError('No se pudo identificar al profesor', 400));
      }

      // Verificar si el profesor tiene acceso a esta historia
      // (es decir, si el alumno de la historia está inscrito en alguna de sus materias)
      const [historias] = await db.query(
        `SELECT hc.ID
         FROM HistorialesClinicos hc
         INNER JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
         WHERE hc.ID = ? AND mp.ProfesorInfoID = ?`,
        [id, profesorInfoId]
      );

      if (historias.length === 0) {
        console.log(`Acceso denegado a historia ${id} - Profesor ${profesorInfoId} no tiene asignado este alumno`);
        return next(new AppError('No tienes permiso para acceder a esta historia clínica', 403));
      }

      console.log(`Acceso permitido a historia ${id} - Profesor ${profesorInfoId} tiene asignado este alumno`);
      return next();
    }

    // ✅ ALUMNO solo puede acceder a sus propias historias
    if (rol === 'alumno') {
      const alumnoId = req.usuario.AlumnoInfoID;

      if (!alumnoId) {
        return next(new AppError('No se pudo identificar al alumno', 400));
      }

      // Verificar si la historia pertenece al alumno
      const [historias] = await db.query(
        'SELECT ID FROM HistorialesClinicos WHERE ID = ? AND AlumnoID = ?',
        [id, alumnoId]
      );

      if (historias.length === 0) {
        console.log(`Acceso denegado a historia ${id} - No pertenece al alumno ${alumnoId}`);
        return next(new AppError('No tienes permiso para acceder a esta historia clínica', 403));
      }

      console.log(`Acceso permitido a historia ${id} - Alumno ${alumnoId} es propietario`);
      return next();
    }

    // Si el rol no es ninguno de los anteriores, denegar acceso
    return next(new AppError('No tienes permiso para acceder a este recurso', 403));

  } catch (error) {
    console.error('Error en checkHistoriaOwnership:', error);
    next(error);
  }
};

module.exports = {
  verifyToken,
  checkRole,
  checkHistoriaOwnership
};