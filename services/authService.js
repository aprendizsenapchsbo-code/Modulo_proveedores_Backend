import "dotenv/config"
import axios from "axios"

// Servicio de autenticación con Azure AD

class AuthService {
    constructor() {
        this.clientId = process.env.AZURE_CLIENT_ID;
        this.clientSecret = process.env.AZURE_CLIENT_SECRET;
        this.tenantId = process.env.AZURE_TENANT_ID;
        this.tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /* 
    Obtener un token válido de Azure
    Si el token actual aún es válido, se reutiliza
    Si expiró, se genera uno nuevo
     */

    async getAccessToken() {
        // Si el token es válido lo devolvemos sin hacer otra solicitud
        if(this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            console.log('Usando token cacheado');
            return this.accessToken;
        }

        try {
            console.log('Solicitando nuevo token a Azure');
            const response = await axios.post(this.tokenEndpoint,
                new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    scope: 'https://graph.microsoft.com/.default',
                    grant_type: 'client_credentials'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            // Guardamos el token y su fecha de expiración
            this.accessToken = response.data.access_token;
            // El token expira en 'expires_in' segundos, guardamos la hora actual
            // Restamos 60 segundos como buffer para renovar antes de que expire
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

            console.log('Token obtenido exitosamente');
            console.log('Token obtenido exitosamente:', this.accessToken);
            return this.accessToken;

        } catch (error) {
            console.error('Error al obtener token de Azure:', error.response?.data || error.message);

            throw new Error('No se pudo obtener el token de Azure. Verifica tus credenciales');
        }
    }

    // Limpiar el token cacheado
    clearToken() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }
}

// Exportamos una única instancia
export default new AuthService();