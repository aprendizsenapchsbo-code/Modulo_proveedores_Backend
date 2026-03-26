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
 
app.use("/api/usuario", users)
app.use("/api/proveedor", proveedores)

// const URI = 'mongodb+srv://AprendizDB:Aprendiz_2026@cluster0.roars80.mongodb.net/proveedores';

// console.log('Intentando conectar...');

// mongoose.connect(URI)
//   .then(() => console.log('✅ Conectado exitosamente'))
//   .catch((err) => {
//     console.log('❌ Error:', err.message);
//     console.log('Código:', err.code);
//   });

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor escuchando en el puerto ${process.env.PORT}`);
    // console.log(process.env.MONGODB_URI)
    mongoose 
    .connect(`${process.env.MONGODB_URL}`) 
    .then(() => console.log(`Base de datos conectada`))
    .catch(err => console.error("Error conectando DB", err));
}); 