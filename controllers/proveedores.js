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
            const { id } = req.params; // Se espera que el id sea el NIT
            console.log('Proveedor encontrado: ', id)

            const proveedor = await sharePointService.getSupplierByNit(id);
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

            // Verificar que no exista una invitación pendiente para ese correo
            /* const invitacionExistente = await Invitacion.findOne({
                CorreoElectronico,
                estadoRegistro: 'pendiente'
            });
            } */
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
            await sharePointService.registerSupplier(supplierData, null);
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
            const { token } = req.params;
            const {
                NIT,
                DV,
                RazonSocial,
                DireccionNotificacion,
                Telefono,
                Ciudad,
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
                AutorizaDatosPersonales,
                AutorizaConflictos,
                Documentos
                } = req.body;
                
                console.log('Completanto registro:');
                console.log(`Token: ${token.substring(0, 10)}...`);
            

            // Buscar la invitación por el token
            /* const invitacion = await Invitacion.findOne({
                tokenRegistro: token,
                estadoRegistro: 'pendiente'
            });

            if (!invitacion) {
                return res.status(400).json({
                    success: false,
                    msg: "El enlace no es válido"
                });
            } */

            // Validar que el NIT no esté registrado
            /* const nitExistente = await proveedores.findOne({ NIT });
            if (nitExistente) {
                return res.status(400).json({
                    success: false,
                    msg: "El NIT ya está registrado"
                })
            }; */

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
            if(req.file) {
                const ext = path.extname(req.file.originalname).toLowerCase();
                const isMimeValid = req.file.mimetype === 'application/pdf';
                const isExtValid = ext === '.pdf';
                
                if (!isMimeValid || !isExtValid) {
                    fs.unlinkSync(req.file.path);
                    return res.status(400).json({
                        success: false,
                        msg: 'El documento debe ser un archivo PDF'
                    });
                }
                console.log(`Documento: ${req.file.originalname}`);
                
            }
            
            // Validar documentos en array si existen
            if (Documentos && Array.isArray(Documentos) && Documentos.length > 0) {
                const documentosInvalidos = Documentos.some(doc => !doc || !doc.tipo || !doc.nombre);
                if (documentosInvalidos) {
                    if (req.file && fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                    return res.status(400).json({
                        success: false,
                        msg: "Cada documento debe incluir tipo y nombre"
                    });
                }
            }

            console.log(`NIT: ${NIT}`);
            console.log(`Razón Social: ${RazonSocial}`);
            

            // Crear el proveedor con el correo que ya está verificado
            // y mantener el estado como Pre-registro hasta que la empresa lo verifique
            const proveedorCompleto = {
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
                AutorizaDatosPersonales,
                AutorizaConflictos,
                Documentos: Documentos || [],
                estadoProveedor: 'Pre-registro',
                fechaRegistroCompleto: new Date().toISOString(),
                tokenRegistro: token,
                documentoPrincipal: req.file ? req.file.originalname : null
            };

            // Actualizar en SharePoint (con o sin archivo)
            const rutaArchivo = req.file ? req.file.path : null;
            await sharePointService.registerSupplier(proveedorCompleto, rutaArchivo);

            console.log('Datos guardados en SharePoint');

            // Limpiar archivo temporal si existe
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            // Enviar correo a la empresa para revisión
            try {
                await enviarCorreoRevisionEmpresa(proveedorCompleto);
                console.log('Correo de revisión enviado a la empresa')
            } catch (emailError) {
                console.error('Error al notificar a la empresa:', emailError);
            }
            
            res.status(200).json({
                success: true,
                data: {
                    NIT,
                    RazonSocial,
                    CorreoElectronico,
                    estadoProveedor: 'Pre-registro'
                },
                msg: "Registro completado exitosamente"
            });
            
        } catch (error) {
            console.error('Error al completar el registro:', error.message);
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                msg: "Error al completar el registro",
                error: error.message
            });
        }
    },

    /* // Función para subir documentos a Cloudinary
    subirDocumento: async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                msg: "No se recibió ningún archivo"
            });
        }

        // Extrae la extensión del archivo original
        const extension = path.extname(req.file.originalname)
            .toLowerCase()
            .replace('.', ''); // "pdf", "docx", "jpg", etc.

        // Nombre limpio sin extensión para Cloudinary
        const nombreSinExtension = path.basename(req.file.originalname, path.extname(req.file.originalname));

        const resultado = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'proveedores/documentos',
                    resource_type: 'raw',
                    type: 'upload',
                    access_mode: 'public',
                    format: extension,                          // 👈 fuerza el formato
                    public_id: `${Date.now()}_${nombreSinExtension}`, // 👈 preserva el nombre
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(req.file.buffer);
        });

        const documento = {
            tipo: req.body.tipo,
            nombre: req.file.originalname,  // nombre original completo
            url: resultado.secure_url,
            formato: extension              // 👈 guarda la extensión
        };

        res.status(200).json({
            success: true,
            data: documento,
            msg: "Archivo subido exitosamente"
        });

    } catch (error) {
        console.error('Error al subir el archivo', error);
        res.status(500).json({
            success: false,
            msg: "Error al subir el archivo"
        });
    }
}, */

    // Actualizar datos del proveedor (Admin/Asistente)
    actualizarProveedor: async (req, res) => {
        try {
            const { id } = req.params;
            const { datosActualizar } = req.body;

            console.log('Actualizando proveedor en SharePoint');
            console.log(`ID ${id}`)

            /* // Validar que el proveedor exista
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
                estadoProveedor,
                Documentos
            };
            Object.keys(datosActualizar).forEach(key => datosActualizar[key] === undefined && delete datosActualizar[key]);
            if (estadoProveedor) {
                datosActualizar.estadoProveedor = estadoProveedor;
            }

            // Actualizar el proveedor
            const proveedorActualizado = await proveedores.findByIdAndUpdate(id, datosActualizar, { new: true });

            if (estadoProveedor === 'Registrado') {
                try {
                    await enviarCorreoAprobacion(proveedorActualizado)
                } catch (correoError) {
                    console.error('Error al enviar correo de aprobación:', correoError);
                }
            } */

            res.status(200).json({
                success: true,
                data: datosActualizar,
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
            const { id } = req.params;
            const { comentario } = req.body;

            // Validar que el proveedor exista
            const proveedor = await proveedores.findById(id);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que el admin esté autenticado
            if (!req.usuario) {
                return res.status(401).json({
                    success: false,
                    msg: "No autenticado"
                });
            }

            // Validar que el proveedor esté en estado "Pre-registro"
            if (proveedor.estadoProveedor !== "Pre-registro") {
                return res.status(400).json({
                    success: false,
                    msg: "Este proveedor ya esta registrado"
                });
            }

            // Actualizar el estado del proveedor a "Registrado"
            const proveedorActualizado = await proveedores.findByIdAndUpdate(id, {
                estadoProveedor: "Actualizado",
                comentarioAprobacion: comentario || null,
                fechaAprobacion: new Date(),
                aprobadoPor: req.usuario._id 
            }, { new: true });

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
            const { id } = req.params;
            const { comentario } = req.body;

            // Validar que el proveedor exista
            const proveedor = await proveedores.findById(id);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que el admin esté autenticado
            if (!req.usuario) {
                return res.status(401).json({
                    success: false,
                    msg: "No autenticado"
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
            const proveedorActualizado = await proveedores.findByIdAndUpdate(id, {
                estadoProveedor: "Inactivo",
                comentarioAprobacion: comentario || null,
                fechaAprobacion: new Date(),
                aprobadoPor: req.usuario._id 
            }, { new: true });

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