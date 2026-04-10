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
            <a href="${process.env.FRONTEND_URL}/#/formulario-proveedor/${token}">
            ${process.env.FRONTEND_URL}/#/formulario-proveedor/${token}
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
    const destinatario = process.env.EMAIL_NOTIFICACION_EMPRESA || process.env.EMAIL_USER;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: destinatario,
        subject: 'Revisión de nuevo proveedor registrado',
        html: `<p>Se ha completado el registro de un nuevo proveedor.</p>
            <p><strong>Proveedor:</strong> ${proveedor.RazonSocial}</p>
            <p><strong>NIT:</strong> ${proveedor.NIT}-${proveedor.DV}</p>
            <p><strong>Correo proveedor:</strong> ${proveedor.CorreoElectronico}</p>
            <p><strong>Representante legal:</strong> ${proveedor.NombreRepresentante}</p>
            <p><strong>Responsable de facturación:</strong> ${proveedor.NombresApellidosResponsable}</p>
            <p>Por favor revise el registro y proceda con la validación.</p>
            <p>Link de administración: ${process.env.FRONTEND_URL_PRODUCCION || 'https://modulo-proveedores.vercel.app'}</p>`
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
