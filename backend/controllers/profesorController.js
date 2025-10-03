const profesorService = require('../services/profesorService');
const historiaClinicaService = require('../services/historiaClinicaService');
const { catchAsync } = require('../utils/errorHandler');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

/**
 * Controlador para manejar las operaciones de profesores
 */
const profesorController = {
  /**
   * Obtener datos del perfil del profesor logueado
   */
  obtenerPerfil: catchAsync(async (req, res) => {
    console.log('📄 === INICIANDO obtenerPerfil ===');
    const profesorId = req.usuario.ProfesorInfoID;

    if (!profesorId) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de profesor no encontrado'
      });
    }

    const perfil = await profesorService.obtenerProfesorPorId(profesorId);

    if (!perfil) {
      return res.status(404).json({
        status: 'error',
        message: 'Profesor no encontrado'
      });
    }

    if (perfil.ContraseñaHash) {
      delete perfil.ContraseñaHash;
    }

    res.status(200).json({
      status: 'success',
      data: perfil
    });
  }),

  obtenerHistoriasClinicas: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    // Cambiar de historiaClinicaService a profesorService
    const historias = await profesorService.obtenerHistoriasClinicasAlumnos(profesorId);

    res.status(200).json({
      status: 'success',
      results: historias.length,
      data: historias
    });
  }),

  obtenerHistoriaClinica: catchAsync(async (req, res) => {
    const { id } = req.params;
    const profesorId = req.usuario.ProfesorInfoID;

    const historia = await historiaClinicaService.obtenerHistoriaClinicaPorIdProfesor(id, profesorId);

    if (!historia) {
      return res.status(404).json({
        status: 'error',
        message: 'Historia clínica no encontrada o no tienes permiso para acceder a ella'
      });
    }

    res.status(200).json({
      status: 'success',
      data: historia
    });
  }),

  obtenerEstadisticasHistorias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const estadisticas = await historiaClinicaService.obtenerEstadisticasPorProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      data: estadisticas
    });
  }),

  obtenerAlumnosAsignados: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const alumnos = await profesorService.obtenerAlumnosAsignados(profesorId);

    res.status(200).json({
      status: 'success',
      results: alumnos.length,
      data: alumnos
    });
  }),

  obtenerMaterias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const materias = await profesorService.obtenerMateriasProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      results: materias.length,
      data: materias
    });
  }),

  obtenerTodasMaterias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const materias = await profesorService.obtenerTodasMateriasProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      results: materias.length,
      data: materias
    });
  }),

  obtenerPeriodoEscolar: catchAsync(async (req, res) => {
    const periodo = await profesorService.obtenerPeriodoEscolarActual();

    if (!periodo) {
      return res.status(404).json({
        status: 'error',
        message: 'No hay un período escolar activo actualmente'
      });
    }

    res.status(200).json({
      status: 'success',
      data: periodo
    });
  }),

  obtenerAlumnosPorMateria: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const materiaId = req.params.materiaId;

    const materiaProfesor = await profesorService.verificarMateriaProfesor(profesorId, materiaId);

    if (!materiaProfesor) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes acceso a esta materia'
      });
    }

    const alumnos = await profesorService.obtenerAlumnosPorMateria(materiaId);

    res.status(200).json({
      status: 'success',
      results: alumnos.length,
      data: alumnos
    });
  }),

  obtenerMateriasConAlumnos: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const materiasConAlumnos = await profesorService.obtenerMateriasConAlumnos(profesorId);

    res.status(200).json({
      status: 'success',
      results: materiasConAlumnos.length,
      data: materiasConAlumnos
    });
  }),

  actualizarPerfil: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const usuarioId = req.usuario.UsuarioID;
    const { nombreUsuario, correoElectronico, telefonoCelular } = req.body;

    if (!nombreUsuario && !correoElectronico && !telefonoCelular) {
      return res.status(400).json({
        status: 'error',
        message: 'Debes enviar al menos un campo para actualizar'
      });
    }

    try {
      await profesorService.actualizarPerfil(profesorId, usuarioId, {
        nombreUsuario: nombreUsuario?.trim(),
        correoElectronico: correoElectronico?.trim().toLowerCase(),
        telefonoCelular: telefonoCelular?.trim()
      });

      res.status(200).json({
        status: 'success',
        message: 'Perfil actualizado correctamente',
        data: null
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);

      if (error.message.includes('nombre de usuario ya existe') ||
          error.message.includes('correo electrónico ya existe') ||
          error.message.includes('número de teléfono ya existe')) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }

      if (error.code === 'ER_DUP_ENTRY') {
        let message = 'Ya existe un registro con esos datos.';

        if (error.sqlMessage.includes('idx_telefono')) {
          message = 'El número de teléfono ya está registrado.';
        } else if (error.sqlMessage.includes('idx_correo')) {
          message = 'El correo electrónico ya está registrado.';
        } else if (error.sqlMessage.includes('idx_nombre')) {
          message = 'El nombre de usuario ya está en uso.';
        }

        return res.status(400).json({
          status: 'error',
          message: message
        });
      }

      throw error;
    }
  }),

  verificarPassword: catchAsync(async (req, res) => {
    const { passwordActual } = req.body;
    const usuarioId = req.usuario.UsuarioID;

    if (!passwordActual) {
      return res.status(400).json({
        status: 'error',
        message: 'La contraseña actual es requerida'
      });
    }

    try {
      const esValida = await profesorService.verificarPassword(usuarioId, passwordActual);

      res.status(200).json({
        status: 'success',
        data: esValida
      });
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Error al verificar contraseña'
      });
    }
  }),

  actualizarPassword: catchAsync(async (req, res) => {
    const { passwordActual, nuevaPassword } = req.body;
    const usuarioId = req.usuario.UsuarioID;

    if (!passwordActual || !nuevaPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Contraseña actual y nueva son requeridas'
      });
    }

    try {
      await profesorService.actualizarPassword(usuarioId, passwordActual, nuevaPassword);

      res.status(200).json({
        status: 'success',
        message: 'Contraseña actualizada correctamente'
      });
    } catch (error) {
      console.error('Error en actualizarPassword controller:', error);

      if (error.message === 'Contraseña actual incorrecta') {
        return res.status(400).json({
          status: 'error',
          message: 'La contraseña actual es incorrecta'
        });
      }

      throw error;
    }
  }),

  // ==================== MÉTODOS DE COMENTARIOS ====================

  agregarComentario: catchAsync(async (req, res) => {
    const { historiaId, comentario, seccionId } = req.body;
    const profesorId = req.usuario.ProfesorInfoID;

    try {
      const query = `
        INSERT INTO ComentariosProfesor
        (HistorialID, ProfesorID, Comentario, SeccionID)
        VALUES (?, ?, ?, ?)
      `;

      await db.query(query, [historiaId, profesorId, comentario, seccionId || null]);

      res.json({
        success: true,
        message: 'Comentario agregado exitosamente'
      });
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar comentario'
      });
    }
  }),

  obtenerComentariosConRespuestas: catchAsync(async (req, res) => {
    const { historiaId } = req.params;

    try {
      const queryComentarios = `
        SELECT
          cp.ID,
          cp.HistorialID,
          cp.ProfesorID,
          CONCAT(p.Nombre, ' ', p.ApellidoPaterno, ' ', IFNULL(p.ApellidoMaterno, '')) as NombreUsuario,
          cp.Comentario,
          cp.FechaComentario as FechaCreacion,
          cp.SeccionID,
          CASE
            WHEN cp.SeccionID = 1 THEN 'Datos Generales'
            WHEN cp.SeccionID = 2 THEN 'Interrogatorio'
            WHEN cp.SeccionID = 3 THEN 'Antecedente Visual'
            WHEN cp.SeccionID = 4 THEN 'Examen Preliminar'
            WHEN cp.SeccionID = 8 THEN 'Estado Refractivo'
            WHEN cp.SeccionID = 10 THEN 'Binocularidad'
            WHEN cp.SeccionID = 14 THEN 'Detección de Alteraciones'
            WHEN cp.SeccionID = 20 THEN 'Diagnóstico'
            WHEN cp.SeccionID = 24 THEN 'Receta Final'
            ELSE 'General'
          END AS SeccionNombre
        FROM ComentariosProfesor cp
        JOIN ProfesoresInfo p ON cp.ProfesorID = p.ID
        WHERE cp.HistorialID = ?
        ORDER BY cp.FechaComentario DESC
      `;

      const [comentarios] = await db.query(queryComentarios, [historiaId]);

      for (let comentario of comentarios) {
        const queryRespuestas = `
          SELECT
            rc.ID,
            rc.ComentarioID,
            rc.UsuarioID,
            CASE
              WHEN p.ID IS NOT NULL THEN CONCAT(p.Nombre, ' ', p.ApellidoPaterno, ' ', IFNULL(p.ApellidoMaterno, ''))
              WHEN a.ID IS NOT NULL THEN CONCAT(a.Nombre, ' ', a.ApellidoPaterno, ' ', IFNULL(a.ApellidoMaterno, ''))
              ELSE 'Usuario Desconocido'
            END as NombreUsuario,
            rc.Respuesta,
            rc.FechaRespuesta,
            CASE
              WHEN p.ID IS NOT NULL THEN TRUE
              ELSE FALSE
            END AS EsProfesor
          FROM RespuestasComentarios rc
          JOIN Usuarios u ON rc.UsuarioID = u.ID
          LEFT JOIN ProfesoresInfo p ON u.ID = p.UsuarioID
          LEFT JOIN AlumnosInfo a ON u.ID = a.UsuarioID
          WHERE rc.ComentarioID = ?
          ORDER BY rc.FechaRespuesta ASC
        `;

        const [respuestas] = await db.query(queryRespuestas, [comentario.ID]);
        comentario.respuestas = respuestas;
      }

      res.json({
        success: true,
        data: { comentarios }
      });
    } catch (error) {
      console.error('Error al obtener comentarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener comentarios'
      });
    }
  }),

  agregarRespuesta: catchAsync(async (req, res) => {
    const { comentarioId } = req.params;
    const { respuesta } = req.body;
    const usuarioId = req.usuario.UsuarioID;

    try {
      const query = `
        INSERT INTO RespuestasComentarios
        (ComentarioID, UsuarioID, Respuesta)
        VALUES (?, ?, ?)
      `;

      await db.query(query, [comentarioId, usuarioId, respuesta]);

      res.json({
        success: true,
        message: 'Respuesta agregada exitosamente'
      });
    } catch (error) {
      console.error('Error al agregar respuesta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar respuesta'
      });
    }
  }),
  obtenerEstadoHistoria: catchAsync(async (req, res) => {
    const { historiaId } = req.params;

    try {
      const query = `
        SELECT Estado
        FROM HistorialesClinicos
        WHERE ID = ?
      `;

      const [result] = await db.query(query, [historiaId]);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Historia no encontrada'
        });
      }

      res.json({
        success: true,
        data: { estado: result[0].Estado }
      });
    } catch (error) {
      console.error('Error al obtener estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estado'
      });
    }
  }),

  // Archivar/Desarchivar historia
  archivarHistoria: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { archivar } = req.body;

    if (archivar) {
      // 1. Obtener el ID del estado "Finalizado"
      const [estadoFinalizado] = await db.query(
        "SELECT ID FROM CatalogosGenerales WHERE TipoCatalogo = 'ESTADO_HISTORIAL' AND Valor = 'Finalizado'"
      );

      if (estadoFinalizado.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Estado Finalizado no encontrado'
        });
      }

      const estadoFinalizadoId = estadoFinalizado[0].ID;

      // 2. Actualizar estado a Finalizado y archivar
      const [result] = await db.query(
        'UPDATE HistorialesClinicos SET EstadoID = ?, Archivado = TRUE, FechaArchivado = NOW(), ActualizadoEn = NOW() WHERE ID = ?',
        [estadoFinalizadoId, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Historia clínica no encontrada'
        });
      }

      return res.json({
        status: 'success',
        message: 'Historia archivada y finalizada correctamente'
      });
    } else {
      // Desarchivar
      const [result] = await db.query(
        'UPDATE HistorialesClinicos SET Archivado = FALSE, FechaArchivado = NULL, ActualizadoEn = NOW() WHERE ID = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Historia clínica no encontrada'
        });
      }

      return res.json({
        status: 'success',
        message: 'Historia desarchivada correctamente'
      });
    }
  }),

  // Cambiar estado de una historia clínica
  cambiarEstadoHistoria: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    console.log(`Cambiando estado de historia ${id} a: ${estado}`);

    // Validar que el estado sea permitido
    const estadosPermitidos = ['Revisión', 'Corrección', 'Finalizado'];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        status: 'error',
        message: 'Estado no válido para profesores'
      });
    }

    // 1. Obtener el ID del catálogo para el estado
    const [estados] = await db.query(
      "SELECT ID FROM CatalogosGenerales WHERE TipoCatalogo = 'ESTADO_HISTORIAL' AND Valor = ?",
      [estado]
    );

    if (estados.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Estado no encontrado en el catálogo'
      });
    }

    const estadoId = estados[0].ID;

    // 2. Actualizar con EstadoID, no con Estado
    const [result] = await db.query(
      'UPDATE HistorialesClinicos SET EstadoID = ?, ActualizadoEn = NOW() WHERE ID = ?',
      [estadoId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Historia clínica no encontrada'
      });
    }

    res.json({
      status: 'success',
      message: 'Estado actualizado correctamente',
      data: { estadoId, estadoNombre: estado }
    });
  })
};

