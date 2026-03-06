import users from "../models/users.js";
import { generarJWT } from "../middlewares/validar-jwt.js";
import bcrypt from "bcrypt";

const httpUser = {
    getUsers: async (req, res) => {
        try {
            const user = await users.find();

            res.json({
                success: true,
                data: user,
                count: user.length
            });

        } catch (error) {
            console.error('Error en obtener los usuario:', error);
            res.status(500).json({
                success: false,
                msg: "Error al buscar los usuarios"
            });
        }
    },

    createUser: async (req, res) => {
        try {
            const {nombre, email, password, rol} = req.body;

            if (!nombre || !email || !password || !rol) {
                return res.status(400).json({
                    success: false,
                    msg: "nombre, email, password y rol son obligatorios"
                });
            }

            const usuarioExistente = await users.findOne({
                $or: [{email}]
            });

            if (usuarioExistente) {
                return res.status(400).json({
                    success: false,
                    msg: "Ya existe un usuario con ese email"
                });
            }

            const user = new users({
                nombre,
                email,
                password,
                rol
            });

            const salt = bcrypt.genSaltSync(10);
            user.password = bcrypt.hashSync(password, salt);

            console.log(user.password);
            
            await user.save();

            res.status(201).json({
                success: true,
                msg: "Usuario creado con éxito",
                data: {
                    id: user._id,
                    nombre: user.nombre,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('Error al crear el usuario:', error);
            res.status(500).json({
                success: false,
                msg: "Error al crear el usuario"
            });
        }       
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    msg: "Email y password son obligatorios"
                });
            }

            const usuario = await users.findOne({email});

            if (!usuario){
                return res.status(400).json({
                    success: false,
                    msg: "Credenciales incorrectas"
                });
            }
            
            const validarPassword = bcrypt.compareSync(password, usuario.password)
            
            if (!validarPassword){
                return res.status(400).json({
                    success: false,
                    msg: "Credenciales incorrectas"
                });
            }

            const token = await generarJWT(usuario.id);

            res.json({
                success: true,
                msg: "Login exitoso",
                data: {
                    token,
                    usuario: {
                        id: usuario.id,
                        nombre: usuario.nombre,
                        email: usuario.email,
                        rol: usuario.rol
                    }
                }
            });

        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            res.status(500).json({
                success: false,
                msg: "Error al iniciar sesión"
            });
        }
    },

    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const {nombre, email, password, rol } = req.body;

            const user = await users.findById(id);

            if (!user) {
                return res.status(400).json({
                    success: false,
                    msg: "Usuario no encontrado"
                });
            }

            // evitar duplicados
            if (email) {
                const existente = await users.findOne({
                    $and: [
                        { _id: { $ne: id } },
                        { $or: [{ email }] }
                    ]
                });

                if (existente) {
                    return res.status(400).json({
                        success: false,
                        msg: "Ya existe un usuario con ese email"
                    });
                }
            }

            const datosActualizar = {};
            if(nombre) datosActualizar.nombre = nombre;
            if(email) datosActualizar.email = email;
            if(rol) datosActualizar.rol = rol;

            // encriptar contraseña si se cambia
            if (password) {
                const salt = bcrypt.genSaltSync(10);
                datosActualizar.password = bcrypt.hashSync(password, salt);
            }

            const usuarioActualizado = await users.findByIdAndUpdate(
                id,
                datosActualizar,
                { new: true, runValidators: true }
            )/* .select('-password') */;

            res.json({
                success: true,
                msg: "Usuario actualizado correctamente",
                data: usuarioActualizado
            });
            
        } catch (error) {
            console.error('Error al actualizar el usuario:', error),
            res.status(500).json({
                success: false,
                msg: "Error al actualizar el usuario"
            });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await users.findByIdAndDelete(id);

            if (!user) {
                return res.status(400).json({
                    success: false,
                    msg: "Usuario no encontrado"
                });
            }

            res.json({
                success: true,
                msg: "Usuario eliminado con éxito",
                data: {
                    id: user._id
                }
            });

        } catch (error) {
            console.error('Error al eliminar el usuario:', error);
            res.status(500).json({
                success: false,
                msg: "Error al eliminar el usuario"
            })
        }
    },
}

export default httpUser;