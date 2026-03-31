import proveedores from "../models/proveedores.js";
import Invitacion from "../models/invitacion.js";
import { enviarCorreoRegistro } from "../services/emailService.js";
import { enviarCorreoActualizacion } from "../services/emailServiceActualizacion.js";

const httpProveedor = {
    getProveedores: async (req, res) => {
        try {
            console.log('🔍 [GET /api/proveedor] - Iniciando petición');
            
            console.log('📋 Buscando proveedores en la BD...');
            const proveedor = await proveedores.find();
            
            console.log('✅ Proveedores encontrados:', proveedor.length);

            res.json({
                success: true,
                data: proveedor,
                count: proveedor.length
            });

        } catch (error) {
            console.error('❌ Error en obtener los proveedores:', error);
            res.status(500).json({
                success: false,
                msg: "Error al buscar los proveedores",
                error: error.message
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
            const {
                NIT,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                NombreRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombresApellidosResponsable,
                CorreoElectronicoResponsable
            } = req.body;

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

            // Crear el proveedor con el correo que ya está verificado
            const nuevoProveedor = await proveedores.create({
                NIT,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                CorreoElectronico: invitacion.CorreoElectronico,
                NombreRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombresApellidosResponsable,
                CorreoElectronicoResponsable
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

    // Actualizar datos del proveedor (Admin/Asistente)
    actualizarProveedor: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                NIT,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                CorreoElectronico,
                NombreRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombresApellidosResponsable,
                CorreoElectronicoResponsable,
                estadoProveedor
            } = req.body;

            // Validar que el proveedor exista
            const proveedorExistente = await proveedores.findById(id);
            if(!proveedorExistente) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que el NIT no esté registrado por otro proveedor
            if (NIT && NIT !== proveedorExistente.NIT) {
                const nitExistente = await proveedores.findOne({ NIT, _id: { $ne: id } });
                if (nitExistente) {
                    return res.status(400).json({
                        success: false,
                        msg: "El NIT ya está registrado por otro proveedor"
                    });
                }
            }

            // Validar que el correo no esté registrado por otro proveedor
            if (CorreoElectronico && CorreoElectronico !== proveedorExistente.CorreoElectronico) {
                const correoExistente = await proveedores.findOne({ 
                    CorreoElectronico: CorreoElectronico, 
                    _id: { $ne: id } 
                });
                if (correoExistente) {
                    return res.status(400).json({
                        success: false,
                        msg: "El correo ya está registrado por otro proveedor"
                    });
                }
            }

            // Preparar objeto de actualización
            const datosActualizar = {
                NIT,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                CorreoElectronico,
                NombreRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombresApellidosResponsable,
                CorreoElectronicoResponsable
            };
            Object.keys(datosActualizar).forEach(key => datosActualizar[key] === undefined && delete datosActualizar[key]);
            if (estadoProveedor) {
                datosActualizar.estadoProveedor = estadoProveedor;
            }

            // Actualizar el proveedor
            const proveedorActualizado = await proveedores.findByIdAndUpdate(id, datosActualizar, { new: true });

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

    // Actualizar datos del proveedor (El proveedor se actualiza a sí mismo desde el formulario)
    actualizarDatosProveedor: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                NIT,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                CorreoElectronico,
                NombreRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombresApellidosResponsable,
                CorreoElectronicoResponsable
            } = req.body;

            // Validar que el proveedor exista
            const proveedorExistente = await proveedores.findById(id);
            if(!proveedorExistente) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que el NIT no esté registrado por otro proveedor
            if (NIT && NIT !== proveedorExistente.NIT) {
                const nitExistente = await proveedores.findOne({ NIT, _id: { $ne: id } });
                if (nitExistente) {
                    return res.status(400).json({
                        success: false,
                        msg: "El NIT ya está registrado por otro proveedor"
                    });
                }
            }

            // Validar que el correo no esté registrado por otro proveedor
            if (CorreoElectronico && CorreoElectronico !== proveedorExistente.CorreoElectronico) {
                const correoExistente = await proveedores.findOne({ 
                    CorreoElectronico: CorreoElectronico, 
                    _id: { $ne: id } 
                });
                if (correoExistente) {
                    return res.status(400).json({
                        success: false,
                        msg: "El correo ya está registrado por otro proveedor"
                    });
                }
            }

            // Actualizar el proveedor y cambiar estado a "Actualizado"
            const datosActualizar = {
                NIT,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                CorreoElectronico,
                NombreRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombresApellidosResponsable,
                CorreoElectronicoResponsable,
                estadoProveedor: "Actualizado"
            };
            Object.keys(datosActualizar).forEach(key => datosActualizar[key] === undefined && delete datosActualizar[key]);

            const proveedorActualizado = await proveedores.findByIdAndUpdate(id, datosActualizar, { new: true });

            res.status(200).json({
                success: true,
                data: proveedorActualizado,
                msg: "Datos actualizados exitosamente"
            });

        } catch (error) {
            console.error('Error al actualizar los datos del proveedor:', error);
            res.status(500).json({
                success: false,
                msg: "Error al actualizar los datos"
            });
        }
    },

    // Función para solicitar actualización al proveedor por medio de correo
    solicitarActualizacion: async (req, res) => {
        try {
            const { id } = req.params;

            // Validar que el proveedor exista
            const proveedor = await proveedores.findById(id);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Enviar correo de actualización con el link del formulario
            await enviarCorreoActualizacion(proveedor.CorreoElectronico, id);

            // Actualizar el estado del proveedor a "Pendiente Actualización"
            const proveedorActualizado = await proveedores.findByIdAndUpdate(id, {
                estadoProveedor: "Pendiente Actualización"
            }, { new: true });

            res.status(200).json({
                success: true,
                data: proveedorActualizado,
                msg: "Correo de actualización enviado exitosamente"
            });

        } catch (error) {
            console.error('Error al solicitar la actualización:', error);
            res.status(500).json({
                success: false,
                msg: "Error al solicitar la actualización"
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