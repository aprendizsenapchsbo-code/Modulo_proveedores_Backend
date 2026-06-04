import axios from "axios";
import fs from 'fs'
import path from "path";
import authService from "./authService.js";

/* Servicio para gestionar documentos en el SharePoint, se encarga de crear carpetas y de subir los documentos */

class SharePointService {
    constructor() {
        this.graphApiUrl = process.env.MICROSOFT_GRAPH_API;
        this.siteName = process.env.SHAREPOINT_SITE_NAME;
        this.rootFolder = process.env.SHAREPOINT_DOCUMENTOS_FOLDER; // Carpeta raiz
        this.suppliersFolder = 'Proveedores' // Subcarpeta para proveedores
    }

    // Obtiene el ID del sitio de SharePoint por su nombre
    async getSiteId() {
        try {
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
            console.log(`Id del sitio obtenido ${siteId}`);
            return siteId;
            
        } catch (error) {
            console.error('Error al obtener el ID del sitio:', error.message);
            throw error;
        }
    }
    
    // Obtener el ID de la carpeta raiz "API Documentos Proveedores Prueba"
    async getRootFolderId(siteId) {
        try {
            const token = await authService.getAccessToken();
            
            // 1. Buscar primero el id de la primera carpeta
            const firstFolderResponse = await axios.get(
                `${this.graphApiUrl}/sites/${siteId}/drive/root/children?$filter=name eq '${process.env.SHAREPOINT_FIRST_FOLDER}'`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const folder1Id = firstFolderResponse.data.value[0].id;
            
            // 2. Buscar el id de la segunda carpeta
            const secondFolderResponse = await axios.get(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${folder1Id}/children?$filter=name eq '${process.env.SHAREPOINT_SECOND_FOLDER}'`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const folder2Id = secondFolderResponse.data.value[0].id;

            // 3. Buscar API Documentos Proveedores Prueba
            const rootResponse = await axios.get(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${folder2Id}/children?$filter=name eq '${this.rootFolder}'`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!rootResponse.data.value || rootResponse.data.value.length === 0) {
                throw new Error(`No se encontró la carpeta: ${this.rootFolder}`);
            }

            const rootFolderId = rootResponse.data.value[0].id;
            console.log('Carpeta raiz encontrada');
            return rootFolderId;
            
        } catch (error) {
            console.error('Error al obtener el ID de la carpeta raiz:', error.message);
            throw error;
        }
    }

    // Obtener el ID de la subcarpeta "Proveedores"
    async getSuppliersFolderId(siteId, rootFolderId) {
        try {
            const token = await authService.getAccessToken();
            const response = await axios.get(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${rootFolderId}/children?$filter=name eq '${this.suppliersFolder}'`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.data.value || response.data.value.length === 0) {
                throw new Error(`No se encontró la carpeta raiz: ${this.rootFolder}`);
            }
            
            const suppliersFolderId = response.data.value[0].id;
            console.log('Carpeta de proveedores encontrada');
            return suppliersFolderId;

        } catch (error) {
            console.error('Error al obtener la carpeta de proveedores:', error.message);
            throw error;
        }
    }
    
    // Leer el archivo JSON de metadata dentro de una carpeta de proveedor
    async getSupplierMetadata(siteId, folderId) {
        try {
            const token = await authService.getAccessToken();
            const response = await axios.get(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${folderId}:/datos_proveedor.json:/content`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;

        } catch (error) {
            console.error('Error al leer metadata del proveedor', error.message);
            return null;
        }
    }

    // Obtener todos los proveedores (recorre todas las carpetas y lee los JSON)
    async getAllSuppliers() {
        try {
            const siteId = await this.getSiteId();
            const documentsFolderId = await this.getDocumentsFolderId(siteId);
            const folders = await this.getAllSupplierFolders(siteId, documentsFolderId);
            
            const supplier = [];
            for (const folder of folders) {
                const metadata = await this.getSupplierMetadata(siteId, folder.id);
                if (metadata) {
                    metadata_.sharePointFolderId = folder.id;
                    metadata_.sharePointFolderName = folder.name;
                    supplier.push(metadata);
                }
            }
            return supplier
            
        } catch (error) {
            console.error('Error al obtener todos los proveedores:', error.message);
            throw error;
        }
    }
    
    // Obtener un proveedor por su NIT (buscando la carpeta que coincida)
    async getSupplierByNit(nit) {
        try {
            const siteId = await this.getSiteId();
            const documentsFolderId = await this.getDocumentsFolderId(siteId);
            const folders = await this.getAllSupplierFolders(siteId, documentsFolderId);

            // Construir el nombre
            const folderName = `Proveedor_${nit.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const targetFolder = folders.find(f => f.name === folderName);

            if (!targetFolder) {
                return null;
            }

            const metadata = await this.getSupplierMetadata(siteId, targetFolder.id);
            return metadata;

        } catch (error) {
            console.error('Error al obtener el proveedor por su NIT:', error.message);
            return null;
        }
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
    async getSupplierFolder(siteId, documentsFolderId, supplierIdentifier) {
        try {
            const token = await authService.getAccessToken();
            const folderName = `Proveedor_${supplierIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}`;

            const response = await axios.get(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${documentsFolderId}/children?$filter=name eq '${folderName}'`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.value && response.data.value.length > 0) {
                return response.data.value[0].id;
            }

            return null;

        } catch (error) {
            console.error('Error al buscar carpeta del proveedor', error.message);
            return null;
        }
    }

    // Crea nombre de carpeta para el proveedor si no existe
    async createSupplierFolder(siteId, suppliersFolderId, supplierName) {
        try {
            const token = await authService.getAccessToken();

            // Crear nombre de carpeta seguro (sin caracteres espaciales)
            const folderName = `Proveedor_${supplierName.replace(/[^a-zA-Z0-9]/g, '_')}`;

            // Verificar si ya existe
            const existingFolderId = await this.getSupplierFolder(siteId, suppliersFolderId, supplierName);
            if (existingFolderId) {
                console.log(`La carpeta del proveedor ya existe ${folderName}`);
                return existingFolderId;
            }

            const response = await axios.post(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${suppliersFolderId}/children`,
                {
                    name: folderName,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename'
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const supplierFolderId = response.data.id;
            console.log(`Carpeta del proveedor creada: ${folderName}`);
            return supplierFolderId;

        } catch (error) {
            console.error('Error al crear la carpeta del proveedor:', error.message);
            throw error;
        }
    }

    // Subir un archivo a la carpeta del proveedor
    async uploadDocument(siteId, supplierFolderId, filePath, fileName) {
        try {
            const token = await authService.getAccessToken();

            // Leer el archivo
            const fileContent = fs.readFileSync(filePath);

            const response = await axios.put(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${supplierFolderId}:/${fileName}:/content`,
                fileContent,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/octet-stream'
                    }
                }
            );

            console.log(`Archivo subido: ${fileName}`);
            return response.data;
            
        } catch (error) {
            console.error('Error al subir el documento:', error.message);
            throw error
        }
    }

    // Guardar los datos del proveedor como archivo JSON en SharePoint
    async uploadSupplierMetadata(siteId, supplierFolderId, supplierData) {
        try {
            const token = await authService.getAccessToken();

            // Crear contenido JSON con los datos del proveedor
            const jsonContent = JSON.stringify(supplierData, null, 2);

            const response = await axios.put(
                `${this.graphApiUrl}/sites/${siteId}/drive/items/${supplierFolderId}:/datos_proveedor.json:/content`,
                jsonContent,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Datos del proveedor guardados');
            return response.data;
            
        } catch (error) {
            console.error('Error al guardar datos del proveedor:', error.message);
            throw error;
        }
    }

    //Funcion Principal: Registra un proveedor completo.
    //Crea carpeta, sube documento y guarda datos
    async registerSupplier(supplierData, documentPath) {
        try {
            console.log('Iniciando registro de proveedor en SharePoint...');

            // Paso 1: Obtener IDs necesarios
            const siteId = await this.getSiteId();
            const rootFolderId = await this.getRootFolderId(siteId);
            const suppliersFolderId = await this.getSuppliersFolderId(siteId, rootFolderId);

            // Paso 2: Crear carpeta del proveedor
            const supplierFolderId = await this.createSupplierFolder(
                siteId,
                suppliersFolderId,
                supplierData.RazonSocial || supplierData.nombre || 'Proveedor'
            );

            // Paso 3: Subir documentos
            const fileName = path.basename(documentPath);
            await this.uploadDocument(siteId, supplierFolderId, documentPath, fileName);

            // Paso 4: Guardar datos del proveedor como JSON
            await this.uploadSupplierMetadata(siteId, supplierFolderId, supplierData);

            console.log('Proveedor registrado exitosamente en SharePoint');
            
            return {
                success: true,
                message: 'Proveedor registrado exitosamente',
                supplierFolder: supplierFolderId,
                siteId: siteId
            };
        } catch (error) {
            console.error('Error al registrar el proveedor:', error.message);
            throw error;
        }
    }
}

export default new SharePointService()