import { Router } from "express";
import { validarJWT, esAdmin } from "../middlewares/validar-jwt.js";
import httpProveedor from "../controllers/proveedores.js";
import { upload } from "../config/multer.js";

const routes = Router();

// Rutas Get
routes.get("/", validarJWT, esAdmin, httpProveedor.getProveedores)
routes.get("/:nit", validarJWT, esAdmin, httpProveedor.getProveedorId)

// Rutas Post
routes.post("/registro", validarJWT, esAdmin, httpProveedor.registroProveedor)
routes.post("/registro/completar/:token", upload.array('documentos', 10), httpProveedor.completarRegistro)
routes.post("/aprobar/pre-registro/:nit", validarJWT, esAdmin, httpProveedor.aprobarPreRegistro)
routes.post("/rechazar/pre-registro/:nit", validarJWT, esAdmin, httpProveedor.rechazarPreRegistro)

// Rutas Put
routes.put("/:nit/solicitar-actualizacion", validarJWT, esAdmin, httpProveedor.solicitarActualizacion)
routes.put("/:nit/actualizar-datos", upload.single('documento'), httpProveedor.actualizarDatosProveedor)
routes.put("/:nit", validarJWT, esAdmin, httpProveedor.actualizarProveedor)

// Rutas Delete
routes.delete("/:nit", validarJWT, esAdmin, httpProveedor.eliminarProveedor)

export default routes; 