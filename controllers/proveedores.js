import proveedores from "../models/proveedores.js";
import Invitacion from "../models/invitacion.js";
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

    // Enviar correo al proveedor
    registroProveedor: async (req, res) => {
        try {
            const { CorreoElectronico } = req.body;

            // Verificar que no exista una invitación pendiente para ese correo
            const invitacionExistente = await Invitacion.findOne({
                CorreoElectronico,
                estadoRegistro: 'pendiente'
            });

            if (invitacionExistente) {
                return res.status(400).json({
                    success: false,
                    msg: "Ya se ha enviado una invitación a este correo. Por favor, revisa tu bandeja de entrada."
                })
            }

            // Enviar correo de registro
            const { token } = await enviarCorreoRegistro(CorreoElectronico);
            console.log(CorreoElectronico);


            res.status(200).json({
                success: true,
                data: CorreoElectronico,
                token: token,
                msg: "Se ha enviado un correo de registro."
            })

        } catch (error) {
            console.error('Error al enviar el correo de registro:', error);
            res.status(500).json({
                success: false,
                msg: "Error al enviar el correo de registro"
            });
        }
    },

    // Completar registro del proveedor
    completarRegistro: async (req, res) => {
        try {
            const { token } = req.params;
            const { NIT, RazonSocial } = req.body;

            // Buscar la invitación por el token
            const invitacion = await Invitacion.findOne({
                tokenRegistro: token,
                estadoRegistro: 'pendiente'
            });

            if (!invitacion) {
                return res.status(400).json({
                    success: false,
                    msg: "El enlace no es válido"
                });
            }

            // Validar que el NIT no esté registrado
            const nitExistente = await proveedores.findOne({ NIT });
            if (nitExistente) {
                return res.status(400).json({
                    success: false,
                    msg: "El NIT ya está registrado"
                })
            };

            // Validar que el correo de la invitación no esté registrado
            const correoExistente = await proveedores.findOne({ 
                CorreoElectronico: invitacion.CorreoElectronico 
            });
            if (correoExistente) {
                return res.status(400).json({
                    success: false,
                    msg: "El correo ya está registrado"
                })
            }

            // Crear el proveedor con el correo que ya esta verificado
            const nuevoProveedor = await proveedores.create({
                NIT,
                RazonSocial,
                CorreoElectronico: invitacion.CorreoElectronico
            });

            // Invalidar el link marcando la invitación como completada
            await Invitacion.findByIdAndUpdate(invitacion._id, {
                estadoRegistro: 'completado'
            })

            res.status(200).json({
                success: true,
                data: nuevoProveedor,
                msg: "Registro completado exitosamente"
            });

        } catch (error) {
            console.error('Error al completar el registro:', error);
            res.status(500).json({
                success: false,
                msg: "Error al completar el registro"
            });
        }
    },

    actualizarProveedor: async (req, res) => {
        try {
            const { id } = req.params;
            const { NIT, RazonSocial, CorreoElectronico, estadoProveedor } = req.body;

            // Validar que el proveedor exista
            const proveedorExistente = await proveedores.findById(id);

            if(!proveedorExistente) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Vañidar que el NIT no esté registrado por otro proveedor
            const nitExistente = await proveedores.findOne({ NIT, _id: { $ne: id } });
            if (nitExistente) {
                return res.status(400).json({
                    success: false,
                    msg: "El NIT ya está registrado por otro proveedor"
                });
            }

            // Validar que el correo no esté registrado por otro proveedor
            const correoExistente = await proveedores.findOne({ CorreoElectronico: CorreoElectronico, _id: { $ne: id } });
            if (correoExistente) {
                return res.status(400).json({
                    success: false,
                    msg: "El correo ya está registrado por otro proveedor"
                });
            }

            // Actualizamos el proveedor
            const proveedorActualizado = await proveedores.findByIdAndUpdate(id, {
                NIT, 
                RazonSocial, 
                CorreoElectronico, 
                estadoProveedor
            }, { new: true }
            );

            res.status(200).json({
                success: true,
                data: proveedorActualizado,
                msg: "Proveedor actualizado exitosamente"
            });

        } catch (error) {
            console.error('Error al actualizar el proveedor:', error);
            res.status(500).json({
                success: false,
                msg: "Error al actualizar el proveedor"
            });
        }
    },

    eliminarProveedor: async (req, res) => {
        try {
            const { id } = req.params;

            await proveedores.findByIdAndDelete(id);

            res.status(200).json({
                success: true,
                msg: "Proveedor eliminado exitosamente"
            });
        } catch (error) {
            console.error('Error al eliminar el proveedor:', error);
            res.status(500).json({
                success: false,
                msg: "Error al eliminar el proveedor"
            });
        }
    }
}

export default httpProveedor;