const jwt = require('jsonwebtoken');
const config = require('../config/config');
const authService = require('../services/authService');
const { AppError } = require('../utils/errorHandler');

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

/**
 * Middleware para comprobar si se es alumno propietario de una historia clínica
 */
const checkHistoriaOwnership = async (req, res, next) => {
try {
const { id } = req.params;
const alumnoId = req.usuario.AlumnoInfoID;

// Verificar si la historia pertenece al alumno
const [historias] = await db.query(
    'SELECT ID FROM HistorialesClinicos WHERE ID = ? AND AlumnoID = ?',
    [id, alumnoId]
);

if (historias.length === 0) {
    return next(new AppError('No tienes permiso para acceder a esta historia clínica', 403));
}

next();
} catch (error) {
next(error);
}
};

module.exports = {
verifyToken,
checkRole,
checkHistoriaOwnership
};