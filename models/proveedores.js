import mongoose from "mongoose";

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
   DireccionNotificacion: {
        type: String,
        required: [true, 'La dirección de notificación es obligatoria'],
        trim: true
    },
    Telefono: {
        type: String,
        required: [true, 'El teléfono es obligatorio'],
        trim: true
    },
    Ciudad: {
        type: String,
        required: [true, 'La ciudad es obligatoria'],
        trim: true
    },
    CorreoElectronico: {
        type: String,
        required: [true, 'El correo electrónico es obligatorio'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'El correo no es válido']
    },
    NombreRepresentante: {
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
    },
    TipoContribuyente: {
        type: String,
        enum: ['Persona Natural', 'Persona Jurídica'],
        required: [true, 'El tipo de contribuyente es obligatorio'],
        default: 'Persona Jurídica'
    },
    AutorizaDatosPersonales: {
        type: Boolean,
        required: [true, 'La autorización de datos personales es obligatoria']
    },
    AutorizaConflictos: {
        type: Boolean,
        required: [true, 'La autorización de conflictos e intereses es obligatoria']
    },
    Documentos: {
        type: [
            {
                tipo: {
                    type: String,
                    required: [true, 'El tipo de documento es obligatorio'],
                    trim: true
                },
                nombre: {
                    type: String,
                    required: [true, 'El nombre del documento es obligatorio'],
                    trim: true
                },
                url: {
                    type: String,
                    required: [true, 'La URL o ruta del documento es obligatoria'],
                    trim: true
                }
            }
        ],
        validate: {
            validator: function(value) {
                return Array.isArray(value) && value.length > 0;
            },
            message: 'Debe ingresar al menos un documento'
        }
    },
    estadoProveedor: {
        type: String,
        enum: ['Pre-registro', 'Registrado', 'Actualizado', 'Pendiente Actualización', 'Inactivo'],
        default: 'Pre-registro'
    },
}, { timestamps: true });

export default mongoose.model("Proveedores", proveedorEsquema);