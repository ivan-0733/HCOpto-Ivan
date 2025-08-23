const db = require('../config/database');

/**
 * Servicio para gestionar alumnos en la base de datos
 */
const alumnoService = {
/**
 * Obtiene los datos de un alumno por su ID
 * @param {number} alumnoInfoId - ID del alumno (de AlumnosInfo)
 * @returns {Promise<Object|null>} - Datos del alumno o null si no existe
 */
async obtenerAlumnoPorId(alumnoInfoId) {
  try {
    // In alumnoService.js - update the query in obtenerAlumnoPorId
    const [alumnos] = await db.query(
      `SELECT a.ID AS AlumnoInfoID, a.NumeroBoleta, a.PeriodoEscolarActualID,
              a.Nombre, a.ApellidoPaterno, a.ApellidoMaterno,
              u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico,
              u.EstaActivo, u.TelefonoCelular, u.FechaCreacion, u.FechaUltimoAcceso
          FROM AlumnosInfo a
          JOIN Usuarios u ON a.UsuarioID = u.ID
          WHERE a.ID = ? AND u.EstaActivo = TRUE`,
      [alumnoInfoId]
    );

    // En tu endpoint de obtenerPerfil o endpoint relacionado
console.log('Datos enviados al frontend:', JSON.stringify(alumnos[0], null, 2));

    if (alumnos.length === 0) {
      return null;
    }

    return alumnos[0];
  } catch (error) {
    console.error('Error al obtener alumno por ID:', error);
    throw error;
  }
},

/**
 * Actualiza la contraseña de un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {string} passwordActual - Contraseña actual
 * @param {string} nuevaPassword - Nueva contraseña
 * @returns {Promise<boolean>} - true si la actualización fue exitosa
 */
async actualizarPassword(usuarioId, passwordActual, nuevaPassword) {
  const connection = await db.pool.getConnection();

  try {
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
    const bcrypt = require('bcrypt');
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
},

/**
 * Verifica si la contraseña actual es correcta
 * @param {number} usuarioId - ID del usuario
 * @param {string} passwordActual - Contraseña a verificar
 * @returns {Promise<boolean>} - true si la contraseña es correcta
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
    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(passwordActual, usuario.ContraseñaHash);

    return isMatch;
  } catch (error) {
    console.error('Error al verificar contraseña:', error);
    throw error;
  }
},

/**
 * Obtiene los datos de un alumno por su número de boleta
 * @param {string} boleta - Número de boleta del alumno
 * @returns {Promise<Object|null>} - Datos del alumno o null si no existe
 */
async obtenerAlumnoPorBoleta(boleta) {
  try {
    const [alumnos] = await db.query(
      `SELECT a.ID AS AlumnoInfoID, a.NumeroBoleta, a.PeriodoEscolarActualID,
              u.ID AS UsuarioID, u.NombreUsuario, u.CorreoElectronico,
              u.EstaActivo, u.TelefonoCelular
          FROM AlumnosInfo a
          JOIN Usuarios u ON a.UsuarioID = u.ID
          WHERE a.NumeroBoleta = ? AND u.EstaActivo = TRUE`,
      [boleta]
    );

    if (alumnos.length === 0) {
      return null;
    }

    return alumnos[0];
  } catch (error) {
    console.error('Error al obtener alumno por boleta:', error);
    throw error;
  }
},

/**
 * Obtiene las materias asignadas a un alumno
 * @param {number} alumnoId - ID del alumno (de AlumnosInfo)
 * @returns {Promise<Array>} - Lista de materias del alumno
 */
async obtenerMateriasAlumno(alumnoId) {
  try {
    const [materias] = await db.query(`
      SELECT
        ma.ID,
        ma.AlumnoInfoID,
        ma.MateriaProfesorID,
        mp.PeriodoEscolarID,
        m.Nombre AS NombreMateria,
        m.Codigo,
        m.Semestre,
        m.EjeFormativo,
        m.Descripcion,
        CONCAT(p.Nombre, ' ', p.ApellidoPaterno) AS NombreProfesor,
        pe.Codigo AS PeriodoEscolar,
        ma.FechaInscripcion,
        mp.Grupo
      FROM MateriasAlumno ma
      JOIN MateriasProfesor mp ON ma.MateriaProfesorID = mp.ID
      JOIN Materias m ON mp.MateriaID = m.ID
      JOIN ProfesoresInfo p ON mp.ProfesorInfoID = p.ID
      JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID
      WHERE ma.AlumnoInfoID = ?
      AND pe.EsActual = TRUE
      ORDER BY m.Semestre, m.Nombre`,
      [alumnoId]
    );

    return materias;
  } catch (error) {
    console.error('Error al obtener materias del alumno:', error);
    throw error;
  }
},

/**
 * Obtiene todas las materias del alumno (actuales y de periodos anteriores)
 * @param {number} alumnoId - ID del alumno
 * @returns {Promise<Array>} - Lista de todas las materias del alumno
 */
async obtenerTodasMateriasAlumno(alumnoId) {
  try {
    const [materias] = await db.query(`
      SELECT
        ma.ID,
        ma.AlumnoInfoID,
        ma.MateriaProfesorID,
        mp.PeriodoEscolarID,
        m.Nombre AS NombreMateria,
        m.Codigo,
        m.Semestre,
        m.EjeFormativo,
        m.Descripcion,
        CONCAT(p.Nombre, ' ', p.ApellidoPaterno) AS NombreProfesor,
        pe.Codigo AS PeriodoEscolar,
        ma.FechaInscripcion,
        mp.Grupo,
        pe.EsActual AS EsPeriodoActual
      FROM MateriasAlumno ma
      JOIN MateriasProfesor mp ON ma.MateriaProfesorID = mp.ID
      JOIN Materias m ON mp.MateriaID = m.ID
      JOIN ProfesoresInfo p ON mp.ProfesorInfoID = p.ID
      JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID
      WHERE ma.AlumnoInfoID = ?
      ORDER BY pe.EsActual DESC, pe.FechaInicio DESC, m.Semestre, m.Nombre`,
      [alumnoId]
    );

    return materias;
  } catch (error) {
    console.error('Error al obtener todas las materias del alumno:', error);
    throw error;
  }
},

/**
 * Obtiene los profesores asignados a un alumno
 * @param {number} alumnoId - ID del alumno (de AlumnosInfo)
 * @returns {Promise<Array>} - Lista de profesores asignados
 */
async obtenerProfesoresAsignados(alumnoId) {
  try {
    const [profesores] = await db.query(`
      SELECT DISTINCT
          p.ID AS ProfesorID,
          p.NumeroEmpleado,
          p.Nombre,
          p.ApellidoPaterno,
          p.ApellidoMaterno,
          m.Nombre AS NombreMateria,
          u.NombreUsuario,
          u.CorreoElectronico,
          u.TelefonoCelular,
          ma.FechaInscripcion AS FechaInicio,
          mp.ID AS MateriaProfesorID
      FROM MateriasAlumno ma
      JOIN MateriasProfesor mp ON ma.MateriaProfesorID = mp.ID
      JOIN ProfesoresInfo p ON mp.ProfesorInfoID = p.ID
      JOIN Materias m ON mp.MateriaID = m.ID
      JOIN Usuarios u ON p.UsuarioID = u.ID
      JOIN PeriodosEscolares pe ON mp.PeriodoEscolarID = pe.ID
      WHERE ma.AlumnoInfoID = ?
        AND pe.EsActual = TRUE
      ORDER BY ma.FechaInscripcion DESC`,
      [alumnoId]
    );

    return profesores;
  } catch (error) {
    console.error('Error al obtener profesores asignados:', error);
    throw error;
  }
},

/**
 * Obtiene el semestre actual
 * @returns {Promise<Object|null>} - Datos del semestre actual o null si no hay ninguno
 */
// Cambiar obtenerSemestreActual por obtenerPeriodoEscolarActual
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
 * Obtiene todos los consultorios disponibles
 * @returns {Promise<Array>} - Lista de consultorios
 */
async obtenerConsultorios() {
  try {
      const [consultorios] = await db.query(
      'SELECT ID, Nombre, Descripcion FROM Consultorios ORDER BY Nombre'
      );

      return consultorios;
  } catch (error) {
      console.error('Error al obtener consultorios:', error);
      throw error;
  }
},

/**
 * Obtiene catálogos generales por tipo
 * @param {string} tipoCatalogo - Tipo de catálogo (GENERO, ESTADO_CIVIL, etc.)
 * @returns {Promise<Array>} - Lista de valores del catálogo
 */
async obtenerCatalogo(tipoCatalogo) {
  try {
      const [catalogo] = await db.query(
      'SELECT ID, Valor, Descripcion, Orden FROM CatalogosGenerales WHERE TipoCatalogo = ? ORDER BY Orden',
      [tipoCatalogo]
      );

      return catalogo;
  } catch (error) {
      console.error(`Error al obtener catálogo ${tipoCatalogo}:`, error);
      throw error;
  }
},

/**
 * Busca pacientes por nombre o correo electrónico
 * @param {string} termino - Término de búsqueda
 * @returns {Promise<Array>} - Lista de pacientes encontrados
 */
async buscarPacientes(termino) {
  try {
      const [pacientes] = await db.query(
      `SELECT ID, Nombre, ApellidoPaterno, ApellidoMaterno,
              CorreoElectronico, TelefonoCelular, Edad
          FROM Pacientes
          WHERE Nombre LIKE ? OR ApellidoPaterno LIKE ? OR
              ApellidoMaterno LIKE ? OR CorreoElectronico LIKE ?
          LIMIT 10`,
      [`%${termino}%`, `%${termino}%`, `%${termino}%`, `%${termino}%`]
      );

      return pacientes;
  } catch (error) {
      console.error('Error al buscar pacientes:', error);
      throw error;
  }
},

/**
 * Actualiza los datos de perfil de un alumno
 * @param {number} alumnoInfoId - ID del alumno (de AlumnosInfo)
 * @param {number} usuarioId - ID del usuario
 * @param {Object} datos - Datos a actualizar
 * @returns {Promise<boolean>} - true si la actualización fue exitosa
 */
async actualizarPerfil(alumnoInfoId, usuarioId, datos) {
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

    // Actualizar datos específicos de alumno si es necesario
    // (en este caso no hay campos adicionales, pero se deja como ejemplo)

    await connection.commit();

    return true;
  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar perfil de alumno:', error);
    throw error;
  } finally {
    connection.release();
  }
}
};

module.exports = alumnoService;