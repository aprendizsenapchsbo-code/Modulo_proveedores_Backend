import sharePointService from '../services/sharePointServices.js';
// import Invitacion from "../models/invitacion.js";
import { enviarCorreoRegistro, enviarCorreoRevisionEmpresa, enviarCorreoAprobacion, enviarCorreoRechazar } from "../services/emailService.js";
import { enviarCorreoActualizacion } from "../services/emailServiceActualizacion.js";
import path from 'path';
import fs from 'fs';
import { error } from 'console';


const httpProveedor = {
    getProveedores: async (req, res) => {
        try {
            console.log('🔍 [GET /api/proveedor] - Iniciando petición');
            
            const proveedores = await sharePointService.getAllSuppliers();
            console.log('📋 Buscando proveedores en SharePoint...');

            res.json({
                success: true,
                data: proveedores,
                count: proveedores.length,
                mensaje: 'Búsqueda en SharePoint en desarrollo'
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

    getProveedorId: async (req, res) => {
        try {
            const { nit } = req.params; // Se espera que el id sea el NIT
            console.log('Proveedor encontrado: ', nit)

            const proveedor = await sharePointService.getSupplierByNit(nit);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: 'Proveedor no encontrando'
                });
            }

            return res.status(200).json({
                success: true,
                data: proveedor,
                mensaje: 'Búsqueda en SharePoint en desarrollo'
            });

        } catch (error) {
            console.error('Error al encontrar el proveedor:', error);
            res.status(500).json({
                success: false,
                msg: "Error al encontrar el proveedor"
            });
        }
    },

    // Enviar correo al proveedor
    registroProveedor: async (req, res) => {
        try {
            const { CorreoElectronico } = req.body;

            if (!CorreoElectronico) {
                return res.status(400).json({
                    success: false,
                    msg: "El correo electronico es obligatorio"
                });
            }
            console.log('Nuevo Pre-registro de proveedor');
            console.log(`Email: ${CorreoElectronico}`);

            // Generar el token unico
            const crypto = await import('crypto');
            const token = crypto.default.randomBytes(32).toString('hex');
            console.log(`Token generado: ${token.substring(0, 10)}...`);
            
            // Prepara datos iniciales para subir al SharePoint
            const supplierData = {
                CorreoElectronico,
                fechaRegistroInicial: new Date().toISOString(),
                estado: 'Invitación_enviada',
                tokenRegistro: token
            };
            
            // Guardar el registro inicial en el SharePoint
            await sharePointService.saveSupplierData(supplierData, null);
            console.log('Registro inicial guardado en SharePoint');
            
            // Enviando correo de pre-registro
            try {
                await enviarCorreoRegistro(CorreoElectronico, token);
                console.log('Correo de pre-registro enviado al proveedor');
            } catch (emailError) {
                console.error('Error al enviar el correo: ', emailError.message);
                return res.status(500).json({
                    success: false,
                    msg: 'Error al enviar el correo de pre-registro',
                    error: emailError.message
                });
            }
            
            res.status(200).json({
                success: true,
                data: {
                    CorreoElectronico,
                    token
                },
                msg: "Se ha enviado un correo de pre-registro."
            })

        } catch (error) {
            console.error('Error al enviar el correo de pre-registro:', error.message);
            res.status(500).json({
                success: false,
                msg: "Error al enviar el correo de registro",
                error: error.message
            });
        }
    },

    // Completar registro del proveedor
    completarRegistro: async (req, res) => {
        try {
            let proveedorData;
            if (req.body.datosProveedor) {
                proveedorData = JSON.parse(req.body.datosProveedor);
            } else {
                proveedorData = req.body;
            }
            console.log('Datos recibidos:', proveedorData);
            const { token } = req.params;
            const { 
                NIT,
                DV,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                CorreoElectronico,
                NombreRepresentante,
                TipoDocumentoRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombreRepresentanteComercial,
                CargoRepresentanteComercial,
                TelefonoRepresentanteComercial,
                CorreoElectronicoRepresentanteComercial,
                NombresApellidosResponsable,
                CargoResponsableFacturacion,
                CorreoElectronicoResponsable,
                TipoContribuyente,
                TipoProveedor,
                AutorizaConflictos,
                AutorizaDatosPersonales,
                Documentos
             } = proveedorData;
                
            console.log('Completanto registro:');
            console.log(`Token: ${token.substring(0, 10)}...`);

            const preRegistro = await sharePointService.getSupplierByToken(token);
            if (!preRegistro) {
                return res.status(404).json({
                    success: false,
                    msg: "Token inválido o expirado"
                });
            }

            // Validar autorizaciones
            const autorizaDatos = AutorizaDatosPersonales === true || AutorizaDatosPersonales === 'true';
            if (!autorizaDatos) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    msg: 'Debe autorizar el tratamiento de datos personales'
                });
            }

            const autorizaConflictos = AutorizaConflictos === true || AutorizaConflictos === 'true';
            if (!autorizaConflictos) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    msg: 'Debe autorizar el tratamiento de conflictos e intereses'
                });
            }

            // Validar documentos si se envio
            if(!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    msg: 'Debes subir al menos un documento'
                })
            }

            // Validar cantidad de documentos según el tipo de contribuyente
            const documentosRequeridos = (TipoContribuyente === 'Persona Natural') ? 3 : 6;

            if (req.files.length < documentosRequeridos) {
                return res.status(400).json({
                    success: false,
                    msg: `Debe subir ${documentosRequeridos} docuementos`
                });
            }
            
            // Validar que los docuementos sean PDF
            for (const file of req.files) {
                if (file.mimetype !== 'application/pdf') {
                    // Limpiar archivos temporales
                    req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));

                    return res.status(400).json({
                        success: false,
                        msg: 'Todos los documentos deben ser PDF'
                    });
                }
            }

            console.log(`NIT: ${NIT}`);
            console.log(`Razón Social: ${RazonSocial}`);
            

            // Construir el objeto del proveedor
            // y mantener el estado como Pre-registro hasta que la empresa lo verifique
            const proveedorCompleto = {
                ...preRegistro,
                ...proveedorData,
                estadoProveedor: 'Pre-registro',
                fechaRegistroCompleto: new Date().toISOString(),
                documentosSubidos: req.files.map(f => f.originalname)
            };

            // Actualizar en SharePoint (usuando NIT como identificador)
            const rutasArchivo = req.files.map(f => f.path);
            await sharePointService.saveSupplierData(proveedorCompleto, rutasArchivo);
            console.log('Datos guardados en SharePoint');
            
            // Limpiar archivos temporales
            req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));

            // Eliminar carpeta temporal
            await sharePointService.deleteSupplierFolder(token);

            // Enviar correo a la empresa para revisión
            try {
                await enviarCorreoRevisionEmpresa(proveedorCompleto);
                console.log('Correo de revisión enviado a la empresa')
            } catch (emailError) {
                console.error('Error al notificar a la empresa:', emailError);
            }
            
            // Respuesta exitosa
            res.status(200).json({
                success: true,
                data: {
                    NIT,
                    RazonSocial,
                    CorreoElectronico: proveedorCompleto.CorreoElectronico,
                    estadoProveedor: 'Pre-registro'
                },
                msg: "Registro completado exitosamente"
            });
            
        } catch (error) {
            console.error('Error al completar el registro:', error.message);
            // limpiar archivos en caso de error
            if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
            res.status(500).json({ 
                success: false, 
                msg: error.message 
            });
        }
    },

    // Actualizar datos del proveedor (Admin/Asistente)
    actualizarProveedor: async (req, res) => {
        try {
            const { nit } = req.params;
            const  datosActualizar  = req.body;

             // Validar que el admin esté autenticado
            if(req.usuario.rol !== 'admin'){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            console.log('Actualizando proveedor en SharePoint');
            console.log(`NIT ${nit}`)

            // Validar que el proveedor exista
            const proveedorExistente = await sharePointService.getSupplierByNit(nit);
            if(!proveedorExistente) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que el NIT no esté registrado por otro proveedor
            if (datosActualizar.NIT && datosActualizar.NIT !== nit) {
                const nitExistente = await sharePointService.getSupplierByNit(datosActualizar.NIT);
                if (nitExistente) {
                    return res.status(400).json({
                        success: false,
                        msg: "El NIT ya está registrado por otro proveedor"
                    });
                }
            }

            // Validar que el correo no esté registrado por otro proveedor
            if (datosActualizar.CorreoElectronico && datosActualizar.CorreoElectronico !== proveedorExistente.CorreoElectronico) {
                const correoExistente = await sharePointService.getSupplierByEmail(datosActualizar.CorreoElectronico);
                if (correoExistente && correoExistente.NIT !== nit) {
                    return res.status(400).json({
                        success: false,
                        msg: "El correo ya está registrado por otro proveedor"
                    });
                }
            }

            // Preparar objeto de actualización
            const updateData = {
                ...datosActualizar,
                updateAt: new Date().toISOString()
            }

            // Actualizar el proveedor en SharePoint
            await sharePointService.updateSupplier(nit, updateData);

            // Obtener el proveedor actualizado (el NIT pudo haber cambiado)
            const nuevoNit = datosActualizar.NIT || nit;
            const proveedorActualizado = await sharePointService.getSupplierByNit(nuevoNit);

            if (updateData.estadoProveedor === 'Registrado') {
                try {
                    await enviarCorreoAprobacion(proveedorActualizado)
                } catch (correoError) {
                    console.error('Error al enviar correo de aprobación:', correoError);
                }
            }

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
                DV,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                CorreoElectronico,
                NombreRepresentante,
                TipoDocumentoRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombreRepresentanteComercial,
                CargoRepresentanteComercial,
                TelefonoRepresentanteComercial,
                CorreoElectronicoRepresentanteComercial,
                NombresApellidosResponsable,
                CargoResponsableFacturacion,
                CorreoElectronicoResponsable,
                TipoContribuyente,
                TipoProveedor,
                Documentos
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
                DV,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
                CorreoElectronico,
                NombreRepresentante,
                TipoDocumentoRepresentante,
                NumeroIdentificacion,
                TelefonoRepresentante,
                CorreoElectronicoRepresentante,
                NombreRepresentanteComercial,
                CargoRepresentanteComercial,
                TelefonoRepresentanteComercial,
                CorreoElectronicoRepresentanteComercial,
                NombresApellidosResponsable,
                CargoResponsableFacturacion,
                CorreoElectronicoResponsable,
                TipoContribuyente,
                TipoProveedor,
                Documentos,
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

    aprobarPreRegistro: async (req, res) => {
        try {
            const { nit } = req.params;
            const { comentario } = req.body;

            // Validar que el admin esté autenticado
            if(req.usuario.rol !== 'admin'){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            // Validar que el proveedor exista
            const proveedor = await sharePointService.getSupplierByNit(nit);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que el proveedor esté en estado "Pre-registro"
            if (proveedor.estadoProveedor !== "Pre-registro") {
                return res.status(400).json({
                    success: false,
                    msg: "Este proveedor ya esta registrado"
                });
            }

            // Actualizar el estado del proveedor a "Actualizado"
            await sharePointService.updateSupplier(nit, {
                estadoProveedor: "Actualizado",
                comentarioAprobacion: comentario || null,
                fechaAprobacion: new Date(),
                aprobadoPor: req.usuario.nombre 
            });

            // Obtener el proveedor actualizado despúes del cambio
            const proveedorActualizado = await sharePointService.getSupplierByNit(nit);

            // Enviar correo de aprobación al proveedor
            try {
                await enviarCorreoAprobacion(proveedorActualizado);
            } catch (mailError) {
                console.warn('Falló el envío del correo de aprobación:', mailError);
            }

            res.status(200).json({
                success: true,
                data: proveedorActualizado,
                msg: "Pre-registro aprobado exitosamente"
            });

        } catch (error) {
            console.error('Error al aprobar el pre-registro:', error);
            res.status(500).json({
                success: false,
                msg: "Error al aprobar el pre-registro"
            });
        }
    },

    rechazarPreRegistro: async (req, res) => {
        try {
            const { nit } = req.params;
            const { comentario } = req.body;

            // Validar que el admin esté autenticado
            if(req.usuario.rol !== 'admin'){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            // Validar que el proveedor exista
            const proveedor = await sharePointService.getSupplierByNit(nit);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que el proveedor esté en estado "Pre-registro"
            if (proveedor.estadoProveedor !== "Pre-registro") {
                return res.status(400).json({
                    success: false,
                    msg: "Este proveedor ya esta registrado"
                });
            }

            // Actualizar el estado del proveedor a "Inactivo"
            await sharePointService.updateSupplier(nit, {
                estadoProveedor: "Inactivo",
                comentarioAprobacion: comentario || null,
                fechaAprobacion: new Date(),
                aprobadoPor: req.usuario.name
            });

            // Obtener el proveedor actualizado despúes del cambio
            const proveedorActualizado = await sharePointService.getSupplierByNit(nit);

            // Enviar correo de aprobación al proveedor
            try {
                await enviarCorreoRechazar(proveedorActualizado);
            } catch (mailError) {
                console.warn('Falló el envío del correo de aprobación:', mailError);
            }

            res.status(200).json({
                success: true,
                data: proveedorActualizado,
                msg: "Pre-registro rechazado"
            });

        } catch (error) {
            console.error('Error al rechazar el pre-registro:', error);
            res.status(500).json({
                success: false,
                msg: "Error al rechazar el pre-registro"
            });
        }
    },

    eliminarProveedor: async (req, res) => {
        try {
            const { nit } = req.params;

            await sharePointService.deleteSupplier(nit);

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