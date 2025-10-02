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
          hc.CreadoEn as FechaCreacion,
          cg_estado.Valor as Estado,
          hc.EstadoID,
          hc.ActualizadoEn as FechaUltimaModificacion,
          hc.Archivado,
          hc.Fecha,

          -- Datos del Paciente
          p.Nombre,
          p.ApellidoPaterno,
          p.ApellidoMaterno,
          p.CURP,
          p.IDSiSeCO,
          p.Edad,
          DATE_SUB(CURDATE(), INTERVAL p.Edad YEAR) as FechaNacimiento,
          cg_genero.Valor as Genero,

          -- Datos del Alumno
          ai.NumeroBoleta,
          CONCAT(ai.Nombre, ' ', ai.ApellidoPaterno, ' ', IFNULL(ai.ApellidoMaterno, '')) as NombreAlumno,
          ai.PeriodoEscolarActualID as SemestreActual,

          -- Datos del Profesor
          pi.NumeroEmpleado,
          CONCAT(pi.Nombre, ' ', pi.ApellidoPaterno, ' ', IFNULL(pi.ApellidoMaterno, '')) as NombreProfesor,

          -- Datos de la Materia
          m.Nombre as NombreMateria,
          m.Codigo as ClaveMateria,
          mp.ID as MateriaProfesorID,
          pe.Codigo as PeriodoEscolar,

          -- ================== INICIO DE LA SOLUCIÓN ==================
          -- Se obtiene el nombre del consultorio desde la tabla 'Consultorios'
          con.Nombre as Consultorio,
          -- =================== FIN DE LA SOLUCIÓN ====================

          -- Datos de Comentarios
          (SELECT COUNT(*) FROM ComentariosProfesor WHERE HistorialID = hc.ID) as TotalComentarios

        FROM HistorialesClinicos hc

        -- Joins para Estado
        INNER JOIN CatalogosGenerales cg_estado ON hc.EstadoID = cg_estado.ID

        -- Joins para Paciente
        INNER JOIN Pacientes p ON hc.PacienteID = p.ID
        INNER JOIN CatalogosGenerales cg_genero ON p.GeneroID = cg_genero.ID

        -- Joins para Alumno
        INNER JOIN AlumnosInfo ai ON hc.AlumnoID = ai.ID

        -- Joins para Materia y Profesor
        INNER JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
        INNER JOIN Materias m ON mp.MateriaID = m.ID
        INNER JOIN ProfesoresInfo pi ON mp.ProfesorInfoID = pi.ID
        INNER JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID

        -- ================== INICIO DE LA SOLUCIÓN ==================
        -- Se añade el JOIN a la tabla 'Consultorios' usando la columna correcta 'ConsultorioID'
        INNER JOIN Consultorios con ON hc.ConsultorioID = con.ID
        -- =================== FIN DE LA SOLUCIÓN ====================

        ORDER BY hc.CreadoEn DESC
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
          cg.Valor as estado,
          COUNT(*) as cantidad
        FROM HistorialesClinicos hc
        INNER JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
        WHERE hc.Archivado = FALSE
        GROUP BY hc.EstadoID, cg.Valor
        ORDER BY
          CASE cg.Valor
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
        FROM AlumnosInfo ai
        INNER JOIN Usuarios u ON ai.UsuarioID = u.ID
        WHERE u.EstaActivo = TRUE
      `);

      // Total de profesores activos
      const [totalProfesores] = await db.query(`
        SELECT COUNT(*) as total
        FROM ProfesoresInfo pi
        INNER JOIN Usuarios u ON pi.UsuarioID = u.ID
        WHERE u.EstaActivo = TRUE
      `);

      // Total de materias (sin filtro de Archivado porque la columna no existe)
      const [totalMaterias] = await db.query(
        'SELECT COUNT(*) as total FROM MateriasProfesor'
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
          m.Nombre as NombreMateria,
          m.Codigo as Clave,
          CONCAT(pe.Codigo, ' - ', pe.FechaInicio, ' a ', pe.FechaFin) as PeriodoEscolar,
          pe.EsActual, -- <<<<<<<<<<<<<<< ESTA ES LA LÍNEA CLAVE AÑADIDA
          mp.Grupo,
          pi.NumeroEmpleado,
          CONCAT(pi.Nombre, ' ', pi.ApellidoPaterno, ' ', IFNULL(pi.ApellidoMaterno, '')) as NombreProfesor,
          (SELECT COUNT(DISTINCT AlumnoID) FROM HistorialesClinicos WHERE MateriaProfesorID = mp.ID) as TotalAlumnos,
          (SELECT COUNT(*) FROM HistorialesClinicos WHERE MateriaProfesorID = mp.ID AND Archivado = FALSE) as TotalHistorias
        FROM MateriasProfesor mp
        INNER JOIN Materias m ON mp.MateriaID = m.ID
        INNER JOIN ProfesoresInfo pi ON mp.ProfesorInfoID = pi.ID
        INNER JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID
        ORDER BY pe.FechaInicio DESC, m.Nombre ASC
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

      // Obtener el ID del catálogo para el estado
      const [estados] = await db.query(
        "SELECT ID FROM CatalogosGenerales WHERE TipoCatalogo = 'ESTADO_HISTORIAL' AND Valor = ?",
        [nuevoEstado]
      );

      if (estados.length === 0) {
        throw new AppError('Estado no encontrado en el catálogo', 400);
      }

      const estadoId = estados[0].ID;

      const [result] = await db.query(
        'UPDATE HistorialesClinicos SET EstadoID = ?, ActualizadoEn = NOW() WHERE ID = ?',
        [estadoId, historiaId]
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
      const fechaArchivado = archivar ? 'NOW()' : 'NULL';

      const [result] = await db.query(
        `UPDATE HistorialesClinicos SET Archivado = ?, FechaArchivado = ${fechaArchivado}, ActualizadoEn = NOW() WHERE ID = ?`,
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
    try {
      // Primero eliminar comentarios asociados
      await db.query('DELETE FROM ComentariosProfesor WHERE HistorialID = ?', [historiaId]);

      // Luego eliminar la historia
      const [result] = await db.query('DELETE FROM HistorialesClinicos WHERE ID = ?', [historiaId]);

      if (result.affectedRows === 0) {
        throw new AppError('Historia clínica no encontrada', 404);
      }

      return { success: true, message: 'Historia eliminada correctamente' };
    } catch (error) {
      console.error('Error al eliminar historia:', error);
      throw error;
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
          c.FechaComentario as FechaCreacion,
          CONCAT(pi.Nombre, ' ', pi.ApellidoPaterno, ' ', IFNULL(pi.ApellidoMaterno, '')) as NombreUsuario,
          r.NombreRol as Rol
        FROM ComentariosProfesor c
        INNER JOIN ProfesoresInfo pi ON c.ProfesorID = pi.ID
        INNER JOIN Usuarios u ON pi.UsuarioID = u.ID
        INNER JOIN Roles r ON u.RolID = r.ID
        WHERE c.HistorialID = ?
        ORDER BY c.FechaComentario DESC
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
      // Obtener el ProfesorID desde el usuarioId
      const [profesor] = await db.query(
        'SELECT ID FROM ProfesoresInfo WHERE UsuarioID = ?',
        [usuarioId]
      );

      if (profesor.length === 0) {
        throw new AppError('Profesor no encontrado', 404);
      }

      const profesorId = profesor[0].ID;

      const [result] = await db.query(
        'INSERT INTO ComentariosProfesor (HistorialID, ProfesorID, Comentario) VALUES (?, ?, ?)',
        [historiaId, profesorId, comentario]
      );

      // Obtener el comentario recién creado
      const [nuevoComentario] = await db.query(
        `SELECT
          c.ID,
          c.Comentario,
          c.FechaComentario as FechaCreacion,
          CONCAT(pi.Nombre, ' ', pi.ApellidoPaterno, ' ', IFNULL(pi.ApellidoMaterno, '')) as NombreUsuario,
          r.NombreRol as Rol
        FROM ComentariosProfesor c
        INNER JOIN ProfesoresInfo pi ON c.ProfesorID = pi.ID
        INNER JOIN Usuarios u ON pi.UsuarioID = u.ID
        INNER JOIN Roles r ON u.RolID = r.ID
        WHERE c.ID = ?`,
        [result.insertId]
      );

      return nuevoComentario[0];
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      throw new AppError('Error al agregar comentario', 500);
    }
  },

  /**
   * Obtener perfil del administrador
   */
  async obtenerPerfilAdmin(usuarioId) {
    try {
      const query = `
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
        WHERE u.ID = ?
      `;

      const [perfil] = await db.query(query, [usuarioId]);

      if (perfil.length === 0) {
        throw new AppError('Perfil de administrador no encontrado', 404);
      }

      return perfil[0];
    } catch (error) {
      console.error('Error al obtener perfil de admin:', error);
      throw error;
    }
  }
};

module.exports = adminService;