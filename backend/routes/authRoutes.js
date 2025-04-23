const express = require('express');
const authController = require('../controllers/authController');
const { loginAlumnoRules, validateResults } = require('../middleware/validator');

const router = express.Router();

// Rutas de autenticación
router.post('/login/alumno', loginAlumnoRules, validateResults, authController.loginAlumno);

module.exports = router;