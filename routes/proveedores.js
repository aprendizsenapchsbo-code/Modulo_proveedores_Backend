import { Router } from "express";
import { validarJWT, esAdmin } from "../middlewares/validar-jwt.js";
import httpProveedor from "../controllers/proveedores.js";
import { upload } from "../config/multer.js";

const routes = Router();

// Rutas Get
routes.get("/", validarJWT, httpProveedor.getProveedores)
routes.get('/buscar', httpProveedor.buscarProveedores);
routes.get('/resumen', validarJWT, httpProveedor.getResumen);
routes.get("/actualizacion/:token", httpProveedor.getProveedorByUpdateToken)
routes.get("/:razonSocial", validarJWT, esAdmin, httpProveedor.getProveedorId)
routes.get("/:razonSocial/documentos/:nombre", /* validarJWT, */ httpProveedor.obtenerDocumentos)
routes.get("/verificar-token/:token", httpProveedor.verificarToken)

// Rutas Post
routes.post("/registro", validarJWT, esAdmin, httpProveedor.registroProveedor)
routes.post("/registro/completar-registro-carga-directa/:token", upload.array('documentos', 10), httpProveedor.completarRegistro)
routes.post("/solicitar-urls-carga/:token", httpProveedor.solicitarUrlsCarga)
routes.post("/aprobar/pre-registro/:razonSocial", validarJWT, esAdmin, httpProveedor.aprobarPreRegistro)
routes.post("/rechazar/pre-registro/:razonSocial", validarJWT, esAdmin, httpProveedor.rechazarPreRegistro)

// Rutas Put
routes.put("/:razonSocial/solicitar-actualizacion", validarJWT, esAdmin, httpProveedor.solicitarActualizacion)
routes.put("/:token/actualizar-datos-carga-directa", upload.array('documentos', 10), httpProveedor.actualizarDatosProveedor)
routes.put("/:RazonSocial", validarJWT, esAdmin, upload.array('documentos', 10), httpProveedor.actualizarProveedor)
routes.put("/inactivar-proveedor/:razonSocial", validarJWT, esAdmin, httpProveedor.inactivarProveedor)

// Rutas Delete
// routes.delete("/:razonSocial", validarJWT, esAdmin, httpProveedor.eliminarProveedor)

// Rutas de node-cron
routes.get('/admin/cron-config', validarJWT, httpProveedor.obtenerConfiguracionCron)
routes.put('/admin/cron-config', validarJWT, esAdmin, httpProveedor.actualizarConfiguracionCron)

export default routes; 