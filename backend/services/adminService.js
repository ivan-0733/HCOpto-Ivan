const db = require('../config/database');
const { AppError } = require('../utils/errorHandler');

const adminService = {
  /**
   * Obtener todas las historias clínicas del sistema
   */
  async obtenerTodasHistorias() {
    try {
      const query = `
        SELECT
          hc.ID,
          hc.FechaCreacion,
          hc.Estado,
          hc.FechaUltimaModificacion,
          hc.Archivado,

          -- Datos del Paciente
          p.Nombre,
          p.ApellidoPaterno,
          p.ApellidoMaterno,
          p.CURP,
          p.IDSiSeCo,
          p.FechaNacimiento,
          p.Genero,

          -- Datos del Alumno
          ai.NumeroBoleta,
          CONCAT(ua.NombreUsuario) as NombreAlumno,
          ai.SemestreActual,

          -- Datos del Profesor
          pi.NumeroEmpleado,
          CONCAT(up.NombreUsuario) as NombreProfesor,

          -- Datos de la Materia
          m.NombreMateria,
          m.Clave as ClaveMateria,
          mp.ID as MateriaProfesorID,
          mp.PeriodoEscolar,
          mp.Archivado as MateriaArchivada,

          -- Datos de Comentarios
          (SELECT COUNT(*) FROM ComentariosHistorial WHERE HistoriaClinicaID = hc.ID) as TotalComentarios

        FROM HistorialesClinicos hc

        -- Joins para Paciente
        INNER JOIN Pacientes p ON hc.PacienteID = p.ID

        -- Joins para Alumno
        INNER JOIN AlumnoInfo ai ON hc.AlumnoID = ai.ID
        INNER JOIN Usuarios ua ON ai.UsuarioID = ua.ID

        -- Joins para Materia y Profesor
        INNER JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
        INNER JOIN Materias m ON mp.MateriaID = m.ID
        INNER JOIN ProfesorInfo pi ON mp.ProfesorID = pi.ID
        INNER JOIN Usuarios up ON pi.UsuarioID = up.ID

        ORDER BY hc.FechaCreacion DESC
      `;

      const [historias] = await db.query(query);
      return historias;
    } catch (error) {
      console.error('Error al obtener todas las historias:', error);
      throw new AppError('Error al obtener las historias clínicas', 500);
    }
  },

  /**
   * Obtener estadísticas globales del sistema
   */
  async obtenerEstadisticasGlobales() {
    try {
      // Total de historias
      const [totalHistorias] = await db.query(
        'SELECT COUNT(*) as total FROM HistorialesClinicos WHERE Archivado = FALSE'
      );

      // Total de historias archivadas
      const [totalArchivadas] = await db.query(
        'SELECT COUNT(*) as total FROM HistorialesClinicos WHERE Archivado = TRUE'
      );

      // Historias por estado
      const [porEstado] = await db.query(`
        SELECT
          Estado as estado,
          COUNT(*) as cantidad
        FROM HistorialesClinicos
        WHERE Archivado = FALSE
        GROUP BY Estado
        ORDER BY
          CASE Estado
            WHEN 'Nuevo' THEN 1
            WHEN 'Corregido' THEN 2
            WHEN 'En proceso' THEN 3
            WHEN 'Revisión' THEN 4
            WHEN 'Corrección' THEN 5
            WHEN 'Finalizado' THEN 6
            ELSE 7
          END
      `);

      // Total de alumnos activos
      const [totalAlumnos] = await db.query(`
        SELECT COUNT(*) as total
        FROM AlumnoInfo ai
        INNER JOIN Usuarios u ON ai.UsuarioID = u.ID
        WHERE u.EstaActivo = TRUE
      `);

      // Total de profesores activos
      const [totalProfesores] = await db.query(`
        SELECT COUNT(*) as total
        FROM ProfesorInfo pi
        INNER JOIN Usuarios u ON pi.UsuarioID = u.ID
        WHERE u.EstaActivo = TRUE
      `);

      // Total de materias activas
      const [totalMaterias] = await db.query(
        'SELECT COUNT(*) as total FROM MateriasProfesor WHERE Archivado = FALSE'
      );

      return {
        total: totalHistorias[0].total,
        archivadas: totalArchivadas[0].total,
        porEstado: porEstado,
        totalAlumnos: totalAlumnos[0].total,
        totalProfesores: totalProfesores[0].total,
        totalMaterias: totalMaterias[0].total
      };
    } catch (error) {
      console.error('Error al obtener estadísticas globales:', error);
      throw new AppError('Error al obtener estadísticas', 500);
    }
  },

  /**
   * Obtener todas las materias del sistema
   */
  async obtenerTodasMaterias() {
    try {
      const query = `
        SELECT
          mp.ID as MateriaProfesorID,
          m.ID,
          m.NombreMateria,
          m.Clave,
          mp.PeriodoEscolar,
          mp.Archivado,
          pi.NumeroEmpleado,
          CONCAT(u.NombreUsuario) as NombreProfesor,
          (SELECT COUNT(*) FROM HistorialesClinicos WHERE MateriaProfesorID = mp.ID AND Archivado = FALSE) as TotalHistorias
        FROM MateriasProfesor mp
        INNER JOIN Materias m ON mp.MateriaID = m.ID
        INNER JOIN ProfesorInfo pi ON mp.ProfesorID = pi.ID
        INNER JOIN Usuarios u ON pi.UsuarioID = u.ID
        ORDER BY mp.PeriodoEscolar DESC, m.NombreMateria ASC
      `;

      const [materias] = await db.query(query);
      return materias;
    } catch (error) {
      console.error('Error al obtener todas las materias:', error);
      throw new AppError('Error al obtener materias', 500);
    }
  },

  /**
   * Actualizar estado de una historia clínica
   */
  async actualizarEstadoHistoria(historiaId, nuevoEstado) {
    try {
      const estadosPermitidos = ['Nuevo', 'Corregido', 'En proceso', 'Revisión', 'Corrección', 'Finalizado'];

      if (!estadosPermitidos.includes(nuevoEstado)) {
        throw new AppError('Estado no válido', 400);
      }

      const [result] = await db.query(
        'UPDATE HistorialesClinicos SET Estado = ?, FechaUltimaModificacion = NOW() WHERE ID = ?',
        [nuevoEstado, historiaId]
      );

      if (result.affectedRows === 0) {
        throw new AppError('Historia clínica no encontrada', 404);
      }

      return { success: true, message: 'Estado actualizado correctamente' };
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      throw error;
    }
  },

  /**
   * Archivar/Desarchivar historia clínica
   */
  async toggleArchivarHistoria(historiaId, archivar) {
    try {
      const [result] = await db.query(
        'UPDATE HistorialesClinicos SET Archivado = ?, FechaUltimaModificacion = NOW() WHERE ID = ?',
        [archivar, historiaId]
      );

      if (result.affectedRows === 0) {
        throw new AppError('Historia clínica no encontrada', 404);
      }

      return {
        success: true,
        message: archivar ? 'Historia archivada correctamente' : 'Historia desarchivada correctamente'
      };
    } catch (error) {
      console.error('Error al archivar/desarchivar historia:', error);
      throw error;
    }
  },

  /**
   * Eliminar historia clínica
   */
  async eliminarHistoria(historiaId) {
    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Eliminar comentarios asociados
      await connection.query(
        'DELETE FROM ComentariosHistorial WHERE HistoriaClinicaID = ?',
        [historiaId]
      );

      // Eliminar historia clínica
      const [result] = await connection.query(
        'DELETE FROM HistorialesClinicos WHERE ID = ?',
        [historiaId]
      );

      if (result.affectedRows === 0) {
        throw new AppError('Historia clínica no encontrada', 404);
      }

      await connection.commit();
      return { success: true, message: 'Historia eliminada correctamente' };
    } catch (error) {
      await connection.rollback();
      console.error('Error al eliminar historia:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Obtener comentarios de una historia
   */
  async obtenerComentariosHistoria(historiaId) {
    try {
      const query = `
        SELECT
          c.ID,
          c.Comentario,
          c.FechaCreacion,
          u.NombreUsuario,
          r.NombreRol as Rol
        FROM ComentariosHistorial c
        INNER JOIN Usuarios u ON c.UsuarioID = u.ID
        INNER JOIN Roles r ON u.RolID = r.ID
        WHERE c.HistoriaClinicaID = ?
        ORDER BY c.FechaCreacion DESC
      `;

      const [comentarios] = await db.query(query, [historiaId]);
      return comentarios;
    } catch (error) {
      console.error('Error al obtener comentarios:', error);
      throw new AppError('Error al obtener comentarios', 500);
    }
  },

  /**
   * Agregar comentario a una historia
   */
  async agregarComentario(historiaId, usuarioId, comentario) {
    try {
      const [result] = await db.query(
        'INSERT INTO ComentariosHistorial (HistoriaClinicaID, UsuarioID, Comentario) VALUES (?, ?, ?)',
        [historiaId, usuarioId, comentario]
      );

      return {
        id: result.insertId,
        historiaId,
        usuarioId,
        comentario,
        fechaCreacion: new Date()
      };
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      throw new AppError('Error al agregar comentario', 500);
    }
  },

  /**
   * Obtener perfil del admin
   */
  async obtenerPerfilAdmin(usuarioId) {
    try {
      const [usuarios] = await db.query(`
        SELECT
          u.ID as UsuarioID,
          u.NombreUsuario,
          u.CorreoElectronico,
          u.TelefonoCelular,
          u.FechaCreacion,
          u.FechaUltimoAcceso,
          r.NombreRol as Rol
        FROM Usuarios u
        INNER JOIN Roles r ON u.RolID = r.ID
        WHERE u.ID = ? AND r.NombreRol = 'admin'
      `, [usuarioId]);

      if (usuarios.length === 0) {
        throw new AppError('Usuario admin no encontrado', 404);
      }

      return usuarios[0];
    } catch (error) {
      console.error('Error al obtener perfil admin:', error);
      throw error;
    }
  }
};

module.exports = adminService;