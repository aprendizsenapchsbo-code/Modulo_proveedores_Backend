import nodemailer from 'nodemailer';
import { getUrlFrontend } from '../utils/urlHelper.js';
import authService from './authService.js';
import axios from 'axios';
// import sharePointServices from './sharePointServices.js';

// Si EMAIL_PROVIDER=graph, usa Graph API; de lo contrario, SMPT (por defecto)
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp'

// Configurar el transporter SMTP (solo si se usa)
let transporter = null;
if (EMAIL_PROVIDER === 'smtp') {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 465,
        secure: process.env.EMAIL_SECURE || 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

// Función interna para enviar correos (se unifica SMTP y Graph)
async function sendEmail(to, subject, htmlBody, from = null) {
    const formAddress = from || process.env.EMAIL_USER || process.env.MAIL_FROM;

    if (EMAIL_PROVIDER === 'graph') {
        // Usar Microsoft Graph API
        const token = await authService.getAccessToken();
        const url = `https://graph.microsoft.com/v1.0/users/${formAddress}/sendMail`;

        const message = {
            message: {
                subject,
                body: { contentType: 'HTML', content: htmlBody },
                toRecipients: [{ emailAddress: { address: to } }]
            },
            saveToSentItems: true
        };
        await axios.post(url, message, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Correo enviado a ${to} (Graph)`);
    } else {
        // Usar SMTP (nodemailer)
        if (!transporter) {
            throw new Error('Transporter SMTP no configurado');
        }
        const mailOptions = {
            from: formAddress,
            to,
            subject,
            html: htmlBody
        };
        const info = await transporter.sendEmail(mailOptions);
        console.log(`Correo enviado a ${to} (SMTP)`, info.message)
    }
}

/* Funciones para enviar correo especificos */
export const enviarCorreoRegistro = async (CorreoElectronico, token) => {
    console.log('Token: ', token);
    if (!token) {
        throw new Error('Token es requerido para el pre-registro')
    }

    const urlFormulario = getUrlFrontend(`formulario-proveedor/${token}`);

    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Invitación de Pre-registro como Proveedor</h2>
            
            <p>Estimado(a),</p>
    
            <p>Ha sido invitado(a) a realizar su <strong>pre-registro como proveedor</strong> de PCH San Bartolomé S.A.S E.S.P.</p>
    
            <p style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
                Por favor complete el proceso ingresando al siguiente enlace:<br><br>
                <a href="${urlFormulario}" 
                style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Completar Pre-registro
                </a>
            </p>
    
            <p><small>${urlFormulario}</small></p>
    
            <p>Una vez finalizado, su información será evaluada para continuar con el proceso de vinculación.</p>
    
            <p><strong>Nota:</strong> Este enlace es válido por 15 días. Si presenta inconvenientes, puede responder a este correo.</p>
    
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
                Cordialmente,<br>
                <strong>PCH San Bartolomé S.A.S E.S.P.</strong><br>
            </p>
            </div>
        `;
    await sendEmail(CorreoElectronico, 'Pre-registro de proveedor', html);
}

export const enviarCorreoRevisionEmpresa = async (proveedor) => {
    if (!proveedor || !proveedor.RazonSocial) {
        throw new Error("Proveedor inválido");
    };

    const {
        RazonSocial,
        NIT,
        DV,
        NombreRepresentante,
        CorreoElectronico,
        Telefono
    } = proveedor

    const destinatario = process.env.EMAIL_NOTIFICACION_EMPRESA || process.env.EMAIL_USER;
    const urlAprobacion = getUrlFrontend(`aprobacion-pre-registro/${encodeURIComponent(RazonSocial)}`);

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d9534f;">⚠️ Nuevo Proveedor Registrado - Revisión Requerida</h2>
            
            <p>Un proveedor ha completado su pre-registro y requiere validación administrativa.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9f9f9;">
            <tr style="background-color: #f0f0f0;">
            <td style="padding: 10px; font-weight: bold; width: 30%; border: 1px solid #ddd;">Razón Social:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${RazonSocial || 'N/A'}</td>
                </tr>
                <tr>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">NIT:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${NIT || 'N/A'}-${DV || '0'}</td>
                </tr>
                <tr style="background-color: #f0f0f0;">
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Representante:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${NombreRepresentante || 'N/A'}</td>
                </tr>
                <tr>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Email:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${CorreoElectronico || 'N/A'}</td>
                </tr>
                <tr style="background-color: #f0f0f0;">
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Teléfono:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${Telefono || 'N/A'}</td>
                </tr>
            </table>
            
            <p style="text-align: center; margin: 20px 0;">
            <a href="${urlAprobacion}" 
            style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            👉 Ir a Panel de Validación
                </a>
            </p>
    
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
            Este es un correo automático del sistema de gestión de proveedores.
            </p>
            </div>
            `;
    await sendEmail(destinatario, '[REVISIÓN REQUERIDA] Nuevo pre-registro de proveedor', html);
};

export const enviarCorreoAprobacion = async (proveedor) => {
    if (!proveedor || !proveedor.CorreoElectronico) {
        throw new Error("Proveedor inválido");
    };

    const {
        RazonSocial,
        NIT,
        NombreRepresentante,
        CorreoElectronico,
    } = proveedor

    const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">✅ ¡Registro Aprobado!</h2>
        
                <p>Estimado(a) <strong>${NombreRepresentante || 'Proveedor'}</strong>,</p>
        
                <p>Nos complace informarle que su registro como proveedor de <strong>PCH San Bartolomé S.A.S E.S.P.</strong> ha sido <strong>aprobado exitosamente</strong>.</p>
        
                <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <strong style="color: #155724;">Datos de su registro:</strong>
                    <ul style="color: #155724; margin: 10px 0;">
                    <li><strong>Razón Social:</strong> ${RazonSocial || 'N/A'}</li>
                    <li><strong>NIT:</strong> ${NIT || 'N/A'}</li>
                    <li><strong>Estado:</strong> <span style="background-color: #28a745; color: white; padding: 2px 8px; border-radius: 3px;">Registrado</span></li>
                    </ul>
                </div>
        
                <p>A partir de ahora hace parte de nuestra base de proveedores activos y podrá participar en los procesos de compra.</p>
        
                <p style="color: #666; font-size: 14px;">
                    Si tiene alguna pregunta o necesita actualizar su información, puede responder a este correo o contactar directamente al departamento de proveedores.
                </p>
        
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">
                    Cordialmente,<br>
                    <strong>PCH San Bartolomé S.A.S E.S.P.</strong><br>
                </p>
                </div>
            `;
    await sendEmail(CorreoElectronico, 'Registro aprobado como proveedor', html);
};

export const enviarCorreoAprobacionActualizacion = async (proveedor) => {
    try {
        const { RazonSocial, NIT, NombreRepresentante, CorreoElectronico } = proveedor;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">✅ ¡Actualización Aprobada!</h2>
                    
                    <p>Estimado(a) <strong>${NombreRepresentante || 'Proveedor'}</strong>,</p>
                    
                    <p>Le informamos que la <strong>actualización de sus datos</strong> como proveedor de <strong>PCH San Bartolomé S.A.S E.S.P.</strong> ha sido <strong>aprobada exitosamente</strong>.</p>
                    
                    <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <strong style="color: #155724;">Datos actualizados:</strong>
                        <ul style="color: #155724; margin: 10px 0;">
                            <li><strong>Razón Social:</strong> ${RazonSocial || 'N/A'}</li>
                            <li><strong>NIT:</strong> ${NIT || 'N/A'}</li>
                            <li><strong>Estado:</strong> <span style="background-color: #28a745; color: white; padding: 2px 8px; border-radius: 3px;">Actualizado</span></li>
                        </ul>
                    </div>
                    
                    <p>Su información ha sido actualizada correctamente y se encuentra vigente.</p>
                    
                    <p style="color: #666; font-size: 14px;">
                        Si tiene alguna pregunta, puede responder a este correo o contactar al departamento de proveedores.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Cordialmente,<br>
                        <strong>PCH San Bartolomé S.A.S E.S.P.</strong><br>
                    </p>
            </div>
        `;
        await sendEmail(CorreoElectronico, 'Actualización de datos aprobada', html);
        console.log('Correo de aprobación de actualización enviado a:', CorreoElectronico)
    } catch (error) {
        console.error('Error al enviar correo de aprobación de actualización:', error.message);
        throw error;
    }
};

export const enviarCorreoRechazar = async (proveedor) => {
    if (!proveedor || !proveedor.CorreoElectronico) {
        throw new Error("Proveedor inválido");
    };

    const {
        RazonSocial,
        NIT,
        NombreRepresentante,
        CorreoElectronico,
        comentarioAprobacion
    } = proveedor

    const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d9534f;">⚠️ Pre-registro No Aprobado</h2>
        
                <p>Estimado(a) <strong>${NombreRepresentante || 'Proveedor'}</strong>,</p>
        
                <p>Le informamos que, tras la revisión de la información suministrada, su <strong>pre-registro como proveedor de PCH San Bartolomé S.A.S E.S.P.</strong> no ha sido aprobado en esta ocasión.</p>
        
                <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d9534f;">
                    <strong style="color: #721c24;">Motivo del rechazo:</strong>
                    <p style="color: #721c24; margin: 10px 0;">
                    ${comentarioAprobacion || 'No se especificó un motivo. Por favor contacte con el departamento de proveedores.'}
                    </p>
                </div>
        
                <strong>Datos de su pre-registro:</strong>
                <ul style="margin: 10px 0;">
                    <li><strong>Razón Social:</strong> ${RazonSocial || 'N/A'}</li>
                    <li><strong>NIT:</strong> ${NIT || 'N/A'}</li>
                    <li><strong>Estado:</strong> <span style="background-color: #d9534f; color: white; padding: 2px 8px; border-radius: 3px;">No Aprobado</span></li>
                </ul>
        
                <p style="margin-top: 20px;">
                    Si requiere mayor información o desea realizar una nueva solicitud con los ajustes correspondientes, puede responder a este correo y nos comunicaremos con usted.
                </p>
        
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">
                    Cordialmente,<br>
                    <strong>PCH San Bartolomé S.A.S E.S.P.</strong><br>
                </p>
                </div>
            `;
    await sendEmail(CorreoElectronico, 'Resultado de pre-registro como proveedor', html);
};

export const enviarCorreoActualizacion = async (CorreoElectronico, tokenActualizacion) => {
    if (!CorreoElectronico) {
        throw new Error("Email del proveedor requerido");
    }

    if (!tokenActualizacion) {
        throw new Error('Token de actualización es requerido');
    }

    const urlFormulario = getUrlFrontend(`formulario-proveedor/${tokenActualizacion}`);
    const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">📝 Actualización de Información Requerida</h2>
        
                <p>Estimado(a) Proveedor,</p>
        
                <p>Cordialmente le solicitamos que actualice la información de su registro como proveedor de <strong>PCH San Bartolomé S.A.S E.S.P</strong>.</p>
        
                <p style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
                    Por favor ingrese al siguiente enlace para actualizar sus datos:<br><br>
                    <a href="${urlFormulario}" 
                    style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Actualizar Información
                    </a>
                </p>
        
                <p><small style="color: #666;">${urlFormulario}</small></p>
        
                <p><strong>¿Qué información debe actualizar?</strong></p>
                <ul style="color: #666; line-height: 1.8;">
                    <li>Datos de contacto (teléfono, dirección, si aplica)</li>
                    <li>Información de representantes (si aplica)</li>
                    <li>Documentos requeridos</li>
                    <li>Cualquier otro dato que haya cambiado</li>
                </ul>
        
                <p style="color: #d9534f; font-weight: bold;">
                    ⚠️ Por favor completar esta actualización en los próximos 15 días.
                </p>
        
                <p style="color: #666; font-size: 14px;">
                    Si presenta inconvenientes o tiene preguntas, puede responder a este correo.
                </p>
        
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">
                    Cordialmente,<br>
                    <strong>PCH San Bartolomé</strong><br>
                </p>
                </div>
            `;
    await sendEmail(CorreoElectronico, 'Solicitud para Actualización de Datos', html);
};
