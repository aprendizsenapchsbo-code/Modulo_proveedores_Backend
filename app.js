// app.js
console.log('AZURE_CLIENT_ID:', process.env.CLIENT_ID ? '✅' : '❌');
console.log('AZURE_TENANT_ID:', process.env.TENANT_ID ? '✅' : '❌');
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
  origin: process.env.FRONTEND_URL_PRODUCCION || 'http://localhost:5173',
  credentials: true
}));

// Parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger HTTP
app.use(morgan('combined'));

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
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('Servidor Express iniciando');
    console.log('='.repeat(50));
    console.log(`Puerto ${PORT}`);
    console.log(`Base de datos SharePoint`)
    console.log(`CORS: ${process.env.FRONTEND_URL_PRODUCCION || process.env.URL_PRUEBAS}`);
    
  });
}

export default app;