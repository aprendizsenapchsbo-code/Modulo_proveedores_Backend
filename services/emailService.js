import proveedores from '../models/proveedores.js';
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

    await proveedores.findOneAndUpdate(
        { CorreoElectronico },
        { tokenRegistro: token },
        { new: true }
    );

    const mailOptions = {
        from: process.env.EMAIL_PASS,
        to: CorreoElectronico,
        subject: 'Registro de proveedor',
        text: `<p>Por favor, utiliza el siguiente link para completar tu registro: ${process.env.FRONTEND_URL}/proveedor/registro/${token}</p>`
    } 

    // Enviar email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado: ', info.messageId);
        return {
            success: true,
            message: info.messageId
        };
    
    } catch (error) {
        console.error('Error al enviar el correo: ', error);
        throw error;
    }
}
