// app.js
/* console.log('AZURE_CLIENT_ID:', process.env.CLIENT_ID ? '✅' : '❌');
console.log('AZURE_TENANT_ID:', process.env.TENANT_ID ? '✅' : '❌');
console.log('SHAREPOINT_SITE_NAME:', process.env.SHAREPOINT_SITE_NAME);

import "dotenv/config"
import express from 'express';
import cors from "cors";
import morgan from "morgan";
import users from "./routes/users.js";
import proveedores from "./routes/proveedores.js";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ 
  origin: process.env.FRONTEND_URL_PRODUCCION /* || 'http://localhost:5173',
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
app.listen(PORT, () => {
  console.log('Servidor Express iniciando');
  console.log('='.repeat(50));
  console.log(`Puerto ${PORT}`);
  console.log(`Base de datos SharePoint`)
  console.log(`CORS: ${process.env.FRONTEND_URL_PRODUCCION /* ||  process.env.URL_PRUEBAS}`);
    
});

export default app; */

import "dotenv/config"
import express from 'express';
import cors from "cors";
import morgan from "morgan";
import users from "./routes/users.js";
import proveedores from "./routes/proveedores.js";

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Lista blanca de orígenes permitidos
const allowedOrigins = [
  process.env.FRONTEND_URL_PRODUCCION,
  process.env.URL_PRUEBAS,
  'https://www.proveedor.pch-sbo.com',
  'https://proveedor.pch-sbo.com',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean); // elimina undefined/null/vacíos

console.log('🌐 Orígenes permitidos por CORS:', allowedOrigins);

// 2. Opciones de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (Postman, curl, apps móviles, same-origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('❌ CORS bloqueado para origin:', origin);
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  // ⚠️ CLAVE: incluir x-token porque es un header personalizado
  allowedHeaders: ['Content-Type', 'Authorization', 'x-token']
};

// 3. Aplicar CORS
app.use(cors(corsOptions));

// Parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger HTTP
app.use(morgan('combined'));

// Ruta de salud
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
  console.log(`Base de datos SharePoint`);
  console.log(`CORS activo para: ${allowedOrigins.join(', ')}`);
});

export default app;