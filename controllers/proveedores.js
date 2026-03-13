import proveedores from "../models/proveedores.js";
import { enviarCorreoRegistro } from "../services/emailService.js";

const httpProveedor = {
    getProveedores: async (req, res) => {
        try {
            const proveedor = await proveedores.find();

            res.json({
                success: true,
                data: proveedor,
                count: proveedor.length
            });

        } catch (error) {
            console.error('Error en obtener los proveedores:', error);
            res.status(500).json({
                success: false,
                msg: "Error al buscar los proveedores"
            });
        }
    },

    registroProveedor: async (req, res) => {
        try {
            const { CorreoElectronico } = req.body;

            // Validar que el NIT no exista
            // const proveedorExistente = await proveedores.findOne({ NIT });
            // if (proveedorExistente) {
            //     return res.status(400).json({
            //         success: false,
            //         msg: "El NIT ya está registrado"
            //     })
            // };

            // const nuevoProveedor = await proveedores.create({
            //     NIT,
            //     RazonSocial,
            //     CorreoElectronico
            // });

            // Enviar correo de registro
            await enviarCorreoRegistro(CorreoElectronico);
            console.log(CorreoElectronico)

            res.status(200).json({
                success: true,
                data: CorreoElectronico,
                msg: "Se ha enviado un correo de registro."
            })

        } catch (error) {
            console.error('Error al enviar el correo de registro:', error);
            res.status(500).json({
                success: false,
                msg: "Error al enviar el correo de registro"
            });
        }
    }
}

export default httpProveedor;