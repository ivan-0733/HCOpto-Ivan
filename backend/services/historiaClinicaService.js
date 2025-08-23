const db = require('../config/database.js');
const { crearHistoriaClinicaCompleta } = require('../controllers/historiaClinicaController.js');

/**
 * Servicio para gestionar historias clínicas en la base de datos
 */
const historiaClinicaService = {
/**
 * Obtiene todas las historias clínicas de un alumno
 * @param {number} alumnoId - ID del alumno (de AlumnosInfo)
 * @returns {Promise<Array>} - Lista de historias clínicas
 */
async obtenerHistoriasClinicasPorAlumno(alumnoId) {
  try {
    const [historias] = await db.query(
      `SELECT hc.ID, hc.Fecha, hc.Archivado, hc.FechaArchivado, hc.EstadoID,
              p.ID AS PacienteID, p.Nombre, p.ApellidoPaterno, p.ApellidoMaterno,
              p.CorreoElectronico, p.TelefonoCelular, p.Edad,
              cg.Valor AS Estado, c.Nombre AS Consultorio, pe.Codigo AS PeriodoEscolar,
              mp.ProfesorInfoID AS ProfesorID,
              m.Nombre AS NombreMateria,
              mp.Grupo AS GrupoMateria,
              hc.MateriaProfesorID,

              -- Datos del Alumno desde AlumnosInfo
              a.Nombre AS AlumnoNombre,
              a.ApellidoPaterno AS AlumnoApellidoPaterno,
              a.ApellidoMaterno AS AlumnoApellidoMaterno,
              a.NumeroBoleta AS AlumnoBoleta,
              ua.CorreoElectronico AS AlumnoCorreo

      FROM HistorialesClinicos hc
          JOIN Pacientes p ON hc.PacienteID = p.ID
          JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
          JOIN Consultorios c ON hc.ConsultorioID = c.ID
          JOIN PeriodosEscolares pe ON hc.PeriodoEscolarID = pe.ID
          JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
          JOIN Materias m ON mp.MateriaID = m.ID
          JOIN AlumnosInfo a ON hc.AlumnoID = a.ID
          JOIN Usuarios ua ON a.UsuarioID = ua.ID
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
        pe.Codigo AS PeriodoEscolar,

        -- Datos de la materia y grupo
        m.Nombre AS NombreMateria,
        mp.Grupo AS GrupoMateria,
        mp.ID AS MateriaProfesorID,

        -- Datos del Alumno desde AlumnosInfo
        a.Nombre AS AlumnoNombre,
        a.ApellidoPaterno AS AlumnoApellidoPaterno,
        a.ApellidoMaterno AS AlumnoApellidoMaterno,

        -- Datos del Profesor desde ProfesoresInfo
        pr.Nombre AS ProfesorNombre,
        pr.ApellidoPaterno AS ProfesorApellidoPaterno,
        pr.ApellidoMaterno AS ProfesorApellidoMaterno,
        pr.ID AS ProfesorID

        FROM HistorialesClinicos hc
        JOIN Pacientes p ON hc.PacienteID = p.ID
        JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
        JOIN Consultorios c ON hc.ConsultorioID = c.ID
        JOIN PeriodosEscolares pe ON hc.PeriodoEscolarID = pe.ID
        JOIN AlumnosInfo a ON hc.AlumnoID = a.ID
        JOIN Usuarios ua ON a.UsuarioID = ua.ID
        JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
        JOIN Materias m ON mp.MateriaID = m.ID
        JOIN ProfesoresInfo pr ON mp.ProfesorInfoID = pr.ID
        JOIN Usuarios up ON pr.UsuarioID = up.ID

        WHERE hc.ID = ? AND hc.AlumnoID = ?`,
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

    // Procesamiento especial para ciertas tablas
    if (table === 'MetodoGrafico' && results.length > 0) {
      // Normalizar nombres de propiedades del método gráfico para que el frontend pueda leerlas
      historia[fieldName] = {
        integracionBinocular: results[0].IntegracionBinocular,
        tipoID: results[0].TipoID,
        visionEstereoscopica: results[0].VisionEstereoscopica,
        tipoVisionID: results[0].TipoVisionID,
        imagenID: results[0].ImagenID
      };
    }
    // Normalizar GridAmsler
    else if (table === 'GridAmsler' && results.length > 0) {
      historia[fieldName] = {
        numeroCartilla: results[0].NumeroCartilla,
        ojoDerechoSensibilidadContraste: results[0].OjoDerechoSensibilidadContraste,
        ojoIzquierdoSensibilidadContraste: results[0].OjoIzquierdoSensibilidadContraste,
        ojoDerechoVisionCromatica: results[0].OjoDerechoVisionCromatica,
        ojoIzquierdoVisionCromatica: results[0].OjoIzquierdoVisionCromatica
      };
    }
    // Normalizar Tonometria
    else if (table === 'Tonometria' && results.length > 0) {
      historia[fieldName] = {
        metodoAnestesico: results[0].MetodoAnestesico,
        fecha: results[0].Fecha,
        hora: results[0].Hora,
        ojoDerecho: results[0].OjoDerecho,
        ojoIzquierdo: results[0].OjoIzquierdo,
        tipoID: results[0].TipoID
      };
    }
    // Normalizar Paquimetria
    else if (table === 'Paquimetria' && results.length > 0) {
      historia[fieldName] = {
        ojoDerechoCCT: results[0].OjoDerechoCCT,
        ojoIzquierdoCCT: results[0].OjoIzquierdoCCT,
        ojoDerechoPIOCorregida: results[0].OjoDerechoPIOCorregida,
        ojoIzquierdoPIOCorregida: results[0].OjoIzquierdoPIOCorregida
      };
    }
    // Normalizar Campimetria
    else if (table === 'Campimetria' && results.length > 0) {
      historia[fieldName] = {
        distancia: results[0].Distancia,
        tamanoColorIndice: results[0].TamanoColorIndice,
        tamanoColorPuntoFijacion: results[0].TamanoColorPuntoFijacion,
        imagenID: results[0].ImagenID
      };
    }
    // Normalizar Biomicroscopia
    else if (table === 'Biomicroscopia' && results.length > 0) {
      historia[fieldName] = {
        ojoDerechoPestanas: results[0].OjoDerechoPestanas,
        ojoIzquierdoPestanas: results[0].OjoIzquierdoPestanas,
        ojoDerechoParpadosIndice: results[0].OjoDerechoParpadosIndice,
        ojoIzquierdoParpadosIndice: results[0].OjoIzquierdoParpadosIndice,
        ojoDerechoBordePalpebral: results[0].OjoDerechoBordePalpebral,
        ojoIzquierdoBordePalpebral: results[0].OjoIzquierdoBordePalpebral,
        ojoDerechoLineaGris: results[0].OjoDerechoLineaGris,
        ojoIzquierdoLineaGris: results[0].OjoIzquierdoLineaGris,
        ojoDerechoCantoExterno: results[0].OjoDerechoCantoExterno,
        ojoIzquierdoCantoExterno: results[0].OjoIzquierdoCantoExterno,
        ojoDerechoCantoInterno: results[0].OjoDerechoCantoInterno,
        ojoIzquierdoCantoInterno: results[0].OjoIzquierdoCantoInterno,
        ojoDerechoPuntosLagrimales: results[0].OjoDerechoPuntosLagrimales,
        ojoIzquierdoPuntosLagrimales: results[0].OjoIzquierdoPuntosLagrimales,
        ojoDerechoConjuntivaTarsal: results[0].OjoDerechoConjuntivaTarsal,
        ojoIzquierdoConjuntivaTarsal: results[0].OjoIzquierdoConjuntivaTarsal,
        ojoDerechoConjuntivaBulbar: results[0].OjoDerechoConjuntivaBulbar,
        ojoIzquierdoConjuntivaBulbar: results[0].OjoIzquierdoConjuntivaBulbar,
        ojoDerechoFondoSaco: results[0].OjoDerechoFondoSaco,
        ojoIzquierdoFondoSaco: results[0].OjoIzquierdoFondoSaco,
        ojoDerechoLimbo: results[0].OjoDerechoLimbo,
        ojoIzquierdoLimbo: results[0].OjoIzquierdoLimbo,
        ojoDerechoCorneaBiomicroscopia: results[0].OjoDerechoCorneaBiomicroscopia,
        ojoIzquierdoCorneaBiomicroscopia: results[0].OjoIzquierdoCorneaBiomicroscopia,
        ojoDerechoCamaraAnterior: results[0].OjoDerechoCamaraAnterior,
        ojoIzquierdoCamaraAnterior: results[0].OjoIzquierdoCamaraAnterior,
        ojoDerechoIris: results[0].OjoDerechoIris,
        ojoIzquierdoIris: results[0].OjoIzquierdoIris,
        ojoDerechoCristalino: results[0].OjoDerechoCristalino,
        ojoIzquierdoCristalino: results[0].OjoIzquierdoCristalino
      };
    }
    else if (table === 'Diagnostico' && results.length > 0) {
  historia[fieldName] = {
    OjoDerechoRefractivo: results[0].OjoDerechoRefractivo,
    OjoIzquierdoRefractivo: results[0].OjoIzquierdoRefractivo,
    OjoDerechoPatologico: results[0].OjoDerechoPatologico,
    OjoIzquierdoPatologico: results[0].OjoIzquierdoPatologico,
    Binocular: results[0].Binocular,
    Sensorial: results[0].Sensorial
  };
}

// Y similar para PlanTratamiento y Pronostico
else if (table === 'PlanTratamiento' && results.length > 0) {
  historia[fieldName] = {
    Descripcion: results[0].Descripcion
  };
}

else if (table === 'Pronostico' && results.length > 0) {
  historia[fieldName] = {
    Descripcion: results[0].Descripcion
  };
}

else if (table === 'Recomendaciones' && results.length > 0) {
  historia[fieldName] = {
    Descripcion: results[0].Descripcion,
    ProximaCita: results[0].ProximaCita
  };
}
    // Normalizar Oftalmoscopia
    else if (table === 'Oftalmoscopia' && results.length > 0) {
      historia[fieldName] = {
        ojoDerechoPapila: results[0].OjoDerechoPapila,
        ojoIzquierdoPapila: results[0].OjoIzquierdoPapila,
        ojoDerechoExcavacion: results[0].OjoDerechoExcavacion,
        ojoIzquierdoExcavacion: results[0].OjoIzquierdoExcavacion,
        ojoDerechoRadio: results[0].OjoDerechoRadio,
        ojoIzquierdoRadio: results[0].OjoIzquierdoRadio,
        ojoDerechoProfundidad: results[0].OjoDerechoProfundidad,
        ojoIzquierdoProfundidad: results[0].OjoIzquierdoProfundidad,
        ojoDerechoVasos: results[0].OjoDerechoVasos,
        ojoIzquierdoVasos: results[0].OjoIzquierdoVasos,
        ojoDerechoRELAV: results[0].OjoDerechoRELAV,
        ojoIzquierdoRELAV: results[0].OjoIzquierdoRELAV,
        ojoDerechoMacula: results[0].OjoDerechoMacula,
        ojoIzquierdoMacula: results[0].OjoIzquierdoMacula,
        ojoDerechoReflejo: results[0].OjoDerechoReflejo,
        ojoIzquierdoReflejo: results[0].OjoIzquierdoReflejo,
        ojoDerechoRetinaPeriferica: results[0].OjoDerechoRetinaPeriferica,
        ojoIzquierdoRetinaPeriferica: results[0].OjoIzquierdoRetinaPeriferica,
        ojoDerechoISNT: results[0].OjoDerechoISNT,
        ojoIzquierdoISNT: results[0].OjoIzquierdoISNT,
        ojoDerechoImagenID: results[0].OjoDerechoImagenID,
        ojoIzquierdoImagenID: results[0].OjoIzquierdoImagenID
      };
    }
    else if (table === 'AgudezaVisual') {
      historia[fieldName] = results.length > 0 ? results : [];
    } else {
      historia[fieldName] = results.length > 0 ? results[0] : null;
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
  fetchRelatedData('AlineacionOcular', 'alineacionOcular'),
  fetchRelatedData('Motilidad', 'motilidad'),
  fetchRelatedData('ExploracionFisica', 'exploracionFisica'),
  fetchRelatedData('ViaPupilar', 'viaPupilar'),
  fetchRelatedData('EstadoRefractivo', 'estadoRefractivo'),
  fetchRelatedData('SubjetivoCerca', 'subjetivoCerca'),
  fetchRelatedData('Binocularidad', 'binocularidad'),
  fetchRelatedData('Forias', 'forias'),
  fetchRelatedData('Vergencias', 'vergencias'),
  fetchRelatedData('MetodoGrafico', 'metodoGrafico'),
  fetchRelatedData('GridAmsler', 'gridAmsler'),
  fetchRelatedData('Tonometria', 'tonometria'),
  fetchRelatedData('Paquimetria', 'paquimetria'),
  fetchRelatedData('Campimetria', 'campimetria'),
  fetchRelatedData('Biomicroscopia', 'biomicroscopia'),
  fetchRelatedData('Oftalmoscopia', 'oftalmoscopia'),
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
 * Crea una historia clínica completa con todas sus secciones
 * @param {Object} datosHistoria - Datos principales de la historia clínica
 * @param {Object} secciones - Objeto con todas las secciones de la historia clínica
 * @returns {Promise<Object>} - Historia clínica creada
 */
async crearHistoriaClinicaCompleta(datosHistoria, secciones) {
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
            datosHistoria.paciente.estadoID ? parseInt(datosHistoria.paciente.estadoID) : null, // Conversión y manejo de nulos
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


    // 2. Crear el registro de la historia clínica con estado "En proceso"
    const [estadoEnProceso] = await connection.query(
      "SELECT ID FROM CatalogosGenerales WHERE TipoCatalogo = 'ESTADO_HISTORIAL' AND Valor = 'En proceso'"
    );

    const estadoId = estadoEnProceso.length > 0 ? estadoEnProceso[0].ID : 43; // 43 como predeterminado si no se encuentra

    const [historiaResult] = await connection.query(
      `INSERT INTO HistorialesClinicos (
        PacienteID, AlumnoID, MateriaProfesorID, Fecha, EstadoID,
        Archivado, ConsultorioID, PeriodoEscolarID, CreadoEn
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        pacienteId,
        datosHistoria.alumnoID,
        datosHistoria.MateriaProfesorID || datosHistoria.materiaProfesorID, // Comprueba ambas variantes
        datosHistoria.fecha || new Date(),
        estadoId,
        false,
        datosHistoria.consultorioID,
        datosHistoria.PeriodoEscolarID || datosHistoria.periodoEscolarID,
      ]
    );

    const historiaID = historiaResult.insertId;

    // 3. Procesar todas las secciones

    // Interrogatorio
    if (secciones.interrogatorio) {
      await connection.query(
        `INSERT INTO Interrogatorio (
          HistorialID, MotivoConsulta, HeredoFamiliares, NoPatologicos,
          Patologicos, VisualesOculares, PadecimientoActual, Prediagnostico
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.interrogatorio.motivoConsulta || null,
          secciones.interrogatorio.heredoFamiliares || null,
          secciones.interrogatorio.noPatologicos || null,
          secciones.interrogatorio.patologicos || null,
          secciones.interrogatorio.visualesOculares || null,
          secciones.interrogatorio.padecimientoActual || null,
          secciones.interrogatorio.prediagnostico || null
        ]
      );
    }

    // Antecedente Visual - Agudeza Visual
    if (secciones.agudezaVisual && Array.isArray(secciones.agudezaVisual)) {
      for (const agudeza of secciones.agudezaVisual) {
        await connection.query(
          `INSERT INTO AgudezaVisual (
            HistorialID, TipoMedicion,
            OjoDerechoSnellen, OjoDerechoMetros, OjoDerechoDecimal, OjoDerechoMAR,
            OjoIzquierdoSnellen, OjoIzquierdoMetros, OjoIzquierdoDecimal, OjoIzquierdoMAR,
            AmbosOjosSnellen, AmbosOjosMetros, AmbosOjosDecimal, AmbosOjosMAR,
            OjoDerechoM, OjoDerechoJeager, OjoDerechoPuntos,
            OjoIzquierdoM, OjoIzquierdoJeager, OjoIzquierdoPuntos,
            AmbosOjosM, AmbosOjosJeager, AmbosOjosPuntos,
            DiametroMM, CapacidadVisualOD, CapacidadVisualOI, CapacidadVisualAO
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            historiaID,
            agudeza.tipoMedicion || 'SIN_RX_LEJOS',
            agudeza.ojoDerechoSnellen || null,
            agudeza.ojoDerechoMetros || null,
            agudeza.ojoDerechoDecimal || null,
            agudeza.ojoDerechoMAR || null,
            agudeza.ojoIzquierdoSnellen || null,
            agudeza.ojoIzquierdoMetros || null,
            agudeza.ojoIzquierdoDecimal || null,
            agudeza.ojoIzquierdoMAR || null,
            agudeza.ambosOjosSnellen || null,
            agudeza.ambosOjosMetros || null,
            agudeza.ambosOjosDecimal || null,
            agudeza.ambosOjosMAR || null,
            agudeza.ojoDerechoM || null,
            agudeza.ojoDerechoJeager || null,
            agudeza.ojoDerechoPuntos || null,
            agudeza.ojoIzquierdoM || null,
            agudeza.ojoIzquierdoJeager || null,
            agudeza.ojoIzquierdoPuntos || null,
            agudeza.ambosOjosM || null,
            agudeza.ambosOjosJeager || null,
            agudeza.ambosOjosPuntos || null,
            agudeza.diametroMM || null,
            agudeza.capacidadVisualOD || null,
            agudeza.capacidadVisualOI || null,
            agudeza.capacidadVisualAO || null
          ]
        );
      }
    }

    // Antecedente Visual - Lensometría
    if (secciones.lensometria) {
      await connection.query(
        `INSERT INTO Lensometria (
          HistorialID, OjoDerechoEsfera, OjoDerechoCilindro, OjoDerechoEje,
          OjoIzquierdoEsfera, OjoIzquierdoCilindro, OjoIzquierdoEje,
          TipoBifocalMultifocalID, ValorADD, DistanciaRango, CentroOptico
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.lensometria.ojoDerechoEsfera || null,
          secciones.lensometria.ojoDerechoCilindro || null,
          secciones.lensometria.ojoDerechoEje || null,
          secciones.lensometria.ojoIzquierdoEsfera || null,
          secciones.lensometria.ojoIzquierdoCilindro || null,
          secciones.lensometria.ojoIzquierdoEje || null,
          secciones.lensometria.tipoBifocalMultifocalID,
          secciones.lensometria.valorADD || null,
          secciones.lensometria.distanciaRango || null,
          secciones.lensometria.centroOptico || null
        ]
      );
    }

    // Examen Preliminar - Alineación Ocular
    if (secciones.alineacionOcular) {
      await connection.query(
        `INSERT INTO AlineacionOcular (
          HistorialID, LejosHorizontal, LejosVertical, CercaHorizontal, CercaVertical, MetodoID
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.alineacionOcular.lejosHorizontal || null,
          secciones.alineacionOcular.lejosVertical || null,
          secciones.alineacionOcular.cercaHorizontal || null,
          secciones.alineacionOcular.cercaVertical || null,
          secciones.alineacionOcular.metodoID || null
        ]
      );
    }

    // Examen Preliminar - Motilidad
    if (secciones.motilidad) {
      await connection.query(
        `INSERT INTO Motilidad (
          HistorialID, Versiones, Ducciones, Sacadicos, Persecucion, Fijacion
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.motilidad.versiones || null,
          secciones.motilidad.ducciones || null,
          secciones.motilidad.sacadicos || null,
          secciones.motilidad.persecucion || null,
          secciones.motilidad.fijacion || null
        ]
      );
    }

    // Examen Preliminar - Exploración Física
    if (secciones.exploracionFisica) {
      await connection.query(
        `INSERT INTO ExploracionFisica (
          HistorialID, OjoDerechoAnexos, OjoIzquierdoAnexos,
          OjoDerechoSegmentoAnterior, OjoIzquierdoSegmentoAnterior
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.exploracionFisica.ojoDerechoAnexos || null,
          secciones.exploracionFisica.ojoIzquierdoAnexos || null,
          secciones.exploracionFisica.ojoDerechoSegmentoAnterior || null,
          secciones.exploracionFisica.ojoIzquierdoSegmentoAnterior || null
        ]
      );
    }

    // Examen Preliminar - Vía Pupilar
    if (secciones.viaPupilar) {
      await connection.query(
        `INSERT INTO ViaPupilar (
          HistorialID, OjoDerechoDiametro, OjoIzquierdoDiametro,
          OjoDerechoFotomotorPresente, OjoDerechoConsensualPresente, OjoDerechoAcomodativoPresente,
          OjoIzquierdoFotomotorPresente, OjoIzquierdoConsensualPresente, OjoIzquierdoAcomodativoPresente,
          OjoDerechoFotomotorAusente, OjoDerechoConsensualAusente, OjoDerechoAcomodativoAusente,
          OjoIzquierdoFotomotorAusente, OjoIzquierdoConsensualAusente, OjoIzquierdoAcomodativoAusente,
          EsIsocoria, EsAnisocoria, RespuestaAcomodacion, PupilasIguales, PupilasRedondas,
          RespuestaLuz, DIP, DominanciaOcularID
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.viaPupilar.ojoDerechoDiametro || null,
          secciones.viaPupilar.ojoIzquierdoDiametro || null,
          secciones.viaPupilar.ojoDerechoFotomotorPresente || false,
          secciones.viaPupilar.ojoDerechoConsensualPresente || false,
          secciones.viaPupilar.ojoDerechoAcomodativoPresente || false,
          secciones.viaPupilar.ojoIzquierdoFotomotorPresente || false,
          secciones.viaPupilar.ojoIzquierdoConsensualPresente || false,
          secciones.viaPupilar.ojoIzquierdoAcomodativoPresente || false,
          secciones.viaPupilar.ojoDerechoFotomotorAusente || false,
          secciones.viaPupilar.ojoDerechoConsensualAusente || false,
          secciones.viaPupilar.ojoDerechoAcomodativoAusente || false,
          secciones.viaPupilar.ojoIzquierdoFotomotorAusente || false,
          secciones.viaPupilar.ojoIzquierdoConsensualAusente || false,
          secciones.viaPupilar.ojoIzquierdoAcomodativoAusente || false,
          secciones.viaPupilar.esIsocoria || false,
          secciones.viaPupilar.esAnisocoria || false,
          secciones.viaPupilar.respuestaAcomodacion || false,
          secciones.viaPupilar.pupilasIguales || false,
          secciones.viaPupilar.pupilasRedondas || false,
          secciones.viaPupilar.respuestaLuz || false,
          secciones.viaPupilar.dip || null,
          secciones.viaPupilar.dominanciaOcularID || null
        ]
      );
    }

    // Estado Refractivo - Estado Refractivo
    if (secciones.estadoRefractivo) {
      await connection.query(
        `INSERT INTO EstadoRefractivo (
          HistorialID, OjoDerechoQueratometria, OjoIzquierdoQueratometria,
          OjoDerechoAstigmatismoCorneal, OjoIzquierdoAstigmatismoCorneal,
          OjoDerechoAstigmatismoJaval, OjoIzquierdoAstigmatismoJaval,
          OjoDerechoRetinoscopiaEsfera, OjoDerechoRetinosciopiaCilindro, OjoDerechoRetinoscopiaEje,
          OjoIzquierdoRetinoscopiaEsfera, OjoIzquierdoRetinosciopiaCilindro, OjoIzquierdoRetinoscopiaEje,
          OjoDerechoSubjetivoEsfera, OjoDerechoSubjetivoCilindro, OjoDerechoSubjetivoEje,
          OjoIzquierdoSubjetivoEsfera, OjoIzquierdoSubjetivoCilindro, OjoIzquierdoSubjetivoEje,
          OjoDerechoBalanceBinocularesEsfera, OjoDerechoBalanceBinocularesCilindro, OjoDerechoBalanceBinocularesEje,
          OjoIzquierdoBalanceBinocularesEsfera, OjoIzquierdoBalanceBinocularesCilindro, OjoIzquierdoBalanceBinocularesEje,
          OjoDerechoAVLejana, OjoIzquierdoAVLejana
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.estadoRefractivo.ojoDerechoQueratometria || null,
          secciones.estadoRefractivo.ojoIzquierdoQueratometria || null,
          secciones.estadoRefractivo.ojoDerechoAstigmatismoCorneal || null,
          secciones.estadoRefractivo.ojoIzquierdoAstigmatismoCorneal || null,
          secciones.estadoRefractivo.ojoDerechoAstigmatismoJaval || null,
          secciones.estadoRefractivo.ojoIzquierdoAstigmatismoJaval || null,
          secciones.estadoRefractivo.ojoDerechoRetinoscopiaEsfera || null,
          secciones.estadoRefractivo.ojoDerechoRetinosciopiaCilindro || null,
          secciones.estadoRefractivo.ojoDerechoRetinoscopiaEje || null,
          secciones.estadoRefractivo.ojoIzquierdoRetinoscopiaEsfera || null,
          secciones.estadoRefractivo.ojoIzquierdoRetinosciopiaCilindro || null,
          secciones.estadoRefractivo.ojoIzquierdoRetinoscopiaEje || null,
          secciones.estadoRefractivo.ojoDerechoSubjetivoEsfera || null,
          secciones.estadoRefractivo.ojoDerechoSubjetivoCilindro || null,
          secciones.estadoRefractivo.ojoDerechoSubjetivoEje || null,
          secciones.estadoRefractivo.ojoIzquierdoSubjetivoEsfera || null,
          secciones.estadoRefractivo.ojoIzquierdoSubjetivoCilindro || null,
          secciones.estadoRefractivo.ojoIzquierdoSubjetivoEje || null,
          secciones.estadoRefractivo.ojoDerechoBalanceBinocularesEsfera || null,
          secciones.estadoRefractivo.ojoDerechoBalanceBinocularesCilindro || null,
          secciones.estadoRefractivo.ojoDerechoBalanceBinocularesEje || null,
          secciones.estadoRefractivo.ojoIzquierdoBalanceBinocularesEsfera || null,
          secciones.estadoRefractivo.ojoIzquierdoBalanceBinocularesCilindro || null,
          secciones.estadoRefractivo.ojoIzquierdoBalanceBinocularesEje || null,
          secciones.estadoRefractivo.ojoDerechoAVLejana || null,
          secciones.estadoRefractivo.ojoIzquierdoAVLejana || null
        ]
      );
    }

    // Estado Refractivo - Subjetivo Cerca
    if (secciones.subjetivoCerca) {
      await connection.query(
        `INSERT INTO SubjetivoCerca (
          HistorialID, OjoDerechoM, OjoDerechoJacger, OjoDerechoPuntos, OjoDerechoSnellen,
          OjoIzquierdoM, OjoIzquierdoJacger, OjoIzquierdoPuntos, OjoIzquierdoSnellen,
          AmbosOjosM, AmbosOjosJacger, AmbosOjosPuntos, AmbosOjosSnellen,
          ValorADD, AV, Distancia, Rango
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.subjetivoCerca.ojoDerechoM || null,
          secciones.subjetivoCerca.ojoDerechoJacger || null,
          secciones.subjetivoCerca.ojoDerechoPuntos || null,
          secciones.subjetivoCerca.ojoDerechoSnellen || null,
          secciones.subjetivoCerca.ojoIzquierdoM || null,
          secciones.subjetivoCerca.ojoIzquierdoJacger || null,
          secciones.subjetivoCerca.ojoIzquierdoPuntos || null,
          secciones.subjetivoCerca.ojoIzquierdoSnellen || null,
          secciones.subjetivoCerca.ambosOjosM || null,
          secciones.subjetivoCerca.ambosOjosJacger || null,
          secciones.subjetivoCerca.ambosOjosPuntos || null,
          secciones.subjetivoCerca.ambosOjosSnellen || null,
          secciones.subjetivoCerca.valorADD || null,
          secciones.subjetivoCerca.av || null,
          secciones.subjetivoCerca.distancia || null,
          secciones.subjetivoCerca.rango || null
        ]
      );
    }

    // Binocularidad - Binocularidad
    if (secciones.binocularidad) {
      await connection.query(
        `INSERT INTO Binocularidad (
          HistorialID, PPC, ARN, ARP, Donders, Sheards, HabAcomLente, HabAcomDificultad,
          OjoDerechoAmpAcomCm, OjoDerechoAmpAcomD, OjoIzquierdoAmpAcomCm, OjoIzquierdoAmpAcomD,
          AmbosOjosAmpAcomCm, AmbosOjosAmpAcomD
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.binocularidad.ppc || null,
          secciones.binocularidad.arn || null,
          secciones.binocularidad.arp || null,
          secciones.binocularidad.donders || false,
          secciones.binocularidad.sheards || false,
          secciones.binocularidad.habAcomLente || null,
          secciones.binocularidad.habAcomDificultad || null,
          secciones.binocularidad.ojoDerechoAmpAcomCm || null,
          secciones.binocularidad.ojoDerechoAmpAcomD || null,
          secciones.binocularidad.ojoIzquierdoAmpAcomCm || null,
          secciones.binocularidad.ojoIzquierdoAmpAcomD || null,
          secciones.binocularidad.ambosOjosAmpAcomCm || null,
          secciones.binocularidad.ambosOjosAmpAcomD || null
        ]
      );
    }

    // Binocularidad - Forias
    if (secciones.forias) {
      await connection.query(
        `INSERT INTO Forias (
          HistorialID, HorizontalesLejos, HorizontalesCerca,
          VerticalLejos, VerticalCerca, MetodoMedicionID,
          CAACalculada, CAAMedida
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.forias.horizontalesLejos || null,
          secciones.forias.horizontalesCerca || null,
          secciones.forias.verticalLejos || null,
          secciones.forias.verticalCerca || null,
          secciones.forias.metodoMedicionID,
          secciones.forias.caaCalculada || null,
          secciones.forias.caaMedida || null
        ]
      );
    }

    // Binocularidad - Vergencias
    if (secciones.vergencias) {
      await connection.query(
        `INSERT INTO Vergencias (
          HistorialID, PositivasLejosBorroso, PositivasLejosRuptura, PositivasLejosRecuperacion,
          PositivasCercaBorroso, PositivasCercaRuptura, PositivasCercaRecuperacion,
          NegativasLejosBorroso, NegativasLejosRuptura, NegativasLejosRecuperacion,
          NegativasCercaBorroso, NegativasCercaRuptura, NegativasCercaRecuperacion,
          SupravergenciasLejosRuptura, SupravergenciasLejosRecuperacion,
          SupravergenciasCercaRuptura, SupravergenciasCercaRecuperacion,
          InfravergenciasLejosRuptura, InfravergenciasLejosRecuperacion,
          InfravergenciasCercaRuptura, InfravergenciasCercaRecuperacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.vergencias.positivasLejosBorroso || null,
          secciones.vergencias.positivasLejosRuptura || null,
          secciones.vergencias.positivasLejosRecuperacion || null,
          secciones.vergencias.positivasCercaBorroso || null,
          secciones.vergencias.positivasCercaRuptura || null,
          secciones.vergencias.positivasCercaRecuperacion || null,
          secciones.vergencias.negativasLejosBorroso || null,
          secciones.vergencias.negativasLejosRuptura || null,
          secciones.vergencias.negativasLejosRecuperacion || null,
          secciones.vergencias.negativasCercaBorroso || null,
          secciones.vergencias.negativasCercaRuptura || null,
          secciones.vergencias.negativasCercaRecuperacion || null,
          secciones.vergencias.supravergenciasLejosRuptura || null,
          secciones.vergencias.supravergenciasLejosRecuperacion || null,
          secciones.vergencias.supravergenciasCercaRuptura || null,
          secciones.vergencias.supravergenciasCercaRecuperacion || null,
          secciones.vergencias.infravergenciasLejosRuptura || null,
          secciones.vergencias.infravergenciasLejosRecuperacion || null,
          secciones.vergencias.infravergenciasCercaRuptura || null,
          secciones.vergencias.infravergenciasCercaRecuperacion || null
        ]
      );
    }

    // Binocularidad - Método Gráfico
    if (secciones.metodoGrafico) {
      await connection.query(
        `INSERT INTO MetodoGrafico (
          HistorialID, IntegracionBinocular, TipoID,
          VisionEstereoscopica, TipoVisionID, ImagenID
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.metodoGrafico.integracionBinocular || null,
          secciones.metodoGrafico.tipoID || null,
          secciones.metodoGrafico.visionEstereoscopica || null,
          secciones.metodoGrafico.tipoVisionID || null,
          secciones.metodoGrafico.imagenID || null
        ]
      );
    }

    // Detección de Alteraciones - Grid de Amsler
    if (secciones.gridAmsler) {
      await connection.query(
        `INSERT INTO GridAmsler (
      HistorialID, NumeroCartilla, OjoDerechoSensibilidadContraste, OjoIzquierdoSensibilidadContraste,
      OjoDerechoVisionCromatica, OjoIzquierdoVisionCromatica
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      historiaID,
      secciones.gridAmsler.numeroCartilla || null,
      secciones.gridAmsler.ojoDerechoSensibilidadContraste || null,
      secciones.gridAmsler.ojoIzquierdoSensibilidadContraste || null,
      secciones.gridAmsler.ojoDerechoVisionCromatica || null,
      secciones.gridAmsler.ojoIzquierdoVisionCromatica || null
    ]
      );
    }

    // Detección de Alteraciones - Tonometría
    if (secciones.tonometria) {
      await connection.query(
        `INSERT INTO Tonometria (
          HistorialID, MetodoAnestesico, Fecha, Hora, OjoDerecho, OjoIzquierdo, TipoID
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.tonometria.metodoAnestesico || null,
          secciones.tonometria.fecha || null,
          secciones.tonometria.hora || null,
          secciones.tonometria.ojoDerecho || null,
          secciones.tonometria.ojoIzquierdo || null,
          secciones.tonometria.tipoID || null
        ]
      );
    }

    // Detección de Alteraciones - Paquimetría
    if (secciones.paquimetria) {
      await connection.query(
        `INSERT INTO Paquimetria (
          HistorialID, OjoDerechoCCT, OjoIzquierdoCCT, OjoDerechoPIOCorregida, OjoIzquierdoPIOCorregida
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.paquimetria.ojoDerechoCCT || null,
          secciones.paquimetria.ojoIzquierdoCCT || null,
          secciones.paquimetria.ojoDerechoPIOCorregida || null,
          secciones.paquimetria.ojoIzquierdoPIOCorregida || null
        ]
      );
    }

    // Detección de Alteraciones - Campimetría
    if (secciones.campimetria) {
      await connection.query(
        `INSERT INTO Campimetria (
      HistorialID, Distancia, TamanoColorIndice, TamanoColorPuntoFijacion, ImagenID
    ) VALUES (?, ?, ?, ?, ?)`,
      [
        historiaID,
        secciones.campimetria.distancia || null,
        secciones.campimetria.tamanoColorIndice || null,
        secciones.campimetria.tamanoColorPuntoFijacion || null,
        secciones.campimetria.imagenID || null  // Un solo campo para la imagen
      ]
      );
    }

    // Detección de Alteraciones - Biomicroscopía
    if (secciones.biomicroscopia) {
      await connection.query(
        `INSERT INTO Biomicroscopia (
          HistorialID, OjoDerechoPestanas, OjoIzquierdoPestanas, OjoDerechoParpadosIndice, OjoIzquierdoParpadosIndice,
          OjoDerechoBordePalpebral, OjoIzquierdoBordePalpebral, OjoDerechoLineaGris, OjoIzquierdoLineaGris,
          OjoDerechoCantoExterno, OjoIzquierdoCantoExterno, OjoDerechoCantoInterno, OjoIzquierdoCantoInterno,
          OjoDerechoPuntosLagrimales, OjoIzquierdoPuntosLagrimales, OjoDerechoConjuntivaTarsal, OjoIzquierdoConjuntivaTarsal,
          OjoDerechoConjuntivaBulbar, OjoIzquierdoConjuntivaBulbar, OjoDerechoFondoSaco, OjoIzquierdoFondoSaco,
          OjoDerechoLimbo, OjoIzquierdoLimbo, OjoDerechoCorneaBiomicroscopia, OjoIzquierdoCorneaBiomicroscopia,
          OjoDerechoCamaraAnterior, OjoIzquierdoCamaraAnterior, OjoDerechoIris, OjoIzquierdoIris,
          OjoDerechoCristalino, OjoIzquierdoCristalino
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.biomicroscopia.ojoDerechoPestanas || null,
          secciones.biomicroscopia.ojoIzquierdoPestanas || null,
          secciones.biomicroscopia.ojoDerechoParpadosIndice || null,
          secciones.biomicroscopia.ojoIzquierdoParpadosIndice || null,
          secciones.biomicroscopia.ojoDerechoBordePalpebral || null,
          secciones.biomicroscopia.ojoIzquierdoBordePalpebral || null,
          secciones.biomicroscopia.ojoDerechoLineaGris || null,
          secciones.biomicroscopia.ojoIzquierdoLineaGris || null,
          secciones.biomicroscopia.ojoDerechoCantoExterno || null,
          secciones.biomicroscopia.ojoIzquierdoCantoExterno || null,
          secciones.biomicroscopia.ojoDerechoCantoInterno || null,
          secciones.biomicroscopia.ojoIzquierdoCantoInterno || null,
          secciones.biomicroscopia.ojoDerechoPuntosLagrimales || null,
          secciones.biomicroscopia.ojoIzquierdoPuntosLagrimales || null,
          secciones.biomicroscopia.ojoDerechoConjuntivaTarsal || null,
          secciones.biomicroscopia.ojoIzquierdoConjuntivaTarsal || null,
          secciones.biomicroscopia.ojoDerechoConjuntivaBulbar || null,
          secciones.biomicroscopia.ojoIzquierdoConjuntivaBulbar || null,
          secciones.biomicroscopia.ojoDerechoFondoSaco || null,
          secciones.biomicroscopia.ojoIzquierdoFondoSaco || null,
          secciones.biomicroscopia.ojoDerechoLimbo || null,
          secciones.biomicroscopia.ojoIzquierdoLimbo || null,
          secciones.biomicroscopia.ojoDerechoCorneaBiomicroscopia || null,
          secciones.biomicroscopia.ojoIzquierdoCorneaBiomicroscopia || null,
          secciones.biomicroscopia.ojoDerechoCamaraAnterior || null,
          secciones.biomicroscopia.ojoIzquierdoCamaraAnterior || null,
          secciones.biomicroscopia.ojoDerechoIris || null,
          secciones.biomicroscopia.ojoIzquierdoIris || null,
          secciones.biomicroscopia.ojoDerechoCristalino || null,
          secciones.biomicroscopia.ojoIzquierdoCristalino || null
        ]
      );
    }

    // Detección de Alteraciones - Oftalmoscopía
    if (secciones.oftalmoscopia) {
      await connection.query(
        `INSERT INTO Oftalmoscopia (
          HistorialID, OjoDerechoPapila, OjoIzquierdoPapila, OjoDerechoExcavacion, OjoIzquierdoExcavacion,
          OjoDerechoRadio, OjoIzquierdoRadio, OjoDerechoProfundidad, OjoIzquierdoProfundidad,
          OjoDerechoVasos, OjoIzquierdoVasos, OjoDerechoRELAV, OjoIzquierdoRELAV,
          OjoDerechoMacula, OjoIzquierdoMacula, OjoDerechoReflejo, OjoIzquierdoReflejo,
          OjoDerechoRetinaPeriferica, OjoIzquierdoRetinaPeriferica, OjoDerechoISNT, OjoIzquierdoISNT,
          OjoDerechoImagenID, OjoIzquierdoImagenID
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.oftalmoscopia.ojoDerechoPapila || null,
          secciones.oftalmoscopia.ojoIzquierdoPapila || null,
          secciones.oftalmoscopia.ojoDerechoExcavacion || null,
          secciones.oftalmoscopia.ojoIzquierdoExcavacion || null,
          secciones.oftalmoscopia.ojoDerechoRadio || null,
          secciones.oftalmoscopia.ojoIzquierdoRadio || null,
          secciones.oftalmoscopia.ojoDerechoProfundidad || null,
          secciones.oftalmoscopia.ojoIzquierdoProfundidad || null,
          secciones.oftalmoscopia.ojoDerechoVasos || null,
          secciones.oftalmoscopia.ojoIzquierdoVasos || null,
          secciones.oftalmoscopia.ojoDerechoRELAV || null,
          secciones.oftalmoscopia.ojoIzquierdoRELAV || null,
          secciones.oftalmoscopia.ojoDerechoMacula || null,
          secciones.oftalmoscopia.ojoIzquierdoMacula || null,
          secciones.oftalmoscopia.ojoDerechoReflejo || null,
          secciones.oftalmoscopia.ojoIzquierdoReflejo || null,
          secciones.oftalmoscopia.ojoDerechoRetinaPeriferica || null,
          secciones.oftalmoscopia.ojoIzquierdoRetinaPeriferica || null,
          secciones.oftalmoscopia.ojoDerechoISNT || null,
          secciones.oftalmoscopia.ojoIzquierdoISNT || null,
          secciones.oftalmoscopia.ojoDerechoImagenID || null,
          secciones.oftalmoscopia.ojoIzquierdoImagenID || null
        ]
      );
    }

    // Diagnóstico
    if (secciones.diagnostico) {
      await connection.query(
        `INSERT INTO Diagnostico (
          HistorialID, OjoDerechoRefractivo, OjoIzquierdoRefractivo,
          OjoDerechoPatologico, OjoIzquierdoPatologico, Binocular, Sensorial
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.diagnostico.ojoDerechoRefractivo || null,
          secciones.diagnostico.ojoIzquierdoRefractivo || null,
          secciones.diagnostico.ojoDerechoPatologico || null,
          secciones.diagnostico.ojoIzquierdoPatologico || null,
          secciones.diagnostico.binocular || null,
          secciones.diagnostico.sensorial || null
        ]
      );
    }

    // Plan de Tratamiento
    if (secciones.planTratamiento) {
      await connection.query(
        `INSERT INTO PlanTratamiento (HistorialID, Descripcion)
        VALUES (?, ?)`,
        [historiaID, secciones.planTratamiento.descripcion || null]
      );
    }

    // Pronóstico
    if (secciones.pronostico) {
      await connection.query(
        `INSERT INTO Pronostico (HistorialID, Descripcion)
        VALUES (?, ?)`,
        [historiaID, secciones.pronostico.descripcion || null]
      );
    }

    // Recomendaciones
    if (secciones.recomendaciones) {
      await connection.query(
        `INSERT INTO Recomendaciones (HistorialID, Descripcion, ProximaCita)
        VALUES (?, ?, ?)`,
        [historiaID, secciones.recomendaciones.descripcion || null, secciones.recomendaciones.proximaCita || null]
      );
    }

    // Receta Final
    if (secciones.recetaFinal) {
      await connection.query(
        `INSERT INTO RecetaFinal (
          HistorialID, OjoDerechoEsfera, OjoDerechoCilindro, OjoDerechoEje,
          OjoDerechoPrisma, OjoDerechoEjePrisma, OjoIzquierdoEsfera,
          OjoIzquierdoCilindro, OjoIzquierdoEje, OjoIzquierdoPrisma,
          OjoIzquierdoEjePrisma, Tratamiento, TipoID, DIP,
          valorADD, Material, Observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historiaID,
          secciones.recetaFinal.ojoDerechoEsfera || null,
          secciones.recetaFinal.ojoDerechoCilindro || null,
          secciones.recetaFinal.ojoDerechoEje || null,
          secciones.recetaFinal.ojoDerechoPrisma || null,
          secciones.recetaFinal.ojoDerechoEjePrisma || null,
          secciones.recetaFinal.ojoIzquierdoEsfera || null,
          secciones.recetaFinal.ojoIzquierdoCilindro || null,
          secciones.recetaFinal.ojoIzquierdoEje || null,
          secciones.recetaFinal.ojoIzquierdoPrisma || null,
          secciones.recetaFinal.ojoIzquierdoEjePrisma || null,
          secciones.recetaFinal.tratamiento || null,
          secciones.recetaFinal.tipoID || null,
          secciones.recetaFinal.dip || null,
          secciones.recetaFinal.valorADD || null,
          secciones.recetaFinal.material || null,
          secciones.recetaFinal.observaciones || null
        ]
      );
    }

    await connection.commit();

    // Obtener la historia clínica completa creada
    return {
      ...await this.obtenerHistoriaClinicaPorId(historiaID, datosHistoria.alumnoID),
      ID: historiaID
    };

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear historia clínica completa:', error);
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
      //checar si existen
      const [agudezaVisuals] = await connection.query(
          'SELECT ID FROM agudezaVisual WHERE HistorialID = ?',
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
              TipoBifocalMultifocalID, ValorADD, DistanciaRango, CentroOptico
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
              ValorADD = ?,
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
              datos.tipoBifocalMultifocalID,,
              datos.valorADD,
              datos.distanciaRango,
              datos.centroOptico,
              historiaId
            ]
          );
        }
        break;

    case 'binocularidad':
      const {
        binocularidad, // datos para tabla Binocularidad
        forias,        // datos para tabla Forias
        vergencias,    // datos para tabla Vergencias
        metodoGrafico  // datos para tabla MetodoGrafico
      } = datos;

      // Tabla Binocularidad
      const [binocularidadExiste] = await connection.query(
        'SELECT ID FROM Binocularidad WHERE HistorialID = ?',
        [historiaId]
      );
      if (binocularidadExiste.length === 0) {
        await connection.query(
          `INSERT INTO Binocularidad (HistorialID, PPC, ARN, ARP, Donders, Sheards, HabAcomLente, HabAcomDificultad,
            OjoDerechoAmpAcomCm, OjoDerechoAmpAcomD, OjoIzquierdoAmpAcomCm, OjoIzquierdoAmpAcomD,
            AmbosOjosAmpAcomCm, AmbosOjosAmpAcomD)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [historiaId, binocularidad.PPC, binocularidad.ARN, binocularidad.ARP, binocularidad.Donders, binocularidad.Sheards,
            binocularidad.HabAcomLente, binocularidad.HabAcomDificultad,
            binocularidad.OjoDerechoAmpAcomCm, binocularidad.OjoDerechoAmpAcomD,
            binocularidad.OjoIzquierdoAmpAcomCm, binocularidad.OjoIzquierdoAmpAcomD,
            binocularidad.AmbosOjosAmpAcomCm, binocularidad.AmbosOjosAmpAcomD]
        );
      } else {
        await connection.query(
          `UPDATE Binocularidad SET PPC = ?, ARN = ?, ARP = ?, Donders = ?, Sheards = ?, HabAcomLente = ?, HabAcomDificultad = ?,
            OjoDerechoAmpAcomCm = ?, OjoDerechoAmpAcomD = ?, OjoIzquierdoAmpAcomCm = ?, OjoIzquierdoAmpAcomD = ?,
            AmbosOjosAmpAcomCm = ?, AmbosOjosAmpAcomD = ?
            WHERE HistorialID = ?`,
          [binocularidad.PPC, binocularidad.ARN, binocularidad.ARP, binocularidad.Donders, binocularidad.Sheards,
            binocularidad.HabAcomLente, binocularidad.HabAcomDificultad,
            binocularidad.OjoDerechoAmpAcomCm, binocularidad.OjoDerechoAmpAcomD,
            binocularidad.OjoIzquierdoAmpAcomCm, binocularidad.OjoIzquierdoAmpAcomD,
            binocularidad.AmbosOjosAmpAcomCm, binocularidad.AmbosOjosAmpAcomD,
            historiaId]
        );
      }

      // Tabla Forias
      await connection.query('DELETE FROM Forias WHERE HistorialID = ?', [historiaId]);
      await connection.query(
        `INSERT INTO Forias (HistorialID, HorizontalesLejos, HorizontalesCerca, VerticalLejos, VerticalCerca,
            MetodoMedicionID, CAA, CAACalculada, CAAMedida)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [historiaId, forias.HorizontalesLejos, forias.HorizontalesCerca, forias.VerticalLejos, forias.VerticalCerca,
          forias.MetodoMedicionID, forias.CAA, forias.CAACalculada, forias.CAAMedida]
      );

      // Tabla Vergencias
      await connection.query('DELETE FROM Vergencias WHERE HistorialID = ?', [historiaId]);
      await connection.query(
        `INSERT INTO Vergencias (HistorialID, PositivasLejosBorroso, PositivasLejosRuptura, PositivasLejosRecuperacion,
          PositivasCercaBorroso, PositivasCercaRuptura, PositivasCercaRecuperacion,
          NegativasLejosBorroso, NegativasLejosRuptura, NegativasLejosRecuperacion,
          NegativasCercaBorroso, NegativasCercaRuptura, NegativasCercaRecuperacion,
          SupravergenciasLejosRuptura, SupravergenciasLejosRecuperacion,
          SupravergenciasCercaRuptura, SupravergenciasCercaRecuperacion,
          InfravergenciasLejosRuptura, InfravergenciasLejosRecuperacion,
          InfravergenciasCercaRuptura, InfravergenciasCercaRecuperacion)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [historiaId,
          vergencias.PositiTonvasLejosBorroso, vergencias.PositivasLejosRuptura, vergencias.PositivasLejosRecuperacion,
          vergencias.PositivasCercaBorroso, vergencias.PositivasCercaRuptura, vergencias.PositivasCercaRecuperacion,
          vergencias.NegativasLejosBorroso, vergencias.NegativasLejosRuptura, vergencias.NegativasLejosRecuperacion,
          vergencias.NegativasCercaBorroso, vergencias.NegativasCercaRuptura, vergencias.NegativasCercaRecuperacion,
          vergencias.SupravergenciasLejosRuptura, vergencias.SupravergenciasLejosRecuperacion,
          vergencias.SupravergenciasCercaRuptura, vergencias.SupravergenciasCercaRecuperacion,
          vergencias.InfravergenciasLejosRuptura, vergencias.InfravergenciasLejosRecuperacion,
          vergencias.InfravergenciasCercaRuptura, vergencias.InfravergenciasCercaRecuperacion]
      );

      // Tabla MetodoGrafico
      await connection.query('DELETE FROM MetodoGrafico WHERE HistorialID = ?', [historiaId]);
      await connection.query(
        `INSERT INTO MetodoGrafico (HistorialID, IntegracionBinocular, TipoID, VisionEstereoscopica, TipoVisionID, ImagenID)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [historiaId, metodoGrafico.IntegracionBinocular, metodoGrafico.TipoID,
          metodoGrafico.VisionEstereoscopica, metodoGrafico.TipoVisionID, metodoGrafico.ImagenID]
      );

    case 'deteccion-alteraciones':
      const {
        gridAmsler,        // datos para tabla GridAmsler
        tonometria,        // datos para tabla Tonometria
        paquimetria,       // datos para tabla Paquimetria
        campimetria,       // datos para tabla Campimetria
        biomicroscopia,    // datos para tabla Biomicroscopia
        oftalmoscopia      // datos para tabla Oftalmoscopia
      } = datos;

  // 1. GridAmsler - Ya no tiene campos de imagen
  const [gridExiste] = await connection.query(
    'SELECT ID FROM GridAmsler WHERE HistorialID = ?',
    [historiaId]
  );

  if (gridExiste.length === 0) {
    await connection.query(
      `INSERT INTO GridAmsler (
        HistorialID, NumeroCartilla, OjoDerechoSensibilidadContraste, OjoIzquierdoSensibilidadContraste,
        OjoDerechoVisionCromatica, OjoIzquierdoVisionCromatica
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        historiaId,
        gridAmsler.NumeroCartilla || null,
        gridAmsler.ojoDerechoSensibilidadContraste || null,
        gridAmsler.ojoIzquierdoSensibilidadContraste || null,
        gridAmsler.ojoDerechoVisionCromatica || null,
        gridAmsler.ojoIzquierdoVisionCromatica || null
      ]
    );
  } else {
    await connection.query(
      `UPDATE GridAmsler SET
        NumeroCartilla = ?,
        OjoDerechoSensibilidadContraste = ?,
        OjoIzquierdoSensibilidadContraste = ?,
        OjoDerechoVisionCromatica = ?,
        OjoIzquierdoVisionCromatica = ?
      WHERE HistorialID = ?`,
      [
        gridAmsler.numeroCartilla || null,
        gridAmsler.ojoDerechoSensibilidadContraste || null,
        gridAmsler.ojoIzquierdoSensibilidadContraste || null,
        gridAmsler.ojoDerechoVisionCromatica || null,
        gridAmsler.ojoIzquierdoVisionCromatica || null,
        historiaId
      ]
    );
  }

  // 2. Tonometría
  const [tonometriaExiste] = await connection.query(
    'SELECT ID FROM Tonometria WHERE HistorialID = ?',
    [historiaId]
  );

  if (tonometriaExiste.length === 0) {
    await connection.query(
      `INSERT INTO Tonometria (
        HistorialID, MetodoAnestesico, Fecha, Hora, OjoDerecho, OjoIzquierdo, TipoID
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        historiaId,
        tonometria.metodoAnestesico || null,
        tonometria.fecha || null,
        tonometria.hora || null,
        tonometria.ojoDerecho || null,
        tonometria.ojoIzquierdo || null,
        tonometria.tipoID || null
      ]
    );
  } else {
    await connection.query(
      `UPDATE Tonometria SET
        MetodoAnestesico = ?,
        Fecha = ?,
        Hora = ?,
        OjoDerecho = ?,
        OjoIzquierdo = ?,
        TipoID = ?
      WHERE HistorialID = ?`,
      [
        tonometria.metodoAnestesico || null,
        tonometria.fecha || null,
        tonometria.hora || null,
        tonometria.ojoDerecho || null,
        tonometria.ojoIzquierdo || null,
        tonometria.tipoID || null,
        historiaId
      ]
    );
  }

  // 3. Paquimetría
  const [paquimetriaExiste] = await connection.query(
    'SELECT ID FROM Paquimetria WHERE HistorialID = ?',
    [historiaId]
  );

  if (paquimetriaExiste.length === 0) {
    await connection.query(
      `INSERT INTO Paquimetria (
        HistorialID, OjoDerechoCCT, OjoIzquierdoCCT, OjoDerechoPIOCorregida, OjoIzquierdoPIOCorregida
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        historiaId,
        paquimetria.ojoDerechoCCT || null,
        paquimetria.ojoIzquierdoCCT || null,
        paquimetria.ojoDerechoPIOCorregida || null,
        paquimetria.ojoIzquierdoPIOCorregida || null
      ]
    );
  } else {
    await connection.query(
      `UPDATE Paquimetria SET
        OjoDerechoCCT = ?,
        OjoIzquierdoCCT = ?,
        OjoDerechoPIOCorregida = ?,
        OjoIzquierdoPIOCorregida = ?
      WHERE HistorialID = ?`,
      [
        paquimetria.ojoDerechoCCT || null,
        paquimetria.ojoIzquierdoCCT || null,
        paquimetria.ojoDerechoPIOCorregida || null,
        paquimetria.ojoIzquierdoPIOCorregida || null,
        historiaId
      ]
    );
  }

  // 4. Campimetría - Tiene una sola imagen ahora
  const [campimetriaExiste] = await connection.query(
    'SELECT ID FROM Campimetria WHERE HistorialID = ?',
    [historiaId]
  );

  if (campimetriaExiste.length === 0) {
    await connection.query(
      `INSERT INTO Campimetria (
        HistorialID, Distancia, TamanoColorIndice, TamanoColorPuntoFijacion, ImagenID
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        historiaId,
        campimetria.distancia || null,
        campimetria.tamanoColorIndice || null,
        campimetria.tamanoColorPuntoFijacion || null,
        campimetria.imagenID || null
      ]
    );
  } else {
    await connection.query(
      `UPDATE Campimetria SET
        Distancia = ?,
        TamanoColorIndice = ?,
        TamanoColorPuntoFijacion = ?,
        ImagenID = ?
      WHERE HistorialID = ?`,
      [
        campimetria.distancia || null,
        campimetria.tamanoColorIndice || null,
        campimetria.tamanoColorPuntoFijacion || null,
        campimetria.imagenID || null,
        historiaId
      ]
    );
  }

  // 5. Biomicroscopía - Ya no tiene campos de imagen
  const [biomicroscopiaExiste] = await connection.query(
    'SELECT ID FROM Biomicroscopia WHERE HistorialID = ?',
    [historiaId]
  );

  if (biomicroscopiaExiste.length === 0) {
    await connection.query(
      `INSERT INTO Biomicroscopia (
        HistorialID, OjoDerechoPestanas, OjoIzquierdoPestanas, OjoDerechoParpadosIndice, OjoIzquierdoParpadosIndice,
        OjoDerechoBordePalpebral, OjoIzquierdoBordePalpebral, OjoDerechoLineaGris, OjoIzquierdoLineaGris,
        OjoDerechoCantoExterno, OjoIzquierdoCantoExterno, OjoDerechoCantoInterno, OjoIzquierdoCantoInterno,
        OjoDerechoPuntosLagrimales, OjoIzquierdoPuntosLagrimales, OjoDerechoConjuntivaTarsal, OjoIzquierdoConjuntivaTarsal,
        OjoDerechoConjuntivaBulbar, OjoIzquierdoConjuntivaBulbar, OjoDerechoFondoSaco, OjoIzquierdoFondoSaco,
        OjoDerechoLimbo, OjoIzquierdoLimbo, OjoDerechoCorneaBiomicroscopia, OjoIzquierdoCorneaBiomicroscopia,
        OjoDerechoCamaraAnterior, OjoIzquierdoCamaraAnterior, OjoDerechoIris, OjoIzquierdoIris,
        OjoDerechoCristalino, OjoIzquierdoCristalino
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historiaId,
        biomicroscopia.ojoDerechoPestanas || null,
        biomicroscopia.ojoIzquierdoPestanas || null,
        biomicroscopia.ojoDerechoParpadosIndice || null,
        biomicroscopia.ojoIzquierdoParpadosIndice || null,
        biomicroscopia.ojoDerechoBordePalpebral || null,
        biomicroscopia.ojoIzquierdoBordePalpebral || null,
        biomicroscopia.ojoDerechoLineaGris || null,
        biomicroscopia.ojoIzquierdoLineaGris || null,
        biomicroscopia.ojoDerechoCantoExterno || null,
        biomicroscopia.ojoIzquierdoCantoExterno || null,
        biomicroscopia.ojoDerechoCantoInterno || null,
        biomicroscopia.ojoIzquierdoCantoInterno || null,
        biomicroscopia.ojoDerechoPuntosLagrimales || null,
        biomicroscopia.ojoIzquierdoPuntosLagrimales || null,
        biomicroscopia.ojoDerechoConjuntivaTarsal || null,
        biomicroscopia.ojoIzquierdoConjuntivaTarsal || null,
        biomicroscopia.ojoDerechoConjuntivaBulbar || null,
        biomicroscopia.ojoIzquierdoConjuntivaBulbar || null,
        biomicroscopia.ojoDerechoFondoSaco || null,
        biomicroscopia.ojoIzquierdoFondoSaco || null,
        biomicroscopia.ojoDerechoLimbo || null,
        biomicroscopia.ojoIzquierdoLimbo || null,
        biomicroscopia.ojoDerechoCorneaBiomicroscopia || null,
        biomicroscopia.ojoIzquierdoCorneaBiomicroscopia || null,
        biomicroscopia.ojoDerechoCamaraAnterior || null,
        biomicroscopia.ojoIzquierdoCamaraAnterior || null,
        biomicroscopia.ojoDerechoIris || null,
        biomicroscopia.ojoIzquierdoIris || null,
        biomicroscopia.ojoDerechoCristalino || null,
        biomicroscopia.ojoIzquierdoCristalino || null
      ]
    );
  } else {
    await connection.query(
      `UPDATE Biomicroscopia SET
        OjoDerechoPestanas = ?, OjoIzquierdoPestanas = ?,
        OjoDerechoParpadosIndice = ?, OjoIzquierdoParpadosIndice = ?,
        OjoDerechoBordePalpebral = ?, OjoIzquierdoBordePalpebral = ?,
        OjoDerechoLineaGris = ?, OjoIzquierdoLineaGris = ?,
        OjoDerechoCantoExterno = ?, OjoIzquierdoCantoExterno = ?,
        OjoDerechoCantoInterno = ?, OjoIzquierdoCantoInterno = ?,
        OjoDerechoPuntosLagrimales = ?, OjoIzquierdoPuntosLagrimales = ?,
        OjoDerechoConjuntivaTarsal = ?, OjoIzquierdoConjuntivaTarsal = ?,
        OjoDerechoConjuntivaBulbar = ?, OjoIzquierdoConjuntivaBulbar = ?,
        OjoDerechoFondoSaco = ?, OjoIzquierdoFondoSaco = ?,
        OjoDerechoLimbo = ?, OjoIzquierdoLimbo = ?,
        OjoDerechoCorneaBiomicroscopia = ?, OjoIzquierdoCorneaBiomicroscopia = ?,
        OjoDerechoCamaraAnterior = ?, OjoIzquierdoCamaraAnterior = ?,
        OjoDerechoIris = ?, OjoIzquierdoIris = ?,
        OjoDerechoCristalino = ?, OjoIzquierdoCristalino = ?
      WHERE HistorialID = ?`,
      [
        biomicroscopia.ojoDerechoPestanas || null,
        biomicroscopia.ojoIzquierdoPestanas || null,
        biomicroscopia.ojoDerechoParpadosIndice || null,
        biomicroscopia.ojoIzquierdoParpadosIndice || null,
        biomicroscopia.ojoDerechoBordePalpebral || null,
        biomicroscopia.ojoIzquierdoBordePalpebral || null,
        biomicroscopia.ojoDerechoLineaGris || null,
        biomicroscopia.ojoIzquierdoLineaGris || null,
        biomicroscopia.ojoDerechoCantoExterno || null,
        biomicroscopia.ojoIzquierdoCantoExterno || null,
        biomicroscopia.ojoDerechoCantoInterno || null,
        biomicroscopia.ojoIzquierdoCantoInterno || null,
        biomicroscopia.ojoDerechoPuntosLagrimales || null,
        biomicroscopia.ojoIzquierdoPuntosLagrimales || null,
        biomicroscopia.ojoDerechoConjuntivaTarsal || null,
        biomicroscopia.ojoIzquierdoConjuntivaTarsal || null,
        biomicroscopia.ojoDerechoConjuntivaBulbar || null,
        biomicroscopia.ojoIzquierdoConjuntivaBulbar || null,
        biomicroscopia.ojoDerechoFondoSaco || null,
        biomicroscopia.ojoIzquierdoFondoSaco || null,
        biomicroscopia.ojoDerechoLimbo || null,
        biomicroscopia.ojoIzquierdoLimbo || null,
        biomicroscopia.ojoDerechoCorneaBiomicroscopia || null,
        biomicroscopia.ojoIzquierdoCorneaBiomicroscopia || null,
        biomicroscopia.ojoDerechoCamaraAnterior || null,
        biomicroscopia.ojoIzquierdoCamaraAnterior || null,
        biomicroscopia.ojoDerechoIris || null,
        biomicroscopia.ojoIzquierdoIris || null,
        biomicroscopia.ojoDerechoCristalino || null,
        biomicroscopia.ojoIzquierdoCristalino || null,
        historiaId
      ]
    );
  }

  // 6. Oftalmoscopía - Mantiene los dos campos de imagen
  const [oftalmoscopiaExiste] = await connection.query(
    'SELECT ID FROM Oftalmoscopia WHERE HistorialID = ?',
    [historiaId]
  );

  if (oftalmoscopiaExiste.length === 0) {
    await connection.query(
      `INSERT INTO Oftalmoscopia (
        HistorialID, OjoDerechoPapila, OjoIzquierdoPapila, OjoDerechoExcavacion, OjoIzquierdoExcavacion,
        OjoDerechoRadio, OjoIzquierdoRadio, OjoDerechoProfundidad, OjoIzquierdoProfundidad,
        OjoDerechoVasos, OjoIzquierdoVasos, OjoDerechoRELAV, OjoIzquierdoRELAV,
        OjoDerechoMacula, OjoIzquierdoMacula, OjoDerechoReflejo, OjoIzquierdoReflejo,
        OjoDerechoRetinaPeriferica, OjoIzquierdoRetinaPeriferica, OjoDerechoISNT, OjoIzquierdoISNT,
        OjoDerechoImagenID, OjoIzquierdoImagenID
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historiaId,
        oftalmoscopia.ojoDerechoPapila || null,
        oftalmoscopia.ojoIzquierdoPapila || null,
        oftalmoscopia.ojoDerechoExcavacion || null,
        oftalmoscopia.ojoIzquierdoExcavacion || null,
        oftalmoscopia.ojoDerechoRadio || null,
        oftalmoscopia.ojoIzquierdoRadio || null,
        oftalmoscopia.ojoDerechoProfundidad || null,
        oftalmoscopia.ojoIzquierdoProfundidad || null,
        oftalmoscopia.ojoDerechoVasos || null,
        oftalmoscopia.ojoIzquierdoVasos || null,
        oftalmoscopia.ojoDerechoRELAV || null,
        oftalmoscopia.ojoIzquierdoRELAV || null,
        oftalmoscopia.ojoDerechoMacula || null,
        oftalmoscopia.ojoIzquierdoMacula || null,
        oftalmoscopia.ojoDerechoReflejo || null,
        oftalmoscopia.ojoIzquierdoReflejo || null,
        oftalmoscopia.ojoDerechoRetinaPeriferica || null,
        oftalmoscopia.ojoIzquierdoRetinaPeriferica || null,
        oftalmoscopia.ojoDerechoISNT || null,
        oftalmoscopia.ojoIzquierdoISNT || null,
        oftalmoscopia.ojoDerechoImagenID || null,
        oftalmoscopia.ojoIzquierdoImagenID || null
      ]
    );
  } else {
    await connection.query(
      `UPDATE Oftalmoscopia SET
        OjoDerechoPapila = ?, OjoIzquierdoPapila = ?,
        OjoDerechoExcavacion = ?, OjoIzquierdoExcavacion = ?,
        OjoDerechoRadio = ?, OjoIzquierdoRadio = ?,
        OjoDerechoProfundidad = ?, OjoIzquierdoProfundidad = ?,
        OjoDerechoVasos = ?, OjoIzquierdoVasos = ?,
        OjoDerechoRELAV = ?, OjoIzquierdoRELAV = ?,
        OjoDerechoMacula = ?, OjoIzquierdoMacula = ?,
        OjoDerechoReflejo = ?, OjoIzquierdoReflejo = ?,
        OjoDerechoRetinaPeriferica = ?, OjoIzquierdoRetinaPeriferica = ?,
        OjoDerechoISNT = ?, OjoIzquierdoISNT = ?,
        OjoDerechoImagenID = ?, OjoIzquierdoImagenID = ?
      WHERE HistorialID = ?`,
      [
        oftalmoscopia.ojoDerechoPapila || null,
        oftalmoscopia.ojoIzquierdoPapila || null,
        oftalmoscopia.ojoDerechoExcavacion || null,
        oftalmoscopia.ojoIzquierdoExcavacion || null,
        oftalmoscopia.ojoDerechoRadio || null,
        oftalmoscopia.ojoIzquierdoRadio || null,
        oftalmoscopia.ojoDerechoProfundidad || null,
        oftalmoscopia.ojoIzquierdoProfundidad || null,
        oftalmoscopia.ojoDerechoVasos || null,
        oftalmoscopia.ojoIzquierdoVasos || null,
        oftalmoscopia.ojoDerechoRELAV || null,
        oftalmoscopia.ojoIzquierdoRELAV || null,
        oftalmoscopia.ojoDerechoMacula || null,
        oftalmoscopia.ojoIzquierdoMacula || null,
        oftalmoscopia.ojoDerechoReflejo || null,
        oftalmoscopia.ojoIzquierdoReflejo || null,
        oftalmoscopia.ojoDerechoRetinaPeriferica || null,
        oftalmoscopia.ojoIzquierdoRetinaPeriferica || null,
        oftalmoscopia.ojoDerechoISNT || null,
        oftalmoscopia.ojoIzquierdoISNT || null,
        oftalmoscopia.ojoDerechoImagenID || null,
        oftalmoscopia.ojoIzquierdoImagenID || null,
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

case 'recomendaciones':
  // Verificar si ya existen recomendaciones para esta historia
  const [recomendaciones] = await connection.query(
    'SELECT ID FROM Recomendaciones WHERE HistorialID = ?',
    [historiaId]
  );

  if (recomendaciones.length === 0) {
    // Crear nuevas recomendaciones
    await connection.query(
      `INSERT INTO Recomendaciones (HistorialID, Descripcion, ProximaCita)
      VALUES (?, ?, ?)`,
      [historiaId, datos.descripcion, datos.proximaCita]
    );
  } else {
    // Actualizar recomendaciones existentes
    await connection.query(
      `UPDATE Recomendaciones SET Descripcion = ?, ProximaCita = ? WHERE HistorialID = ?`,
      [datos.descripcion, datos.proximaCita, historiaId]
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
 * Actualiza la sección de Método Gráfico con un ID de imagen
 * @param {number} historiaId - ID de la historia clínica
 * @param {number} imagenId - ID de la imagen subida
 * @returns {Promise<boolean>} - true si la actualización fue exitosa
 */
async actualizarMetodoGraficoConImagen(historiaId, imagenId) {
  try {
    // Verificar si ya existe un registro de método gráfico para esta historia
    const [metodoGrafico] = await db.query(
      'SELECT ID FROM MetodoGrafico WHERE HistorialID = ?',
      [historiaId]
    );

    if (metodoGrafico.length === 0) {
      // Crear nueva entrada si no existe
      await db.query(
        `INSERT INTO MetodoGrafico (HistorialID, ImagenID) VALUES (?, ?)`,
        [historiaId, imagenId]
      );
    } else {
      // Actualizar la entrada existente
      await db.query(
        `UPDATE MetodoGrafico SET ImagenID = ? WHERE HistorialID = ?`,
        [imagenId, historiaId]
      );
    }

    return true;
  } catch (error) {
    console.error('Error al actualizar método gráfico con imagen:', error);
    throw error;
  }
},

/**
 * Obtiene estadísticas de historias clínicas por profesor
 * @param {number} profesorId - ID del profesor
 * @returns {Promise<Object>} - Estadísticas de historias clínicas del profesor
 */
async obtenerEstadisticasPorProfesor(profesorId) {
  try {
    // Obtener total de historias y conteo por estado para el profesor
    const [estadisticas] = await db.query(
      `SELECT
          (SELECT COUNT(*)
          FROM HistorialesClinicos hc2
          JOIN MateriasProfesor mp2 ON hc2.MateriaProfesorID = mp2.ID
          WHERE mp2.ProfesorInfoID = ?) AS total,
          (SELECT COUNT(*)
          FROM HistorialesClinicos hc3
          JOIN MateriasProfesor mp3 ON hc3.MateriaProfesorID = mp3.ID
          WHERE mp3.ProfesorInfoID = ? AND hc3.Archivado = TRUE) AS archivadas,
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
    console.error('Error al obtener estadísticas del profesor:', error);
    throw error;
  }
},

/**
 * Obtiene todas las historias clínicas de los alumnos asignados a un profesor
 * @param {number} profesorId - ID del profesor (de ProfesoresInfo)
 * @returns {Promise<Array>} - Lista de historias clínicas de los alumnos del profesor
 */
async obtenerHistoriasClinicasPorProfesor(profesorId) {
  try {
    const [historias] = await db.query(
      `SELECT hc.ID, hc.Fecha, hc.Archivado, hc.FechaArchivado, hc.EstadoID,
              p.ID AS PacienteID, p.Nombre, p.ApellidoPaterno, p.ApellidoMaterno,
              p.CorreoElectronico, p.TelefonoCelular, p.Edad,
              cg.Valor AS Estado, c.Nombre AS Consultorio, pe.Codigo AS PeriodoEscolar,
              mp.ProfesorInfoID AS ProfesorID,
              m.Nombre AS NombreMateria,
              mp.Grupo AS GrupoMateria,
              hc.MateriaProfesorID,

              -- Datos del Alumno desde AlumnosInfo
              a.Nombre AS AlumnoNombre,
              a.ApellidoPaterno AS AlumnoApellidoPaterno,
              a.ApellidoMaterno AS AlumnoApellidoMaterno,
              a.NumeroBoleta AS AlumnoBoleta,
              ua.CorreoElectronico AS AlumnoCorreo

      FROM HistorialesClinicos hc
          JOIN Pacientes p ON hc.PacienteID = p.ID
          JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
          JOIN Consultorios c ON hc.ConsultorioID = c.ID
          JOIN PeriodosEscolares pe ON hc.PeriodoEscolarID = pe.ID
          JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
          JOIN Materias m ON mp.MateriaID = m.ID
          JOIN AlumnosInfo a ON hc.AlumnoID = a.ID
          JOIN Usuarios ua ON a.UsuarioID = ua.ID
          WHERE mp.ProfesorInfoID = ?
          ORDER BY hc.Fecha DESC`,
      [profesorId]
    );

    console.log('Historias clínicas del profesor obtenidas:', historias.length);
    return historias;
  } catch (error) {
    console.error('Error al obtener historias clínicas del profesor:', error);
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
 * Obtiene una historia clínica por su ID desde la perspectiva del profesor
 * Valida que la historia pertenezca a un alumno asignado al profesor
 * @param {number} id - ID de la historia clínica
 * @param {number} profesorId - ID del profesor para verificar permisos
 * @returns {Promise<Object|null>} - Datos de la historia clínica o null si no existe
 */
async obtenerHistoriaClinicaPorIdProfesor(id, profesorId) {
  try {
    console.log(`Obteniendo historia ID=${id} para profesorId=${profesorId}`);

    // Primero verificar que la historia existe y el profesor tiene acceso a ella
    const [verificacion] = await db.query(
      `SELECT hc.ID
      FROM HistorialesClinicos hc
      JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
      WHERE hc.ID = ? AND mp.ProfesorInfoID = ?`,
      [id, profesorId]
    );

    if (verificacion.length === 0) {
      console.log(`Historia no encontrada ID=${id} para profesorId=${profesorId} o sin permisos`);
      return null;
    }

    console.log(`✅ Verificación exitosa - Historia ID=${id} existe y profesor ${profesorId} tiene acceso`);

    // Usar la misma lógica que obtenerHistoriaClinicaPorId pero con validación de profesor
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
        pe.Codigo AS PeriodoEscolar,

        -- Datos de la materia y grupo
        m.Nombre AS NombreMateria,
        mp.Grupo AS GrupoMateria,
        mp.ID AS MateriaProfesorID,

        -- Datos del Alumno desde AlumnosInfo
        a.Nombre AS AlumnoNombre,
        a.ApellidoPaterno AS AlumnoApellidoPaterno,
        a.ApellidoMaterno AS AlumnoApellidoMaterno,

        -- Datos del Profesor desde ProfesoresInfo
        pr.Nombre AS ProfesorNombre,
        pr.ApellidoPaterno AS ProfesorApellidoPaterno,
        pr.ApellidoMaterno AS ProfesorApellidoMaterno,
        pr.ID AS ProfesorID

        FROM HistorialesClinicos hc
        JOIN Pacientes p ON hc.PacienteID = p.ID
        JOIN CatalogosGenerales cg ON hc.EstadoID = cg.ID
        JOIN Consultorios c ON hc.ConsultorioID = c.ID
        JOIN PeriodosEscolares pe ON hc.PeriodoEscolarID = pe.ID
        JOIN AlumnosInfo a ON hc.AlumnoID = a.ID
        JOIN Usuarios ua ON a.UsuarioID = ua.ID
        JOIN MateriasProfesor mp ON hc.MateriaProfesorID = mp.ID
        JOIN Materias m ON mp.MateriaID = m.ID
        JOIN ProfesoresInfo pr ON mp.ProfesorInfoID = pr.ID
        JOIN Usuarios up ON pr.UsuarioID = up.ID

        WHERE hc.ID = ? AND mp.ProfesorInfoID = ?`,
      [id, profesorId]
    );

    if (historias.length === 0) {
      return null;
    }

    const historia = historias[0];

    // Reutilizar la misma lógica de fetchRelatedData del método obtenerHistoriaClinicaPorId
    const fetchRelatedData = async (table, fieldName, whereColumn = 'HistorialID') => {
  try {
    const [results] = await db.query(
      `SELECT * FROM ${table} WHERE ${whereColumn} = ?`,
      [id]
    );

    // Procesamiento especial para ciertas tablas
    if (table === 'MetodoGrafico' && results.length > 0) {
      // Normalizar nombres de propiedades del método gráfico
      historia[fieldName] = {
        integracionBinocular: results[0].IntegracionBinocular,
        tipoID: results[0].TipoID,
        visionEstereoscopica: results[0].VisionEstereoscopica,
        tipoVisionID: results[0].TipoVisionID,
        imagenID: results[0].ImagenID
      };
    }
    // Normalizar GridAmsler
    else if (table === 'GridAmsler' && results.length > 0) {
      historia[fieldName] = {
        numeroCartilla: results[0].NumeroCartilla,
        ojoDerechoSensibilidadContraste: results[0].OjoDerechoSensibilidadContraste,
        ojoIzquierdoSensibilidadContraste: results[0].OjoIzquierdoSensibilidadContraste,
        ojoDerechoVisionCromatica: results[0].OjoDerechoVisionCromatica,
        ojoIzquierdoVisionCromatica: results[0].OjoIzquierdoVisionCromatica
      };
    }
    // Normalizar Tonometria - CORREGIDO: usar los campos correctos de la BD
    else if (table === 'Tonometria' && results.length > 0) {
      historia[fieldName] = {
        metodoAnestesico: results[0].MetodoAnestesico,
        fecha: results[0].Fecha,
        hora: results[0].Hora,
        ojoDerecho: results[0].OjoDerecho,        // Campo correcto según BD
        ojoIzquierdo: results[0].OjoIzquierdo,    // Campo correcto según BD
        tipoID: results[0].TipoID
      };
    }
    // Normalizar Paquimetria
    else if (table === 'Paquimetria' && results.length > 0) {
      historia[fieldName] = {
        ojoDerechoCCT: results[0].OjoDerechoCCT,
        ojoIzquierdoCCT: results[0].OjoIzquierdoCCT,
        ojoDerechoPIOCorregida: results[0].OjoDerechoPIOCorregida,
        ojoIzquierdoPIOCorregida: results[0].OjoIzquierdoPIOCorregida
      };
    }
    // Normalizar Campimetria
    else if (table === 'Campimetria' && results.length > 0) {
      historia[fieldName] = {
        distancia: results[0].Distancia,
        tamanoColorIndice: results[0].TamanoColorIndice,
        tamanoColorPuntoFijacion: results[0].TamanoColorPuntoFijacion,
        imagenID: results[0].ImagenID
      };
    }
    // Normalizar Biomicroscopia
    else if (table === 'Biomicroscopia' && results.length > 0) {
      historia[fieldName] = {
        ojoDerechoPestanas: results[0].OjoDerechoPestanas,
        ojoIzquierdoPestanas: results[0].OjoIzquierdoPestanas,
        ojoDerechoParpadosIndice: results[0].OjoDerechoParpadosIndice,
        ojoIzquierdoParpadosIndice: results[0].OjoIzquierdoParpadosIndice,
        ojoDerechoBordePalpebral: results[0].OjoDerechoBordePalpebral,
        ojoIzquierdoBordePalpebral: results[0].OjoIzquierdoBordePalpebral,
        ojoDerechoLineaGris: results[0].OjoDerechoLineaGris,
        ojoIzquierdoLineaGris: results[0].OjoIzquierdoLineaGris,
        ojoDerechoCantoExterno: results[0].OjoDerechoCantoExterno,
        ojoIzquierdoCantoExterno: results[0].OjoIzquierdoCantoExterno,
        ojoDerechoCantoInterno: results[0].OjoDerechoCantoInterno,
        ojoIzquierdoCantoInterno: results[0].OjoIzquierdoCantoInterno,
        ojoDerechoPuntosLagrimales: results[0].OjoDerechoPuntosLagrimales,
        ojoIzquierdoPuntosLagrimales: results[0].OjoIzquierdoPuntosLagrimales,
        ojoDerechoConjuntivaTarsal: results[0].OjoDerechoConjuntivaTarsal,
        ojoIzquierdoConjuntivaTarsal: results[0].OjoIzquierdoConjuntivaTarsal,
        ojoDerechoConjuntivaBulbar: results[0].OjoDerechoConjuntivaBulbar,
        ojoIzquierdoConjuntivaBulbar: results[0].OjoIzquierdoConjuntivaBulbar,
        ojoDerechoFondoSaco: results[0].OjoDerechoFondoSaco,
        ojoIzquierdoFondoSaco: results[0].OjoIzquierdoFondoSaco,
        ojoDerechoLimbo: results[0].OjoDerechoLimbo,
        ojoIzquierdoLimbo: results[0].OjoIzquierdoLimbo,
        ojoDerechoCorneaBiomicroscopia: results[0].OjoDerechoCorneaBiomicroscopia,
        ojoIzquierdoCorneaBiomicroscopia: results[0].OjoIzquierdoCorneaBiomicroscopia,
        ojoDerechoCamaraAnterior: results[0].OjoDerechoCamaraAnterior,
        ojoIzquierdoCamaraAnterior: results[0].OjoIzquierdoCamaraAnterior,
        ojoDerechoIris: results[0].OjoDerechoIris,
        ojoIzquierdoIris: results[0].OjoIzquierdoIris,
        ojoDerechoCristalino: results[0].OjoDerechoCristalino,
        ojoIzquierdoCristalino: results[0].OjoIzquierdoCristalino
      };
    }
    // Normalizar Oftalmoscopia
    else if (table === 'Oftalmoscopia' && results.length > 0) {
      historia[fieldName] = {
        ojoDerechoPapila: results[0].OjoDerechoPapila,
        ojoIzquierdoPapila: results[0].OjoIzquierdoPapila,
        ojoDerechoExcavacion: results[0].OjoDerechoExcavacion,
        ojoIzquierdoExcavacion: results[0].OjoIzquierdoExcavacion,
        ojoDerechoRadio: results[0].OjoDerechoRadio,
        ojoIzquierdoRadio: results[0].OjoIzquierdoRadio,
        ojoDerechoProfundidad: results[0].OjoDerechoProfundidad,
        ojoIzquierdoProfundidad: results[0].OjoIzquierdoProfundidad,
        ojoDerechoVasos: results[0].OjoDerechoVasos,
        ojoIzquierdoVasos: results[0].OjoIzquierdoVasos,
        ojoDerechoRELAV: results[0].OjoDerechoRELAV,
        ojoIzquierdoRELAV: results[0].OjoIzquierdoRELAV,
        ojoDerechoMacula: results[0].OjoDerechoMacula,
        ojoIzquierdoMacula: results[0].OjoIzquierdoMacula,
        ojoDerechoReflejo: results[0].OjoDerechoReflejo,
        ojoIzquierdoReflejo: results[0].OjoIzquierdoReflejo,
        ojoDerechoRetinaPeriferica: results[0].OjoDerechoRetinaPeriferica,
        ojoIzquierdoRetinaPeriferica: results[0].OjoIzquierdoRetinaPeriferica,
        ojoDerechoISNT: results[0].OjoDerechoISNT,
        ojoIzquierdoISNT: results[0].OjoIzquierdoISNT,
        ojoDerechoImagenID: results[0].OjoDerechoImagenID,
        ojoIzquierdoImagenID: results[0].OjoIzquierdoImagenID
      };
    }
    // Normalizar Diagnostico
    else if (table === 'Diagnostico' && results.length > 0) {
      historia[fieldName] = {
        OjoDerechoRefractivo: results[0].OjoDerechoRefractivo,
        OjoIzquierdoRefractivo: results[0].OjoIzquierdoRefractivo,
        OjoDerechoPatologico: results[0].OjoDerechoPatologico,
        OjoIzquierdoPatologico: results[0].OjoIzquierdoPatologico,
        Binocular: results[0].Binocular,
        Sensorial: results[0].Sensorial
      };
    }
    // Normalizar PlanTratamiento
    else if (table === 'PlanTratamiento' && results.length > 0) {
      historia[fieldName] = {
        Descripcion: results[0].Descripcion
      };
    }
    // Normalizar Pronostico
    else if (table === 'Pronostico' && results.length > 0) {
      historia[fieldName] = {
        Descripcion: results[0].Descripcion
      };
    }
    // Normalizar Recomendaciones
    else if (table === 'Recomendaciones' && results.length > 0) {
      historia[fieldName] = {
        Descripcion: results[0].Descripcion,
        ProximaCita: results[0].ProximaCita
      };
    }
    // Para AgudezaVisual que es un array
    else if (table === 'AgudezaVisual') {
      historia[fieldName] = results.length > 0 ? results : [];
    }
    // Para todas las demás tablas
    else {
      historia[fieldName] = results.length > 0 ? results[0] : null;
    }
  } catch (err) {
    console.error(`Error en ${table}:`, err.message);
    historia[fieldName] = table === 'AgudezaVisual' ? [] : null;
  }
};

// PROMISE.ALL COMPLETO - Reemplazar el Promise.all existente con este:
await Promise.all([
  fetchRelatedData('Interrogatorio', 'interrogatorio'),
  fetchRelatedData('AgudezaVisual', 'agudezaVisual'),
  fetchRelatedData('Lensometria', 'lensometria'),
  fetchRelatedData('AlineacionOcular', 'alineacionOcular'),
  fetchRelatedData('Motilidad', 'motilidad'),
  fetchRelatedData('ExploracionFisica', 'exploracionFisica'),
  fetchRelatedData('ViaPupilar', 'viaPupilar'),
  fetchRelatedData('EstadoRefractivo', 'estadoRefractivo'),
  fetchRelatedData('SubjetivoCerca', 'subjetivoCerca'),
  fetchRelatedData('Binocularidad', 'binocularidad'),
  fetchRelatedData('Forias', 'forias'),
  fetchRelatedData('Vergencias', 'vergencias'),
  fetchRelatedData('MetodoGrafico', 'metodoGrafico'),
  fetchRelatedData('GridAmsler', 'gridAmsler'),
  fetchRelatedData('Tonometria', 'tonometria'),
  fetchRelatedData('Paquimetria', 'paquimetria'),
  fetchRelatedData('Campimetria', 'campimetria'),
  fetchRelatedData('Biomicroscopia', 'biomicroscopia'),
  fetchRelatedData('Oftalmoscopia', 'oftalmoscopia'),
  fetchRelatedData('Diagnostico', 'diagnostico'),
  fetchRelatedData('PlanTratamiento', 'planTratamiento'),
  fetchRelatedData('Pronostico', 'pronostico'),
  fetchRelatedData('Recomendaciones', 'recomendaciones'),
  fetchRelatedData('RecetaFinal', 'recetaFinal')
]);

  // SECCIÓN DE COMENTARIOS - Agregar después del Promise.all:
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
    console.error('Error al obtener historia cli­nica para profesor:', error);
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