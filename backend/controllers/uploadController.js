const fileManager = require('../utils/fileManager');
const { STUDY_TYPES } = fileManager;
const fs = require('fs').promises;
const db = require('../config/database');
const path = require('path');
const { UPLOAD_DIR } = require('../utils/fileManager');


// Configuración de Multer
const multer = require('multer');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(process.cwd(), 'temp_uploads');
        fs.mkdir(tempDir, { recursive: true })
            .then(() => cb(null, tempDir))
            .catch(err => cb(err));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'), false);
        }
    }
});


//Controlador para manejar la subida de imágenes
const uploadHistoriaClinicaImage = async (req, res) => {
console.log('Inicio de uploadHistoriaClinicaImage');

try {
// Verificar si hay un archivo
if (!req.file) {
    console.warn('No se recibió ningún archivo');
    return res.status(400).json({
    status: 'error',
    message: 'No se ha recibido ningún archivo'
    });
}

console.log('Archivo recibido:', {
    nombre: req.file.originalname,
    tipo: req.file.mimetype,
    tamaño: req.file.size,
    ruta: req.file.path
});

// Obtener datos necesarios
const historiaID = req.params.id;
const seccionID = req.body.seccionID;
const tipoImagenID = req.body.tipoImagenID;

console.log('Datos recibidos:', { historiaID, seccionID, tipoImagenID });

if (!historiaID) {
    return res.status(400).json({
    status: 'error',
    message: 'ID de historia clínica no proporcionado'
    });
}

if (!seccionID || !tipoImagenID) {
    return res.status(400).json({
    status: 'error',
    message: 'Sección ID y Tipo Imagen ID son requeridos'
    });
}

// Verificación de permisos sobre la historia clínica
console.log('Verificando permisos sobre historia clínica:', historiaID);
let historia;
try {
    [historia] = await db.query(
    `SELECT PacienteID FROM HistorialesClinicos 
    WHERE ID = ? AND AlumnoID = ?`,
    [historiaID, req.usuario.AlumnoInfoID]
    );
    console.log('Resultado de verificación:', historia);
} catch (dbError) {
    console.error('Error en consulta de verificación:', dbError);
    return res.status(500).json({
    status: 'error',
    code: 'DB_ERROR',
    message: 'Error al verificar permisos sobre la historia clínica',
    details: dbError.message
    });
}

if (!historia?.length) {
    console.warn('Acceso no autorizado a historia clínica', {
    historiaID,
    alumnoId: req.usuario.AlumnoInfoID
    });
    return res.status(403).json({
    status: 'error',
    code: 'FORBIDDEN_ACCESS',
    message: 'No tienes permiso para modificar esta historia clínica o no existe'
    });
}

// Determinar tipo de estudio
console.log('Determinando tipo de estudio para sección:', seccionID);
const getEstudioType = (sectionId) => {
    const sectionMap = {
    '9': STUDY_TYPES.CAMPIMETRIA,
    '11': STUDY_TYPES.ALTERACIONES,  // Mantener para Oftalmoscopía
    '12': STUDY_TYPES.BINOCULARIDAD  // Mantener para Binocularidad
    };
    return sectionMap[sectionId] || STUDY_TYPES.GENERAL;
};

const estudio = getEstudioType(seccionID);
const pacienteId = historia[0].PacienteID;
const alumnoId = req.usuario.AlumnoInfoID;

console.log('Datos para guardar imagen:', {
    estudio,
    pacienteId,
    alumnoId
});

// Procesar y guardar la imagen
let result;
try {
    console.log('Iniciando guardado de imagen...');
    result = await fileManager.saveImage(req.file, {
    alumnoId,
    pacienteId,
    estudio,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype
    });
    console.log('Resultado de guardado:', result);
} catch (saveError) {
    console.error('Error al guardar imagen:', saveError);
    return res.status(500).json({
    status: 'error',
    code: 'FILE_SAVE_ERROR',
    message: 'Error al guardar la imagen en el sistema',
    details: saveError.message
    });
}

// Registrar en base de datos
let imageId;
try {
    console.log('Registrando imagen en base de datos...');
    const [insertResult] = await db.query(
    `INSERT INTO Imagenes 
    (Ruta, Nombre, HistorialID, PacienteID, Tipo, FechaSubida, TamanoBytesH, TamanoBytesV, SeccionID, TipoImagenID)
    VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
    [
        result.path,                // Ruta
        result.filename,            // Nombre (usando filename como nombre)
        historiaID,                 // HistorialID
        pacienteId,                 // PacienteID
        req.file.mimetype,          // Tipo
        req.file.size,              // TamanoBytesH 
        0,                          // TamanoBytesV 
        seccionID,                  // SeccionID
        tipoImagenID                // TipoImagenID
    ]
    );

    imageId = insertResult.insertId;
    console.log('ID de imagen insertado:', imageId);

    // Si es una imagen para Método Gráfico (seccionID = 12), actualizamos directamente
    if (seccionID === '12') {
    console.log('Actualizando directamente Método Gráfico con ID de imagen:', imageId);
    
    // Verificar si existe un registro para esta historia
    const [metodoGrafico] = await db.query(
        'SELECT ID FROM MetodoGrafico WHERE HistorialID = ?',
        [historiaID]
    );

    if (metodoGrafico.length === 0) {
        // Crear nuevo registro con la referencia a la imagen
        await db.query(
        `INSERT INTO MetodoGrafico (HistorialID, ImagenID) VALUES (?, ?)`,
        [historiaID, imageId]
        );
        console.log('Creado nuevo registro en MetodoGrafico con ImagenID:', imageId);
    } else {
        // Actualizar el registro existente
        await db.query(
        `UPDATE MetodoGrafico SET ImagenID = ? WHERE HistorialID = ?`,
        [imageId, historiaID]
        );
        console.log('Actualizado registro existente en MetodoGrafico con ImagenID:', imageId);
    }
    }
    //si es una imagen para campimetria
        if (seccionID === '9') {
    console.log('Actualizando directamente Campimetría con ID de imagen:', imageId);
    
    // Verificar si existe un registro para esta historia
    const [campimetria] = await db.query(
        'SELECT ID FROM Campimetria WHERE HistorialID = ?',
        [historiaID]
    );

    if (campimetria.length === 0) {
        // Crear nuevo registro con la referencia a la imagen
        await db.query(
        `INSERT INTO Campimetria (HistorialID, ImagenID) VALUES (?, ?)`,
        [historiaID, imageId]
        );
        console.log('Creado nuevo registro en Campimetria con ImagenID:', imageId);
    } else {
        // Actualizar el registro existente
        await db.query(
        `UPDATE Campimetria SET ImagenID = ? WHERE HistorialID = ?`,
        [imageId, historiaID]
        );
        console.log('Actualizado registro existente en Campimetria con ImagenID:', imageId);
    }
    }

    //si es una imagen para oftalmoscopia
    if (seccionID === '11') {
    // 1. Validación estricta del parámetro
    if (req.body.esOjoDerecho === undefined) {
        console.error('Falta parámetro esOjoDerecho para oftalmoscopía');
        return res.status(400).json({
            status: 'error',
            message: 'Se requiere especificar ojo (esOjoDerecho: true/false)'
        });
    }

    if (typeof req.body.esOjoDerecho !== 'string' || 
        !['true', 'false'].includes(req.body.esOjoDerecho.toLowerCase())) {
        console.error('Valor inválido para esOjoDerecho:', req.body.esOjoDerecho);
        return res.status(400).json({
            status: 'error',
            message: 'esOjoDerecho debe ser "true" o "false"'
        });
    }

    const esOjoDerecho = req.body.esOjoDerecho.toLowerCase() === 'true';
    const columna = esOjoDerecho ? 'OjoDerechoImagenID' : 'OjoIzquierdoImagenID';
    
    try {
        // 2. Verificar existencia del registro
        const [oftalmoscopia] = await db.query(
            'SELECT ID FROM Oftalmoscopia WHERE HistorialID = ?',
            [historiaID]
        );

        // 3. Ejecutar la operación sin transacción o usar la conexión correctamente
        if (!oftalmoscopia || oftalmoscopia.length === 0) {
            // Crear nuevo registro
            await db.query(
                `INSERT INTO Oftalmoscopia (HistorialID, ${columna}) VALUES (?, ?)`,
                [historiaID, imageId]
            );
            console.log(`Nuevo registro creado con ${columna}: ${imageId}`);
        } else {
            // Actualizar registro existente
            await db.query(
                `UPDATE Oftalmoscopia SET ${columna} = ? WHERE HistorialID = ?`,
                [imageId, historiaID]
            );
            console.log(`Actualizado ${columna} a ${imageId}`);
        }
        
    } catch (error) {
        console.error('Error en operación de oftalmoscopía:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al actualizar oftalmoscopía',
            details: error.message
        });
    }
}

    
} catch (dbError) {
    console.error('Error al insertar en BD:', dbError);
    console.log('Intentando eliminar archivo guardado...');
    await fileManager.deleteFile(result.path).catch(err => {
    console.error('Error al eliminar archivo después de fallo en BD:', err);
    });
    return res.status(500).json({
    status: 'error',
    code: 'DB_INSERT_ERROR',
    message: 'Error al registrar la imagen en la base de datos',
    details: dbError.message
    });
}

// Respuesta exitosa
console.log('Imagen subida y registrada exitosamente:', { imageId });
return res.status(201).json({
    status: 'success',
    message: 'Imagen subida y registrada correctamente',
    data: {
    imageId,
    path: result.path,
    filename: result.filename,
    estudio,
    mimeType: req.file.mimetype,
    size: req.file.size,
    createdAt: new Date().toISOString()
    }
});

} catch (error) {
console.error('Error en uploadHistoriaClinicaImage:', error);
return res.status(500).json({
    status: 'error',
    message: 'Error al procesar la solicitud',
    error: error.message
});
}
};

// Controlador para obtener una imagen por su ID (en uploadController.js)
const getImageById = async (req, res) => {
    try {
        const imageId = req.params.id;
        
        // 1. Obtener información de la imagen
        const [imagen] = await db.query(
            `SELECT Ruta, Nombre, Tipo FROM Imagenes WHERE ID = ?`,
            [imageId]
        );

        if (!imagen?.length) {
            return res.status(404).json({
                status: 'error',
                message: 'Imagen no encontrada en la base de datos'
            });
        }

        const imagenInfo = imagen[0];
        console.log("imagenInfo:", imagenInfo);        
        // 2. Construir ruta absoluta correctamente
        const relativePath = imagenInfo.Ruta.startsWith('uploads/')
        ? imagenInfo.Ruta.substring(7)
        : imagenInfo.Ruta;

        const absolutePath = path.join(process.cwd(), 'uploads', relativePath);

    
        // 3. Verificar existencia del archivo
        try {
            await fs.access(absolutePath);
            
            // 4. Servir el archivo
            res.setHeader('Content-Type', imagenInfo.Tipo || 'application/octet-stream');
            return res.sendFile(absolutePath);
            
        } catch (error) {
            console.error('Archivo no encontrado en:', absolutePath);
            
            // 5. Búsqueda recursiva como último recurso
            const fileName = path.basename(imagenInfo.Ruta);
            const foundFiles = await findFilesByPattern(UPLOAD_DIR, fileName);
            
            if (foundFiles.length > 0) {
                res.setHeader('Content-Type', imagenInfo.Tipo || 'application/octet-stream');
                return res.sendFile(foundFiles[0]);
            }

            return res.status(404).json({
                status: 'error',
                message: 'Imagen no encontrada en el sistema de archivos',
                debug: {
                    rutaOriginal: imagenInfo.Ruta,
                    rutaBuscada: absolutePath,
                    directorioUploads: UPLOAD_DIR,
                    archivoBuscado: fileName
                }                
            });
        }

    } catch (error) {
        console.error('Error en getImageById:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al procesar la solicitud',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

async function findFilesByPattern(startPath, fileName) {
let results = [];
const files = await fs.readdir(startPath, { withFileTypes: true });

for (const file of files) {
    const filePath = path.join(startPath, file.name);
    if (file.isDirectory()) {
        results = results.concat(await findFilesByPattern(filePath, fileName));
    } else if (file.name === fileName) {
        results.push(filePath);
    }
}

return results;
};

// Controlador para eliminar imágenes
const deleteImage = async (req, res) => {
    console.log('Inicio de deleteImage');
    try {
        const { filePath } = req.body;
        console.log('Solicitud para eliminar archivo:', filePath);

        // Verificar permisos
        if (!filePath.includes(`/${req.usuario.alumnoId}/`)) {
            console.warn('Intento de eliminación no autorizado', {
                user: req.usuario.alumnoId,
                filePath
            });
            return res.status(403).json({ error: 'No tienes permisos para esta acción' });
        }

        console.log('Eliminando archivo...');
        const result = await fileManager.deleteFile(filePath);
        console.log('Resultado de eliminación:', result);

        if (result) {
            console.log('Archivo eliminado exitosamente');
            res.json({ success: true, message: 'Archivo eliminado' });
        } else {
            console.warn('Archivo no encontrado para eliminar');
            res.status(404).json({ error: 'Archivo no encontrado' });
        }
    } catch (error) {
        console.error('Error en deleteImage:', error);
        res.status(500).json({ 
            error: 'Error al eliminar el archivo',
            details: error.message 
        });
    }
};

// Controlador para listar imágenes por estudio
const listStudyImages = async (req, res) => {
    console.log('Inicio de listStudyImages');
    try {
        const { pacienteId, estudio } = req.params;
        console.log('Parámetros recibidos:', { pacienteId, estudio });

        if (!Object.values(STUDY_TYPES).includes(estudio)) {
            console.warn('Tipo de estudio no válido:', estudio);
            return res.status(400).json({ error: 'Tipo de estudio no válido' });
        }

        console.log('Buscando imágenes para:', {
            alumnoId: req.usuario.alumnoId,
            pacienteId,
            estudio
        });

        const files = await fileManager.getStudyFiles(
            req.usuario.alumnoId,
            pacienteId,
            estudio
        );

        console.log('Imágenes encontradas:', files.length);
        res.json({
            success: true,
            data: files
        });
    } catch (error) {
        console.error('Error en listStudyImages:', error);
        res.status(500).json({ 
            error: 'Error al listar archivos',
            details: error.message 
        });
    }
};

module.exports = {
    uploadHistoriaClinicaImage,
    deleteImage,
    listStudyImages,
    getImageById,
    UPLOAD_DIR,
    upload 
};