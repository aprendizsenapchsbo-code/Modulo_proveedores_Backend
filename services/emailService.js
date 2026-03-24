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
        subject: 'Registro de proveedor',
        html: `<p>Por favor, utiliza el siguiente link para completar tu registro: ${process.env.FRONTEND_URL}/#/formulario-proveedor/${token}</p>`
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
