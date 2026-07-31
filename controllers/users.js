import usersServices from "../services/usersServices.js";
import crypto from 'crypto';
import { enviarCorreoBienvenidaUsuario } from "../services/emailService.js";
import jwt from 'jsonwebtoken';
import bcrypt from "bcrypt";

/* 
Controlador de Usuario

Funciones:
- Login: Autentica usuario y devuelve JWT
- createUser: Crea un nuevo usuario (admin)
- getUsers: Obtiene lista de usuarios (admin)
- updateUser: Actuliza datos del usuario
- deleteUser: Elimina un usuario (admin)
*/

const httpUser = {
    /* 
    POST: Login de usuario
    
    FLUJO:
    1. Recibe email y contraseña
    2. Busca usuario en SharePoint
    3. Valida contraseña
    4. Genera JWT
    5. Devulve token
    */
   
    login: async (req, res) => {
        try {
            const { email, password } = req.body
   
            if (!email || !password) {
                return res.status(400).json({
                   success: false,
                   msg: "Email y password son obligatorios"
                });
            }
   
            console.log('Intento de login');
            console.log(`Email: ${email}`);

           /*  // Obtener IDs necesarios
            const siteId = await usersServices.getSiteId();
            const usersFolderId = await usersServices.getUsersFolderId(siteId); */

            // Buscar usuario en SharePoint
            const usuario = await usersServices.getUserByEmail(email);
    
            if (!usuario){
                console.error('Usuario no encontrado');
                return res.status(401).json({
                    success: false,
                    msg: "Email o contraseña incorrectas"
                });
            }
            
            // Validar contraseña (comparar hash con bcrypt)
            const validarPassword = await bcrypt.compare(password, usuario.passwordHash);
            
            if (!validarPassword){
                console.error('Contraseña incorrecta');
                return res.status(401).json({
                    success: false,
                    msg: "Email o contraseña incorrectas"
                });
            }
    
            // Generar token
            const token = jwt.sign(
                {
                    _id: usuario.email, // usar email como id
                    email: usuario.email,
                    nombre: usuario.nombre,
                    rol: usuario.rol
                },
                process.env.JWT_SECRET || 'clavesupersegura',
                { expiresIn: '1h' }
            );

            console.log('Login exitoso');
    
            res.status(200).json({
                success: true,
                token,
                usuario: {
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol
                },
                msg: "Login exitoso"
            });
    
        } catch (error) {
            console.error('Error al iniciar sesión:', error.message);
            res.status(500).json({
                success: false,
                msg: "Error al iniciar sesión",
                error: error.message
            });
        }
    },

    /*
    POST: Crear nuevo usuario (solo admin)
    
    FLUJO:
    1. Valida que sea admin
    2. Valida datos requeridos
    3. Encripta contraseña
    4. Guarda usuario en SharePoint
    5. Devuelve usuario creado
     */

    createUser: async (req, res) => {
        try {
            // Verificar que el usuario sea admin
            if (req.usuario.rol !== 'admin') {
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            const {nombre, email, rol = 'usuario'} = req.body;

            // validar roles
            const rolesPermitidos = ['usuario', 'admin'];
            const rolFinal = rolesPermitidos.includes(rol) ? rol : 'usuario';

            if (!nombre || !email) {
                return res.status(400).json({
                    success: false,
                    msg: "Nombre y correo son obligatorios"
                });
            }

            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if(!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    msg: 'El email no es válido'
                });
            }

            console.log('\n Creando nuevo usuario:');
            console.log(`Email: ${email}`);
            console.log(`Nombre: ${nombre}`);
            console.log(`Rol: ${rol}`);
            
            /* // Obtener IDs necesarios
            const siteId = await usersServices.getSiteId();
            const rootFolderId = await usersServices.getRootFolderId(siteId);
            const usersFolderId = await usersServices.getOrCreateUsersFolder(siteId, rootFolderId);

            console.log('Carpetas en raíz:');
            await usersServices.listarCarpetas(siteId);

            console.log('Carpetas dentro de API Documentos Proveedores Prueba:');
            await usersServices.listarCarpetas(siteId, rootFolderId); */
            
            // Verificar que el email no exista
            if (await usersServices.getUserByEmail(email)) {
                return res.status(400).json({
                    success: false,
                    msg: "El email ya esta registrado"
                });
            }

            // Token de activación (32 bytes hex) con expiración de 24h
            const tokenActivacion = crypto.randomBytes(32).toString('hex');
            const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            // Preparar datos del usuario
            const usuarioData = {
                email,
                nombre,
                rol: rolFinal,
                passwordHash: null,
                activo: false,
                requiereActivacion: true,
                tokenActivacion,
                tokenActivacionExpiracion: expiracion,
                creadoPor: req.usuario?.email || null,
                createAt: new Date().toISOString(),
                updateAt: new Date().toISOString(),
            };

            // Guardar en SharePoint
            await usersServices.createUser(usuarioData);

            // Notificar al usuario que su cuenta fue creada
            try {
                await enviarCorreoBienvenidaUsuario({
                    email,
                    nombre,
                    tokenActivacion
                });
            } catch (mailError) {
                // No rompemos la creación si el correo falla
                console.error('El usuario se creó, pero falló el correo de bienvenida:', mailError.message);
            }

            // Devolver usuario sin la contraseña
            const { passwordHash: _, tokenActivacion: __, ...seguro } = usuarioData;

            res.status(201).json({
                success: true,
                data: seguro,
                msg: "Invitación enviada"
            });

        } catch (error) {
            console.error('Error al crear el usuario:', error.message);
            res.status(500).json({
                success: false,
                msg: "Error al crear el usuario",
                error: error.message
            });
        }       
    },

    /* Activación de usuario */
    activarCuenta: async (req, res) => {
        try {
            const { token, password } = req.body;
            if (!token || !password) {
                return res.status(400).json({
                    success: false,
                    msg: 'Token y contraseña son obligatorios'
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    msg: 'La contraseña debe tener máximo 8 caracteres'
                });
            }

            const usuario = await usersServices.getUsersByActivationToken(token);
            if(!usuario) {
                return res.status(400).json({
                    success: false,
                    msg: 'El enlace es inválido o ya fue usado'
                });
            }
            if (new Date(usuario.tokenActivacionExpiracion) < new Date()) {
                return res.status(400).json({
                    success: false,
                    msg: 'El enlace expiró. Pide uno nuevo al administrador'
                });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            await usersServices.updateUser(usuario.email, {
                passwordHash,
                activo: true,
                requiereActivacion: false,
                tokenActivacion: null,
                tokenActivacionExpiracion: null,
                updatedAt: new Date().toISOString()
            });

            res.json({
                success: true,
                msg: 'Cuenta activada. Ya puedes iniciar sesión'
            });

        } catch (error) {
            console.error('Error al activar cuenta:', error.message);
            res.status(500).json({
                success: false,
                msg: 'Error al activar la cuenta'
            });
        }
    },

    /* GET: Obtener lista de usuarios (solo admin) */

    getUsers: async (req, res) => {
        try {
            console.log('Obteniendo lista de usuarios');

            // Verificar que el usuario sea admin
            if(req.usuario.rol !== 'admin'){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            /* // Obtener IDs necesarios
            const siteId = await usersServices.getSiteId();
            const usersFolderId = await usersServices.getUsersFolderId(siteId); */

            // Obtener usuarios
            const usuarios = await usersServices.getAllUsers();

            // Remover passwordHash de cada usuario
            const usuariosSinPassword = usuarios.map(({ passwordHash, ...rest }) => rest);

            console.log(`${usuariosSinPassword.length} usuarios encontrados`);

            res.status(200).json({
                success: true,
                data: usuariosSinPassword,
                count: usuariosSinPassword.length,
                msg: 'Usuarios obtenidos exitosamente'
            });

        } catch (error) {
            console.error('Error en obtener los usuario:', error.message);
            res.status(500).json({
                success: false,
                msg: "Error al buscar los usuarios",
                error: error.message
            });
        }
    },

    /* PUT: Actualizar datos del usuario */

    updateUser: async (req, res) => {
        try {
            // El ID puede ser el mismo email del usuario
            const { email } = req.params;

            // Verificar que el usuario sea admin
            if(req.usuario.rol !== 'admin' && req.usuario.email !== email){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }

            const datosActualizar = req.body;

            console.log('Actualizando usuario:');
            console.log(`Email: ${email}`);

            /* // Obtener IDs necesarios
            const siteId = await usersServices.getSiteId();
            const usersFolderId = await usersServices.getUsersFolderId(siteId); */

            /* const usuarioSolicitante = req.usuario;
            if (usuarioSolicitante.rol !== 'admin' && usuarioSolicitante.email !== email) {
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permiso para actualizar este usuario'
                });
            } */

            // Actualizar usuario
            const usuarioActualizado = await usersServices.updateUser(
                email,
                datosActualizar
            );

            // Remover passwordHash
            const { passwordHash, ...rest } = usuarioActualizado;
            console.log('Usuario actualizado')

            res.status(200).json({
                success: true,
                data: rest,
                msg: "Usuario actualizado correctamente",
            });
            
        } catch (error) {
            console.error('Error al actualizar el usuario:', error.message),
            res.status(500).json({
                success: false,
                msg: "Error al actualizar el usuario",
                error: error.message
            });
        }
    },

    /* DELETE: Eliminar un usuario (solo admin) */
    deleteUser: async (req, res) => {
        try {
            const { email } = req.params;
            // Verificar que el usuario sea admin
            if(req.usuario.rol !== 'admin'){
                return res.status(403).json({
                    success: false,
                    msg: 'No tienes permisos para esta acción'
                });
            }
            
            console.log('Eliminando usuario');
            console.log(`Email: ${email}`)

            /* // Obtener IDs necesarios
            const siteId = await usersServices.getSiteId();
            const usersFolderId = await usersServices.getUsersFolderId(siteId); */

            // Eliminar usuario
            await usersServices.deleteUser(email);

            console.log('Usuario eliminado')

            res.status(200).json({
                success: true,
                msg: "Usuario eliminado con éxito",
            });

        } catch (error) {
            console.error('Error al eliminar el usuario:', error.message);
            res.status(500).json({
                success: false,
                msg: "Error al eliminar el usuario",
                error: error.message
            });
        }
    }
};

export default httpUser;