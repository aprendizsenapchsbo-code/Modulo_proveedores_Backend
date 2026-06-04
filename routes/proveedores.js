import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt.js";
import httpProveedor from "../controllers/proveedores.js";
import { upload } from "../config/multer.js";

const routes = Router();

// Rutas Get
routes.get("/", validarJWT, httpProveedor.getProveedores)
routes.get("/:id", httpProveedor.getProveedorId)

// Rutas Post
routes.post("/registro", httpProveedor.registroProveedor)
routes.post("/registro/completar/:token", upload.single('documento'), httpProveedor.completarRegistro)
routes.post("/aprobar/pre-registro/:id", validarJWT, httpProveedor.aprobarPreRegistro)
routes.post("/rechazar/pre-registro/:id", validarJWT, httpProveedor.rechazarPreRegistro)

// Rutas Put
routes.put("/:id/solicitar-actualizacion", /* validarJWT, */ httpProveedor.solicitarActualizacion)
routes.put("/:id/actualizar-datos", upload.single('documento'), httpProveedor.actualizarDatosProveedor)
routes.put("/:id", /* validarJWT, */ httpProveedor.actualizarProveedor)

// Rutas Delete
routes.delete("/:id", /* validarJWT, */ httpProveedor.eliminarProveedor)

export default routes; 