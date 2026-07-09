import axios from "axios";
import authService from "./authService.js";
import { token } from "morgan";

/*
Servicio de Usuarios en SharePoint

Las funciones que se implementan son:
- Almacenamiento de usuario en SharePoint
- Autenticación de usuarios
- Creación y actualización de usuario
- Búsqueda de usuarios
 */

class UsersService {
    constructor() {
        this.graphApiUrl = process.env.MICROSOFT_GRAPH_API;
        this.siteName = process.env.SHAREPOINT_SITE_NAME;
        this.driveId = process.env.SHAREPOINT_ID_SIG;
        this.basePath = process.env.SHAREPOINT_DOCUMENTOS_FOLDER; // Carpeta raiz
        this.usersFolder = 'Usuarios'; // Carpeta para almacenar los usuarios
    }

    // Codificar cada segmento de la ruta para evitar problemas con caracteres especiales
    encodedPath(path) {
        return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    }

    // ------------SITIO Y DRIVE----------------

    // Obtiene el ID del sitio de SharePoint
    async getSiteId() {
        try {
            if (this.siteId) return this.siteId; // Cacheamos el siteId para evitar múltiples llamadas
            const token = await authService.getAccessToken();

            const response = await axios.get(
                `${this.graphApiUrl}/sites?search=${this.siteName}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.data.value || response.data.value.length === 0) {
                throw new Error(`No se encontró el sitio SharePoint: ${this.siteName}`);
            }
            
            const siteId = response.data.value[0].id;
            this.siteId = siteId; // Guardamos el siteId para futuras llamadas
            console.log('ID del sitio obtenido: ' + siteId);
            return siteId;
        } catch (error) {
            console.error('Error al obtener ID del sitio:', error.message);
            throw error;
        }
    }

    // Consultar driveId de la biblioteca SIG
    async getDriveId( driveName = 'SIG') {
        try {
            if (this.driveId) return this.driveId;
            // Si no está en variables de entorno, se busca por nombre
            const siteId = await this.getSiteId();
            const token = await authService.getAccessToken();
            const url = `${this.graphApiUrl}/sites/${siteId}/drives`;
            
            const response = await axios.get(url,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const drive = response.data.value.find(d => d.name === driveName);
            if (!drive) {
                throw new Error(`Biblioteca "${driveName}" no encontrada`);
            }
            this.driveId = drive.id; // Guardamos el driveId para futuras llamadas
            console.log('ID del drive obtenido: ' + this.driveId);
            return drive.id;

        } catch (error) {
            console.error('Error al obtener ID del drive:', error.message);
            throw error;
        }
    }

    /* async diagnosticarEstructura(siteId) {
        console.log("DIAGNOSTICO DE CARPETAS EN SHAREPOINT");
        await this.explorarTodo(siteId);
    }

    async explorarTodo(siteId, parentId = null, nivel = 0) {
        const token = await authService.getAccessToken();
        const url = parentId 
            ? `${this.graphApiUrl}/sites/${siteId}/drive/items/${parentId}/children`
            : `${this.graphApiUrl}/sites/${siteId}/drive/root/children`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        for (const item of res.data.value) {
            if (item.folder) {
                console.log(`${'  '.repeat(nivel)}📁 ${item.name}`);
                await this.explorarTodo(siteId, item.id, nivel + 1);
            } else {
                console.log(`${'  '.repeat(nivel)}📄 ${item.name}`);
            }
        }
    } */
    
    /* // METODO TEMPORAL para listar toda la jerarquia
    async explorarHastaEncontrar(siteId, nombreBuscado, parentId = null, nivel = 0) {
        const token = await authService.getAccessToken();
        const url = parentId
            ? `${this.graphApiUrl}/sites/${siteId}/drive/items/${parentId}/children`
            : `${this.graphApiUrl}/sites/${siteId}/drive/root/children`;
    
        const res = await axios.get(url,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        
        for (const item of res.data.value) {
            if (item.folder) {
                console.log(`${'  '.repeat(nivel)}- ${item.name} (ID: ${item.id})`);
                if (item.name === nombreBuscado) {
                    console.log(`Encontrado en nivel ${nivel}`);
                    return item.id;
                }
                const encontrado = await this.explorarHastaEncontrar(siteId, nombreBuscado, item.id, nivel + 1);
                if (encontrado) return encontrado;
            }
        }
        return null;
    } */

    /* // Obtener el ID de la carpeta raiz "API Documentos Proveedores Prueba"
    async getRootFolderId(siteId, driveId) {
        
        const folderPath = this.rootFolder;
        const encodedPath = folderPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedPath}`;
        const token = await authService.getAccessToken();

        try {
            const response = await axios.get(url,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response) {
                throw new Error(`No se encontró la carpeta: ${folderPath}`);
            }

            console.log(`Carpeta raíz encontrada: ${folderPath}`);
            return response.data.id;
            
        } catch (error) {
            console.error('Error al obtener la carpeta raíz:', error.message);
            throw error;
        }
    } */

        // ----------CARPETAS-----------

    // Método auxiliar para crear carpetas anidadas
    async ensureFolder(folderPath) {
        const siteId = await this.getSiteId();
        const driveId = await this.getDriveId();
        const token = await authService.getAccessToken();
        const parts = folderPath.split('/');
        let currentPath = '';

        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const folderUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${currentPath}`;
            try {
                await axios.get(folderUrl, 
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
            } catch (err) {
                if (err.response?.status === 404) {
                    // Crear carpeta
                    await axios.patch(folderUrl, {
                        name: part,
                        folder: {},
                        '@microsoft.graph.conflictBehavior': 'fail'
                    }, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                    );
                    console.log(`Carpeta creada: ${currentPath}`);
                } else throw err;
            }
        }
    }

    // Obtener el ID de la carpeta
    async getFolderId(folderPath) {
        try {
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();

            const encodedPath = this.encodedPath(folderPath);
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedPath}`;

            const res = await axios.get(url,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!res) {
                throw new Error(`No se encontró la carpeta: ${folderPath}`);
            }
            return res.data.id;
            
        } catch (error) {
            console.error('Error al obtener el ID de la carpeta:', error.message);
            throw error;
        }
    }

    /* // Crear carpeta de usuario si no existe
    async getOrCreateUsersFolder(siteId, rootFolderId) {
        try {
        const token = await authService.getAccessToken();
        const folderName = this.usersFolder; // Usuarios
        const url = `${this.graphApiUrl}/sites/${siteId}/drive/items/${rootFolderId}/children?$filter=name eq '${folderName}'`;
        
        const response = await axios.get(url,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    // 'Content-Type': 'application/json'
                }
            }
        );

        const usersFolder = response.data.value?.find(item => item.name === folderName && item.folder);
        if (usersFolder) return usersFolder.id;

        // Crear la carpeta Usuarios
        const createRes = await axios.post(
            `${this.graphApiUrl}/sites/${siteId}/drive/items/${rootFolderId}/children`, {
                name: folderName,
                folder: {},
                '@microsoft.graph.conflictBehavior': 'fail'
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
    
        console.log(`Carpeta ${folderName} creada`);
        return createRes.data.id;
        } catch (error) {
            console.error('Error al crear la carpeta de usuarios:', error.message);
            throw error
        }
    } */

    /* // METODO TEMPORAL PARA MIRAR CUANTAS CARPETAS HAY
    async listarCarpetas(siteId, parentFolderId = null) {
        try {
            const token = await authService.getAccessToken();

            const url = parentFolderId
                ? `${this.graphApiUrl}/sites/${siteId}/drive/items/${parentFolderId}/children`
                : `${this.graphApiUrl}/sites/${siteId}/drive/root/children`;

                const response = await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Carpetas encontradas:');
                response.data.value.forEach(item => {
                    if(item.folder) {
                        console.log(`- ${item.name} (ID: ${item.id})`);
                    }
                });

                return response.data.value.filter(item => item.folder)
        } catch (error) {
            console.error('Error al listar las carpetas:', error.message);
            throw error;
        }
    } */
    
    /* // Obtiene el ID de la carpeta de usuarios
    async getUsersFolderId(siteId, rootFolderId) {
        try {
            const token = await authService.getAccessToken();
            
            const response = await axios.get(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${rootFolderId}/children?$filter=name eq '${this.usersFolder}'`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.data.value || response.data.value.length === 0) {
                throw new Error(`No se encontró la carpeta: ${this.userFolder}`);
            }

            const userFolderId = response.data.value[0].id;
            console.log('Carpeta de usuarios encontrada');
            return userFolderId;
        } catch (error) {
            console.error('Error al obtener carpeta de usuarios:', error.message);
            throw error;
        }
    }
 */
    // ------------USUARIOS---------------

    // Busca un usuario por email en SharePoint
    async getUserByEmail(email) {
        try {
            const usersFolderPath = `${this.basePath}/${this.usersFolder}`;
            const emailLower = email.toLowerCase();
            const fileName = `${emailLower.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            const filePath = `${usersFolderPath}/${fileName}`;
            const encodedPath = this.encodedPath(filePath);
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedPath}`;
            console.log("Buscando usuario en:", url);
            

            const response = await axios.get(url,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Usuario encontrado en SharePoint');
            
            const contentRes = await axios.get(`${url}:/content`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );
            
            return contentRes.data;
        } catch (error) {
            console.error('Error al obtener el usuario:', error.message?.status, error.response?.data);
            if (error.response?.status === 404) {
                return null; // Usuario no encontrado
            }
            throw error;
        }
    }

    // Crea un archivo JSON con los datos del usuario
    async createUser(userData) {
        try {
            const usersFolderPath = `${this.basePath}/${this.usersFolder}`;
            await this.ensureFolder(usersFolderPath);
            // Crear nombre de archivo único basado en email
            const fileName = `${userData.email.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            const filePath = `${usersFolderPath}/${fileName}`;
            const encodedPath = this.encodedPath(filePath);
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedPath}:/content`;
            console.log("Usuario creado en: ", url);
            
            // Convertir los datos en JSON
            const jsonContent = JSON.stringify(userData, null, 2);
            
            const response = await axios.put(url,
                jsonContent,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`Usuario creado: ${userData.email}`);
            return response.data;
            
        } catch (error) {
            console.error('Error al crear el usuario:', error.message);
            throw error
        }
    }
    
    // Obtiene todos los usuarios (para admin)
    async getAllUsers() {
        try {
            const usersFolderPath = `${this.basePath}/${this.usersFolder}`;
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const folderId = await this.getFolderId(usersFolderPath);
            const childrenUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/items/${folderId}/children`;
            
            const response = await axios.get(childrenUrl,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            const usuarios = [];
            for (const item of response.data.value || []) {
                if (item.name.endsWith('.json')) {
                    const content = await axios.get(
                        `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/items/${item.id}/content`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });
                    usuarios.push(content.data);
                }
            }
            return usuarios;
        } catch (error) {
            console.error('Error al obtener todos los usuarios:', error.message);
            throw error;
        }
    }

    // Actualizar un usuario
    async updateUser(email, updateData) {
        try {
            const usersFolderPath = `${this.basePath}/${this.usersFolder}`;
            await this.ensureFolder(usersFolderPath);
            const fileName = `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            const filePath = `${usersFolderPath}/${fileName}`;
            const encodedPath = this.encodedPath(filePath);
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedPath}`;
            
            // Buscar el archivo del usuario
            const existing = await axios.get(url,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );
            
            const contentUrl = `${url}:/content`;
            const oldContent = await axios.get(contentUrl,{
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Mezclar datos actuales con actualizaciones
            const updateUser = {
                ...oldContent.data,
                ...updateData,
                updateAt: new Date().toISOString()
            };
            
            // Actualizar archivo
            await axios.put(contentUrl, JSON.stringify(updateUser, null, 2), {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`Usuario actualizado: ${email}`);
            return updateUser;
            
        } catch (err) {
            if (err.response?.status === 404) {
                throw new Error(`Usuario no encontrado`);
            }
            throw err;
        }
    }
    /* 
    Autentica un usuario (valida email y contraseña)
    Importante Las contraseñas deben estar encriptadas en SharePoint
    */
   /* async authenticateUser(email, password) {
       try {
           console.log(`Autenticando usuario: ${email}`);
           
           // Obtener IDs necesarios
           const siteId = await this.getSiteId();
           const usersFolderId = await this.getUsersFolderId(siteId);
           
           // Obtener usuario por email
           const usuario = await this.getUserByEmail(siteId, usersFolderId, email);
           
            if (!usuario) {
                console.error('Usuario no encontrado')
                return null;
            }
            
            // Validar contraseña (debe comparar hash)
            if (usuario.password !== password) {
                console.error('Contraseña incorrecta');
                return null
            }
            
            console.log('Usuario autenticado correctamente');
            return usuario;
            
        } catch (error) {
            console.error('Error al autenticar el usuario:', error.message);
            throw error;
        }
    } */
    
   /*  // Validar si un email ya existe
    async emailExiste(siteId, usersFolderId, email) {
        try {
            const usuario = await this.getUserByEmail(siteId, usersFolderId, email);
            return usuario !== null;
        } catch (error) {
            console.error('Error al verificar email:', error.message);
            return false;
        }
    } */
    
    /* // Crear un nuevo usuario (registro)
    async registerUser(userData) {
        try {
            console.log(`Registrando nuevo usuario: ${userData.email}`);
            
            // Obtener IDs necesarios
            const rootFolderId = await this.getRootFolderId(siteId);
            const usersFolderId = await this.getOrCreateUsersFolder(siteId, rootFolderId);
            
            // Verificar que el email no exista
            const existe = await this.emailExiste(siteId, usersFolderId, userData.email);
            if(existe) {
                throw new Error('El email ya está registrado');
            }
            
            // Crear usuario
            const resultado = await this.createUser(siteId, usersFolderId, userData);
            return {
                success: true,
                user: userData,
                message: 'Usuario registrado exitosamente'
            }
        } catch (error) {
            console.error('Error al registrar nuevo usuario:', error.message);
            throw error;
        }
    } */
    
    
    
    // Eliminar un usuario
    async deleteUser(email) {
        try {
            const usersFolderPath = `${this.basePath}/${this.usersFolder}`;
            await this.ensureFolder(usersFolderPath);
            const fileName = `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            const filePath = `${usersFolderPath}/${fileName}`;
            const encodedPath = this.encodedPath(filePath);
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedPath}`;
            
            // ELiminar archivo
            await axios.delete(url,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            console.log(`Usuario eliminado: ${email}`);
            return { success: true };
            
        } catch (error) {
            console.error('Error al eliminar el usuario:', error.message);
            throw error;
        }
    }
}

export default new UsersService();