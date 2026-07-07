import axios from "axios";
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
            return response.data.id;
            
        } catch (error) {
            console.error('Error al obtener el ID de la carpeta raiz:', error.message);
            throw error;
        }
    }

    // ------------------PROVEEDORES------------------
    // Obtener el ID de la subcarpeta "Proveedores"
    getSupplierFolderPath(razonSocial, anio = null) {
        const sanitized = razonSocial.toString().trim().replace(/[^a-zA-Z0-9]/g, '_');
        const anioFolder = anio ? anio.toString() : this.getCurrentYear();
        return `${this.basePath}/${this.suppliersFolder}/Proveedor_${sanitized}/${anioFolder}`;
    }

    // Obtener el año actual (para pre-registro o creación inicial)
    getCurrentYear() {
        return new Date().getFullYear().toString();
    }

    sanitize(str) {
        return str.toString().trim().replace(/[^a-zA-Z0-9]/g, '_');
    }

    // Obtener el año mas reciente de un proveedor (para el dashboard)
    async getLatestYear(razonSocial) {
        const baseFolder = `${this.basePath}/${this.suppliersFolder}/Proveedor_${this.sanitize(razonSocial)}`;
        console.log('baseFolder:', baseFolder)
        const siteId = await this.getSiteId();
        const driveId = await this.getDriveId();
        const token = await authService.getAccessToken();
        const encoded = this.encodedPath(baseFolder);
        const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encoded}:/children`;
        try {
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const folders = response.data.value.filter(item => item.folder);
            if (folders.length === 0) return null;

            // Ordenar por nombre descendente (año mayor primero) y tomar el primero
            const years = folders.map(f => parseInt(f.name)).filter(y => !isNaN(y));
            if (years.length === 0) return null;
            return Math.max(...years).toString();

        } catch (err) {
            return null;
        }
    }
    
    // Leer el archivo JSON de metadata dentro de una carpeta de proveedor
    async saveSupplierData(supplierData, files = null, anio = null) {
        // Usar Razón Social como identificador principal
        let identifier = supplierData.RazonSocial || supplierData.tokenRegistro;

        if (!identifier) identifier = supplierData.NIT;
        if (!identifier) identifier = supplierData.tokenRegistro;
        if (!identifier) identifier = 'Proveedor';

        const anioFinal = anio || this.getCurrentYear();
        const folderPath = this.getSupplierFolderPath(identifier, anioFinal);
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
                // Validar que el archivo tenga buffer
                if (!file.buffer) {
                    console.warn(`Archivo sin buffer omitido: ${file.originalname}`);
                    continue;
                }

                // Sanitizar nombre para evitar error 400 en SharePoint
                const safeFileName = file.savedName
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // Eliminar acentos
                    .replace(/[^\w.-]/g, '_'); // Reemplazar caracteres especiales
                const filePathUrl = `${folderPath}/${safeFileName}`;
                const encodedFile = this.encodedPath(filePathUrl);
                const fileUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedFile}:/content`;
                console.log(`Ruta final del archivo: ${encodedFile}`);

                try {
                    await axios.put(fileUrl, file.buffer, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/octet-stream'
                        }
                    });
                    console.log(`Documento subido ${safeFileName}`)
                } catch (uploadErr) {
                    console.error(`Error al subir ${safeFileName}:`, uploadErr.message);
                    console.error(`Status: ${uploadErr.response?.status}`);
                    console.error(`StatusText: ${uploadErr.response?.statusText}`);
                    console.error(`Data:`, JSON.stringify(uploadErr.response?.data, null, 2));
                    console.error(`Headers:`, JSON.stringify(uploadErr.response?.headers, null, 2));
                    console.error(`URL solicitada: ${fileUrl}`);
                    console.error(`Tamaño del buffer: ${file.buffer.length} bytes`);
                    // Opcional para mirar el nombre original del documento
                    console.error(`Nombre original: ${file.originalname}`);
                }
            }
        }
        return { success: true, folderPath };
    }

    // Obtener todos los proveedores (recorre todas las carpetas y lee los JSON)
    async getAllSuppliers(limit = 0, skipToken = null) {
        try {
            console.log('skipToken recibido:', skipToken)
            const supplierBase = `${this.basePath}/${this.suppliersFolder}`;
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const encodedPath = this.encodedPath(supplierBase);
            
            let url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedPath}:/children?$top=${limit}`;
            if (skipToken) {
                url += `&$skiptoken=${skipToken}`;
            }
    
            console.log('URL a Graph:', url)
            // const folderId = await this.getFolderId(supplierBase);

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log('@odata.nextLink en respuesta:', response.data['@odata.nextLink'] || 'NO HAY');
            
            const proveedores = [];
            for (const item of response.data.value) {
                if (item.folder) {
                    // Obtener subcarpetas de años para este proveedor
                    const proveedorFolderPath = `${supplierBase}/${item.name}`;
                    const encodedProveedor = this.encodedPath(proveedorFolderPath);
                    const yearsUrl = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encodedProveedor}:/children`;
                    const yearsRes = await axios.get(yearsUrl, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    const yearFolders = yearsRes.data.value.filter(f => f.folder);
                    if (yearFolders.length === 0) continue;
                    // Obtener por año descendente y tomar el primero
                    const latestYear = yearFolders.map(f => parseInt(f.name)).sort((a,b) => b-a)[0];
                    const jsonPath = `${proveedorFolderPath}/${latestYear}/datos_proveedor.json`;
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
                        console.warn(`No se pudo leer JSON en ${item.name}/${latestYear}:`, err.message);
                    }
                }
            }
            // Extraer el skipToken de la siguiente página si existe
            const nextLink = response.data['@odata.nextLink'] || null;
            let nextSkipToken = null;
            if (nextLink) {
                try {
                    const urlObj = new URL(nextLink);
                    nextSkipToken = urlObj.searchParams.get('$skiptoken');
                } catch (e) {
                    // Si falla, intenta extraer manualmente
                    const match = nextLink.match(/[?&]$skiptoken=([^&]+)/);
                    if (match) nextSkipToken = match[1];
                }
            }

            return {
                data: proveedores,
                hasMore: !!nextLink,
                nextLink: nextLink,   // URL completa
                nextSkipToken: nextSkipToken // Solo el token
            };
            
        } catch (error) {
            console.error('Error al obtener todos los proveedores:', error.message);
            throw error;
        }
    }
    
    // Obtener un proveedor por su Razón Social (buscando la carpeta que coincida)
    async getSupplierByRazonSocial(razonSocial) {
        try {
            const latestYear = await this.getLatestYear(razonSocial);
            console.log('latestYear:', latestYear);
            if (!latestYear) return null;
            const folderPath = this.getSupplierFolderPath(razonSocial, latestYear);
            console.log('folderPath:', folderPath);
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
        const latestYear = await this.getLatestYear(razonSocial);
        if (!latestYear) return null;
        const folderPath = this.getSupplierFolderPath(razonSocial, latestYear);
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
        const resultado = await this.getAllSuppliers();

        // Acceder a resultado.data
        const all = Array.isArray(resultado) ? resultado : (resultado.data || [])
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
        const resultado = await this.getAllSuppliers();
        
        const todosProveedores = Array.isArray(resultado) ? resultado : (resultado.data || []);

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
        const resultado = await this.getAllSuppliers();

        const all = Array.isArray(resultado) ? resultado : (resultado.data || []);
        console.log('Proveedores encontrados:', all.length);

        const found = all.find(e =>  e.CorreoElectronico?.toLowerCase() === normalizedEmail );
        if (!found) {
            console.log('Email no encontrado entre todos los proveedores');
        } else {
            console.log('Email encontrado');
        }
        return found;
    }

    async updateSupplier(razonSocial, updateData, files = null, anio = null) {
        try {
            const existing = await this.getSupplierByRazonSocial(razonSocial);
            if (!existing) {
                throw new Error(`Proveedor con Razón Social ${razonSocial} no encontrado`);
            }

            let anioFinal = anio;
            if (!anioFinal) {
                // Intentar obtener el año más reciente de la carpeta del proveedor
                anioFinal = await this.getLatestYear(razonSocial);
            }
    
            const merged = { ...existing, ...updateData, updateAt: new Date().toISOString() };
            return await this.saveSupplierData(merged, files, anioFinal);
        } catch (error) {
            console.error('Error no se pudo actualizar el proveedor:', error.message);
            throw error;
        }
    }

    async deleteSupplier(razonSocial) {
        try {
            const baseFolder = `${this.basePath}/${this.suppliersFolder}/Proveedor_${this.sanitize(razonSocial)}`;
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const encoded = await this.encodedPath(baseFolder);
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

    // Eliminar carpeta de un año especifico para un proveedor
    async deleteSupplierYearFolder(razonSocial, anio) {
        try {
            const folderPath = this.getSupplierFolderPath(razonSocial, anio);
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
            console.log(`Carpeta del año ${anio} eliminada para: ${razonSocial}`);
        } catch (error) {
            console.error('Error al eliminar la carpeta del año:', error.message);
            throw error;
        }
    }

    // Eliminar la carpeta raíz del proveedor (toda la carpeta, sin importar el año)
    async deleteSupplierBaseFolder(identifier) {
        try {
            const sanitized = this.sanitize(identifier);
            const baseFolder = `${this.basePath}/${this.suppliersFolder}/Proveedor_${sanitized}`;
            const siteId = await this.getSiteId();
            const driveId = await this.getDriveId();
            const token = await authService.getAccessToken();
            const encoded = this.encodedPath(baseFolder);
            const url = `${this.graphApiUrl}/sites/${siteId}/drives/${driveId}/root:/${encoded}`;

            await axios.delete(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Carpeta base del proveedor eliminada: ${baseFolder}`);
        } catch (error) {
            console.error('Error al eliminar la carpeta base del proveedor:', error.message);
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