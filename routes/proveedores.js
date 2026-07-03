import { Router } from "express";
import { validarJWT, esAdmin } from "../middlewares/validar-jwt.js";
import httpProveedor from "../controllers/proveedores.js";
import { upload } from "../config/multer.js";

const routes = Router();

// Rutas Get
routes.get("/", validarJWT, esAdmin, httpProveedor.getProveedores)
routes.get("/actualizacion/:token", httpProveedor.getProveedorByUpdateToken)
routes.get("/:razonSocial", validarJWT, esAdmin, httpProveedor.getProveedorId)
routes.get("/:razonSocial/documentos/:nombre", /* validarJWT, */ httpProveedor.obtenerDocumentos)
routes.get("/verificar-token/:token", httpProveedor.verificarToken)

// Rutas Post
routes.post("/registro", validarJWT, esAdmin, httpProveedor.registroProveedor)
routes.post("/registro/completar/:token", upload.array('documentos', 10), httpProveedor.completarRegistro)
routes.post("/aprobar/pre-registro/:razonSocial", validarJWT, esAdmin, httpProveedor.aprobarPreRegistro)
routes.post("/rechazar/pre-registro/:razonSocial", validarJWT, esAdmin, httpProveedor.rechazarPreRegistro)

// Rutas Put
routes.put("/:razonSocial/solicitar-actualizacion", validarJWT, esAdmin, httpProveedor.solicitarActualizacion)
routes.put("/:token/actualizar-datos", upload.array('documentos', 10), httpProveedor.actualizarDatosProveedor)
routes.put("/:RazonSocial", validarJWT, esAdmin, upload.array('documentos', 10), httpProveedor.actualizarProveedor)

// Rutas Delete
routes.delete("/:razonSocial", validarJWT, esAdmin, httpProveedor.eliminarProveedor)

export default routes; 