// ==================== MÉTODOS PARA GESTIÓN DE ALUMNOS ====================

const buscarAlumnos = async (req, res) => {
  try {
    const profesorID = req.usuario.ProfesorInfoID;
    const { termino } = req.query;

    if (!termino || termino.length < 3) {
      return res.status(400).json({
        status: 'error',
        message: 'El término de búsqueda debe tener al menos 3 caracteres'
      });
    }

    const query = `
      SELECT DISTINCT
        ai.ID as AlumnoInfoID,
        ai.NumeroBoleta,
        ai.Nombre,
        ai.ApellidoPaterno,
        ai.ApellidoMaterno,
        u.CorreoElectronico,
        u.TelefonoCelular
      FROM Usuarios u
      INNER JOIN AlumnosInfo ai ON u.ID = ai.UsuarioID
      WHERE u.EstaActivo = 1
        AND u.RolID = (SELECT ID FROM Roles WHERE NombreRol = 'Alumno')
        AND (ai.NumeroBoleta LIKE ?
          OR CONCAT(ai.Nombre, ' ', ai.ApellidoPaterno, ' ', COALESCE(ai.ApellidoMaterno, '')) LIKE ?
          OR u.CorreoElectronico LIKE ?
          OR ai.Nombre LIKE ?
          OR ai.ApellidoPaterno LIKE ?
          OR COALESCE(ai.ApellidoMaterno, '') LIKE ?)
      ORDER BY ai.Nombre, ai.ApellidoPaterno
      LIMIT 10
    `;

    const searchTerm = `%${termino}%`;
    const [results] = await db.query(query, [
      searchTerm, searchTerm, searchTerm,
      searchTerm, searchTerm, searchTerm
    ]);

    res.status(200).json({
      status: 'success',
      data: results
    });

  } catch (error) {
    console.error('Error al buscar alumnos:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al buscar alumnos'
    });
  }
};

