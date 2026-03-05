import Router from "express";
import { validarJWT } from "../middlewares/validar-jwt.js";
import httpUser from "../controllers/users.js";

const routes = Router();

routes.get("/", validarJWT, httpUser.getUsers)
routes.post("/", httpUser.createUser)
routes.post("/login", httpUser.login)
routes.put("/:id", httpUser.updateUser)
routes.delete("/:id", httpUser.deleteUser)

export default routes;