const express = require('express');
const authController = require('../controllers/authController');
const { loginAlumnoRules, loginProfesorRules, validateResults } = require('../middleware/validator');

const router = express.Router();

// Rutas de autenticación
router.post('/login/alumno', loginAlumnoRules, validateResults, authController.loginAlumno);
router.post('/login/profesor', loginProfesorRules, validateResults, authController.loginProfesor);

module.exports = router;