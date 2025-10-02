const profesorService = require('../services/profesorService');
const historiaClinicaService = require('../services/historiaClinicaService');
const { catchAsync } = require('../utils/errorHandler');
const bcrypt = require('bcryptjs');
const db = require('../config/database'); // ← AGREGAR ESTA LÍNEA

/**
 * Controlador para manejar las operaciones de profesores
 */
const profesorController = {
  /**
   * Obtener datos del perfil del profesor logueado
   */
  obtenerPerfil: catchAsync(async (req, res) => {
    console.log('🔄 === INICIANDO obtenerPerfil ===');
    console.log('req.usuario:', req.usuario);
    console.log('req.role:', req.role);

    const profesorId = req.usuario.ProfesorInfoID;
    console.log('profesorId extraído:', profesorId);

    if (!profesorId) {
      console.log('❌ ProfesorInfoID no encontrado en req.usuario');
      return res.status(400).json({
        status: 'error',
        message: 'ID de profesor no encontrado'
      });
    }

    console.log('🔄 Llamando a profesorService.obtenerProfesorPorId...');
    const perfil = await profesorService.obtenerProfesorPorId(profesorId);
    console.log('Perfil obtenido del service:', perfil);

    if (!perfil) {
      console.log('❌ Perfil no encontrado en la base de datos');
      return res.status(404).json({
        status: 'error',
        message: 'Profesor no encontrado'
      });
    }

    // Asegurarse de no enviar información sensible
    if (perfil.ContraseñaHash) {
      delete perfil.ContraseñaHash;
    }

    console.log('✅ Enviando respuesta exitosa del perfil');
    res.status(200).json({
      status: 'success',
      data: perfil
    });
  }),

  /**
   * Obtener historias clínicas de los alumnos del profesor
   */
  obtenerHistoriasClinicas: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const historias = await historiaClinicaService.obtenerHistoriasClinicasPorProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      results: historias.length,
      data: historias
    });
  }),

  /**
 * Obtener una historia clínica específica por ID (desde perspectiva del profesor)
 */
obtenerHistoriaClinica: catchAsync(async (req, res) => {
  const { id } = req.params;
  const profesorId = req.usuario.ProfesorInfoID;

  console.log(`Profesor Controller: Obteniendo historia clínica ID=${id} para profesorId=${profesorId}`);

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

  /**
   * Obtener estadísticas de historias clínicas del profesor
   */
  obtenerEstadisticasHistorias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const estadisticas = await historiaClinicaService.obtenerEstadisticasPorProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      data: estadisticas
    });
  }),

  /**
   * Obtener alumnos asignados al profesor
   */
  obtenerAlumnosAsignados: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const alumnos = await profesorService.obtenerAlumnosAsignados(profesorId);

    res.status(200).json({
      status: 'success',
      results: alumnos.length,
      data: alumnos
    });
  }),

  /**
   * Obtener materias del profesor
   */
  obtenerMaterias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const materias = await profesorService.obtenerMateriasProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      results: materias.length,
      data: materias
    });
  }),

  /**
   * Obtener todas las materias del profesor (incluyendo históricas)
   */
  obtenerTodasMaterias: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const materias = await profesorService.obtenerTodasMateriasProfesor(profesorId);

    res.status(200).json({
      status: 'success',
      results: materias.length,
      data: materias
    });
  }),

  /**
   * Obtener información del período escolar actual
   */
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

  /**
   * Obtener alumnos de una materia específica del profesor
   */
  obtenerAlumnosPorMateria: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;
    const materiaId = req.params.materiaId;

    // Verificar que la materia pertenece al profesor
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

  /**
   * Obtener materias con sus alumnos (método alternativo)
   */
  obtenerMateriasConAlumnos: catchAsync(async (req, res) => {
    const profesorId = req.usuario.ProfesorInfoID;

    const materiasConAlumnos = await profesorService.obtenerMateriasConAlumnos(profesorId);

    res.status(200).json({
      status: 'success',
      results: materiasConAlumnos.length,
      data: materiasConAlumnos
    });
  }),

  /**
   * Actualizar datos del perfil
   */
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

      // Manejar errores específicos
      if (error.message.includes('nombre de usuario ya existe') ||
          error.message.includes('correo electrónico ya existe') ||
          error.message.includes('número de teléfono ya existe')) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }

      // Para errores de duplicación de MySQL
      if (error.code === 'ER_DUP_ENTRY') {
        let message = 'Ya existe un registro con esos datos.';

        if (error.sqlMessage.includes('idx_telefono')) {
          message = 'El número de teléfono ya está registrado. Por favor, utiliza otro.';
        } else if (error.sqlMessage.includes('idx_correo')) {
          message = 'El correo electrónico ya está registrado. Por favor, utiliza otro.';
        } else if (error.sqlMessage.includes('idx_nombre')) {
          message = 'El nombre de usuario ya está en uso. Por favor, elige otro.';
        }

        return res.status(400).json({
          status: 'error',
          message: message,
          sqlCode: error.code,
          sqlMessage: error.sqlMessage
        });
      }

      // Si es otro tipo de error, lo pasamos al manejador global
      throw error;
    }
  }),

  /**
   * Verificar contraseña actual
   */
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

  /**
   * Actualiza la contraseña del profesor
   */
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

      // Manejar errores específicos
      if (error.message === 'Contraseña actual incorrecta') {
        return res.status(400).json({
          status: 'error',
          message: 'La contraseña actual es incorrecta'
        });
      }

      // Para otros errores, dejamos que catchAsync los maneje
      throw error;
    }
  })
};

