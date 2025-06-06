const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database.js');

/**
 * Servicio para la autenticación de usuarios
 */
const authService = {
  /**
   * Verifica si existe un alumno con la boleta especificada
   */
  async verificarExistenciaAlumno(boleta) {
    try {
      const [alumnos] = await db.query(
        `SELECT COUNT(*) as count
        FROM AlumnosInfo a
        JOIN Usuarios u ON a.UsuarioID = u.ID
        WHERE a.NumeroBoleta = ?`,
        [boleta]
      );

      return alumnos[0].count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de alumno:', error);
      throw error;
    }
  },

  /**
   * Verifica si existe un profesor con el número de empleado especificado
   */
  async verificarExistenciaProfesor(numeroEmpleado) {
    try {
      const [profesores] = await db.query(
        `SELECT COUNT(*) as count
        FROM ProfesoresInfo p
        JOIN Usuarios u ON p.UsuarioID = u.ID
        WHERE p.NumeroEmpleado = ?`,
        [numeroEmpleado]
      );

      return profesores[0].count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de profesor:', error);
      throw error;
    }
  },

  /**
   * Verifica si el correo proporcionado corresponde a la boleta
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
   * Verifica si el correo proporcionado corresponde al número de empleado
   */
  async verificarCorreoNumeroEmpleado(numeroEmpleado, correo) {
    try {
      const [profesores] = await db.query(
        `SELECT COUNT(*) as count
        FROM ProfesoresInfo p
        JOIN Usuarios u ON p.UsuarioID = u.ID
        WHERE p.NumeroEmpleado = ?
        AND u.CorreoElectronico = ?`,
        [numeroEmpleado, correo]
      );

      return profesores[0].count > 0;
    } catch (error) {
      console.error('Error al verificar correo y número de empleado:', error);
      throw error;
    }
  },

  /**
   * Verifica si existe un usuario con el correo especificado
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
   * Verifica si la contraseña es correcta para un profesor
   */
  async verificarPasswordProfesor(numeroEmpleado, correo, password) {
    try {
      const [profesores] = await db.query(
        `SELECT u.ContraseñaHash
        FROM ProfesoresInfo p
        JOIN Usuarios u ON p.UsuarioID = u.ID
        WHERE p.NumeroEmpleado = ?
        AND u.CorreoElectronico = ?
        AND u.EstaActivo = TRUE`,
        [numeroEmpleado, correo]
      );

      if (profesores.length === 0) {
        return false;
      }

      const profesor = profesores[0];
      return await this.verificarPassword(password, profesor.ContraseñaHash);
    } catch (error) {
      console.error('Error al verificar contraseña de profesor:', error);
      throw error;
    }
  },

  /**
   * Verifica si la cuenta de un alumno está activa
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
   * Verifica si la cuenta de un profesor está activa
   */
  async verificarCuentaActivaProfesor(numeroEmpleado) {
    try {
      const [usuarios] = await db.query(
        `SELECT u.EstaActivo
        FROM ProfesoresInfo p
        JOIN Usuarios u ON p.UsuarioID = u.ID
        WHERE p.NumeroEmpleado = ?`,
        [numeroEmpleado]
      );

      if (usuarios.length === 0) {
        return false;
      }

      return usuarios[0].EstaActivo;
    } catch (error) {
      console.error('Error al verificar estado de cuenta de profesor:', error);
      throw error;
    }
  },

  /**
   * Obtiene los datos de un alumno por boleta y correo
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
   * Obtiene los datos de un profesor por número de empleado y correo
   */
  async obtenerDatosProfesor(numeroEmpleado, correo) {
    try {
      const [profesores] = await db.query(
        `SELECT p.ID AS ProfesorInfoID, p.NumeroEmpleado,
                u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico
        FROM ProfesoresInfo p
        JOIN Usuarios u ON p.UsuarioID = u.ID
        WHERE p.NumeroEmpleado = ?
        AND u.CorreoElectronico = ?
        AND u.EstaActivo = TRUE`,
        [numeroEmpleado, correo]
      );

      if (profesores.length === 0) {
        return null;
      }

      return profesores[0];
    } catch (error) {
      console.error('Error al obtener datos del profesor:', error);
      throw error;
    }
  },

  /**
   * Compara una contraseña plana con el hash almacenado
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