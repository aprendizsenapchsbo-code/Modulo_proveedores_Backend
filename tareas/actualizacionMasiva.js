import cron from 'node-cron';
import sharePointService from '../services/sharePointServices.js';
import { enviarCorreoActualizacion, enviarCorreoResumenActualizacion } from '../services/emailService.js';

// ------ Lógica de la actualización masiva (la tarea en sí) -------
async function ejecutarActualizacionAnual() {
    console.log('Iniciando actualización masiva anual...');
    try {
        const proveedores = await sharePointService.getProveedoresParaActualizacionAnual();
        if (proveedores.length === 0) {
            console.log('No hay proveedores para actualizar');
            return;
        }

        const anioActual = new Date().getFullYear().toString();
        const crypto = await import('crypto');
        let exitos = 0, fallos = 0;

        for (const proveedor of proveedores) {
            try {
                const token = crypto.randomBytes(32).toString('hex');
                await sharePointService.updateSupplier(proveedor.RazonSocial, {
                    tokenActualizacion: token,
                    tokenActualizacionExpiracion: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                    estadoProveedor: 'Pendiente Actualización',
                    anioActualizacionPendiente: anioActual
                });
                await enviarCorreoActualizacion(proveedor.CorreoElectronico, token);
                exitos++;
            } catch (err) {
                fallos++;
                console.error(`Fallo para ${proveedor.RazonSocial}:`, err.message);
            }
        }

        await enviarCorreoResumenActualizacion({ exitos, fallos, total: proveedores.length });
        console.log(`Resumen: ${exitos} exitosos, ${fallos} fallos de ${proveedores.length}`);
    } catch (error) {
        console.error('Error en actuaización masiva:', error);
    }
}


// ------ Manejo del cron -------
let tareaProgramada = null;
let expresionGuardada = '0 8 1 5 *';   // Valor por defecto (1 de Mayo 8:00 AM)

function programarTarea(expresion) {
    if (tareaProgramada) {
        tareaProgramada.stop();
    }
    if (!cron.validate(expresion)) {
        console.error(`Expresión cron inválida: ${expresion}`);
        return false;
    }
    tareaProgramada = cron.schedule(expresion, ejecutarActualizacionAnual, {
        scheduled: true,
        timezone: "America/Bogota"
    });
    console.log(`Tarea programada con: ${expresion}`);
    return true;
}

// Iniciar al cargar el módulo (cuando se importe en app.js)
(async () => {
    try {
        const config = await sharePointService.getCronConfig();
        expresionGuardada = config.expresionCron || '0 8 1 5 *';
        programarTarea(expresionGuardada);
    } catch (error) {
        console.error('Error al cargar configuración cron, usando por defecto:', error)
        programarTarea(expresionGuardada);
    }
})();

// ------- Funciones que usarán los controladores -------
export function obtenerExpresion() {
    return expresionGuardada;
}

export async function cambiarExpresion(nuevaExpresion) {
    if (!cron.validate(nuevaExpresion)) {
        throw new Error('Expresión cron no válida');
    }
    await sharePointService.saveCronConfig({ expresionCron: nuevaExpresion });
    programarTarea(nuevaExpresion);
    expresionGuardada = nuevaExpresion;
    return true;
}

/* // Prueba
async function ejecutarActualizacionAnual() {
    console.log('Modo prueba: enviando correo de actualización a un solo proveedor...');
    try {
        const razonSocialPrueba = 'Charlie Software';
        const proveedor = await sharePointService.getSupplierByRazonSocial(razonSocialPrueba);
        if (!proveedor) {
            console.log(`Proveedor "${razonSocialPrueba}" no encontrado`);
            return;
        }
        
        const token = 'token-de-prueba-12345';
        const anioActual = new Date().getFullYear().toString();

        // Solo se envía el correo, no guarda en SharePoin
        await enviarCorreoActualizacion(proveedor.CorreoElectronico, token);
        console.log(`Correo de prueba enviado a ${proveedor.CorreoElectronico}`);
        
        // Envía resumen al admin (también de prueba)
        await enviarCorreoResumenActualizacion({ exitos: 1, fallos: 0, total: 1 });
        console.log('Correo resumen enviado al administrador');
        
    } catch (error) {
        console.error('Error en prueba:', error);
    }
} */