const db = require('../config/database');

/**
 * Servicio para gestionar profesores en la base de datos
 */
const profesorService = {
  /**
   * Obtiene los datos de un profesor por su ID
   */
  async obtenerProfesorPorId(profesorInfoId) {
    try {
      console.log('🔄 === SERVICE: obtenerProfesorPorId ===');
      console.log('profesorInfoId recibido:', profesorInfoId);

      const query = `SELECT p.ID AS ProfesorInfoID, p.NumeroEmpleado,
              p.Nombre, p.ApellidoPaterno, p.ApellidoMaterno,
              u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico,
              u.EstaActivo, u.TelefonoCelular, u.FechaCreacion, u.FechaUltimoAcceso
       FROM ProfesoresInfo p
       JOIN Usuarios u ON p.UsuarioID = u.ID
       WHERE p.ID = ? AND u.EstaActivo = TRUE`;

      console.log('Query SQL:', query);
      console.log('Parámetros:', [profesorInfoId]);

      const [profesores] = await db.query(query, [profesorInfoId]);

      console.log('Resultados de la query:', profesores);
      console.log('Número de resultados:', profesores.length);

      if (profesores.length === 0) {
        console.log('❌ No se encontró profesor con ID:', profesorInfoId);
        return null;
      }

      console.log('✅ Profesor encontrado:', profesores[0]);
      return profesores[0];
    } catch (error) {
      console.error('❌ Error en obtenerProfesorPorId:', error);
      throw error;
    }
  },

  /**
 * Obtiene las historias clínicas de los alumnos asignados al profesor
 */
async obtenerHistoriasClinicasAlumnos(profesorId) {
  try {
    const [historias] = await db.query(`
      SELECT hc.ID, hc.Fecha, hc.Archivado, hc.FechaArchivado, hc.EstadoID,
             p.ID AS PacienteID, p.Nombre, p.ApellidoPaterno, p.ApellidoMaterno,
             p.CorreoElectronico, p.TelefonoCelular, p.Edad,
             cg.Valor AS Estado, c.Nombre AS Consultorio, pe.Codigo AS PeriodoEscolar,
             mp.ProfesorInfoID AS ProfesorID,
             m.Nombre AS NombreMateria,
             mp.Grupo AS GrupoMateria,
             hc.MateriaProfesorID,
             a.Nombre AS AlumnoNombre,
             a.ApellidoPaterno AS AlumnoApellidoPaterno,
             a.ApellidoMaterno AS AlumnoApellidoMaterno
      FROM HistorialesClinicos hc
      JOIN Pacientes p ON hc.PacienteID = p.ID
      JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
      JOIN Consultorios c ON hc.ConsultorioID = c.ID
      JOIN PeriodosEscolares pe ON hc.PeriodoEscolarID = pe.ID
      JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
      JOIN Materias m ON mp.MateriaID = m.ID
      JOIN AlumnosInfo a ON hc.AlumnoID = a.ID
      WHERE mp.ProfesorInfoID = ?
      ORDER BY hc.Fecha DESC`,
      [profesorId]
    );

    return historias;
  } catch (error) {
    console.error('Error al obtener historias clínicas de alumnos:', error);
    throw error;
  }
},

/**
 * Obtiene estadísticas de historias clínicas de los alumnos del profesor
 */
async obtenerEstadisticasHistorias(profesorId) {
  try {
    // Obtener total de historias y conteo por estado
    const [estadisticas] = await db.query(`
      SELECT
        (SELECT COUNT(*)
         FROM HistorialesClinicos hc
         JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
         WHERE mp.ProfesorInfoID = ?) AS total,
        (SELECT COUNT(*)
         FROM HistorialesClinicos hc
         JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
         WHERE mp.ProfesorInfoID = ? AND hc.Archivado = TRUE) AS archivadas,
        cg.Valor AS estado,
        COUNT(hc.ID) AS cantidad
      FROM HistorialesClinicos hc
      JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
      JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
      WHERE mp.ProfesorInfoID = ?
      GROUP BY hc.EstadoID, cg.Valor`,
      [profesorId, profesorId, profesorId]
    );

    // Formatear respuesta
    const total = estadisticas.length > 0 ? estadisticas[0].total : 0;
    const archivadas = estadisticas.length > 0 ? estadisticas[0].archivadas : 0;

    const porEstado = estadisticas.map(item => ({
      estado: item.estado,
      cantidad: item.cantidad
    }));

    return {
      total,
      archivadas,
      porEstado
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de historias:', error);
    throw error;
  }
},

  /**
   * Obtiene los alumnos asignados a un profesor
   */
  async obtenerAlumnosAsignados(profesorId) {
    try {
      const [alumnos] = await db.query(`
        SELECT DISTINCT
          a.ID AS AlumnoInfoID,
          a.NumeroBoleta,
          a.Nombre,
          a.ApellidoPaterno,
          a.ApellidoMaterno,
          m.Nombre AS NombreMateria,
          mp.Grupo,
          pe.Codigo AS PeriodoEscolar,
          ma.FechaInscripcion,
          ma.MateriaProfesorID
        FROM MateriasAlumno ma
        JOIN MateriasProfesor mp ON ma.MateriaProfesorID = mp.ID
        JOIN AlumnosInfo a ON ma.AlumnoInfoID = a.ID
        JOIN Materias m ON mp.MateriaID = m.ID
        JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID
        WHERE mp.ProfesorInfoID = ?
        AND pe.EsActual = TRUE
        ORDER BY m.Nombre, a.ApellidoPaterno, a.ApellidoMaterno, a.Nombre`,
        [profesorId]
      );

      return alumnos;
    } catch (error) {
      console.error('Error al obtener alumnos asignados:', error);
      throw error;
    }
  },

  /**
   * Obtiene las materias asignadas a un profesor en el período actual
   */
  async obtenerMateriasProfesor(profesorId) {
    try {
      const [materias] = await db.query(`
        SELECT
          mp.ID,
          mp.MateriaID,
          mp.ProfesorInfoID,
          mp.PeriodoEscolarID,
          mp.ID AS MateriaProfesorID,
          m.Nombre AS NombreMateria,
          m.Codigo,
          m.Semestre,
          m.EjeFormativo,
          m.Descripcion,
          mp.Grupo,
          pe.Codigo AS PeriodoEscolar,
          pe.EsActual AS EsPeriodoActual,
          mp.FechaAsignacion,
          (SELECT COUNT(DISTINCT ma.AlumnoInfoID)
           FROM MateriasAlumno ma
           WHERE ma.MateriaProfesorID = mp.ID) AS CantidadAlumnos
        FROM MateriasProfesor mp
        JOIN Materias m ON mp.MateriaID = m.ID
        JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID
        WHERE mp.ProfesorInfoID = ?
        AND pe.EsActual = TRUE
        ORDER BY m.Semestre, m.Nombre`,
        [profesorId]
      );

      return materias;
    } catch (error) {
      console.error('Error al obtener materias del profesor:', error);
      throw error;
    }
  },

  /**
   * Obtiene todas las materias del profesor (actuales e históricas)
   */
  async obtenerTodasMateriasProfesor(profesorId) {
    try {
      const [materias] = await db.query(`
        SELECT
          mp.ID,
          mp.MateriaID,
          mp.ProfesorInfoID,
          mp.PeriodoEscolarID,
          mp.ID AS MateriaProfesorID,
          m.Nombre AS NombreMateria,
          m.Codigo,
          m.Semestre,
          m.EjeFormativo,
          m.Descripcion,
          mp.Grupo,
          pe.Codigo AS PeriodoEscolar,
          pe.EsActual AS EsPeriodoActual,
          mp.FechaAsignacion,
          (SELECT COUNT(DISTINCT ma.AlumnoInfoID)
           FROM MateriasAlumno ma
           WHERE ma.MateriaProfesorID = mp.ID) AS CantidadAlumnos
        FROM MateriasProfesor mp
        JOIN Materias m ON mp.MateriaID = m.ID
        JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID
        WHERE mp.ProfesorInfoID = ?
        ORDER BY pe.EsActual DESC, pe.FechaInicio DESC, m.Semestre, m.Nombre`,
        [profesorId]
      );

      return materias;
    } catch (error) {
      console.error('Error al obtener todas las materias del profesor:', error);
      throw error;
    }
  },

  /**
   * Obtiene el período escolar actual
   */
  async obtenerPeriodoEscolarActual() {
    try {
      const [periodos] = await db.query(
        'SELECT ID, Codigo, FechaInicio, FechaFin FROM PeriodosEscolares WHERE EsActual = TRUE'
      );

      if (periodos.length === 0) {
        return null;
      }

      return periodos[0];
    } catch (error) {
      console.error('Error al obtener período escolar actual:', error);
      throw error;
    }
  },

  /**
   * Actualiza los datos de perfil de un profesor
   */
  async actualizarPerfil(profesorInfoId, usuarioId, datos) {
    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verificar si el nombre de usuario ya existe (si se está actualizando)
      if (datos.nombreUsuario) {
        const [existeNombreUsuario] = await connection.query(
          'SELECT ID FROM Usuarios WHERE LOWER(NombreUsuario) = LOWER(?) AND ID != ?',
          [datos.nombreUsuario, usuarioId]
        );

        if (existeNombreUsuario.length > 0) {
          throw new Error('El nombre de usuario ya existe. Por favor, elige otro.');
        }
      }

      // Verificar si el correo electrónico ya existe (si se está actualizando)
      if (datos.correoElectronico) {
        const [existeCorreo] = await connection.query(
          'SELECT ID FROM Usuarios WHERE LOWER(CorreoElectronico) = LOWER(?) AND ID != ?',
          [datos.correoElectronico, usuarioId]
        );

        if (existeCorreo.length > 0) {
          throw new Error('El correo electrónico ya existe. Por favor, utiliza otro.');
        }
      }

      // Verificar si el teléfono ya existe (si se está actualizando)
      if (datos.telefonoCelular) {
        const [existeTelefono] = await connection.query(
          'SELECT ID FROM Usuarios WHERE TelefonoCelular = ? AND ID != ?',
          [datos.telefonoCelular, usuarioId]
        );

        if (existeTelefono.length > 0) {
          throw new Error('El número de teléfono ya existe. Por favor, utiliza otro.');
        }
      }

      // Actualizar datos de usuario
      if (datos.nombreUsuario || datos.correoElectronico || datos.telefonoCelular) {
        await connection.query(
          `UPDATE Usuarios SET
            NombreUsuario = COALESCE(?, NombreUsuario),
            CorreoElectronico = COALESCE(?, CorreoElectronico),
            TelefonoCelular = COALESCE(?, TelefonoCelular)
          WHERE ID = ?`,
          [datos.nombreUsuario, datos.correoElectronico, datos.telefonoCelular, usuarioId]
        );
      }

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error al actualizar perfil de profesor:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Verifica si la contraseña actual es correcta
   */
  async verificarPassword(usuarioId, passwordActual) {
    try {
      // Obtener el usuario
      const [usuarios] = await db.query(
        'SELECT ContraseñaHash FROM Usuarios WHERE ID = ?',
        [usuarioId]
      );

      if (usuarios.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const usuario = usuarios[0];

      // Verificar la contraseña
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(passwordActual, usuario.ContraseñaHash);

      return isMatch;
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      throw error;
    }
  },

  /**
   * Actualiza la contraseña de un usuario
   */
  async actualizarPassword(usuarioId, passwordActual, nuevaPassword) {
    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Primero verificar si la contraseña actual es correcta
      const [usuarios] = await connection.query(
        'SELECT ContraseñaHash FROM Usuarios WHERE ID = ?',
        [usuarioId]
      );

      if (usuarios.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const usuario = usuarios[0];

      // Aquí asumimos que estás usando bcrypt para hash de contraseñas
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(passwordActual, usuario.ContraseñaHash);

      if (!isMatch) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Hash de la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

      // Actualizar la contraseña
      await connection.query(
        'UPDATE Usuarios SET ContraseñaHash = ? WHERE ID = ?',
        [hashedPassword, usuarioId]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error al actualizar contraseña:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = profesorService;