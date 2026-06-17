// import proveedores from "../models/proveedores.js";
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper para construir URLs seguras
const getUrlFrontend = (ruta) => {
    const base = process.env.URL_PRODUCCION || 'https://www.proveedor.pch-sbo.com/gestion-proveedores/#/' /* || 'http://localhost:5173/wp-content/themes/popularfx/vue-app/#/' */;
    return `${base.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}}`
}

// Enviar correo solicitando actualización de datos del proveedor
export const enviarCorreoActualizacion = async (CorreoElectronico, tokenActualizacion) => {
    try {
        if (!CorreoElectronico) {
            throw new Error("Email del proveedor requerido");
        }

        // Construir URL del formulario
        const urlFormulario = tokenActualizacion 
            ? getUrlFrontend(`formulario-proveedor/${tokenActualizacion}`) 
            : getUrlFrontend('formulario-proveedor');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: CorreoElectronico,
            subject: 'Solicitud para Actualización de Datos',
            html: `
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
                    ⚠️ Por favor completar esta actualización en los próximos 10 días.
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
            `
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de actualización enviado: ', CorreoElectronico);
        return {
            success: true,
            message: info.messageId,
            CorreoElectronico
        };
    } catch (error) {
        console.error('Error al enviar el correo: ', error);
        throw error;
    }
}
