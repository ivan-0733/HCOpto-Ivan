const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database.js');

/**
 * Servicio para la autenticación de usuarios
 */
const authService = {
  /**
   * Verifica las credenciales de un alumno y devuelve los datos si son correctos
   * @param {string} boleta - Número de boleta del alumno
   * @param {string} correo - Correo electrónico del alumno
   * @param {string} password - Contraseña del alumno
   * @returns {Promise<Object|null>} - Datos del alumno o null si las credenciales son incorrectas
   */
  async verificarCredencialesAlumno(boleta, correo) {
    try {
      const [alumnos] = await db.query(
        `SELECT a.ID AS AlumnoInfoID, a.NumeroBoleta, a.SemestreActual, 
                u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico, u.ContraseñaHash 
        FROM AlumnosInfo a 
        JOIN Usuarios u ON a.UsuarioID = u.ID 
        WHERE a.NumeroBoleta = ? AND u.CorreoElectronico = ? 
        AND u.EstaActivo = TRUE`,
        [boleta, correo]
      );

      if (alumnos.length === 0) {
        return null;
      }
      
      return alumnos[0];
    } catch (error) {
      console.error('Error al verificar credenciales:', error);
      throw error;
    }
  },

  /**
   * Compara una contraseña plana con el hash almacenado
   * @param {string} password - Contraseña plana
   * @param {string} hashedPassword - Hash de la contraseña almacenada
   * @returns {Promise<boolean>} - true si la contraseña es correcta
   */
  async verificarPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  },

  /**
   * Genera un token JWT para un usuario
   * @param {number} usuarioId - ID del usuario
   * @param {string} role - Rol del usuario (alumno, profesor, investigador)
   * @returns {string} - Token JWT
   */
  generarToken(usuarioId, role) {
    return jwt.sign(
      { id: usuarioId, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  },

  /**
   * Actualiza la fecha de último acceso de un usuario
   * @param {number} usuarioId - ID del usuario
   * @returns {Promise<void>}
   */
  async actualizarUltimoAcceso(usuarioId) {
    try {
      await db.query(
        'UPDATE Usuarios SET FechaUltimoAcceso = NOW() WHERE ID = ?',
        [usuarioId]
      );
    } catch (error) {
      console.error('Error al actualizar último acceso:', error);
      throw error;
    }
  },

  /**
   * Verifica si un token JWT es válido
   * @param {string} token - Token JWT
   * @returns {Promise<Object|null>} - Datos del token decodificado o null si no es válido
   */
  async verificarToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      return null;
    }
  },

  /**
   * Obtiene los datos de un usuario por su ID
   * @param {number} usuarioId - ID del usuario
   * @param {string} role - Rol del usuario (alumno, profesor, investigador)
   * @returns {Promise<Object|null>} - Datos del usuario o null si no existe
   */
  async obtenerUsuarioPorId(usuarioId, role) {
    try {
      let query;
      let params = [usuarioId];
      
      switch (role) {
        case 'alumno':
          query = `
            SELECT a.ID AS AlumnoInfoID, a.NumeroBoleta, a.SemestreActual, 
                  u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico, 
                  u.EstaActivo, u.TelefonoCelular
            FROM AlumnosInfo a 
            JOIN Usuarios u ON a.UsuarioID = u.ID 
            WHERE u.ID = ? AND u.EstaActivo = TRUE`;
          break;
        
        case 'profesor':
          query = `
            SELECT p.ID AS ProfesorInfoID, p.NumeroEmpleado, 
                  u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico, 
                  u.EstaActivo, u.TelefonoCelular
            FROM ProfesoresInfo p 
            JOIN Usuarios u ON p.UsuarioID = u.ID 
            WHERE u.ID = ? AND u.EstaActivo = TRUE`;
          break;
        
        case 'investigador':
          query = `
            SELECT i.ID AS InvestigadorInfoID, i.Institucion, i.AreaEspecialidad,
                  u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico, 
                  u.EstaActivo, u.TelefonoCelular
            FROM InvestigadoresInfo i 
            JOIN Usuarios u ON i.UsuarioID = u.ID 
            WHERE u.ID = ? AND u.EstaActivo = TRUE`;
          break;
        
        default:
          query = `
            SELECT ID AS UsuarioID, NombreUsuario, CorreoElectronico, 
                  EstaActivo, TelefonoCelular 
            FROM Usuarios 
            WHERE ID = ? AND EstaActivo = TRUE`;
      }
      
      const [usuarios] = await db.query(query, params);
      
      if (usuarios.length === 0) {
        return null;
      }
      
      return usuarios[0];
    } catch (error) {
      console.error('Error al obtener usuario por ID:', error);
      throw error;
    }
  }
};

module.exports = authService;
