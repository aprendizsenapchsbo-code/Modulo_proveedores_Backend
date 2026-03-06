import mongoose from "mongoose";

const userEsquema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'El email es obligatorio'],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'La contraseña es obligatoria'],
        unique: true,
        trim: true
    },
    rol: {
        type: String,
        enum: ['Admin', 'Asistente Administrativo'],
    },
}, {
    timestamps: true
});

export default mongoose.model("Users", userEsquema);