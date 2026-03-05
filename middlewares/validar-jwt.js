import users from "../models/users.js";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";

export const generarJWT = (id) => {
    return new Promise((resolve, reject) => {
        const informacion = {id};
        jwt.sign(informacion, process.env.LLAVESECRETA, {
            expiresIn: "1h"
        }, (err, token) => {
            if (err){
                console.log(err);
                reject("No se pudo generar el token")
            }else {
                resolve(token)
            }
        })
    })
}

export const validarJWT = async (req, res, next) => {
    const token = req.header("x-token");
    if(!token) {
        return res.status(401).json({
            msg: "No hay token en la petición"
        })
    }

    try {
        const {id} = jwt.verify(token, process.env.LLAVESECRETA)

        let usuario = await users.findById(id);

        req.usuario = usuario;
        next();
    } catch (error) {
        console.error('Error validando JWT:', error);
        res.status(401).json({
            success: false,
            msg:"token no valido"
        })
    }
}