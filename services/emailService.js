// import proveedores from '../models/proveedores.js';
import Invitacion from '../models/invitacion.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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
    const base = process.env.FRONTEND_URL_PRODUCCION || 'https://modulo-proveedores.vercel.app';
    // Asegura que no haya doble slash // ni falte slash /
    return `${base.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`;
};

export const enviarCorreoRegistro = async (CorreoElectronico) => {

    const token = generarToken();
    console.log('Token: ', token);


    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: CorreoElectronico,
        subject: 'Pre-registro de proveedor',
        html: `<p>Estimado(a),</p>

            <p>Ha sido invitado(a) a realizar su <strong>pre-registro como proveedor</strong>.</p>

            <p>
            Por favor complete el proceso ingresando al siguiente enlace:<br>
            <a href="${process.env.FRONTEND_URL_PRODUCCION}/#/formulario-proveedor/${token}">
            ${process.env.FRONTEND_URL_PRODUCCION}/#/formulario-proveedor/${token}
            </a>
            </p>

            <p>Una vez finalizado, su información será evaluada para continuar con el proceso de vinculación.</p>

            <p>Si presenta inconvenientes, puede responder a este correo.</p>

            <p>
            Cordialmente,<br>
            PCH San Bartolomé
            </p>`
    }

    // Enviar email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado: ', info.messageId);

        // Guardar el email si se envio exitosamente
        await Invitacion.create({
            CorreoElectronico,
            tokenRegistro: token,
        });

        return {
            success: true,
            message: info.messageId,
            token
        };
    } catch (error) {
        console.error('Error al enviar el correo: ', error);
        throw error;
    }
}

export const enviarCorreoRevisionEmpresa = async (proveedor) => {
    if (!proveedor || !proveedor._id) throw new Error("Proveedor inválido");
    const id = proveedor._id;
    const urlRevision = getUrlFrontend(`/aprobacion-pre-registro/${id}`)

    const destinatario = process.env.EMAIL_NOTIFICACION_EMPRESA || process.env.EMAIL_USER;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: destinatario,
        subject: 'Revisión de nuevo proveedor registrado',
        html:  `
            <div style="font-family: Arial, sans-serif;">
                <h3>Nuevo Proveedor Registrado</h3>
                <p>Se ha completado el pre-registro y requiere validación administrativa.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr><td style="padding: 5px; font-weight: bold;">Proveedor:</td><td>${proveedor.RazonSocial || 'N/A'}</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">NIT:</td><td>${proveedor.NIT || 'N/A'}-${proveedor.DV || '0'}</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">Rep. Legal:</td><td>${proveedor.NombreRepresentante || 'N/A'}</td></tr>
                </table>

                <p style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL_PRODUCCION}/#/aprobacion-pre-registro/${id}" 
                       style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Ir a Validar Proveedor
                    </a>
                </p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de revisión enviado: ', info.messageId);
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
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: proveedor.CorreoElectronico,
        subject: 'Registro aprobado como proveedor',
        html: `
            <p>Estimado(a) <strong>${proveedor.NombreRepresentante}</strong>,</p>

            <p>Nos complace informarle que su registro como proveedor de <strong>PCH San Bartolomé</strong> ha sido <strong>aprobado exitosamente</strong>.</p>

            <p><strong>Datos de su registro:</strong></p>
            <ul>
                <li><strong>Razón Social:</strong> ${proveedor.RazonSocial}</li>
                <li><strong>NIT:</strong> ${proveedor.NIT}</li>
                <li><strong>Estado:</strong> Registrado</li>
            </ul>

            <p>A partir de ahora hace parte de nuestra base de proveedores activos.</p>

            <p>Si tiene alguna pregunta puede responder a este correo.</p>

            <p>
            Cordialmente,<br>
            PCH San Bartolomé
            </p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de aprobación enviado: ', info.messageId);
        return {
            success: true,
            message: info.messageId
        };
    } catch (error) {
        console.error('Error al enviar el correo de aprobación:', error);
        throw error;
    }
}

export const enviarCorreoRechazar = async (proveedor) => {
        const mailOptions = {
        from: process.env.EMAIL_USER,
        to: proveedor.CorreoElectronico,
        subject: 'Resultado de pre-registro como proveedor',
        html: `
            <p>Estimado(a) <strong>${proveedor.NombreRepresentante}</strong>,</p>

            <p>Le informamos que, tras la revisión de la información suministrada, su <strong>pre-registro como proveedor de PCH San Bartolomé</strong> no ha sido aprobado en esta ocasión.</p>

            <p><strong>Motivo:</strong><br>
            ${proveedor.comentarioAprobacion}</p>

            <p><strong>Datos del pre-registro:</strong></p>
            <ul>
                <li><strong>Razón Social:</strong> ${proveedor.RazonSocial}</li>
                <li><strong>NIT:</strong> ${proveedor.NIT}</li>
                <li><strong>Estado:</strong> ${proveedor.estadoProveedor}</li>
            </ul>

            <p>Si requiere mayor información o desea realizar una nueva solicitud con los ajustes correspondientes, puede responder a este correo.</p>

            <p>
            Cordialmente,<br>
            PCH San Bartolomé
            </p>
        `
    };

    try {
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
