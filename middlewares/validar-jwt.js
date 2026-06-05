// import users from "../models/users.js";
// import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import usersServices from "../services/usersServices.js";

export const generarJWT = (payload) => {
    return new Promise((resolve, reject) => {
        jwt.sign(
            {
                _id: payload.id, //email
                email: payload.email,
                nombre: payload.nombre,
                rol: payload.rol
            },
            process.env.JWT_SECRET || 'clavesupersegura',
            { expiresIn: "7d" },
            (err, token) => {
                if(err) {
                    console.log(err);
                    reject("No se pudo generar el token");
                } else {
                    resolve(token)
                }
            }
        );
    });
};

export const validarJWT = async (req, res, next) => {
    const token = req.header("x-token");
    if(!token) {
        return res.status(401).json({
            success: false,
            msg: "No hay token en la petición"
        });
    }

    try {
        // Verificar el token y extraer el payload
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'clavesupersegura');

        // Buscar usuario en SharePoint por email
        /* const siteId = await usersServices.getSiteId();
        const rootFolderId = await usersServices.getRootFolderId(siteId);
        const usersFolderId = await usersServices.getOrCreateUsersFolder(siteId, rootFolderId); */
        const usuario = await usersServices.getUserByEmail(payload.email);

        if (!usuario) {
            return res.status(401).json({
                msg: "Token no válido - usuario no existe en SharePoint"
            });
        }

        // Adjuntar usuario al request (sin el passwordHash)
        const { passwordHash, ...usuarioSinPassword } = usuario;
        req.usuario = usuarioSinPassword;
        next();
    } catch (error) {
        console.error('Error validando JWT:', error.message);
        res.status(401).json({
            success: false,
            msg:"token no válido"
        });
    }
};

// Middleware para verificar rol de admin
export const esAdmin = (req, res, next) => {
    if (req.usuario?.rol === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            msg: 'Acceso denegado - se requiere permisos de administrador'
        });
    }
};