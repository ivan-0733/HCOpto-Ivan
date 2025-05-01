const fileManager = require('../utils/fileManager');
const { STUDY_TYPES } = fileManager;
const fs = require('fs').promises;
const db = require('../config/database');
const path = require('path');

// Configuración de Multer
const multer = require('multer');

// Asegurarse de que la carpeta de destino exista
const uploadDir = './uploads';
try {
    fs.access(uploadDir).catch(async () => {
        await fs.mkdir(uploadDir, { recursive: true });
    });
} catch (error) {
    console.log('Creando directorio de uploads:', error);
}

// Cambiar a diskStorage para mayor estabilidad
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Configuración global de Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: fileManager.MAX_FILE_SIZE || 10 * 1024 * 1024 }, // 10MB por defecto si no está definido
    fileFilter: (req, file, cb) => {
        console.log(`Validando tipo de archivo: ${file.mimetype}`);
        if (fileManager.ALLOWED_TYPES && fileManager.ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.warn(`Tipo de archivo no permitido: ${file.mimetype}`);
            cb(new Error('Solo se permiten imágenes JPG/PNG'), false);
        }
    }
});

// Controlador para manejar la subida de imágenes
const uploadHistoriaClinicaImage = async (req, res) => {
    console.log('Inicio de uploadHistoriaClinicaImage');
    
    try {
        // Verificar si hay un archivo (debe ser procesado por el middleware de Multer en la ruta)
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
        
        // // OPCIÓN SIMPLE: Para pruebas, solo devolver éxito
        // return res.status(200).json({
        //     status: 'success',
        //     message: 'Archivo subido correctamente',
        //     data: {
        //         historiaID,
        //         seccionID,
        //         tipoImagenID,
        //         filename: req.file.filename,
        //         path: req.file.path,
        //         size: req.file.size,
        //         mimetype: req.file.mimetype
        //     }
        // });
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
                '7': STUDY_TYPES.GRID_AMSLER,
                '9': STUDY_TYPES.CAMPIMETRIA,
                '10': STUDY_TYPES.ALTERACIONES,
                '11': STUDY_TYPES.ALTERACIONES,
                '12': STUDY_TYPES.BINOCULARIDAD
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
    upload // Exportamos la configuración global de upload
};