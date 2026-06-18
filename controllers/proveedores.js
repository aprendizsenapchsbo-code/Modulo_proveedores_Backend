import sharePointService from '../services/sharePointServices.js';
import { enviarCorreoRegistro, enviarCorreoActualizacion, enviarCorreoRevisionEmpresa, enviarCorreoAprobacion, enviarCorreoAprobacionActualizacion, enviarCorreoRechazar } from "../services/emailService.js";
import { buffer } from 'stream/consumers';

function obtenerTiposDocumentosRequeridos(tipoContribuyente) {
    if (tipoContribuyente === 'Persona Jurídica') {
        return [
            'COPIA DE RUT COMPLETO',
            'COPIA DE CAMARA COMERCIO VIGENTE (Menor a 90 días)',
            'COPIA DE DOCUMENTO DE IDENTIFICACION DEL REPRESENTANTE LEGAL',
            'CERTIFICACION BANCARIA',
            '2 CERTIFICADOS COMERCIALES',
            'ESTADOS FINANCIEROS COMPARATIVOS DE LOS (2) ULTIMOS AÑOS'
        ];
    } else if (tipoContribuyente === 'Persona Natural') {
        return [
            'COPIA DE RUT COMPLETO',
            'COPIA DE DOCUMENTO DE IDENTIFICACION DEL RESPRESENTANTE LEGAL',
            'CERTIFICACIÓN BANCARIA'
        ];
    }
    return [];
}

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
            const { razonSocial } = req.params; // Se espera que el id sea el la Razón Social
            console.log('Proveedor encontrado: ', razonSocial)

            const proveedor = await sharePointService.getSupplierByRazonSocial(razonSocial);
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

    obtenerDocumentos: async (req, res) => {
        try {
            // Validar que sea admin
            /* if (req.usuario.rol !== 'admin') {
                res.status(401).json({
                    success: false,
                    msg: "¡UPS! No tienes acceso"
                });
            } */

            console.log('Params:', req.params)
            const { razonSocial, nombre } = req.params;
            console.log(`Buscando archivo: ${nombre} para proveedor: ${razonSocial}`)

            const fileBuffer = await sharePointService.downloadFile(razonSocial, nombre);
            res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
            res.setHeader('Content-Type', 'application/pdf');
            res.send(fileBuffer);

        } catch (error) {
            console.error('Error al obtener el documento:', error.message)
            res.status(404).json({
                success: false,
                msg: "Documento no encontrado"
            });
        }
    },

    verificarToken: async (req, res) => {
        try {
            const { token } = req.params;
            const preRegistro = await sharePointService.getSupplierByToken(token);
            if (!preRegistro) {
                return res.status(404).json({
                    success: false,
                    msg: "Token inválido o expirado"
                });
            }

            // Verificar si ya fue utilizado (si el estado no es 'Invitación_enviada')
            if (preRegistro.estado !== 'Invitación_enviada') {
                return res.status(404).json({
                    success: false,
                    msg: "Este enlace ya fue utilizado"
                });
            }
            return res.json({
                success: true,
                msg: "Token válido"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                msg: error.message
            });
        }
    },

    getProveedorByUpdateToken: async (req, res) => {
        try {
            const { token } = req.params;

            const proveedor = await sharePointService.getSupplierByUpdateToken(token);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: 'Token de actualización inválido o expirado'
                });
            }
            res.json({
                success: true,
                data: proveedor
            })
        } catch (error) {
            console.error('Error al obtener proveedor por token de actualización:', error);
            res.status(500).json({
                success: false,
                msg: error.message
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
            const anioPreRegistro = process.env.PREREGISTRO_ANIO_BASE || new Date().getFullYear().toString();
            
            // Guardar el registro inicial en el SharePoint
            await sharePointService.saveSupplierData(supplierData, null, anioPreRegistro);
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
            const autorizaConflictos = AutorizaConflictos === true || AutorizaConflictos === 'true';
            if (!autorizaDatos || !autorizaConflictos) {
                return res.status(400).json({
                    success: false,
                    msg: 'Debe autorizar los terminos'
                });
            }

            // Validar documentos si se envio
            if(!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    msg: 'Debes subir al menos un documento'
                })
            }

            // Obtener tipos de documentos según tipo de contribuyente
            const tiposRequeridos = obtenerTiposDocumentosRequeridos(TipoContribuyente);

            if (req.files.length < tiposRequeridos.length) {
                return res.status(400).json({
                    success: false,
                    msg: `Debe subir ${tiposRequeridos.length} documentos`
                });
            }
            
            // Validar que los documentos sean PDF
            for (const file of req.files) {
                if (file.mimetype !== 'application/pdf') {
                    return res.status(400).json({
                        success: false,
                        msg: 'Todos los documentos deben ser PDF'
                    });
                }
            }

            const uploadTimestamp = Date.now();

            const documentosGuardados = req.files.map((f, index) => {
                const nombreGuardado = `${uploadTimestamp}-${index}-${f.originalname}`;
                return {
                    tipo: tiposRequeridos[index] || 'Documento adjunto',
                    nombre: nombreGuardado,
                    nombreOriginal: f.originalname,
                    url: `${process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`}/api/proveedor/${encodeURIComponent(RazonSocial)}/documentos/${encodeURIComponent(nombreGuardado)}`
                };
            });

            console.log(`NIT: ${NIT}`);
            console.log(`Razón Social: ${RazonSocial}`);
            

            // Construir el objeto del proveedor
            // y mantener el estado como Pre-registro hasta que la empresa lo verifique
            const proveedorCompleto = {
                ...preRegistro,
                ...proveedorData,
                estado: 'Invitación_usada',
                estadoProveedor: 'Pre-registro',
                fechaRegistroCompleto: new Date().toISOString(),
                Documentos: documentosGuardados
            };

            // Actualizar en SharePoint (usuando NIT como identificador)
            const filesWithBuffers = req.files.map((f, index) => {
                const nombreGuardado = `${uploadTimestamp}-${index}-${f.originalname}`;
                return {
                    buffer: f.buffer,
                    originalname: f.originalname,
                    savedName: nombreGuardado
                };
            });
            const anioPreRegistro = process.env.PREREGISTRO_ANIO_BASE || new Date().getFullYear().toString();

            await sharePointService.saveSupplierData(proveedorCompleto, filesWithBuffers, anioPreRegistro);
            console.log('Datos guardados en SharePoint');

            // Eliminar carpeta temporal
            await sharePointService.deleteSupplierBaseFolder(token);

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
            res.status(500).json({ 
                success: false, 
                msg: error.message 
            });
        }
    },

    // Actualizar datos del proveedor (Admin/Asistente)
    actualizarProveedor: async (req, res) => {
        try {
            const { RazonSocial } = req.params;
            const  datosActualizar  = req.body;

            // Validar que el admin esté autenticado
            if(req.usuario.rol !== 'admin'){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            console.log('Actualizando proveedor en SharePoint');
            console.log(`Razón Social ${RazonSocial}`)

            // Validar que el proveedor exista
            const proveedorExistente = await sharePointService.getSupplierByRazonSocial(RazonSocial);
            if(!proveedorExistente) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que la RazonSocial no esté registrado por otro proveedor
            if (datosActualizar.RazonSocial && datosActualizar.RazonSocial !== RazonSocial) {
                const nitExistente = await sharePointService.getSupplierByRazonSocial(datosActualizar.RazonSocial);
                if (nitExistente) {
                    return res.status(400).json({
                        success: false,
                        msg: "La Razón Social ya está registrada por otro proveedor"
                    });
                }
            }

            // Validar que el correo no esté registrado por otro proveedor
            if (datosActualizar.CorreoElectronico && datosActualizar.CorreoElectronico !== proveedorExistente.CorreoElectronico) {
                const correoExistente = await sharePointService.getSupplierByEmail(datosActualizar.CorreoElectronico);
                if (correoExistente && correoExistente.RazonSocial !== razonSocial) {
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
            await sharePointService.updateSupplier(RazonSocial, updateData);

            // Obtener el proveedor actualizado (el NIT pudo haber cambiado)
            const nuevoNit = datosActualizar.RazonSocial || RazonSocial;
            const proveedorActualizado = await sharePointService.getSupplierByRazonSocial(nuevoNit);

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
            const { token } = req.params;
            let proveedorData = req.body;

            // Si los datos vienen como JSON string en 'datosProveedor'
            if (req.body.datosProveedor) {
                proveedorData = JSON.parse(req.body.datosProveedor);
            }

            // Buscar proveedor por token de actualización
            const proveedor = await sharePointService.getSupplierByUpdateToken(token);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: "Enlace inválido o expirado"
                });
            }
            const anioObjetivo = proveedor.anioActualizacionPendiente || new Date().getFullYear().toString();

            const existingDocs = proveedor.Documentos || [];

            // Leer tiposDocumentos del body (si existe)
            let tiposDocumentos = [];
            if (req.body.tiposDocumentos) {
                try {
                    tiposDocumentos = JSON.parse(req.body.tiposDocumentos);
                } catch (e) {
                    console.warn('Error al parsear tiposDocumentos:', e)
                }
            }

            const {
                NIT,
                DV,
                RazonSocial: nuevaRazonSocial, // nueva razón social si cambia
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
            } = proveedorData;

            // Usar la razón social actual si no se envía una nueva
            const razonSocialFinal = nuevaRazonSocial || proveedor.RazonSocial;

            // Validar que la Razón Social no esté registrada por otro proveedor
            if (nuevaRazonSocial && nuevaRazonSocial !== proveedor.RazonSocial) {
                const otroProveedor = await sharePointService.getSupplierByRazonSocial(nuevaRazonSocial);
                if (otroProveedor) {
                    return res.status(400).json({
                        success: false,
                        msg: "La Razón Social ya está registrada por otro proveedor"
                    });
                }
            }

            // Validar que el correo no esté registrado por otro proveedor
            if (CorreoElectronico && CorreoElectronico !== proveedor.CorreoElectronico) {
                const correoExistente = await sharePointService.getSupplierByEmail(CorreoElectronico);
                if (correoExistente && correoExistente.RazonSocial !== proveedor.RazonSocial) {
                    return res.status(400).json({
                        success: false,
                        msg: "El correo ya está registrado por otro proveedor"
                    });
                }
            }

            // Procesar nuevos archivos subidos
            let nuevosDocs = [];
            const uploadTimestamp = Date.now();
            if (req.files && req.files.length > 0) {
                nuevosDocs = req.files.map((file, index) => {
                    const nombreGuardado = `${uploadTimestamp}-${index}-${file.originalname}`;
                    // Buscar el tipo correspondiente en tiposDocumentos según el indice
                    const tipoInfo = tiposDocumentos.find(t => t.index === index);
                    const tipo = tipoInfo ? tipoInfo.tipo : 'Documento adjunto';
                    return {
                        tipo: tipo,
                        nombre: nombreGuardado,
                        nombreOriginal: file.originalname,
                        url: `${process.env.BACKEND_URL || `https://${req.get('host')}`}/api/proveedor/${proveedor.RazonSocial}/documentos/${encodeURIComponent(nombreGuardado)}`
                    };
                });
            }

            // Combinar documentos existentes + nuevos
            const todosDocs = nuevosDocs;

            // Actualizar el proveedor y cambiar estado a "Actualizado"
            const updateData = {
                NIT,
                DV,
                RazonSocial: razonSocialFinal,
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
                Documentos: todosDocs,
                estadoProveedor: "Actualizado",
                tokenActualizacion: null, // Eliminar token (uso único)
                tokenActualizacionExpiracion: null,
                fechaActualización: new Date().toISOString()
            };
            // Elimnar campos undefined
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) delete updateData[key];
            });

            const filesWithBuffers = req.files ? req.files.map((f, idx) => ({
                buffer: f.buffer,
                originalname: f.originalname,
                savedName: nuevosDocs[idx]?.nombre // usamos el nombre generado
            })) : null;
            // Actualizar en SharePoint
            await sharePointService.updateSupplier(proveedor.RazonSocial, updateData, filesWithBuffers, anioObjetivo);

            // Obtener el proveedor actualizado
            const proveedorActualizado = await sharePointService.getSupplierByRazonSocial(razonSocialFinal);

            // Enviar correo a la empresa para revisión
            try {
                await enviarCorreoRevisionEmpresa(proveedorActualizado);
                console.log('Correo de revisión enviado a la empresa')
            } catch (emailError) {
                console.error('Error al notificar a la empresa:', emailError);
            }

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
            const { razonSocial } = req.params;

            // Validar que el proveedor exista
            const proveedor = await sharePointService.getSupplierByRazonSocial(razonSocial);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            const anioObjetivo = new Date().getFullYear().toString(); // o el año siguiente
            // Generar token único
            const crypto = await import('crypto');
            const tokenActualizacion = crypto.default.randomBytes(32).toString('hex');

            
            // Actualizar el estado del proveedor a "Pendiente Actualización" y guardar el token único con expiración
            await sharePointService.updateSupplier(razonSocial, {
                tokenActualizacion: tokenActualizacion,
                estadoProveedor: "Pendiente Actualización",
                tokenActualizacionExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
                anioActualizacionPendiente: anioObjetivo
            });
            
            // Obtener el proveedor actualizado
            const proveedorActualizado = await sharePointService.getSupplierByRazonSocial(razonSocial);
            
            // Enviar correo de actualización con el enlace que incluya el token y el año
            await enviarCorreoActualizacion(proveedorActualizado.CorreoElectronico, tokenActualizacion);

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
            const { razonSocial } = req.params;
            const { comentario } = req.body;

            // Validar que el admin esté autenticado
            if(req.usuario.rol !== 'admin'){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            // Validar que el proveedor exista
            const proveedor = await sharePointService.getSupplierByRazonSocial(razonSocial);
            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    msg: "Proveedor no encontrado"
                });
            }

            // Validar que el proveedor esté en estado "Pre-registro"
            if (proveedor.estadoProveedor !== "Pre-registro" && proveedor.estadoProveedor !== 'Pendiente Actualización') {
                return res.status(400).json({
                    success: false,
                    msg: "Este proveedor no está en estado de Pre-registro o de Actualización pendiente"
                });
            }

            // Determinar el nuevo estado según el caso
            const esPreRegistro = proveedor.estadoProveedor === "Pre-registro";
            const nuevoEstado = esPreRegistro ? "Registrado" : "Actualizado";

            // Actualizar el estado del proveedor a "Actualizado"
            await sharePointService.updateSupplier(razonSocial, {
                estadoProveedor: nuevoEstado,
                comentarioAprobacion: comentario || null,
                fechaAprobacion: new Date(),
                aprobadoPor: req.usuario.nombre 
            });

            // Obtener el proveedor actualizado despúes del cambio
            const proveedorActualizado = await sharePointService.getSupplierByRazonSocial(razonSocial);

            // Enviar correo de según el caso
            if (esPreRegistro) {
                await enviarCorreoAprobacion(proveedorActualizado)
            } else {
                await enviarCorreoAprobacionActualizacion(proveedorActualizado);
            }
            

            res.status(200).json({
                success: true,
                data: proveedorActualizado,
                msg: esPreRegistro ? "Pre-registro aprobado exitosamente" : "Actualización aprobada exitosamente"
            });

        } catch (error) {
            console.error('Error al aprobar:', error);
            res.status(500).json({
                success: false,
                msg: "Error al aprobar"
            });
        }
    },

    rechazarPreRegistro: async (req, res) => {
        try {
            const { razonSocial } = req.params;
            const { comentario } = req.body;

            // Validar que el admin esté autenticado
            if(req.usuario.rol !== 'admin'){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            // Validar que el proveedor exista
            const proveedor = await sharePointService.getSupplierByRazonSocial(razonSocial);
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
            await sharePointService.updateSupplier(razonSocial, {
                estadoProveedor: "Inactivo",
                comentarioAprobacion: comentario || null,
                fechaAprobacion: new Date(),
                aprobadoPor: req.usuario.name
            });

            // Obtener el proveedor actualizado despúes del cambio
            const proveedorActualizado = await sharePointService.getSupplierByRazonSocial(razonSocial);

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
            const { razonSocial } = req.params;

            await sharePointService.deleteSupplier(razonSocial);

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