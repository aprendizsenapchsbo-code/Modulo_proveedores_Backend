import Router from "express";
import httpUser from "../controllers/users.js";

const routes = Router();

routes.get("/", httpUser.getUsers)
routes.post("/", httpUser.createUser)
routes.put("/:id", httpUser.updateUser)
routes.delete("/:id", httpUser.deleteUser)

export default routes;