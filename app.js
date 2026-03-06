import "dotenv/config"
import express from 'express';
import mongoose from 'mongoose';
import users from "./routes/users.js"
import cors from "cors"

const app = express();

app.use(express.json());

app.use(cors({
    origin: "*"
}))

app.use("/api/usuario", users)

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor escuchando en el puerto ${process.env.PORT}`);
    mongoose
    .connect(`${process.env.MONGODB_URI}`)
    .then(() => console.log(`Base de datos conectada`))
    .catch(err => console.error("Error conectando DB", err));
});