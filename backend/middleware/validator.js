const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../utils/errorHandler');

/**
 * Middleware para validar los resultados de las validaciones anteriores
 */
const validateResults = (req, res, next) => {
const errors = validationResult(req);
if (!errors.isEmpty()) {
const errorMessages = errors.array().map(err => `${err.msg}`).join(', ');
return next(new AppError(errorMessages, 400));
}
next();
};

/**
 * Reglas de validación para el inicio de sesión de alumnos
 */
const loginAlumnoRules = [
body('boleta')
.notEmpty().withMessage('El número de boleta es obligatorio')
.isString().withMessage('El número de boleta debe ser texto'),

body('correo')
.notEmpty().withMessage('El correo electrónico es obligatorio')
.isEmail().withMessage('Introduce un correo electrónico válido'),

body('password')
.notEmpty().withMessage('La contraseña es obligatoria')
.isString().withMessage('La contraseña debe ser texto')
];

/**
 * Reglas de validación para crear una nueva historia clínica
 */
const crearHistoriaClinicaRules = [
body('profesorID')
.notEmpty().withMessage('El ID del profesor es obligatorio')
.isNumeric().withMessage('El ID del profesor debe ser un número'),

body('consultorioID')
.notEmpty().withMessage('El ID del consultorio es obligatorio')
.isNumeric().withMessage('El ID del consultorio debe ser un número'),

body('semestreID')
.notEmpty().withMessage('El ID del semestre es obligatorio')
.isNumeric().withMessage('El ID del semestre debe ser un número'),

body('paciente')
.notEmpty().withMessage('Los datos del paciente son obligatorios')
.isObject().withMessage('Los datos del paciente deben ser un objeto'),

body('paciente.nombre')
.notEmpty().withMessage('El nombre del paciente es obligatorio')
.isString().withMessage('El nombre debe ser texto'),

body('paciente.apellidoPaterno')
.notEmpty().withMessage('El apellido paterno del paciente es obligatorio')
.isString().withMessage('El apellido paterno debe ser texto'),

body('paciente.generoID')
.notEmpty().withMessage('El género del paciente es obligatorio')
.isNumeric().withMessage('El ID del género debe ser un número'),

body('paciente.edad')
.notEmpty().withMessage('La edad del paciente es obligatoria')
.isInt({ min: 1, max: 130 }).withMessage('La edad debe ser un número entre 1 y 130'),

body('paciente.correoElectronico')
.notEmpty().withMessage('El correo del paciente es obligatorio')
.isEmail().withMessage('Introduce un correo válido')
];

/**
 * Reglas de validación para actualizar una sección de historia clínica
 */
const actualizarSeccionRules = [
param('id')
.notEmpty().withMessage('El ID de la historia clínica es obligatorio')
.isNumeric().withMessage('El ID debe ser un número'),

param('seccion')
.notEmpty().withMessage('El nombre de la sección es obligatorio')
.isString().withMessage('El nombre de la sección debe ser texto')
.isIn([
    'interrogatorio', 'agudezaVisual', 'lensometria', 'diagnostico',
    'planTratamiento', 'pronostico', 'recetaFinal'
]).withMessage('Sección no válida')
];

/**
 * Reglas de validación para responder a un comentario
 */
const responderComentarioRules = [
param('id')
.notEmpty().withMessage('El ID de la historia clínica es obligatorio')
.isNumeric().withMessage('El ID debe ser un número'),

param('comentarioId')
.notEmpty().withMessage('El ID del comentario es obligatorio')
.isNumeric().withMessage('El ID debe ser un número'),

body('respuesta')
.notEmpty().withMessage('La respuesta es obligatoria')
.isString().withMessage('La respuesta debe ser texto')
];

/**
 * Reglas de validación para cambiar el estado de una historia clínica
 */
const cambiarEstadoRules = [
param('id')
.notEmpty().withMessage('El ID de la historia clínica es obligatorio')
.isNumeric().withMessage('El ID debe ser un número'),

body('estadoId')
.notEmpty().withMessage('El ID del estado es obligatorio')
.isNumeric().withMessage('El ID debe ser un número')
];

/**
 * Reglas de validación para la búsqueda de pacientes
 */
const buscarPacientesRules = [
query('termino')
.notEmpty().withMessage('El término de búsqueda es obligatorio')
.isString().withMessage('El término de búsqueda debe ser texto')
.isLength({ min: 3 }).withMessage('El término de búsqueda debe tener al menos 3 caracteres')
];

module.exports = {
validateResults,
loginAlumnoRules,
crearHistoriaClinicaRules,
actualizarSeccionRules,
responderComentarioRules,
cambiarEstadoRules,
buscarPacientesRules
};