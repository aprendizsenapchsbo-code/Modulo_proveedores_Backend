import mongoose from "mongoose";
import { type } from "os";

const proveedorEsquema = new mongoose.Schema({
    // Información general del proveedor
    NIT : {
        type: String,
        required: [true, 'El NIT es obligatorio'],
        unique: true,
        trim: true
    },
     RazonSocial: {
        type: String,
        required: [true, 'La razón social es obligatoria'],
        trim: true
    },
//    DireccionNotificacion: {
//         type: String,
//         required: [true, 'La dirección de notificación es obligatoria'],
//         trim: true
//     },
//     Telefono: {
//         type: String,
//         required: [true, 'El teléfono es obligatorio'],
//         trim: true
//     },
//     Ciudad: {
//         type: String,
//         required: [true, 'La ciudad es obligatoria'],
//         trim: true
//     },
    CorreoElectronico: {
        type: String,
        required: [true, 'El correo electrónico es obligatorio'],
        trim: true,
        lowercase: true
    },
    /*   NombreRepresentante: {
        type: String,
        required: [true, 'El nombre del representante legal es obligatorio'],
        trim: true
    },
    NumeroIdentificacion: {
        type: String,
        required: [true, 'El número de identificación del representante legal es obligatorio'],
        trim: true
    },
    TelefonoRepresentante: {
        type: String,
        required: [true, 'El teléfono del representante legal es obligatorio'],
        trim: true
    },
    CorreoElectronicoRepresentante: {
        type: String,
        required: [true, 'El correo electrónico del representante legal es obligatorio'],
        trim: true,
        lowercase: true
    },

    // Información de facturación
    NombresApellidosResponsable: {
        type: String,
        required: [true, 'Los nombres y apellidos del responsable de facturación son obligatorios'],
        trim: true
    },
    CorreoElectronicoResponsable: {
        type: String,
        required: [true, 'El correo electrónico del responsable de facturación es obligatorio'],
        trim: true,
        lowercase: true
    }, */
    tokenRegistro: {
        type: String,
        default: null
    }
});

export default mongoose.model("Proveedores", proveedorEsquema);