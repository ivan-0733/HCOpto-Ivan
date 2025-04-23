const db = require('../config/database');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
try {
console.log('Iniciando carga de datos de prueba...');

// Crear roles si no existen
console.log('Creando roles...');
await db.query(`
    INSERT IGNORE INTO Roles (NombreRol, Descripcion) VALUES 
    ('Alumno', 'Rol para estudiantes'),
    ('Profesor', 'Rol para profesores'),
    ('Investigador', 'Rol para investigadores')
`);

// Obtener el ID del rol de alumno
const [roles] = await db.query('SELECT ID FROM Roles WHERE NombreRol = ?', ['Alumno']);
const rolAlumnoId = roles[0]?.ID;

if (!rolAlumnoId) {
    throw new Error('No se pudo obtener el ID del rol de alumno');
}

// Crear un usuario alumno de prueba
console.log('Creando usuario alumno de prueba...');
const hashedPassword = await bcrypt.hash('password123', 12);

// Verificar si el usuario ya existe
const [usuariosExistentes] = await db.query(
    'SELECT ID FROM Usuarios WHERE CorreoElectronico = ?', 
    ['alumno@mail.com']
);

let usuarioId;

if (usuariosExistentes.length > 0) {
    console.log('El usuario ya existe, actualizando...');
    usuarioId = usuariosExistentes[0].ID;
    await db.query(
    'UPDATE Usuarios SET ContraseñaHash = ?, NombreUsuario = ?, RolID = ?, EstaActivo = TRUE WHERE ID = ?',
    [hashedPassword, 'AlumnoPrueba', rolAlumnoId, usuarioId]
    );
} else {
    console.log('Creando nuevo usuario...');
    const [result] = await db.query(`
    INSERT INTO Usuarios (NombreUsuario, CorreoElectronico, ContraseñaHash, RolID, EstaActivo) 
    VALUES (?, ?, ?, ?, TRUE)
    `, ['AlumnoPrueba', 'alumno@mail.com', hashedPassword, rolAlumnoId]);
    
    usuarioId = result.insertId;
}

// Verificar si el alumno ya existe
const [alumnosExistentes] = await db.query(
    'SELECT ID FROM AlumnosInfo WHERE UsuarioID = ?', 
    [usuarioId]
);

// Crear o actualizar registro de alumno
if (alumnosExistentes.length > 0) {
    console.log('La información de alumno ya existe, actualizando...');
    await db.query(
    'UPDATE AlumnosInfo SET NumeroBoleta = ?, SemestreActual = ? WHERE UsuarioID = ?',
    ['2020630001', 1, usuarioId]
    );
} else {
    console.log('Creando información de alumno...');
    await db.query(`
    INSERT INTO AlumnosInfo (UsuarioID, NumeroBoleta, SemestreActual) 
    VALUES (?, ?, ?)
    `, [usuarioId, '2020630001', 1]);
}

// Crear un semestre actual
console.log('Creando semestre actual...');
await db.query(`
    INSERT IGNORE INTO Semestres (Nombre, FechaInicio, FechaFin, EsActual) 
    VALUES ('2025-1', '2024-08-01', '2025-01-31', TRUE)
`);

// Crear un consultorio de ejemplo
console.log('Creando consultorio de ejemplo...');
await db.query(`
    INSERT IGNORE INTO Consultorios (Nombre, Descripcion) 
    VALUES ('Consultorio 1', 'Consultorio principal')
`);

// Crear un profesor de prueba
console.log('Creando profesor de prueba...');
const [rolesProfesor] = await db.query('SELECT ID FROM Roles WHERE NombreRol = ?', ['Profesor']);
const rolProfesorId = rolesProfesor[0]?.ID;

if (!rolProfesorId) {
    throw new Error('No se pudo obtener el ID del rol de profesor');
}

// Verificar si el profesor ya existe
const [profesoresExistentes] = await db.query(
    'SELECT ID FROM Usuarios WHERE CorreoElectronico = ?', 
    ['profesor@mail.com']
);

let profesorUsuarioId;

if (profesoresExistentes.length > 0) {
    profesorUsuarioId = profesoresExistentes[0].ID;
    await db.query(
    'UPDATE Usuarios SET ContraseñaHash = ?, NombreUsuario = ?, RolID = ?, EstaActivo = TRUE WHERE ID = ?',
    [hashedPassword, 'ProfesorPrueba', rolProfesorId, profesorUsuarioId]
    );
} else {
    const [result] = await db.query(`
    INSERT INTO Usuarios (NombreUsuario, CorreoElectronico, ContraseñaHash, RolID, EstaActivo) 
    VALUES (?, ?, ?, ?, TRUE)
    `, ['ProfesorPrueba', 'profesor@mail.com', hashedPassword, rolProfesorId]);
    
    profesorUsuarioId = result.insertId;
}

// Verificar si la información del profesor ya existe
const [infoProfesorExistente] = await db.query(
    'SELECT ID FROM ProfesoresInfo WHERE UsuarioID = ?', 
    [profesorUsuarioId]
);

let profesorInfoId;

if (infoProfesorExistente.length > 0) {
    profesorInfoId = infoProfesorExistente[0].ID;
    await db.query(
    'UPDATE ProfesoresInfo SET NumeroEmpleado = ? WHERE ID = ?',
    ['PROF001', profesorInfoId]
    );
} else {
    const [result] = await db.query(`
    INSERT INTO ProfesoresInfo (UsuarioID, NumeroEmpleado) 
    VALUES (?, ?)
    `, [profesorUsuarioId, 'PROF001']);
    
    profesorInfoId = result.insertId;
}

// Crear vinculación entre alumno y profesor
console.log('Vinculando alumno con profesor...');
const [alumnoInfo] = await db.query('SELECT ID FROM AlumnosInfo WHERE UsuarioID = ?', [usuarioId]);
const alumnoInfoId = alumnoInfo[0]?.ID;

if (!alumnoInfoId) {
    throw new Error('No se pudo obtener el ID del alumno');
}

// Verificar si ya existe la vinculación
const [vinculacionExistente] = await db.query(
    'SELECT ID FROM VinculacionAlumnoProfesor WHERE AlumnoInfoID = ? AND ProfesorInfoID = ?',
    [alumnoInfoId, profesorInfoId]
);

if (vinculacionExistente.length > 0) {
    await db.query(
    'UPDATE VinculacionAlumnoProfesor SET Activo = TRUE, FechaInicio = NOW() WHERE ID = ?',
    [vinculacionExistente[0].ID]
    );
} else {
    await db.query(`
    INSERT INTO VinculacionAlumnoProfesor (AlumnoInfoID, ProfesorInfoID, FechaInicio, Activo) 
    VALUES (?, ?, NOW(), TRUE)
    `, [alumnoInfoId, profesorInfoId]);
}

// Crear catálogos necesarios
console.log('Creando catálogos necesarios...');
await db.query(`
    INSERT IGNORE INTO CatalogosGenerales (TipoCatalogo, Valor, Descripcion, Orden) VALUES 
    ('GENERO', 'Hombre', 'Género masculino', 1),
    ('GENERO', 'Mujer', 'Género femenino', 2),
    ('ESTADO_CIVIL', 'Soltero (a)', 'Persona no casada ni en unión civil', 1),
    ('ESCOLARIDAD', 'Superior completa', 'Completó educación superior y obtuvo título', 1),
    ('ESTADO_HISTORIAL', 'En proceso', 'Historial en proceso de elaboración', 1),
    ('ESTADO_HISTORIAL', 'Revisión', 'En proceso de revisión por el profesor', 2),
    ('ESTADO_HISTORIAL', 'Corrección', 'Requiere correcciones del alumno', 3),
    ('ESTADO_HISTORIAL', 'Finalizado', 'Historial finalizado y aprobado', 4)
`);

console.log('¡Base de datos sembrada con éxito! Credenciales de prueba:');
console.log('Alumno:');
console.log('  - Boleta: 2020630001');
console.log('  - Correo: alumno@mail.com');
console.log('  - Contraseña: password123');
console.log('Profesor:');
console.log('  - RFC: PROF001');
console.log('  - Correo: profesor@mail.com');
console.log('  - Contraseña: password123');

process.exit(0);
} catch (error) {
console.error('Error al sembrar la base de datos:', error);
process.exit(1);
}
};

// Ejecutar la función principal
seedDatabase();