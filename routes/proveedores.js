import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt.js";
import httpProveedor from "../controllers/proveedores.js";
import { upload } from "../config/cloudinary.js";

const routes = Router();

routes.get("/", /* validarJWT, */ httpProveedor.getProveedores)
routes.post("/registro", /* validarJWT, */ httpProveedor.registroProveedor)
routes.post("/registro/completar/:token", /* validarJWT, */ httpProveedor.completarRegistro)
routes.put("/:id/solicitar-actualizacion", /* validarJWT, */ httpProveedor.solicitarActualizacion)
routes.put("/:id/actualizar-datos", /* validarJWT, */ httpProveedor.actualizarDatosProveedor)
routes.put("/:id", /* validarJWT, */ httpProveedor.actualizarProveedor)
routes.delete("/:id", /* validarJWT, */ httpProveedor.eliminarProveedor)

// Ruta para subir los archivos a cloudinary
routes.post("/upload", /* validarJWT, */ upload.single('archivo'), httpProveedor.subirDocumento)

export default routes; 