import 'dotenv/config';
import usersServices from './services/usersServices.js';

async function testDrive() {
    try {
        // Obtener el siteId
        const siteId = await usersServices.getSiteId();
        console.log("Site ID:", siteId);

        // Probar a buscar la biblioteca "SIG"
        const driveId = await usersServices.getDriveId(siteId, "SIG");
        console.log("Drive ID encontrado:", driveId);
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testDrive();