import multer from "multer";
import path from 'path';
import fs from 'fs';

/* 
Configuración de Multer para subir archivos
Los archivos se guardan temporalmente en uploads/ antes de subirlos al SharePoint
*/

// Crear carpeta uploads si no existe
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Nombre único con timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

// Filtro de archivo permitido
const fileFilter = (req, file, cb) => {
    // Solo se permite archivos .pdf
    const isMimeValid = file.mimetype === 'application/pdf';

    const ext = path.extname(file.originalname).toLowerCase();
    const isExtValid = ext === '.pdf';

    if(isMimeValid && isExtValid) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos en PDF'), false);
    }
};

// Crear instancia de multer
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // máximo 5MB por archivo
    }
});