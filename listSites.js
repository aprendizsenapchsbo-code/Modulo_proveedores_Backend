import 'dotenv/config'
import authService from "./services/authService.js";
import axios from "axios";

async function listSites() {
    try {
        const token = await authService.getAccessToken();
        const response = await axios.get(
            "https://graph.microsoft.com/v1.0/sites?search=*",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const sites = response.data.value.map(site => ({
            displayName: site.displayName,
            webUrl: site.webUrl,
            id: site.id
        }));

        console.log("Sitios encontrados:");
        console.log(sites)
        return sites;
    } catch (error) {
        console.error("Error al listar sitios:", error.response?.data || error.message);
    }
}

listSites();