const verificarBoletaExistente = async (req, res) => {
  try {
    const { numeroBoleta } = req.query;

    if (!numeroBoleta) {
      return res.status(400).json({
        status: 'error',
        message: 'Número de boleta requerido'
      });
    }

    const query = `
      SELECT COUNT(*) as count
      FROM AlumnosInfo
      WHERE NumeroBoleta = ?
    `;

    const [results] = await db.query(query, [numeroBoleta]);
    const existe = results[0].count > 0;

    res.status(200).json({
      status: 'success',
      data: existe
    });

  } catch (error) {
    console.error('Error al verificar boleta:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor'
    });
  }
};

const verificarCorreoExistente = async (req, res) => {
  try {
    const { correoElectronico } = req.query;

    if (!correoElectronico) {
      return res.status(400).json({
        status: 'error',
        message: 'Correo electrónico requerido'
      });
    }

    const query = `
      SELECT COUNT(*) as count
      FROM Usuarios
      WHERE CorreoElectronico = ?
    `;

    const [results] = await db.query(query, [correoElectronico]);
    const existe = results[0].count > 0;

    res.status(200).json({
      status: 'success',
      data: existe
    });

  } catch (error) {
    console.error('Error al verificar correo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor'
    });
  }
};

const inscribirAlumnoMateria = async (req, res) => {
  const connection = await db.pool.getConnection();

  try {
    await connection.beginTransaction();

    const profesorID = req.usuario.ProfesorInfoID;
    const { alumnoInfoId, materiaProfesorId } = req.body;

    if (!alumnoInfoId || !materiaProfesorId) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'ID de alumno y materia son requeridos'
      });
    }

    const [alumnoInfo] = await connection.query(
      `SELECT ai.Nombre, ai.ApellidoPaterno, ai.ApellidoMaterno, ai.NumeroBoleta
       FROM AlumnosInfo ai
       WHERE ai.ID = ?`,
      [alumnoInfoId]
    );

    if (alumnoInfo.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'El alumno no existe'
      });
    }

    const [materiaProfesor] = await connection.query(
      `SELECT mp.ID, mp.PeriodoEscolarID, mp.Grupo,
              m.Nombre as NombreMateria, m.Codigo as CodigoMateria,
              pi.Nombre as NombreProfesor, pi.ApellidoPaterno as ApellidoProfesor
       FROM MateriasProfesor mp
       INNER JOIN Materias m ON mp.MateriaID = m.ID
       INNER JOIN ProfesoresInfo pi ON mp.ProfesorInfoID = pi.ID
       WHERE mp.ID = ? AND mp.ProfesorInfoID = ?`,
      [materiaProfesorId, profesorID]
    );

    if (materiaProfesor.length === 0) {
      await connection.rollback();
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para inscribir alumnos en esta materia'
      });
    }

    const [yaInscrito] = await connection.query(
      `SELECT COUNT(*) as count
       FROM MateriasAlumno
       WHERE AlumnoInfoID = ? AND MateriaProfesorID = ?`,
      [alumnoInfoId, materiaProfesorId]
    );

    if (yaInscrito[0].count > 0) {
      await connection.rollback();

      const alumno = alumnoInfo[0];
      const materia = materiaProfesor[0];
      const nombreCompleto = `${alumno.Nombre} ${alumno.ApellidoPaterno} ${alumno.ApellidoMaterno || ''}`.trim();

      return res.status(400).json({
        status: 'error',
        message: `El alumno ${nombreCompleto} (${alumno.NumeroBoleta}) ya está inscrito en ${materia.CodigoMateria} - ${materia.NombreMateria}, Grupo ${materia.Grupo}`
      });
    }

    await connection.query(
      `INSERT INTO MateriasAlumno (AlumnoInfoID, MateriaProfesorID, FechaInscripcion)
       VALUES (?, ?, NOW())`,
      [alumnoInfoId, materiaProfesorId]
    );

    const periodoEscolarID = materiaProfesor[0].PeriodoEscolarID;
    await connection.query(
      `UPDATE AlumnosInfo
       SET PeriodoEscolarActualID = ?
       WHERE ID = ? AND (PeriodoEscolarActualID IS NULL OR PeriodoEscolarActualID < ?)`,
      [periodoEscolarID, alumnoInfoId, periodoEscolarID]
    );

    await connection.commit();

    const alumno = alumnoInfo[0];
    const materia = materiaProfesor[0];
    const nombreCompleto = `${alumno.Nombre} ${alumno.ApellidoPaterno} ${alumno.ApellidoMaterno || ''}`.trim();

    res.status(200).json({
      status: 'success',
      message: `${nombreCompleto} ha sido inscrito exitosamente en ${materia.CodigoMateria} - ${materia.NombreMateria}, Grupo ${materia.Grupo}`
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al inscribir alumno:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al inscribir el alumno'
    });
  } finally {
    connection.release();
  }
};

