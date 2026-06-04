// import proveedores from '../models/proveedores.js';
// import Invitacion from '../models/invitacion.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import sharePointServices from './sharePointServices.js';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

const generarToken = () => {
    return crypto.randomBytes(30).toString('hex');
}

// Helper para construir URLs seguras
const getUrlFrontend = (ruta) => {
    const base = process.env.FRONTEND_URL_PRODUCCION || 'https://www.proveedor.pch-sbo.com/gestion-proveedores/#/';
    // Asegura que no haya doble slash // ni falte slash /
    return `${base.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`;
};

export const enviarCorreoRegistro = async (CorreoElectronico) => {

    const token = generarToken();
    console.log('Token: ', token);

    const urlFormulario = getUrlFrontend(`formulario-proveedor/${token}`);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: CorreoElectronico,
        subject: 'Pre-registro de proveedor',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Invitación de Pre-registro como Proveedor</h2>
            
            <p>Estimado(a),</p>
    
            <p>Ha sido invitado(a) a realizar su <strong>pre-registro como proveedor</strong> de PCH San Bartolomé.</p>
    
            <p style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
                Por favor complete el proceso ingresando al siguiente enlace:<br><br>
                <a href="${urlFormulario}" 
                style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Completar Pre-registro
                </a>
            </p>
    
            <p><small>${urlFormulario}</small></p>
    
            <p>Una vez finalizado, su información será evaluada para continuar con el proceso de vinculación.</p>
    
            <p><strong>Nota:</strong> Este enlace es válido por 7 días. Si presenta inconvenientes, puede responder a este correo.</p>
    
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
                Cordialmente,<br>
                <strong>PCH San Bartolomé</strong><br>
                Departamento de Proveedores
            </p>
            </div>
        `
    }

    // Enviar email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado: ', info.messageId);

        return {
            success: true,
            message: info.messageId,
            token,
            CorreoElectronico
        };
    } catch (error) {
        console.error('Error al enviar el correo: ', error);
        throw error;
    }
}

export const enviarCorreoRevisionEmpresa = async (proveedor) => {
    try {
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
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: destinatario,
        subject: '[REVISIÓN REQUERIDA] Nuevo pre-registro de proveedor',
        html:  `
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
            <a href="${process.env.FRONTEND_URL_PRODUCCION}/#/aprobacion-pre-registro" 
            style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            👉 Ir a Panel de Validación
                </a>
            </p>
    
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
            Este es un correo automático del sistema de gestión de proveedores.
            </p>
            </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de revisión enviado a:', info.messageId);
        return {
            success: true,
            message: info.messageId
        };
    } catch (error) {
        console.error('Error al enviar el correo de revisión:', error);
        throw error;
    }
}

export const enviarCorreoAprobacion = async (proveedor) => {
    try {
        if (!proveedor || !proveedor.CorreoElectronico) {
            throw new Error("Proveedor inválido");
        };
        
        const {
            RazonSocial,
            NIT,
            NombreRepresentante,
            CorreoElectronico,
        } = proveedor
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: CorreoElectronico,
            subject: 'Registro aprobado como proveedor',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">✅ ¡Registro Aprobado!</h2>
        
                <p>Estimado(a) <strong>${NombreRepresentante || 'Proveedor'}</strong>,</p>
        
                <p>Nos complace informarle que su registro como proveedor de <strong>PCH San Bartolomé</strong> ha sido <strong>aprobado exitosamente</strong>.</p>
        
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
                    <strong>PCH San Bartolomé</strong><br>
                    Departamento de Proveedores
                </p>
                </div>
            `
            };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de aprobación enviado: ', CorreoElectronico);

        return {
            success: true,
            message: info.messageId
        };
    } catch (error) {
        console.error('Error al enviar el correo de aprobación:', error.message);
        throw error;
    }
}

export const enviarCorreoRechazar = async (proveedor) => {
    try {
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

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: CorreoElectronico,
            subject: 'Resultado de pre-registro como proveedor',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d9534f;">⚠️ Pre-registro No Aprobado</h2>
        
                <p>Estimado(a) <strong>${NombreRepresentante || 'Proveedor'}</strong>,</p>
        
                <p>Le informamos que, tras la revisión de la información suministrada, su <strong>pre-registro como proveedor de PCH San Bartolomé</strong> no ha sido aprobado en esta ocasión.</p>
        
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
                    <strong>PCH San Bartolomé</strong><br>
                    Departamento de Proveedores
                </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de rechazo pre-registro enviado: ', info.messageId);
        return {
            success: true,
            message: info.messageId
        };
    } catch (error) {
        console.error('Error al enviar el correo de rechazo:', error);
        throw error;
    }
}
