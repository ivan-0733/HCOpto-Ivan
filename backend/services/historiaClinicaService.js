const db = require('../config/database.js');

/**
 * Servicio para gestionar historias clínicas en la base de datos
 */
const historiaClinicaService = {
/**
 * Obtiene todas las historias clínicas de un alumno
 * @param {number} alumnoId - ID del alumno (de AlumnosInfo)
 * @returns {Promise<Array>} - Lista de historias clínicas
 */
// En historiaClinicaService.js
async obtenerHistoriasClinicasPorAlumno(alumnoId) {
  try {
    const [historias] = await db.query(
      `SELECT hc.ID, hc.Fecha, hc.Archivado, hc.FechaArchivado, hc.EstadoID,
              p.ID AS PacienteID, p.Nombre, p.ApellidoPaterno, p.ApellidoMaterno,
              p.CorreoElectronico, p.TelefonoCelular, p.Edad,
              cg.Valor AS Estado, c.Nombre AS Consultorio, s.Nombre AS Semestre,
              hc.ProfesorID  -- Asegurarse de incluir ProfesorID desde la tabla HistorialesClinicos
      FROM HistorialesClinicos hc
          JOIN Pacientes p ON hc.PacienteID = p.ID
          JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
          JOIN Consultorios c ON hc.ConsultorioID = c.ID
          JOIN Semestres s ON hc.SemestreID = s.ID
          WHERE hc.AlumnoID = ?
          ORDER BY hc.Fecha DESC`,
      [alumnoId]
    );

    // Hacer console.log para verificar que ProfesorID está presente en los resultados
    console.log('Primera historia clínica obtenida:', historias.length > 0 ? historias[0] : 'No hay historias');

    return historias;
  } catch (error) {
    console.error('Error al obtener historias clínicas:', error);
    throw error;
  }
},

/**
 * Obtiene una historia clínica por su ID
 * @param {number} id - ID de la historia clínica
 * @param {number} alumnoId - ID del alumno para verificar permisos
 * @returns {Promise<Object|null>} - Datos de la historia clínica o null si no existe
 */
async obtenerHistoriaClinicaPorId(id, alumnoId) {
  try {
    console.log(`Obteniendo historia ID=${id} para alumnoId=${alumnoId}`);

    // Consulta única optimizada con todos los joins necesarios
    const [historias] = await db.query(
      `SELECT
        hc.ID,
        hc.Fecha,
        hc.Archivado,
        hc.FechaArchivado,
        hc.EstadoID,

        -- Datos del Paciente
        p.ID AS PacienteID,
        p.Nombre AS Nombre,
        p.ApellidoPaterno AS ApellidoPaterno,
        p.ApellidoMaterno AS ApellidoMaterno,
        p.GeneroID,
        p.Edad,
        p.EstadoCivilID,
        p.EscolaridadID,
        p.Ocupacion,
        p.DireccionLinea1,
        p.DireccionLinea2,
        p.Ciudad,
        p.EstadoID AS PacienteEstadoID,
        p.CodigoPostal,
        p.Pais,
        p.CorreoElectronico,
        p.TelefonoCelular,
        p.Telefono,

        -- Datos del Catálogo
        cg.Valor AS Estado,

        -- Consultorio y semestre
        c.Nombre AS Consultorio,
        s.Nombre AS Semestre,

        -- Datos del Alumno desde AlumnosInfo
        a.Nombre AS AlumnoNombre,
        a.ApellidoPaterno AS AlumnoApellidoPaterno,
        a.ApellidoMaterno AS AlumnoApellidoMaterno,

        -- Datos del Profesor desde ProfesoresInfo
        pr.Nombre AS ProfesorNombre,
        pr.ApellidoPaterno AS ProfesorApellidoPaterno,
        pr.ApellidoMaterno AS ProfesorApellidoMaterno

        FROM HistorialesClinicos hc
        JOIN Pacientes p ON hc.PacienteID = p.ID
        JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
        JOIN Consultorios c ON hc.ConsultorioID = c.ID
        JOIN Semestres s ON hc.SemestreID = s.ID
        JOIN AlumnosInfo a ON hc.AlumnoID = a.ID
        JOIN Usuarios ua ON a.UsuarioID = ua.ID
        JOIN ProfesoresInfo pr ON hc.ProfesorID = pr.ID
        JOIN Usuarios up ON pr.UsuarioID = up.ID

        WHERE hc.ID = ? AND hc.AlumnoID = ?;`,
      [id, alumnoId]
    );

    if (historias.length === 0) {
      console.log(`Historia no encontrada ID=${id} para alumnoId=${alumnoId}`);
      return null;
    }

    const historia = historias[0];
    console.log('Datos básicos obtenidos:', historia.ID);

    // Función auxiliar para ejecutar consultas relacionadas con manejo de errores
    const fetchRelatedData = async (table, fieldName, whereColumn = 'HistorialID') => {
      try {
        const [results] = await db.query(
          `SELECT * FROM ${table} WHERE ${whereColumn} = ?`,
          [id]
        );
        historia[fieldName] = results.length > 0 ? results : [];
        if (results.length > 0 && table !== 'AgudezaVisual') {
          historia[fieldName] = results[0];
        }
      } catch (err) {
        console.error(`Error en ${table}:`, err.message);
        historia[fieldName] = table === 'AgudezaVisual' ? [] : null;
      }
    };

    // Obtener datos relacionados
    await Promise.all([
      fetchRelatedData('Interrogatorio', 'interrogatorio'),
      fetchRelatedData('AgudezaVisual', 'agudezaVisual'),
      fetchRelatedData('Lensometria', 'lensometria'),
      fetchRelatedData('Diagnostico', 'diagnostico'),
      fetchRelatedData('PlanTratamiento', 'planTratamiento'),
      fetchRelatedData('Pronostico', 'pronostico'),
      fetchRelatedData('RecetaFinal', 'recetaFinal'),
    ]);

    // Obtener comentarios y respuestas con manejo de errores
    try {
      const [comentarios] = await db.query(
        `SELECT cp.*, u.NombreUsuario AS ProfesorNombre
         FROM ComentariosProfesor cp
         JOIN ProfesoresInfo p ON cp.ProfesorID = p.ID
         JOIN Usuarios u ON p.UsuarioID = u.ID
         WHERE cp.HistorialID = ?
         ORDER BY cp.FechaComentario`,
        [id]
      );

      historia.comentarios = await Promise.all(
        comentarios.map(async (comentario) => {
          try {
            const [respuestas] = await db.query(
              `SELECT rc.*, u.NombreUsuario AS AlumnoNombre
               FROM RespuestasComentarios rc
               JOIN AlumnosInfo a ON rc.AlumnoID = a.ID
               JOIN Usuarios u ON a.UsuarioID = u.ID
               WHERE rc.ComentarioID = ?
               ORDER BY rc.FechaRespuesta`,
              [comentario.ID]
            );
            return { ...comentario, respuestas };
          } catch (err) {
            console.error('Error obteniendo respuestas:', err.message);
            return { ...comentario, respuestas: [] };
          }
        })
      );
    } catch (err) {
      console.error('Error obteniendo comentarios:', err.message);
      historia.comentarios = [];
    }

    return historia;
  } catch (error) {
    console.error('Error general:', error.message);
    throw new AppError('Error al obtener la historia clínica', 500);
  }
},

/**
 * Crea una nueva historia clínica
 * @param {Object} datosHistoria - Datos de la historia clínica
 * @returns {Promise<Object>} - Historia clínica creada
 */
async crearHistoriaClinica(datosHistoria) {
const connection = await db.pool.getConnection();

try {
    await connection.beginTransaction();

    // 1. Crear el paciente si no existe
    let pacienteId;

    if (datosHistoria.paciente.id) {
    // Si se proporciona un ID de paciente, verificar que exista
    const [pacientes] = await connection.query(
        'SELECT ID FROM Pacientes WHERE ID = ?',
        [datosHistoria.paciente.id]
    );

    if (pacientes.length === 0) {
        throw new Error('El paciente no existe');
    }

    pacienteId = datosHistoria.paciente.id;
    } else {
    // Verificar si el paciente ya existe por correo o teléfono
    const [pacientesExistentes] = await connection.query(
        'SELECT ID FROM Pacientes WHERE CorreoElectronico = ? OR TelefonoCelular = ?',
        [datosHistoria.paciente.correoElectronico, datosHistoria.paciente.telefonoCelular]
    );

    if (pacientesExistentes.length > 0) {
        pacienteId = pacientesExistentes[0].ID;
    } else {
        // Crear nuevo paciente
        const [resultPaciente] = await connection.query(
        `INSERT INTO Pacientes (
            Nombre, ApellidoPaterno, ApellidoMaterno, GeneroID, Edad,
            EstadoCivilID, EscolaridadID, Ocupacion, DireccionLinea1, DireccionLinea2,
            Ciudad, EstadoID, CodigoPostal, Pais, CorreoElectronico, TelefonoCelular, Telefono
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            datosHistoria.paciente.nombre,
            datosHistoria.paciente.apellidoPaterno,
            datosHistoria.paciente.apellidoMaterno,
            datosHistoria.paciente.generoID,
            datosHistoria.paciente.edad,
            datosHistoria.paciente.estadoCivilID,
            datosHistoria.paciente.escolaridadID,
            datosHistoria.paciente.ocupacion,
            datosHistoria.paciente.direccionLinea1,
            datosHistoria.paciente.direccionLinea2,
            datosHistoria.paciente.ciudad,
            datosHistoria.paciente.estadoID,
            datosHistoria.paciente.codigoPostal,
            datosHistoria.paciente.pais || 'México',
            datosHistoria.paciente.correoElectronico,
            datosHistoria.paciente.telefonoCelular,
            datosHistoria.paciente.telefono
        ]
        );

        pacienteId = resultPaciente.insertId;
    }
    }

    // 2. Crear la historia clínica
    const [resultHistoria] = await connection.query(
    `INSERT INTO HistorialesClinicos (
        PacienteID, AlumnoID, ProfesorID, Fecha, EstadoID,
        Archivado, ConsultorioID, SemestreID
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        pacienteId,
        datosHistoria.alumnoID,
        datosHistoria.profesorID,
        datosHistoria.fecha || new Date(),
        datosHistoria.estadoID || 43, // Por defecto "En proceso"
        datosHistoria.archivado || false,
        datosHistoria.consultorioID,
        datosHistoria.semestreID
    ]
    );

    const historiaId = resultHistoria.insertId;

    // 3. Crear el interrogatorio (si se proporciona)
    if (datosHistoria.interrogatorio) {
    await connection.query(
        `INSERT INTO Interrogatorio (
        HistorialID, MotivoConsulta, HeredoFamiliares, NoPatologicos,
        Patologicos, VisualesOculares, PadecimientoActual, Prediagnostico
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
        historiaId,
        datosHistoria.interrogatorio.motivoConsulta,
        datosHistoria.interrogatorio.heredoFamiliares,
        datosHistoria.interrogatorio.noPatologicos,
        datosHistoria.interrogatorio.patologicos,
        datosHistoria.interrogatorio.visualesOculares,
        datosHistoria.interrogatorio.padecimientoActual,
        datosHistoria.interrogatorio.prediagnostico
        ]
    );
    }

    await connection.commit();

    // Obtener la historia clínica creada
    const historiaCreada = await this.obtenerHistoriaClinicaPorId(historiaId, datosHistoria.alumnoID);

    return historiaCreada;
} catch (error) {
    await connection.rollback();
    console.error('Error al crear historia clínica:', error);
    throw error;
} finally {
    connection.release();
}
},

/**
 * Actualiza una sección específica de la historia clínica
 * @param {number} historiaId - ID de la historia clínica
 * @param {string} seccion - Nombre de la sección a actualizar
 * @param {Object} datos - Datos para actualizar
 * @returns {Promise<boolean>} - true si la actualización fue exitosa
 */
async actualizarSeccion(historiaId, seccion, datos) {
const connection = await db.pool.getConnection();

try {
    await connection.beginTransaction();

    // Verificar que la historia clínica exista y no esté archivada
    const [historias] = await connection.query(
    'SELECT Archivado FROM HistorialesClinicos WHERE ID = ?',
    [historiaId]
    );

    if (historias.length === 0) {
    throw new Error('La historia clínica no existe');
    }

    if (historias[0].Archivado) {
    throw new Error('No se puede modificar una historia clínica archivada');
    }

    // Actualizar la sección correspondiente
    switch (seccion) {
    case 'interrogatorio':
        // Verificar si ya existe un interrogatorio para esta historia
        const [interrogatorios] = await connection.query(
        'SELECT ID FROM Interrogatorio WHERE HistorialID = ?',
        [historiaId]
        );

        if (interrogatorios.length === 0) {
        // Crear nuevo interrogatorio
        await connection.query(
            `INSERT INTO Interrogatorio (
            HistorialID, MotivoConsulta, HeredoFamiliares, NoPatologicos,
            Patologicos, VisualesOculares, PadecimientoActual, Prediagnostico
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
            historiaId,
            datos.motivoConsulta,
            datos.heredoFamiliares,
            datos.noPatologicos,
            datos.patologicos,
            datos.visualesOculares,
            datos.padecimientoActual,
            datos.prediagnostico
            ]
        );
        } else {
        // Actualizar interrogatorio existente
        await connection.query(
            `UPDATE Interrogatorio SET
            MotivoConsulta = ?,
            HeredoFamiliares = ?,
            NoPatologicos = ?,
            Patologicos = ?,
            VisualesOculares = ?,
            PadecimientoActual = ?,
            Prediagnostico = ?
            WHERE HistorialID = ?`,
            [
            datos.motivoConsulta,
            datos.heredoFamiliares,
            datos.noPatologicos,
            datos.patologicos,
            datos.visualesOculares,
            datos.padecimientoActual,
            datos.prediagnostico,
            historiaId
            ]
        );
        }
        break;

    case 'agudezaVisual':
        // Eliminar registros existentes para esta historia
        await connection.query(
        'DELETE FROM AgudezaVisual WHERE HistorialID = ?',
        [historiaId]
        );

        // Insertar nuevos registros de agudeza visual
        for (const agudeza of datos) {
        await connection.query(
            `INSERT INTO AgudezaVisual (
            HistorialID, TipoMedicion, OjoDerechoSnellen, OjoDerechoMetros, OjoDerechoMAR,
            OjoIzquierdoSnellen, OjoIzquierdoMetros, OjoIzquierdoMAR,
            AmbosOjosSnellen, AmbosOjosMetros, AmbosOjosMAR,
            OjoDerechoM, OjoDerechoJeager, OjoDerechoPuntos,
            OjoIzquierdoM, OjoIzquierdoJeager, OjoIzquierdoPuntos,
            AmbosOjosM, AmbosOjosJeager, AmbosOjosPuntos,
            DiametroMM, CapacidadVisualOD, CapacidadVisualOI, CapacidadVisualAO
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
            historiaId,
            agudeza.tipoMedicion,
            agudeza.ojoDerechoSnellen,
            agudeza.ojoDerechoMetros,
            agudeza.ojoDerechoMAR,
            agudeza.ojoIzquierdoSnellen,
            agudeza.ojoIzquierdoMetros,
            agudeza.ojoIzquierdoMAR,
            agudeza.ambosOjosSnellen,
            agudeza.ambosOjosMetros,
            agudeza.ambosOjosMAR,
            agudeza.ojoDerechoM,
            agudeza.ojoDerechoJeager,
            agudeza.ojoDerechoPuntos,
            agudeza.ojoIzquierdoM,
            agudeza.ojoIzquierdoJeager,
            agudeza.ojoIzquierdoPuntos,
            agudeza.ambosOjosM,
            agudeza.ambosOjosJeager,
            agudeza.ambosOjosPuntos,
            agudeza.diametroMM,
            agudeza.capacidadVisualOD,
            agudeza.capacidadVisualOI,
            agudeza.capacidadVisualAO
            ]
        );
        }
        break;

    case 'lensometria':
        // Verificar si ya existe un registro de lensometría para esta historia
        const [lensometrias] = await connection.query(
        'SELECT ID FROM Lensometria WHERE HistorialID = ?',
        [historiaId]
        );

        if (lensometrias.length === 0) {
        // Crear nuevo registro de lensometría
        await connection.query(
            `INSERT INTO Lensometria (
            HistorialID, OjoDerechoEsfera, OjoDerechoCilindro, OjoDerechoEje,
            OjoIzquierdoEsfera, OjoIzquierdoCilindro, OjoIzquierdoEje,
            TipoBifocalMultifocalID, ADD, DistanciaRango, CentroOptico
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
            historiaId,
            datos.ojoDerechoEsfera,
            datos.ojoDerechoCilindro,
            datos.ojoDerechoEje,
            datos.ojoIzquierdoEsfera,
            datos.ojoIzquierdoCilindro,
            datos.ojoIzquierdoEje,
            datos.tipoBifocalMultifocalID,
            datos.add,
            datos.distanciaRango,
            datos.centroOptico
            ]
        );
        } else {
        // Actualizar registro de lensometría existente
        await connection.query(
            `UPDATE Lensometria SET
            OjoDerechoEsfera = ?,
            OjoDerechoCilindro = ?,
            OjoDerechoEje = ?,
            OjoIzquierdoEsfera = ?,
            OjoIzquierdoCilindro = ?,
            OjoIzquierdoEje = ?,
            TipoBifocalMultifocalID = ?,
            ADD = ?,
            DistanciaRango = ?,
            CentroOptico = ?
            WHERE HistorialID = ?`,
            [
            datos.ojoDerechoEsfera,
            datos.ojoDerechoCilindro,
            datos.ojoDerechoEje,
            datos.ojoIzquierdoEsfera,
            datos.ojoIzquierdoCilindro,
            datos.ojoIzquierdoEje,
            datos.tipoBifocalMultifocalID,
            datos.add,
            datos.distanciaRango,
            datos.centroOptico,
            historiaId
            ]
        );
        }
        break;

    case 'diagnostico':
        // Verificar si ya existe un diagnóstico para esta historia
        const [diagnosticos] = await connection.query(
        'SELECT ID FROM Diagnostico WHERE HistorialID = ?',
        [historiaId]
        );

        if (diagnosticos.length === 0) {
        // Crear nuevo diagnóstico
        await connection.query(
            `INSERT INTO Diagnostico (
            HistorialID, OjoDerechoRefractivo, OjoIzquierdoRefractivo,
            OjoDerechoPatologico, OjoIzquierdoPatologico, Binocular, Sensorial
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
            historiaId,
            datos.ojoDerechoRefractivo,
            datos.ojoIzquierdoRefractivo,
            datos.ojoDerechoPatologico,
            datos.ojoIzquierdoPatologico,
            datos.binocular,
            datos.sensorial
            ]
        );
        } else {
        // Actualizar diagnóstico existente
        await connection.query(
            `UPDATE Diagnostico SET
            OjoDerechoRefractivo = ?,
            OjoIzquierdoRefractivo = ?,
            OjoDerechoPatologico = ?,
            OjoIzquierdoPatologico = ?,
            Binocular = ?,
            Sensorial = ?
            WHERE HistorialID = ?`,
            [
            datos.ojoDerechoRefractivo,
            datos.ojoIzquierdoRefractivo,
            datos.ojoDerechoPatologico,
            datos.ojoIzquierdoPatologico,
            datos.binocular,
            datos.sensorial,
            historiaId
            ]
        );
        }
        break;

    case 'planTratamiento':
        // Verificar si ya existe un plan de tratamiento para esta historia
        const [planes] = await connection.query(
        'SELECT ID FROM PlanTratamiento WHERE HistorialID = ?',
        [historiaId]
        );

        if (planes.length === 0) {
        // Crear nuevo plan de tratamiento
        await connection.query(
            `INSERT INTO PlanTratamiento (HistorialID, Descripcion)
            VALUES (?, ?)`,
            [historiaId, datos.descripcion]
        );
        } else {
        // Actualizar plan de tratamiento existente
        await connection.query(
            `UPDATE PlanTratamiento SET Descripcion = ? WHERE HistorialID = ?`,
            [datos.descripcion, historiaId]
        );
        }
        break;

    case 'recetaFinal':
        // Verificar si ya existe una receta final para esta historia
        const [recetas] = await connection.query(
        'SELECT ID FROM RecetaFinal WHERE HistorialID = ?',
        [historiaId]
        );

        if (recetas.length === 0) {
        // Crear nueva receta final
        await connection.query(
            `INSERT INTO RecetaFinal (
            HistorialID, OjoDerechoEsfera, OjoDerechoCilindro, OjoDerechoEje,
            OjoDerechoPrisma, OjoDerechoEjePrisma, OjoIzquierdoEsfera,
            OjoIzquierdoCilindro, OjoIzquierdoEje, OjoIzquierdoPrisma,
            OjoIzquierdoEjePrisma, Tratamiento, TipoID, DIP,
            ADD, Material, Observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
            historiaId,
            datos.ojoDerechoEsfera,
            datos.ojoDerechoCilindro,
            datos.ojoDerechoEje,
            datos.ojoDerechoPrisma,
            datos.ojoDerechoEjePrisma,
            datos.ojoIzquierdoEsfera,
            datos.ojoIzquierdoCilindro,
            datos.ojoIzquierdoEje,
            datos.ojoIzquierdoPrisma,
            datos.ojoIzquierdoEjePrisma,
            datos.tratamiento,
            datos.tipoID,
            datos.dip,
            datos.add,
            datos.material,
            datos.observaciones
            ]
        );
        } else {
        // Actualizar receta final existente
        await connection.query(
            `UPDATE RecetaFinal SET
            OjoDerechoEsfera = ?,
            OjoDerechoCilindro = ?,
            OjoDerechoEje = ?,
            OjoDerechoPrisma = ?,
            OjoDerechoEjePrisma = ?,
            OjoIzquierdoEsfera = ?,
            OjoIzquierdoCilindro = ?,
            OjoIzquierdoEje = ?,
            OjoIzquierdoPrisma = ?,
            OjoIzquierdoEjePrisma = ?,
            Tratamiento = ?,
            TipoID = ?,
            DIP = ?,
            ADD = ?,
            Material = ?,
            Observaciones = ?
            WHERE HistorialID = ?`,
            [
            datos.ojoDerechoEsfera,
            datos.ojoDerechoCilindro,
            datos.ojoDerechoEje,
            datos.ojoDerechoPrisma,
            datos.ojoDerechoEjePrisma,
            datos.ojoIzquierdoEsfera,
            datos.ojoIzquierdoCilindro,
            datos.ojoIzquierdoEje,
            datos.ojoIzquierdoPrisma,
            datos.ojoIzquierdoEjePrisma,
            datos.tratamiento,
            datos.tipoID,
            datos.dip,
            datos.add,
            datos.material,
            datos.observaciones,
            historiaId
            ]
        );
        }
        break;

    // Otras secciones pueden ser implementadas de manera similar

    default:
        throw new Error(`Sección no válida: ${seccion}`);
    }

    // Actualizar la última modificación de la historia clínica
    await connection.query(
    'UPDATE HistorialesClinicos SET ActualizadoEn = NOW() WHERE ID = ?',
    [historiaId]
    );

    await connection.commit();

    return true;
} catch (error) {
    await connection.rollback();
    console.error(`Error al actualizar sección ${seccion}:`, error);
    throw error;
} finally {
    connection.release();
}
},

/**
 * Responde a un comentario de un profesor
 * @param {number} comentarioId - ID del comentario
 * @param {number} alumnoId - ID del alumno que responde
 * @param {string} respuesta - Texto de la respuesta
 * @returns {Promise<Object>} - Respuesta creada
 */
async responderComentario(comentarioId, alumnoId, respuesta) {
try {
    // Verificar que el comentario exista
    const [comentarios] = await db.query(
    `SELECT cp.*, hc.Archivado, hc.AlumnoID
        FROM ComentariosProfesor cp
        JOIN HistorialesClinicos hc ON cp.HistorialID = hc.ID
        WHERE cp.ID = ?`,
    [comentarioId]
    );

    if (comentarios.length === 0) {
    throw new Error('El comentario no existe');
    }

    const comentario = comentarios[0];

    // Verificar que la historia no esté archivada
    if (comentario.Archivado) {
    throw new Error('No se puede responder a un comentario en una historia archivada');
    }

    // Verificar que el alumno sea el propietario de la historia
    if (comentario.AlumnoID !== alumnoId) {
    throw new Error('No tienes permiso para responder a este comentario');
    }

    // Crear la respuesta
    const [resultado] = await db.query(
    `INSERT INTO RespuestasComentarios (ComentarioID, AlumnoID, Respuesta)
        VALUES (?, ?, ?)`,
    [comentarioId, alumnoId, respuesta]
    );

    // Obtener la respuesta creada
    const [respuestas] = await db.query(
    `SELECT rc.*, u.NombreUsuario AS AlumnoNombre
        FROM RespuestasComentarios rc
        JOIN AlumnosInfo a ON rc.AlumnoID = a.ID
        JOIN Usuarios u ON a.UsuarioID = u.ID
        WHERE rc.ID = ?`,
    [resultado.insertId]
    );

    return respuestas[0];
} catch (error) {
    console.error('Error al responder comentario:', error);
    throw error;
}
},

/**
 * Obtiene estadísticas de historias clínicas por alumno
 * @param {number} alumnoId - ID del alumno
 * @returns {Promise<Object>} - Estadísticas de historias clínicas
 */
async obtenerEstadisticas(alumnoId) {
try {
    // Obtener total de historias y conteo por estado
    const [estadisticas] = await db.query(
    `SELECT
        (SELECT COUNT(*) FROM HistorialesClinicos WHERE AlumnoID = ?) AS total,
        (SELECT COUNT(*) FROM HistorialesClinicos WHERE AlumnoID = ? AND Archivado = TRUE) AS archivadas,
        cg.Valor AS estado,
        COUNT(hc.ID) AS cantidad
        FROM HistorialesClinicos hc
        JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
        WHERE hc.AlumnoID = ?
        GROUP BY hc.EstadoID, cg.Valor`,
    [alumnoId, alumnoId, alumnoId]
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
    console.error('Error al obtener estadísticas:', error);
    throw error;
}
},

/**
 * Cambia el estado de una historia clínica
 * @param {number} historiaId - ID de la historia clínica
 * @param {number} estadoId - ID del nuevo estado
 * @param {number} alumnoId - ID del alumno para verificar permisos
 * @returns {Promise<boolean>} - true si el cambio fue exitoso
 */
async cambiarEstado(historiaId, estadoId, alumnoId) {
try {
    // Verificar que la historia exista y pertenezca al alumno
    const [historias] = await db.query(
    'SELECT Archivado FROM HistorialesClinicos WHERE ID = ? AND AlumnoID = ?',
    [historiaId, alumnoId]
    );

    if (historias.length === 0) {
    throw new Error('La historia clínica no existe o no tienes permiso para modificarla');
    }

    // Verificar que la historia no esté archivada
    if (historias[0].Archivado) {
    throw new Error('No se puede modificar una historia clínica archivada');
    }

    // Actualizar el estado
    await db.query(
    'UPDATE HistorialesClinicos SET EstadoID = ?, ActualizadoEn = NOW() WHERE ID = ?',
    [estadoId, historiaId]
    );

    return true;
} catch (error) {
    console.error('Error al cambiar estado de historia clínica:', error);
    throw error;
}
}
};

module.exports = historiaClinicaService;