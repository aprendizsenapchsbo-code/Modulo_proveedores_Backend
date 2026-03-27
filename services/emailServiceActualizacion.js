import proveedores from "../models/proveedores.js";
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

export const enviarCorreoActualizacion = async (CorreoElectronico, id) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: CorreoElectronico,
        subject: 'Actualización de datos',
        html: `<p>Por favor, utiliza el siguiente link para actualizar tus datos: ${process.env.FRONTEND_URL_PRODUCCION}/#/formulario-proveedor/${id}</p>`
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de actualización enviado: ', info.messageId);
        return {
            success: true,
            message: info.messageId
        };
    } catch (error) {
        console.error('Error al enviar el correo: ', error);
        throw error;
    }
}
