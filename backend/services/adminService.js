const db = require('../config/database');
const { AppError } = require('../utils/errorHandler');
const bcrypt = require('bcrypt');

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
          p.IDSiSeCO as IDSiSeCo,
          p.Edad,
          DATE_SUB(CURDATE(), INTERVAL p.Edad YEAR) as FechaNacimiento,
          cg_genero.Valor as Genero,

          -- Datos del Alumno
          ai.NumeroBoleta,
          CONCAT(ai.Nombre, ' ', ai.ApellidoPaterno, ' ', IFNULL(ai.ApellidoMaterno, '')) as NombreAlumno,
          u_alumno.CorreoElectronico as CorreoAlumno,
          ai.PeriodoEscolarActualID as SemestreActual,

          -- Datos del Profesor
          pi.NumeroEmpleado,
          CONCAT(pi.Nombre, ' ', pi.ApellidoPaterno, ' ', IFNULL(pi.ApellidoMaterno, '')) as NombreProfesor,
          u_profesor.CorreoElectronico as CorreoProfesor,

          -- Datos de la Materia
          m.Nombre as NombreMateria,
          m.Codigo as ClaveMateria,
          mp.ID as MateriaProfesorID,
          mp.Grupo as GrupoMateria,
          pe.Codigo as PeriodoEscolar,

          -- Consultorio
          con.Nombre as Consultorio,

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
        INNER JOIN Usuarios u_alumno ON ai.UsuarioID = u_alumno.ID

        -- Joins para Materia y Profesor
        INNER JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
        INNER JOIN Materias m ON mp.MateriaID = m.ID
        INNER JOIN ProfesoresInfo pi ON mp.ProfesorInfoID = pi.ID
        INNER JOIN Usuarios u_profesor ON pi.UsuarioID = u_profesor.ID
        INNER JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID

        -- Join para Consultorio
        INNER JOIN Consultorios con ON hc.ConsultorioID = con.ID

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
          mp.Grupo as GrupoMateria,
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
      if (archivar) {
        // Al archivar: cambiar estado a Finalizado y archivar

        // 1. Obtener el ID del estado "Finalizado"
        const [estadoFinalizado] = await db.query(
          "SELECT ID FROM CatalogosGenerales WHERE TipoCatalogo = 'ESTADO_HISTORIAL' AND Valor = 'Finalizado'"
        );

        if (estadoFinalizado.length === 0) {
          throw new AppError('Estado Finalizado no encontrado', 404);
        }

        const estadoFinalizadoId = estadoFinalizado[0].ID;

        // 2. Actualizar estado a Finalizado y archivar
        const [result] = await db.query(
          'UPDATE HistorialesClinicos SET EstadoID = ?, Archivado = TRUE, FechaArchivado = NOW(), ActualizadoEn = NOW() WHERE ID = ?',
          [estadoFinalizadoId, historiaId]
        );

        if (result.affectedRows === 0) {
          throw new AppError('Historia clínica no encontrada', 404);
        }

        return {
          success: true,
          message: 'Historia archivada y finalizada correctamente'
        };
      } else {
        // Al desarchivar: solo quitar archivado (mantener el estado)
        const [result] = await db.query(
          'UPDATE HistorialesClinicos SET Archivado = FALSE, FechaArchivado = NULL, ActualizadoEn = NOW() WHERE ID = ?',
          [historiaId]
        );

        if (result.affectedRows === 0) {
          throw new AppError('Historia clínica no encontrada', 404);
        }

        return {
          success: true,
          message: 'Historia desarchivada correctamente'
        };
      }
    } catch (error) {
      console.error('Error al archivar/desarchivar historia:', error);
      throw error;
    }
  },

  /**
   * Eliminar historia clínica (con todas sus dependencias)
   */
  /**
   * Eliminar historia clínica (con todas sus dependencias)
   */
  async eliminarHistoria(historiaId) {
    try {
      // 1. Eliminar auditoría (si existe)
      await db.query('DELETE FROM AuditoriaHistorialesClinicos WHERE HistorialID = ?', [historiaId]);

      // 2. Eliminar comentarios de profesores
      await db.query('DELETE FROM ComentariosProfesor WHERE HistorialID = ?', [historiaId]);

      // 3. Eliminar otros registros relacionados si existen
      // Agrega aquí cualquier otra tabla que tenga FK a HistorialesClinicos

      // 4. Finalmente eliminar la historia clínica
      const [result] = await db.query('DELETE FROM HistorialesClinicos WHERE ID = ?', [historiaId]);

      if (result.affectedRows === 0) {
        throw new AppError('Historia clínica no encontrada', 404);
      }

      return { success: true, message: 'Historia eliminada correctamente' };

    } catch (error) {
      console.error('Error al eliminar historia:', error);
      throw new AppError('Error al eliminar la historia clínica', 500);
    }
  },

  // En backend/services/adminService.js - AGREGAR:
  async obtenerHistoriaDetalle(historiaId) {
    try {
      // Reutilizar la query del servicio de historia clínica o crear una propia
      const historiaClinicaService = require('./historiaClinicaService');
      return await historiaClinicaService.obtenerHistoriaClinicaPorId(historiaId);
    } catch (error) {
      console.error('Error al obtener historia detalle (admin):', error);
      throw new AppError('Error al obtener la historia clínica', 500);
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

// REEMPLAZA el método agregarComentario en backend/services/adminService.js

// REEMPLAZA COMPLETAMENTE el método agregarComentario en backend/services/adminService.js

/**
 * Agregar comentario a una historia
 * Nota: El rol ya viene en el middleware auth, así que lo pasamos como parámetro
 */
async agregarComentario(historiaId, usuarioId, comentario, userRole) {
  try {
    let profesorId = null;

    // Normalizar el rol a minúsculas para comparación
    const rol = userRole ? userRole.toLowerCase() : '';

    if (rol === 'admin') {
      // Para admin: buscar si ya tiene un registro en ProfesoresInfo
      const [profesorAdmin] = await db.query(
        'SELECT ID FROM ProfesoresInfo WHERE UsuarioID = ?',
        [usuarioId]
      );

      if (profesorAdmin.length === 0) {
        // Crear registro en ProfesoresInfo para el admin
        console.log('Creando registro de profesor para admin con UsuarioID:', usuarioId);
        const [resultInsert] = await db.query(
          `INSERT INTO ProfesoresInfo (
            UsuarioID,
            Nombre,
            ApellidoPaterno,
            ApellidoMaterno,
            NumeroEmpleado
          ) VALUES (?, 'Administrador', 'Sistema', '', 'ADMIN')`,
          [usuarioId]
        );
        profesorId = resultInsert.insertId;
        console.log('Registro de profesor creado para admin con ID:', profesorId);
      } else {
        profesorId = profesorAdmin[0].ID;
        console.log('Admin ya tiene registro de profesor con ID:', profesorId);
      }
    } else if (rol === 'profesor') {
      // Para profesor: obtener su ID de ProfesoresInfo
      const [profesor] = await db.query(
        'SELECT ID FROM ProfesoresInfo WHERE UsuarioID = ?',
        [usuarioId]
      );

      if (profesor.length === 0) {
        throw new AppError('Profesor no encontrado', 404);
      }

      profesorId = profesor[0].ID;
    } else {
      throw new AppError('Solo profesores y administradores pueden agregar comentarios', 403);
    }

    // Insertar el comentario
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
    throw error.statusCode ? error : new AppError('Error al agregar comentario', 500);
  }
},

  /**
   * Obtener período escolar actual
   */
  async obtenerPeriodoEscolarActual() {
    try {
      const [periodos] = await db.query(
        `SELECT
          ID,
          Codigo,
          FechaInicio,
          FechaFin,
          EsActual,
          FechaInicioSiguiente
        FROM PeriodosEscolares
        WHERE EsActual = TRUE
        LIMIT 1`
      );

      return periodos.length > 0 ? periodos[0] : null;
    } catch (error) {
      console.error('Error al obtener período escolar actual:', error);
      throw error;
    }
  },

  async obtenerTodosProfesores() {
    try {
      const query = `
        SELECT
          pi.ID,
          pi.NumeroEmpleado,
          pi.Nombre,
          pi.ApellidoPaterno,
          pi.ApellidoMaterno,
          u.CorreoElectronico,
          u.TelefonoCelular,
          pi.UsuarioID,
          COUNT(DISTINCT mp.ID) as TotalMaterias,
          COUNT(DISTINCT hc.ID) as TotalHistorias
        FROM ProfesoresInfo pi
        INNER JOIN Usuarios u ON pi.UsuarioID = u.ID
        LEFT JOIN MateriasProfesor mp ON pi.ID = mp.ProfesorInfoID
        LEFT JOIN HistorialesClinicos hc ON mp.ID = hc.MateriaProfesorID
        WHERE u.RolID = (SELECT ID FROM Roles WHERE NombreRol = 'profesor')
        GROUP BY pi.ID, u.CorreoElectronico, u.TelefonoCelular
        ORDER BY pi.ApellidoPaterno, pi.ApellidoMaterno, pi.Nombre
      `;

      const [profesores] = await db.query(query);
      return profesores;
    } catch (error) {
      console.error('Error al obtener profesores:', error);
      throw new AppError('Error al obtener profesores', 500);
    }
  },

  async crearProfesor(datos) {
    try {
      // 1. Crear usuario - USAR NÚMERO DE EMPLEADO COMO NOMBRE DE USUARIO
      const [usuarioResult] = await db.query(
        `INSERT INTO Usuarios (NombreUsuario, CorreoElectronico, ContraseñaHash, TelefonoCelular, RolID)
         VALUES (?, ?, ?, ?, (SELECT ID FROM Roles WHERE NombreRol = 'profesor'))`,
        [
          datos.numeroEmpleado, // ✅ CAMBIO: usar número de empleado
          datos.correoElectronico,
          await bcrypt.hash(datos.numeroEmpleado, 10),
          datos.telefonoCelular
        ]
      );

      const usuarioId = usuarioResult.insertId;

      // 2. Crear profesor
      const [profesorResult] = await db.query(
        `INSERT INTO ProfesoresInfo
         (UsuarioID, NumeroEmpleado, Nombre, ApellidoPaterno, ApellidoMaterno)
         VALUES (?, ?, ?, ?, ?)`,
        [
          usuarioId,
          datos.numeroEmpleado,
          datos.nombre,
          datos.apellidoPaterno,
          datos.apellidoMaterno
        ]
      );

      return {
        ID: profesorResult.insertId,
        UsuarioID: usuarioId,
        ...datos
      };
    } catch (error) {
      console.error('Error al crear profesor:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('El número de empleado o correo ya existe', 400);
      }

      throw new AppError('Error al crear profesor', 500);
    }
  },

  async verificarEmpleadoExistente(numeroEmpleado) {
    try {
      console.log('Verificando número de empleado:', numeroEmpleado);

      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM ProfesoresInfo WHERE NumeroEmpleado = ?',
        [numeroEmpleado]
      );

      console.log('Resultado verificación empleado:', result[0].count);

      return result[0].count > 0;
    } catch (error) {
      console.error('Error al verificar empleado:', error);
      return false;
    }
  },

  async verificarCorreoProfesorExistente(correoElectronico) {
    try {
      console.log('🔍 Verificando correo:', correoElectronico); // Debug

      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM Usuarios WHERE CorreoElectronico = ? AND EstaActivo = TRUE',
        [correoElectronico]
      );

      console.log('📊 Resultado:', result[0].count); // Debug

      return result[0].count > 0;
    } catch (error) {
      console.error('❌ Error al verificar correo:', error);
      return false;
    }
  },

  async verificarProfesorTieneHistorias(profesorId) {
    try {
      const [result] = await db.query(
        `SELECT COUNT(*) as cantidad
         FROM HistorialesClinicos hc
         INNER JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
         WHERE mp.ProfesorInfoID = ?`,
        [profesorId]
      );

      const cantidad = result[0].cantidad;
      return {
        tieneHistorias: cantidad > 0,
        cantidad: cantidad
      };
    } catch (error) {
      console.error('Error al verificar historias:', error);
      throw new AppError('Error al verificar historias', 500);
    }
  },

  async eliminarProfesor(profesorId) {
    try {
      // 1. Verificar que no tenga historias
      const verificacion = await this.verificarProfesorTieneHistorias(profesorId);
      if (verificacion.tieneHistorias) {
        throw new AppError('No se puede eliminar un profesor con historias clínicas asociadas', 400);
      }

      // 2. Obtener UsuarioID
      const [profesor] = await db.query(
        'SELECT UsuarioID FROM ProfesoresInfo WHERE ID = ?',
        [profesorId]
      );

      if (profesor.length === 0) {
        throw new AppError('Profesor no encontrado', 404);
      }

      const usuarioId = profesor[0].UsuarioID;

      // 3. Eliminar registros relacionados (estos sí se pueden eliminar)
      await db.query('DELETE FROM MateriasProfesor WHERE ProfesorInfoID = ?', [profesorId]);
      await db.query('DELETE FROM ComentariosProfesor WHERE ProfesorID = ?', [profesorId]);

      // 4. Eliminar registro de ProfesoresInfo
      await db.query('DELETE FROM ProfesoresInfo WHERE ID = ?', [profesorId]);

      // 5. DESACTIVAR usuario en lugar de eliminarlo (respetando el soft delete)
      await db.query(
        'UPDATE Usuarios SET EstaActivo = FALSE, FechaBorrado = NOW() WHERE ID = ?',
        [usuarioId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error al eliminar profesor:', error);
      throw error;
    }
  },

  // ==================== GESTIÓN DE ALUMNOS ====================

async obtenerTodosAlumnos() {
  try {
    const query = `
      SELECT
        ai.ID,
        ai.NumeroBoleta,
        ai.Nombre,
        ai.ApellidoPaterno,
        ai.ApellidoMaterno,
        u.CorreoElectronico,
        u.TelefonoCelular,
        ai.UsuarioID,
        pe.Codigo as PeriodoEscolarActual,
        COUNT(DISTINCT mp.ID) as TotalMaterias,
        COUNT(DISTINCT hc.ID) as TotalHistorias
      FROM AlumnosInfo ai
      INNER JOIN Usuarios u ON ai.UsuarioID = u.ID
      LEFT JOIN PeriodosEscolares pe ON ai.PeriodoEscolarActualID = pe.ID
      LEFT JOIN MateriasAlumno ma ON ai.ID = ma.AlumnoInfoID
      LEFT JOIN MateriasProfesor mp ON ma.MateriaProfesorID = mp.ID
      LEFT JOIN HistorialesClinicos hc ON ai.ID = hc.AlumnoID
      WHERE u.RolID = (SELECT ID FROM Roles WHERE NombreRol = 'alumno')
      GROUP BY ai.ID, u.CorreoElectronico, u.TelefonoCelular, pe.Codigo
      ORDER BY ai.ApellidoPaterno, ai.ApellidoMaterno, ai.Nombre
    `;

    const [alumnos] = await db.query(query);
    return alumnos;
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    throw new AppError('Error al obtener alumnos', 500);
  }
},

async crearAlumno(datos) {
  try {
    // 1. Crear usuario - USAR NÚMERO DE BOLETA COMO NOMBRE DE USUARIO
    const [usuarioResult] = await db.query(
      `INSERT INTO Usuarios (NombreUsuario, CorreoElectronico, ContraseñaHash, TelefonoCelular, RolID)
       VALUES (?, ?, ?, ?, (SELECT ID FROM Roles WHERE NombreRol = 'alumno'))`,
      [
        datos.numeroBoleta, // ✅ CAMBIO: usar número de boleta
        datos.correoElectronico,
        await bcrypt.hash(datos.numeroBoleta, 10),
        datos.telefonoCelular
      ]
    );

    const usuarioId = usuarioResult.insertId;

    // 2. Obtener período escolar actual si no se proporciona
    let periodoEscolarId = datos.periodoEscolarActualID || null;

    if (!periodoEscolarId) {
      const [periodoActual] = await db.query(
        'SELECT ID FROM PeriodosEscolares WHERE EsActual = TRUE LIMIT 1'
      );

      if (periodoActual.length > 0) {
        periodoEscolarId = periodoActual[0].ID;
      }
    }

    // 3. Crear alumno
    const [alumnoResult] = await db.query(
      `INSERT INTO AlumnosInfo
       (UsuarioID, NumeroBoleta, Nombre, ApellidoPaterno, ApellidoMaterno, PeriodoEscolarActualID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        datos.numeroBoleta,
        datos.nombre,
        datos.apellidoPaterno,
        datos.apellidoMaterno,
        periodoEscolarId
      ]
    );

    return {
      ID: alumnoResult.insertId,
      UsuarioID: usuarioId,
      ...datos
    };
  } catch (error) {
    console.error('Error al crear alumno:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('El número de boleta o correo ya existe', 400);
    }

    throw new AppError('Error al crear alumno', 500);
  }
},

async verificarBoletaExistente(numeroBoleta) {
  try {
    console.log('Verificando número de boleta:', numeroBoleta);

    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM AlumnosInfo WHERE NumeroBoleta = ?',
      [numeroBoleta]
    );

    console.log('Resultado verificación boleta:', result[0].count);

    return result[0].count > 0;
  } catch (error) {
    console.error('Error al verificar boleta:', error);
    return false;
  }
},

async verificarCorreoAlumnoExistente(correoElectronico) {
  try {
    console.log('Verificando correo alumno:', correoElectronico);

    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM Usuarios WHERE CorreoElectronico = ? AND EstaActivo = TRUE',
      [correoElectronico]
    );

    console.log('Resultado:', result[0].count);

    return result[0].count > 0;
  } catch (error) {
    console.error('Error al verificar correo:', error);
    return false;
  }
},

async verificarAlumnoTieneHistorias(alumnoId) {
  try {
    const [result] = await db.query(
      'SELECT COUNT(*) as cantidad FROM HistorialesClinicos WHERE AlumnoID = ?',
      [alumnoId]
    );

    const cantidad = result[0].cantidad;
    return {
      tieneHistorias: cantidad > 0,
      cantidad: cantidad
    };
  } catch (error) {
    console.error('Error al verificar historias:', error);
    throw new AppError('Error al verificar historias', 500);
  }
},

async eliminarAlumno(alumnoId) {
  try {
    // 1. Verificar que no tenga historias
    const verificacion = await this.verificarAlumnoTieneHistorias(alumnoId);
    if (verificacion.tieneHistorias) {
      throw new AppError('No se puede eliminar un alumno con historias clínicas asociadas', 400);
    }

    // 2. Obtener UsuarioID
    const [alumno] = await db.query(
      'SELECT UsuarioID FROM AlumnosInfo WHERE ID = ?',
      [alumnoId]
    );

    if (alumno.length === 0) {
      throw new AppError('Alumno no encontrado', 404);
    }

    const usuarioId = alumno[0].UsuarioID;

    // 3. Eliminar registros relacionados
    await db.query('DELETE FROM MateriasAlumno WHERE AlumnoInfoID = ?', [alumnoId]);
    await db.query('DELETE FROM RespuestasComentarios WHERE AlumnoID = ?', [alumnoId]);

    // 4. Eliminar registro de AlumnosInfo
    await db.query('DELETE FROM AlumnosInfo WHERE ID = ?', [alumnoId]);

    // 5. DESACTIVAR usuario en lugar de eliminarlo
    await db.query(
      'UPDATE Usuarios SET EstaActivo = FALSE, FechaBorrado = NOW() WHERE ID = ?',
      [usuarioId]
    );

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar alumno:', error);
    throw error;
  }
},

// ==================== GESTIÓN DE MATERIAS ====================

async obtenerTodasMateriasAdmin() {
  try {
    const query = `
      SELECT
        mp.ID as MateriaProfesorID,
        m.ID as MateriaID,
        m.Codigo,
        m.Nombre as NombreMateria,
        m.Semestre,
        m.EjeFormativo,
        m.Descripcion,
        mp.Grupo,
        pe.Codigo as PeriodoEscolar,
        pe.EsActual,
        turno.Valor as Turno,
        CONCAT(pi.Nombre, ' ', pi.ApellidoPaterno, ' ', IFNULL(pi.ApellidoMaterno, '')) as NombreProfesor,
        pi.NumeroEmpleado,
        pi.ID as ProfesorInfoID,
        mp.FechaAsignacion,
        COUNT(DISTINCT ma.AlumnoInfoID) as CantidadAlumnos,
        COUNT(DISTINCT hc.ID) as CantidadHistorias
      FROM MateriasProfesor mp
      INNER JOIN Materias m ON mp.MateriaID = m.ID
      INNER JOIN ProfesoresInfo pi ON mp.ProfesorInfoID = pi.ID
      INNER JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID
      INNER JOIN CatalogosGenerales turno ON mp.TurnoID = turno.ID
      LEFT JOIN MateriasAlumno ma ON mp.ID = ma.MateriaProfesorID
      LEFT JOIN HistorialesClinicos hc ON mp.ID = hc.MateriaProfesorID
      WHERE turno.TipoCatalogo = 'TURNO'
        AND pe.EsActual = TRUE  -- Solo período activo
      GROUP BY mp.ID
      ORDER BY m.Nombre ASC
    `;

    const [materias] = await db.query(query);

    // Para cada materia, obtener sus alumnos
    for (let materia of materias) {
      const [alumnos] = await db.query(`
        SELECT
          ai.ID as AlumnoInfoID,
          ai.NumeroBoleta,
          ai.Nombre,
          ai.ApellidoPaterno,
          ai.ApellidoMaterno,
          u.CorreoElectronico,
          u.TelefonoCelular,
          ma.FechaInscripcion
        FROM MateriasAlumno ma
        INNER JOIN AlumnosInfo ai ON ma.AlumnoInfoID = ai.ID
        INNER JOIN Usuarios u ON ai.UsuarioID = u.ID
        WHERE ma.MateriaProfesorID = ?
        ORDER BY ai.ApellidoPaterno, ai.ApellidoMaterno, ai.Nombre
      `, [materia.MateriaProfesorID]);

      materia.Alumnos = alumnos;
    }

    return materias;
  } catch (error) {
    console.error('Error al obtener materias admin:', error);
    throw new AppError('Error al obtener materias', 500);
  }
},

async crearMateriaProfesor(datos) {
  try {
    // 1. Verificar que el profesor existe
    const [profesor] = await db.query(
      'SELECT ID FROM ProfesoresInfo WHERE ID = ?',
      [datos.profesorInfoId]
    );

    if (profesor.length === 0) {
      throw new AppError('Profesor no encontrado', 404);
    }

    let materiaId;

    // 2. Verificar si se está usando una materia existente o creando una nueva
    if (datos.materiaExistenteId) {
      // Usar materia existente
      materiaId = datos.materiaExistenteId;

      const [materiaExiste] = await db.query(
        'SELECT ID FROM Materias WHERE ID = ?',
        [materiaId]
      );

      if (materiaExiste.length === 0) {
        throw new AppError('Materia no encontrada', 404);
      }
    } else {
      // Crear nueva materia
      if (!datos.codigoMateria || !datos.nombreMateria || !datos.semestre) {
        throw new AppError('Faltan datos obligatorios para crear la materia', 400);
      }

      // Verificar que el código no exista
      const [codigoExiste] = await db.query(
        'SELECT ID FROM Materias WHERE Codigo = ?',
        [datos.codigoMateria]
      );

      if (codigoExiste.length > 0) {
        throw new AppError('Ya existe una materia con este código', 400);
      }

      const [resultMateria] = await db.query(
        `INSERT INTO Materias (Codigo, Nombre, Semestre, EjeFormativo, Descripcion)
         VALUES (?, ?, ?, ?, ?)`,
        [
          datos.codigoMateria,
          datos.nombreMateria,
          datos.semestre,
          datos.ejeFormativo || null,
          datos.descripcion || null
        ]
      );

      materiaId = resultMateria.insertId;
    }

    // 3. Obtener período escolar actual
    const [periodoActual] = await db.query(
      'SELECT ID FROM PeriodosEscolares WHERE EsActual = TRUE LIMIT 1'
    );

    if (periodoActual.length === 0) {
      throw new AppError('No hay período escolar activo', 404);
    }

    const periodoEscolarId = periodoActual[0].ID;

    // 4. Obtener ID del turno
    const turnoFinal = datos.turno || 'Matutino';
    const [turno] = await db.query(
      "SELECT ID FROM CatalogosGenerales WHERE TipoCatalogo = 'TURNO' AND Valor = ?",
      [turnoFinal]
    );

    if (turno.length === 0) {
      throw new AppError('Turno no encontrado', 404);
    }

    const turnoId = turno[0].ID;

    // 5. Verificar que no exista la misma combinación
    const [existe] = await db.query(
      `SELECT ID FROM MateriasProfesor
       WHERE MateriaID = ? AND ProfesorInfoID = ?
       AND PeriodoEscolarID = ? AND Grupo = ? AND TurnoID = ?`,
      [materiaId, datos.profesorInfoId, periodoEscolarId, datos.grupo, turnoId]
    );

    if (existe.length > 0) {
      throw new AppError('Esta combinación de materia-profesor-grupo-turno ya existe en este período', 400);
    }

    // 6. Crear MateriasProfesor
    const [result] = await db.query(
      `INSERT INTO MateriasProfesor
       (MateriaID, ProfesorInfoID, PeriodoEscolarID, Grupo, TurnoID, FechaAsignacion)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [materiaId, datos.profesorInfoId, periodoEscolarId, datos.grupo, turnoId]
    );

    return {
      ID: result.insertId,
      MateriaID: materiaId,
      ...datos
    };
  } catch (error) {
    console.error('Error al crear materia-profesor:', error);

    if (error.statusCode) {
      throw error;
    }

    throw new AppError('Error al crear la asignación de materia', 500);
  }
},

// AGREGAR este nuevo método:
async buscarMateriasDisponibles(termino) {
  try {
    const query = `
      SELECT
        ID,
        Codigo,
        Nombre,
        Semestre,
        EjeFormativo,
        Descripcion
      FROM Materias
      WHERE
        Codigo LIKE ? OR
        Nombre LIKE ? OR
        Semestre LIKE ?
      ORDER BY Semestre, Nombre
      LIMIT 10
    `;

    const searchTerm = `%${termino}%`;
    const [materias] = await db.query(query, [searchTerm, searchTerm, searchTerm]);

    return materias;
  } catch (error) {
    console.error('Error al buscar materias:', error);
    throw new AppError('Error al buscar materias', 500);
  }
},

async verificarMateriaProfesorTieneHistorias(materiaProfesorId) {
  try {
    const [result] = await db.query(
      'SELECT COUNT(*) as cantidad FROM HistorialesClinicos WHERE MateriaProfesorID = ?',
      [materiaProfesorId]
    );

    const cantidad = result[0].cantidad;
    return {
      tieneHistorias: cantidad > 0,
      cantidad: cantidad
    };
  } catch (error) {
    console.error('Error al verificar historias de materia:', error);
    throw new AppError('Error al verificar historias', 500);
  }
},

async eliminarMateriaProfesor(materiaProfesorId) {
  try {
    // 1. Verificar que no tenga historias
    const verificacion = await this.verificarMateriaProfesorTieneHistorias(materiaProfesorId);
    if (verificacion.tieneHistorias) {
      throw new AppError('No se puede eliminar una materia con historias clínicas asociadas', 400);
    }

    // 2. Eliminar inscripciones de alumnos
    await db.query('DELETE FROM MateriasAlumno WHERE MateriaProfesorID = ?', [materiaProfesorId]);

    // 3. Eliminar la materia-profesor
    const [result] = await db.query(
      'DELETE FROM MateriasProfesor WHERE ID = ?',
      [materiaProfesorId]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Materia no encontrada', 404);
    }

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar materia-profesor:', error);
    throw error;
  }
},

async buscarProfesoresDisponibles(termino) {
  try {
    const query = `
      SELECT
        pi.ID as ProfesorInfoID,
        pi.NumeroEmpleado,
        pi.Nombre,
        pi.ApellidoPaterno,
        pi.ApellidoMaterno,
        u.CorreoElectronico,
        u.TelefonoCelular
      FROM ProfesoresInfo pi
      INNER JOIN Usuarios u ON pi.UsuarioID = u.ID
      WHERE u.EstaActivo = TRUE
      AND (
        CONCAT(pi.Nombre, ' ', pi.ApellidoPaterno, ' ', IFNULL(pi.ApellidoMaterno, '')) LIKE ?
        OR pi.NumeroEmpleado LIKE ?
        OR u.CorreoElectronico LIKE ?
      )
      ORDER BY pi.ApellidoPaterno, pi.ApellidoMaterno, pi.Nombre
      LIMIT 10
    `;

    const searchTerm = `%${termino}%`;
    const [profesores] = await db.query(query, [searchTerm, searchTerm, searchTerm]);

    return profesores;
  } catch (error) {
    console.error('Error al buscar profesores:', error);
    throw new AppError('Error al buscar profesores', 500);
  }
},

async obtenerCatalogoMaterias() {
  try {
    const [materias] = await db.query(`
      SELECT
        ID,
        Codigo,
        Nombre,
        Semestre,
        EjeFormativo,
        Descripcion
      FROM Materias
      ORDER BY Semestre, Nombre
    `);

    return materias;
  } catch (error) {
    console.error('Error al obtener catálogo de materias:', error);
    throw new AppError('Error al obtener catálogo de materias', 500);
  }
},

// Agregar alumno a materia (reutilizar del profesor service)
async inscribirAlumnoAMateria(datos) {
  try {
    // Verificar que el alumno no esté ya inscrito
    const [yaInscrito] = await db.query(
      'SELECT ID FROM MateriasAlumno WHERE AlumnoInfoID = ? AND MateriaProfesorID = ?',
      [datos.alumnoInfoId, datos.materiaProfesorId]
    );

    if (yaInscrito.length > 0) {
      throw new AppError('El alumno ya está inscrito en esta materia', 400);
    }

    // Inscribir al alumno
    const [result] = await db.query(
      'INSERT INTO MateriasAlumno (AlumnoInfoID, MateriaProfesorID, FechaInscripcion) VALUES (?, ?, NOW())',
      [datos.alumnoInfoId, datos.materiaProfesorId]
    );

    return { success: true, inscripcionId: result.insertId };
  } catch (error) {
    console.error('Error al inscribir alumno:', error);
    throw error.statusCode ? error : new AppError('Error al inscribir alumno', 500);
  }
},

async eliminarAlumnoDeMateriaAdmin(datos) {
  try {
    const [result] = await db.query(
      'DELETE FROM MateriasAlumno WHERE AlumnoInfoID = ? AND MateriaProfesorID = ?',
      [datos.alumnoInfoId, datos.materiaProfesorId]
    );

    if (result.affectedRows === 0) {
      throw new AppError('No se encontró la inscripción', 404);
    }

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar alumno de materia:', error);
    throw error.statusCode ? error : new AppError('Error al eliminar alumno de materia', 500);
  }
},

async buscarAlumnosDisponibles(termino) {
  try {
    const query = `
      SELECT
        ai.ID as AlumnoInfoID,
        ai.NumeroBoleta,
        ai.Nombre,
        ai.ApellidoPaterno,
        ai.ApellidoMaterno,
        u.CorreoElectronico,
        u.TelefonoCelular
      FROM AlumnosInfo ai
      INNER JOIN Usuarios u ON ai.UsuarioID = u.ID
      WHERE u.EstaActivo = TRUE
      AND (
        CONCAT(ai.Nombre, ' ', ai.ApellidoPaterno, ' ', IFNULL(ai.ApellidoMaterno, '')) LIKE ?
        OR ai.NumeroBoleta LIKE ?
        OR u.CorreoElectronico LIKE ?
      )
      ORDER BY ai.ApellidoPaterno, ai.ApellidoMaterno, ai.Nombre
      LIMIT 10
    `;

    const searchTerm = `%${termino}%`;
    const [alumnos] = await db.query(query, [searchTerm, searchTerm, searchTerm]);

    return alumnos;
  } catch (error) {
    console.error('Error al buscar alumnos:', error);
    throw new AppError('Error al buscar alumnos', 500);
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