/**
 * Envuelve funciones asíncronas para el manejo de errores en Express
 * @param {Function} fn - Función asíncrona a envolver
 * @returns {Function} - Función envuelta con manejo de errores
 */
const catchAsync = (fn) => {
return (req, res, next) => {
    fn(req, res, next).catch(next);
};
};

/**
 * Clase personalizada para errores operacionales
 */
class AppError extends Error {
constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
}
}

/**
 * Middleware para manejar errores en la aplicación
 */
const errorHandler = (err, req, res, next) => {
err.statusCode = err.statusCode || 500;
err.status = err.status || 'error';

// Modo desarrollo: enviar detalles completos del error
if (process.env.NODE_ENV === 'development') {
    console.error('ERROR 💥', err);
    
    return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
    });
}

// Modo producción: enviar mensaje de error genérico
if (err.isOperational) {
    return res.status(err.statusCode).json({
    status: err.status,
    message: err.message
    });
}

// Error de programación o desconocido: no exponer detalles
console.error('ERROR 💥', err);
return res.status(500).json({
    status: 'error',
    message: 'Algo salió mal. Por favor intenta más tarde.'
});
};

module.exports = {
catchAsync,
AppError,
errorHandler
};