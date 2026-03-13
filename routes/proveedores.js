import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt.js";
import httpProveedor from "../controllers/proveedores.js";

const routes = Router();

routes.get("/", validarJWT, httpProveedor.getProveedores)
routes.post("/registro", /* validarJWT, */ httpProveedor.registroProveedor)
// routes.put("/:id", validarJWT, httpProveedor.updateProveedor)
// routes.delete("/:id", validarJWT, httpProveedor.deleteProveedor)

export default routes; 