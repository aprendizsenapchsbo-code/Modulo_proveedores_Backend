// app.js
console.log('AZURE_CLIENT_ID:', process.env.AZURE_CLIENT_ID ? '✅' : '❌');
console.log('AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID ? '✅' : '❌');
console.log('SHAREPOINT_SITE_NAME:', process.env.SHAREPOINT_SITE_NAME);

import "dotenv/config"
import express from 'express';
/* import mongoose from 'mongoose';*/
import cors from "cors";
import morgan from "morgan";
import users from "./routes/users.js";
import proveedores from "./routes/proveedores.js";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ 
  origin: /* process.env.FRONTEND_URL_PRODUCCION ||  */'http://localhost:5173',
  credentials: true
}));

// Parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger HTTP
app.use(morgan('combined'));

/* const connectDB = async () => {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGODB_URL, {
    bufferCommands: false,
    family: 4, // 👈 fix para Vercel
    serverSelectionTimeoutMS: 10000,
  });
 
  isConnected = true;
  console.log('✅ Base de datos conectada');
}; */

// Middleware que conecta ANTES de cada request
/* app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ Error conectando DB:', err);
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
}); */

// Rutas Públicas
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    msg: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.use("/api/usuario", users);
app.use("/api/proveedor", proveedores);



// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log('Servidor Express iniciando');
  console.log('='.repeat(50));
  console.log(`Puerto ${PORT}`);
  console.log(`Base de datos SharePoint`)
  console.log(`CORS: ${/* process.env.FRONTEND_URL_PRODUCCION || */ process.env.URL_PRUEBAS}`);
  
});

export default app;