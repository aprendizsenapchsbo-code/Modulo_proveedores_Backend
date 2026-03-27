import "dotenv/config"
import express from 'express';
import mongoose from 'mongoose';
import users from "./routes/users.js"
import proveedores from "./routes/proveedores.js"
import cors from "cors"

const app = express();

app.use(express.json());

app.use(cors({
    origin: "*"
}))

// 👇 Conectar a MongoDB ANTES de las rutas, fuera del app.listen
const connectDB = async () => {
    if (mongoose.connection.readyState === 0) { // 0 = desconectado
        await mongoose.connect(process.env.MONGODB_URI)
            .then(() => console.log('✅ Base de datos conectada'))
            .catch(err => console.error('❌ Error conectando DB:', err));
    }
};

connectDB(); // 👈 se ejecuta al iniciar el módulo

app.use("/api/usuario", users)
app.use("/api/proveedor", proveedores)

if (process.env.NODE_ENV !== 'production') {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Servidor escuchando en el puerto ${process.env.PORT || 3000}`);
    });
}

export default app;