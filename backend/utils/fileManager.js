const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

// Configuración básica
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads'); 
console.log('UPLOAD_DIR RESUELTO:', UPLOAD_DIR);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']; // Solo JPG/PNG

// Tipos de estudios 
const STUDY_TYPES = {
BINOCULARIDAD: 'binocularidad',
ALTERACIONES: 'alteraciones-oculares',
GRID_AMSLER: 'grid-amsler',
CAMPIMETRIA: 'campimetria',
GENERAL: 'general'
};

// Crear directorio si no existe
const ensureUploadsDir = async () => {
try { 
await fs.access(UPLOAD_DIR);
} catch (error) { 
await fs.mkdir(UPLOAD_DIR, { recursive: true });
}
};

// Generar ruta organizada: /alumno/paciente/estudio/
const getStudyPath = (alumnoId, pacienteId, estudio) => {
return path.join(alumnoId.toString(), pacienteId.toString(), estudio);
};

// Validación básica de archivos
const validateFile = (file) => {
    if (!file) throw new Error('Archivo no proporcionado');
    if (file.size > MAX_FILE_SIZE) throw new Error(`El archivo excede el tamaño máximo de ${MAX_FILE_SIZE/1024/1024}MB`);
    if (!ALLOWED_TYPES.includes(file.mimetype)) throw new Error(`Solo se permiten archivos de tipo: ${ALLOWED_TYPES.join(', ')}`);
    
    // Comprobar si tenemos un buffer o una ruta
    if (!file.buffer && !file.path) {
    throw new Error('El archivo debe ser proporcionado como buffer o con una ruta en el sistema de archivos');
    }
};

// Guardar imagen con procesamiento básico
const saveImage = async (file, options) => {
// Validaciones iniciales
await ensureUploadsDir();
validateFile(file);

const { alumnoId, pacienteId, estudio } = options;
if (!alumnoId || !pacienteId || !estudio) {
    throw new Error('Faltan datos requeridos: alumnoId, pacienteId, estudio');
}

// Estructura de carpetas (relativa a UPLOAD_DIR)
const relativeDir = path.join(alumnoId.toString(), pacienteId.toString(), estudio);
const absoluteDir = path.join(UPLOAD_DIR, relativeDir);

await fs.mkdir(absoluteDir, { recursive: true });

// Nombre de archivo único
const timestamp = Date.now();
const hash = crypto.randomBytes(4).toString('hex');
const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
const filename = `${timestamp}-${hash}${extension}`;
const absolutePath = path.join(absoluteDir, filename);

// Procesamiento de la imagen
const sharpInstance = file.buffer ? sharp(file.buffer) : sharp(file.path);

await sharpInstance
    .resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true
    })
    .jpeg({
        quality: 80,
        progressive: true
    })
    .toFile(absolutePath);

// Limpieza de archivo temporal si existe
if (file.path && file.path !== absolutePath) {
    await fs.unlink(file.path).catch(console.error);
}

// Estadísticas del archivo
const stats = await fs.stat(absolutePath);

return {
    // Guardamos solo la ruta relativa (sin '/uploads/')
    path: path.join(relativeDir, filename).replace(/\\/g, '/'),
    filename,
    estudio,
    mimeType: file.mimetype,
    originalName: file.originalname,
    size: stats.size,
    createdAt: new Date(timestamp).toISOString()
};
};

// Eliminar archivo de manera segura
const deleteFile = async (filePath) => {
if (!filePath) throw new Error('Ruta de archivo no proporcionada');

// Normalizar y asegurar la ruta
const normalizedPath = path.normalize(filePath);
const fullPath = path.join(UPLOAD_DIR, normalizedPath);

// Prevenir directory traversal
if (!fullPath.startsWith(UPLOAD_DIR)) {
throw new Error('Ruta de archivo inválida');
}

try {
await fs.unlink(fullPath);
return true;
} catch (error) {
if (error.code === 'ENOENT') {
    return false; // El archivo no existía
}
throw error;
}
};

module.exports = {
  STUDY_TYPES,
  saveImage,
  deleteFile,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  UPLOAD_DIR
};