const eliminarAlumnoDeMateria = async (req, res) => {
  try {
    const profesorId = req.usuario.ProfesorInfoID;
    const { alumnoInfoId, materiaProfesorId } = req.body;

    if (!alumnoInfoId || !materiaProfesorId) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de alumno y materia son requeridos'
      });
    }

    const resultado = await profesorService.eliminarAlumnoDeMateria(
      alumnoInfoId,
      materiaProfesorId,
      profesorId
    );

    res.status(200).json({
      status: 'success',
      message: resultado.message,
      data: resultado.data
    });

  } catch (error) {
    console.error('Error al eliminar alumno de materia:', error);

    return res.status(400).json({
      status: 'error',
      message: error.message || 'Error al eliminar alumno de la materia'
    });
  }
};

const crearAlumnoEInscribir = async (req, res) => {
  const connection = await db.pool.getConnection();

  try {
    await connection.beginTransaction();

    const profesorID = req.usuario.ProfesorInfoID;
    const {
      numeroBoleta,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      correoElectronico,
      materiaProfesorId
    } = req.body;

    if (!numeroBoleta || !nombre || !apellidoPaterno || !correoElectronico || !materiaProfesorId) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Todos los campos son requeridos'
      });
    }

    const [boletaExists] = await connection.query(
      'SELECT COUNT(*) as count FROM AlumnosInfo WHERE NumeroBoleta = ?',
      [numeroBoleta]
    );

    if (boletaExists[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: `El número de boleta ${numeroBoleta} ya está registrado en el sistema`
      });
    }

    const [correoExists] = await connection.query(
      'SELECT COUNT(*) as count FROM Usuarios WHERE CorreoElectronico = ?',
      [correoElectronico]
    );

    if (correoExists[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: `El correo electrónico ${correoElectronico} ya está registrado en el sistema`
      });
    }

    const [materiaProfesor] = await connection.query(
      `SELECT mp.ID, mp.PeriodoEscolarID, mp.Grupo,
              m.ID as MateriaID, m.Nombre as NombreMateria, m.Codigo as CodigoMateria
       FROM MateriasProfesor mp
       INNER JOIN Materias m ON mp.MateriaID = m.ID
       WHERE mp.ID = ? AND mp.ProfesorInfoID = ?`,
      [materiaProfesorId, profesorID]
    );

    if (materiaProfesor.length === 0) {
      await connection.rollback();
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para inscribir alumnos en esta materia'
      });
    }

    const periodoEscolarID = materiaProfesor[0].PeriodoEscolarID;
    const nombreUsuario = numeroBoleta;
    const passwordTemporal = numeroBoleta;
    const passwordHash = await bcrypt.hash(passwordTemporal, 12);

    const [usuarioResult] = await connection.query(
      `INSERT INTO Usuarios (NombreUsuario, CorreoElectronico, ContraseñaHash, RolID, EstaActivo, FechaCreacion)
       VALUES (?, ?, ?, (SELECT ID FROM Roles WHERE NombreRol = 'Alumno'), 1, NOW())`,
      [nombreUsuario, correoElectronico, passwordHash]
    );

    const usuarioID = usuarioResult.insertId;

    const [alumnoInfoResult] = await connection.query(
      `INSERT INTO AlumnosInfo (UsuarioID, NumeroBoleta, Nombre, ApellidoPaterno, ApellidoMaterno, PeriodoEscolarActualID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioID, numeroBoleta, nombre, apellidoPaterno, apellidoMaterno || '', periodoEscolarID]
    );

    const alumnoInfoID = alumnoInfoResult.insertId;

    await connection.query(`INSERT INTO MateriasAlumno (AlumnoInfoID, MateriaProfesorID, FechaInscripcion)
       VALUES (?, ?, NOW())`,
      [alumnoInfoID, materiaProfesorId]
    );

    await connection.commit();

    const nombreCompleto = `${nombre} ${apellidoPaterno} ${apellidoMaterno || ''}`.trim();
    const materia = materiaProfesor[0];

    res.status(201).json({
      status: 'success',
      message: `${nombreCompleto} ha sido creado e inscrito exitosamente en ${materia.CodigoMateria} - ${materia.NombreMateria}, Grupo ${materia.Grupo}`,
      data: {
        alumnoInfoID,
        numeroBoleta,
        nombreCompleto,
        correoElectronico,
        passwordTemporal,
        materia: `${materia.CodigoMateria} - ${materia.NombreMateria}`,
        grupo: materia.Grupo,
        fechaInscripcion: new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear alumno:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al crear el alumno'
    });
  } finally {
    connection.release();
  }
};

// EXPORTAR TODO JUNTO
module.exports = {
  ...profesorController,
  buscarAlumnos,
  verificarBoletaExistente,
  verificarCorreoExistente,
  crearAlumnoEInscribir,
  inscribirAlumnoMateria,
  eliminarAlumnoDeMateria
};