// ==================== NUEVOS MÉTODOS PARA GESTIÓN DE ALUMNOS ====================

// Buscar alumnos existentes
// 1. CORREGIR buscarAlumnos - línea 386 aproximadamente
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

    // ✅ CORRECTO - Relación directa entre Usuarios y AlumnosInfo
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
      INNER JOIN AlumnosInfo ai ON u.ID = ai.UsuarioID    -- ✅ Relación directa correcta
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
    // CAMBIAR DE db.execute A db.query
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

// Verificar si una boleta ya existe
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

    // CAMBIAR DE db.execute A db.query
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

// Verificar si un correo ya existe
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

    // CAMBIAR DE db.execute A db.query
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

// Crear nuevo alumno e inscribirlo a una materia
// Mejoras en la función inscribirAlumnoMateria
const inscribirAlumnoMateria = async (req, res) => {
  const connection = await db.pool.getConnection();

  try {
    await connection.beginTransaction();

    const profesorID = req.usuario.ProfesorInfoID;
    const { alumnoInfoId, materiaProfesorId } = req.body;

    // Validaciones básicas
    if (!alumnoInfoId || !materiaProfesorId) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'ID de alumno y materia son requeridos'
      });
    }

    // Obtener información del alumno para mensaje más descriptivo
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

    // Obtener información de la materia y profesor para mensaje más descriptivo
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

    // Verificar que el alumno no esté ya inscrito en esta materia CON MENSAJE MEJORADO
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
        message: `El alumno ${nombreCompleto} (${alumno.NumeroBoleta}) ya está inscrito en ${materia.CodigoMateria} - ${materia.NombreMateria}, Grupo ${materia.Grupo}`,
        detalles: {
          alumno: nombreCompleto,
          numeroBoleta: alumno.NumeroBoleta,
          materia: `${materia.CodigoMateria} - ${materia.NombreMateria}`,
          grupo: materia.Grupo,
          profesor: `${materia.NombreProfesor} ${materia.ApellidoProfesor}`
        }
      });
    }

    // Inscribir al alumno (la fecha se agrega automáticamente con NOW())
    await connection.query(
      `INSERT INTO MateriasAlumno (AlumnoInfoID, MateriaProfesorID, FechaInscripcion)
       VALUES (?, ?, NOW())`,
      [alumnoInfoId, materiaProfesorId]
    );

    // Actualizar período escolar actual del alumno si es necesario
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
      message: `${nombreCompleto} ha sido inscrito exitosamente en ${materia.CodigoMateria} - ${materia.NombreMateria}, Grupo ${materia.Grupo}`,
      data: {
        alumnoInfoId,
        materiaProfesorId,
        alumno: nombreCompleto,
        numeroBoleta: alumno.NumeroBoleta,
        materia: `${materia.CodigoMateria} - ${materia.NombreMateria}`,
        grupo: materia.Grupo,
        fechaInscripcion: new Date().toISOString().split('T')[0] // Fecha actual para mostrar en el frontend
      }
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

// Eliminar alumno de una materia (desinscripción)
const eliminarAlumnoDeMateria = async (req, res) => {
  try {
    const profesorId = req.usuario.ProfesorInfoID;
    const { alumnoInfoId, materiaProfesorId } = req.body;

    // Validaciones básicas
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

// También mejora la función crearAlumnoEInscribir para incluir validación de duplicados
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

    // Validaciones básicas
    if (!numeroBoleta || !nombre || !apellidoPaterno || !correoElectronico || !materiaProfesorId) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar que la boleta no exista
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

    // Verificar que el correo no exista
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

    // Obtener información de la materia para mensaje más descriptivo
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
    const materiaID = materiaProfesor[0].MateriaID;

    // Generar nombre de usuario (número de boleta)
    const nombreUsuario = numeroBoleta;

    // Generar contraseña temporal (el número de boleta completo)
    const passwordTemporal = numeroBoleta;
    const passwordHash = await bcrypt.hash(passwordTemporal, 12);

    // 1. Crear usuario
    const [usuarioResult] = await connection.query(
      `INSERT INTO Usuarios (NombreUsuario, CorreoElectronico, ContraseñaHash, RolID, EstaActivo, FechaCreacion)
       VALUES (?, ?, ?, (SELECT ID FROM Roles WHERE NombreRol = 'Alumno'), 1, NOW())`,
      [nombreUsuario, correoElectronico, passwordHash]
    );

    const usuarioID = usuarioResult.insertId;

    // 2. Crear AlumnosInfo
    const [alumnoInfoResult] = await connection.query(
      `INSERT INTO AlumnosInfo (UsuarioID, NumeroBoleta, Nombre, ApellidoPaterno, ApellidoMaterno, PeriodoEscolarActualID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioID, numeroBoleta, nombre, apellidoPaterno, apellidoMaterno || '', periodoEscolarID]
    );

    const alumnoInfoID = alumnoInfoResult.insertId;

    // 3. Inscribir en la materia (la fecha se agrega automáticamente)
    await connection.query(
      `INSERT INTO MateriasAlumno (AlumnoInfoID, MateriaProfesorID, FechaInscripcion)
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
        passwordTemporal, // Solo para fines informativos
        materia: `${materia.CodigoMateria} - ${materia.NombreMateria}`,
        grupo: materia.Grupo,
        fechaInscripcion: new Date().toISOString().split('T')[0] // Fecha actual
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

module.exports = {
  ...profesorController,
  // Nuevas exportaciones
  buscarAlumnos,
  verificarBoletaExistente,
  verificarCorreoExistente,
  crearAlumnoEInscribir,
  inscribirAlumnoMateria,
  eliminarAlumnoDeMateria
};