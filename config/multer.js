import multer from "multer";

// Usar almacenamiento en memoria (no escribe en disco)
const storage = multer.memoryStorage();

// Filtro de archivo permitido
const fileFilter = (req, file, cb) => {
    console.log('Archivo recibido en multer:', {
        mimetype: file.mimetype,
        originalname: file.originalname,
        fieldname: file.fieldname
    });
    
    const validMimes = ['application/pdf', 'application/x-pdf', 'application/octet-stream'];
    
    const ext = file.originalname.split('.').pop().toLowerCase();
    const isExtValid = (ext === 'pdf' /* || ext === 'xlsx' || ext === 'xls' */);
    const isMimeValid = (
        file.mimetype === 'application/pdf' /* ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
        file.mimetype === 'application/vnd.ms-excel' // .xls */
    );
    
    if(isExtValid && isMimeValid) {
        console.log('✅ Archivo aceptado por multer');
        cb(null, true);
    } else {
        console.log('❌ Archivo rechazado por multer');
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