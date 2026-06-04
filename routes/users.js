import Router from "express";
import { validarJWT, esAdmin } from "../middlewares/validar-jwt.js";
import httpUser from "../controllers/users.js";

const routes = Router();

// Rutas públicas
routes.post("/login", httpUser.login)

// Rutas protegidas
routes.get("/", validarJWT, esAdmin, httpUser.getUsers)
routes.post("/", /* validarJWT, esAdmin, */ httpUser.createUser)
routes.put("/:email", validarJWT, httpUser.updateUser)
routes.delete("/:email", validarJWT, esAdmin, httpUser.deleteUser)

export default routes;