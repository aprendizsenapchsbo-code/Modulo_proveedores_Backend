import mongoose from "mongoose";

const invitacionEsquema = new mongoose.Schema({
    CorreoElectronico: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    tokenRegistro: {
        type: String,
        required: true,
        unique: true
    },
    estadoRegistro: {
        type: String,
        enum: ['pendiente', 'completado'],
        default: 'pendiente'
    }
}, { timestamps: true });

export default mongoose.model("Invitacion", invitacionEsquema);