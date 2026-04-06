import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

// Conectar la cuenta de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware de subida
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // máximo 5MB por archivo
    }
});

export { cloudinary, upload };