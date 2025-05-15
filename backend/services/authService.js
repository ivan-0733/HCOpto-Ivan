const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database.js');

/**
 * Servicio para la autenticación de usuarios
 */
const authService = {
  /**
   * Verifica si existe un alumno con la boleta especificada
   * @param {string} boleta - Número de boleta del alumno
   * @returns {Promise<boolean>} - true si existe, false en caso contrario
   */
  async verificarExistenciaAlumno(boleta) {
    try {
      const [alumnos] = await db.query(
        `SELECT COUNT(*) as count
        FROM AlumnosInfo a
        JOIN Usuarios u ON a.UsuarioID = u.ID
        WHERE a.NumeroBoleta = ?`,  // Removed the EstaActivo condition
        [boleta]
      );

      return alumnos[0].count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de alumno:', error);
      throw error;
    }
  },

  /**
   * Verifica si el correo proporcionado corresponde a la boleta
   * @param {string} boleta - Número de boleta del alumno
   * @param {string} correo - Correo electrónico
   * @returns {Promise<boolean>} - true si corresponde, false en caso contrario
   */
  async verificarCorreoBoleta(boleta, correo) {
    try {
      const [alumnos] = await db.query(
        `SELECT COUNT(*) as count
        FROM AlumnosInfo a
        JOIN Usuarios u ON a.UsuarioID = u.ID
        WHERE a.NumeroBoleta = ?
        AND u.CorreoElectronico = ?`,
        [boleta, correo]
      );

      return alumnos[0].count > 0;
    } catch (error) {
      console.error('Error al verificar correo y boleta:', error);
      throw error;
    }
  },

  /**
   * Verifica si existe un usuario con el correo especificado
   * @param {string} correo - Correo electrónico
   * @returns {Promise<boolean>} - true si existe, false en caso contrario
   */
  async verificarExistenciaCorreo(correo) {
    try {
      const [usuarios] = await db.query(
        `SELECT COUNT(*) as count
        FROM Usuarios
        WHERE CorreoElectronico = ?`,
        [correo]
      );

      return usuarios[0].count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de correo:', error);
      throw error;
    }
  },

  /**
   * Verifica si la contraseña es correcta para un alumno
   * @param {string} boleta - Número de boleta del alumno
   * @param {string} correo - Correo electrónico del alumno
   * @param {string} password - Contraseña a verificar
   * @returns {Promise<boolean>} - true si la contraseña es correcta
   */
  async verificarPasswordAlumno(boleta, correo, password) {
    try {
      const [alumnos] = await db.query(
        `SELECT u.ContraseñaHash
        FROM AlumnosInfo a
        JOIN Usuarios u ON a.UsuarioID = u.ID
        WHERE a.NumeroBoleta = ?
        AND u.CorreoElectronico = ?
        AND u.EstaActivo = TRUE`,
        [boleta, correo]
      );

      if (alumnos.length === 0) {
        return false;
      }

      const alumno = alumnos[0];
      return await this.verificarPassword(password, alumno.ContraseñaHash);
    } catch (error) {
      console.error('Error al verificar contraseña de alumno:', error);
      throw error;
    }
  },

  /**
   * Verifica si la cuenta de un alumno está activa
   * @param {string} boleta - Número de boleta del alumno
   * @param {string} correo - Correo electrónico
   * @returns {Promise<boolean>} - true si la cuenta está activa
   */
  async verificarCuentaActiva(boleta) {
    try {
      const [usuarios] = await db.query(
        `SELECT u.EstaActivo
        FROM AlumnosInfo a
        JOIN Usuarios u ON a.UsuarioID = u.ID
        WHERE a.NumeroBoleta = ?`,
        [boleta]
      );

      if (usuarios.length === 0) {
        return false;
      }

      return usuarios[0].EstaActivo;
    } catch (error) {
      console.error('Error al verificar estado de cuenta:', error);
      throw error;
    }
  },

  /**
   * Obtiene los datos de un alumno por boleta y correo
   * @param {string} boleta - Número de boleta del alumno
   * @param {string} correo - Correo electrónico del alumno
   * @returns {Promise<Object|null>} - Datos del alumno o null si no existe
   */
  async obtenerDatosAlumno(boleta, correo) {
    try {
      const [alumnos] = await db.query(
        `SELECT a.ID AS AlumnoInfoID, a.NumeroBoleta, a.PeriodoEscolarActualID,
                u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico
        FROM AlumnosInfo a
        JOIN Usuarios u ON a.UsuarioID = u.ID
        WHERE a.NumeroBoleta = ?
        AND u.CorreoElectronico = ?
        AND u.EstaActivo = TRUE`,
        [boleta, correo]
      );

      if (alumnos.length === 0) {
        return null;
      }

      return alumnos[0];
    } catch (error) {
      console.error('Error al obtener datos del alumno:', error);
      throw error;
    }
  },

  /**
   * Verifica las credenciales de un alumno y devuelve los datos si son correctos
   * @param {string} boleta - Número de boleta del alumno
   * @param {string} correo - Correo electrónico del alumno
   * @param {string} password - Contraseña del alumno
   * @returns {Promise<Object|null>} - Datos del alumno o null si las credenciales son incorrectas
   */
  async verificarCredencialesAlumno(boleta, correo, password) {
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

      const alumno = alumnos[0];

      // Verificar la contraseña antes de devolver los datos
      if (!alumno.ContraseñaHash || !(await this.verificarPassword(password, alumno.ContraseñaHash))) {
        return null;
      }

      return alumno;
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
    // Verificar que ambos argumentos existan
    if (!password || !hashedPassword) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Error al comparar contraseñas:', error);
      return false;
    }
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
      process.env.JWT_SECRET || 'hcopto_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hcopto_secret_key');
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
            SELECT a.ID AS AlumnoInfoID, a.NumeroBoleta, a.PeriodoEscolarActualID,
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