// app.js
import "dotenv/config"
import express from 'express';
import mongoose from 'mongoose';
import users from "./routes/users.js"
import proveedores from "./routes/proveedores.js"
import cors from "cors"

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Conexión cacheada para serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGODB_URL, {
    bufferCommands: false,
    family: 4, // 👈 fix para Vercel
    serverSelectionTimeoutMS: 10000,
  });
 
  isConnected = true;
  console.log('✅ Base de datos conectada');
};

// Middleware que conecta ANTES de cada request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ Error conectando DB:', err);
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

app.use("/api/usuario", users);
app.use("/api/proveedor", proveedores);

if (process.env.NODE_ENV !== 'production') {
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor escuchando en el puerto ${process.env.PORT || 3000}`);
  });
}

export default app;