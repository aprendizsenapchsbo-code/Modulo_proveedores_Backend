import axios from "axios";
/* import fs from 'fs'
import path from "path"; */
import authService from "./authService.js";

/* Servicio para gestionar documentos en el SharePoint, se encarga de crear carpetas y de subir los documentos */

class SharePointService {
    constructor() {
        this.graphApiUrl = process.env.MICROSOFT_GRAPH_API;
        this.siteName = process.env.SHAREPOINT_SITE_NAME;
        this.driveId = process.env.SHAREPOINT_ID_SIG;
        this.basePath = process.env.SHAREPOINT_DOCUMENTOS_FOLDER; // Carpeta raiz
        this.suppliersFolder = 'Proveedores' // Subcarpeta para proveedores
    }

    // Codificar cada segmento de la ruta para evitar problemas con caracteres especiales
    encodedPath(path) {
        return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    }

    // ----------------SITIO Y DRIVE----------------
    // Obtiene el ID del sitio de SharePoint por su nombre
    async getSiteId() {
        try {
            if (this.siteId) return this.siteId;
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
                throw new Error(`No se encontró el sitio de SharePoint: ${this.siteName}`);
            }
            
            const siteId = response.data.value[0].id;
            this.siteId = siteId;
            console.log(`Id del sitio obtenido ${siteId}`);
            return siteId;
            
        } catch (error) {
            console.error('Error al obtener el ID del sitio:', error.message);
            throw error;
        }
    }

    // Obtener el ID del drive (biblioteca SIG)
    async getDriveId( driveName = 'SIG' ) {
        try {
            if (this.driveId) return this.driveId;
            const siteId = await this.getSiteId();
            const token = await authService.getAccessToken();
            const url = `${this.graphApiUrl}/sites/${siteId}/drives`;

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });

            const drive = response.data.value.find(d => d.name === driveName);
            if (!drive) {
                throw new Error(`Biblioteca "${driveName}" no encontrada`);
            }
            this.driveId = drive.id;
            console.log(`ID del drive obtenido: ${this.driveId}`);
            return this.driveId;

        } catch (error) {
            console.error('Error al obtener el ID del drive:', error.message);
            throw error;
        }
    }

    // --------------CARPETAS-------------------

    // Crear carpetas anidadas: API Documentos Proveedores Prueba > Proveedores
    async ensureFolder(folderPath) {
        try {
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const parts = folderPath.split('/');
            let current = '';

            for (const part of parts){
                current = current ? `${current}/${part}` : part;
                const encoded = this.encodedPath(current)
                const folderUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encoded}`;
                try {
                    await axios.get(folderUrl, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                } catch (err) {
                    if (err.response && err.response.status === 404) {
                        // Crear la carpeta
                        await axios.patch(folderUrl, {
                            name: part,
                            folder: {},
                            '@microsoft.graph.conflictBehavior': 'fail'
                        }, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        console.log(`Carpeta creada: ${current}`);
                    } else throw err;
                }
            }

        } catch (error) {
            console.error('Error al crear carpeta en SharePoint:', error.message);
            throw error;
        }
    }
    
    // Obtener el ID de la carpeta
    async getFolderId(folderPath) {
        try {
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            
            const encoded = this.encodedPath(folderPath);
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encoded}`;

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response) {
                throw new Error(`No se encontró la carpeta: ${folderPath}`);
            }
            return response.data.id;;
            
        } catch (error) {
            console.error('Error al obtener el ID de la carpeta raiz:', error.message);
            throw error;
        }
    }

    // ------------------PROVEEDORES------------------
    // Obtener el ID de la subcarpeta "Proveedores"
    getSupplierFolderPath(razonSocial) {
        const sanitized = razonSocial.toString().replace(/[^a-zA-Z0-9]/g, '_');
        return `${this.basePath}/${this.suppliersFolder}/Proveedor_${sanitized}`;
    }

    /* getSupplierJsonPath(identifier) {
        return `${this.getSupplierFolderPath(identifier)}/datos_proveedor.json`;
    } */
    
    // Leer el archivo JSON de metadata dentro de una carpeta de proveedor
    async saveSupplierData(supplierData, files = null) {
        // Usar Razón Social como identificador principal
        let identifier = supplierData.RazonSocial || supplierData.tokenRegistro;

        if (!identifier) identifier = supplierData.NIT;
        if (!identifier) identifier = supplierData.tokenRegistro;
        if (!identifier) identifier = 'Proveedor';

        const folderPath = this.getSupplierFolderPath(identifier);
        await this.ensureFolder(folderPath);

        const siteId = await this.getSiteId();
        const driveId = await this.getDriveId();
        const token = await authService.getAccessToken();

        // Guardamdo el JSON
        const jsonPath = `${folderPath}/datos_proveedor.json`;
        const encodedJson = this.encodedPath(jsonPath);
        const jsonUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedJson}:/content`;

        await axios.put(jsonUrl, JSON.stringify(supplierData, null, 2), {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Subir documentos desde buffers
        if (files && Array.isArray(files) && files.length > 0) {
            for (const file of files) {
                const fileName = file.savedName;
                const filePathUrl = `${folderPath}/${fileName}`;
                const encodedFile = this.encodedPath(filePathUrl);
                const fileUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedFile}:/content`;

                await axios.put(fileUrl, file.buffer, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/octet-stream'
                    }
                });
                console.log(`Documento subido ${fileName}`)
            }
        }
        return { succes: true, folderPath };
    }

    // Obtener todos los proveedores (recorre todas las carpetas y lee los JSON)
    async getAllSuppliers() {
        try {
            const supplierBase = `${this.basePath}/${this.suppliersFolder}`;
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();

            const folderId = await this.getFolderId(supplierBase);
            const childrenUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/items/${folderId}/children`;

            const response = await axios.get(childrenUrl, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            const proveedores = [];
            for (const item of response.data.value) {
                if (item.folder) {
                    const jsonPath = `${supplierBase}/${item.name}/datos_proveedor.json`;
                    try {
                        const encodedJson = this.encodedPath(jsonPath);
                        const jsonUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedJson}`;

                        const contentRes = await axios.get(`${jsonUrl}:/content`, {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });
                        console.log('Proveedor encontrado:'), {
                            CorreoElectronico: contentRes.data.CorreoElectronico,
                            tokenRegistro: contentRes.data.tokenRegistro,
                            NIT: contentRes.data.NIT
                        }

                        proveedores.push(contentRes.data);
                    } catch (err) {
                        console.warn(`No se pudo leer JSON en ${item.name}:`, err.message);
                    }
                }
            }
            return proveedores;
            
        } catch (error) {
            console.error('Error al obtener todos los proveedores:', error.message);
            throw error;
        }
    }
    
    // Obtener un proveedor por su Razón Social (buscando la carpeta que coincida)
    async getSupplierByRazonSocial(razonSocial) {
        try {
            const folderPath = this.getSupplierFolderPath(razonSocial);
            const jsonPath = `${folderPath}/datos_proveedor.json`;
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const encoded = await this.encodedPath(jsonPath);
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encoded}`;

            try {
                const contentRes = await axios.get(`${url}:/content`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                return contentRes.data;
            } catch (err) {
                if (err.response?.status === 404) {
                    return null;
                }
                throw err;
            }

        } catch (error) {
            console.error('Error al obtener el proveedor por su NIT:', error.message);
            return null;
        }
    }
    
    async downloadFile(razonSocial, fileName) {
        const folderPath = this.getSupplierFolderPath(razonSocial);
        const filePath = `${folderPath}/${fileName}`;
        const siteId = await this.getSiteId();
        const driveId = await this.getDriveId();
        const token = await authService.getAccessToken();
        const encoded = await this.encodedPath(filePath)
        const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encoded}:/content`;
        console.log('🔍 URL de descarga:', url);

        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            responseType: 'arraybuffer'
        });
        return response.data;
    }

    // Obtener el ID de la carpeta 'API Documentos Proveedores Prueba'
    /* async getDocumentsFolderId(siteId) {
        try {
            const token = await authService.getAccessToken();
            
            const response = await axios.get(
                `${this.graphApiUrl}/sites/${siteId}/drive/root/children?$filter=name eq '${this.documentsFolder}'`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.data.value || response.data.value.length === 0) {
                throw new Error(`No se encontró la carpeta: ${this.documentsFolder}`);
            }
            
            const folderId = response.data.value[0].id;
            console.log(`Carpeta de documentos encontrada: ${folderId}`);
            return folderId;
            
        } catch (error) {
            console.error('Error al obtener la carpeta de documentos:', error.message);
            throw error;
        }
    } */

    // Verificar que la carpeta del proveedor ya exista
    async getSupplierByToken(token) {
        console.log(`Buscando token: ${token}`)
        const all = await this.getAllSuppliers();
        console.log('Proveedores encontrados:', all.length);

        const found = all.find(s => {
            console.log(`Comparando con: ${s.tokenRegistro}`)
            return s.tokenRegistro === token
        });
        if (!found) {
            console.log('Token no encontrado entre todos los proveedores');
        } else {
            console.log('Token encontrado');
        }
        return found;
    }

    // Servicio para encontrar el token que va en el link magico al solicitar actualización al proveedor
    async getSupplierByUpdateToken(token) {
        console.log(`buscando token de actualización: ${token}`);
        const todosProveedores = await this.getAllSuppliers();
        
        const found = todosProveedores.find(s => 
            s.tokenActualizacion === token
        );

        if (found) {
            // Opcional: verificar que el token no haya expirado
            if (found.tokenActualizacionExpiracion && new Date(found.tokenActualizacionExpiracion) < new Date()){
                console.log('Token expirado');
                return null
            }
            console.log('Token encontrado');
            return found
        }
        console.log('Token no encontrado');
        return null;
    }

    async getSupplierByEmail(email) {
        const normalizedEmail = email.toLowerCase();
        console.log(`Buscando email: ${normalizedEmail}`)
        const all = await this.getAllSuppliers();
        console.log('Proveedores encontrados:', all.length);

        const found = all.find(e =>  e.CorreoElectronico?.toLowerCase() === normalizedEmail );
        if (!found) {
            console.log('Email no encontrado entre todos los proveedores');
        } else {
            console.log('Email encontrado');
        }
        return found;
    }

    async updateSupplier(razonSocial, updateData, files = null) {
        try {
            const existing = await this.getSupplierByRazonSocial(razonSocial);
    
            if (!existing) {
                throw new Error(`Proveedor con Razón Social ${razonSocial} no encontrado`);
            }
    
            const merged = { ...existing, ...updateData, updateAt: new Date().toISOString() };
            return await this.saveSupplierData(merged, files);
        } catch {
            console.error('Error no se pudo actualizar el proveedor:', error.message)
            throw error
        }
    }

    async deleteSupplier(razonSocial) {
        try {
            const folderPath = this.getSupplierFolderPath(razonSocial);
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const encoded = await this.encodedPath(folderPath);
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encoded}`;

            await axios.delete(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log(`Proveedor eliminado: ${razonSocial}`)
        } catch (error) {
            console.log('Error al eliminar el proveedor:', error.message);
            throw error;
        }
    }

    async deleteSupplierFolder(razonSocial) {
        const folderPath = this.getSupplierFolderPath(razonSocial);
        const siteId = await this.getSiteId();
        const driveId = await this.getDriveId();
        const token = await authService.getAccessToken();
        const encoded = this.encodedPath(folderPath);
        const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encoded}`;

        await axios.delete(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log(`Carpeta eliminada: ${folderPath}`);
    }
}

export default new SharePointService();