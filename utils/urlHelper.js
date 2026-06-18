export const getUrlFrontend = (ruta) => {
    const base = process.env.URL_PRODUCCION || 'https://www.proveedor.pch-sbo.com/gestion-proveedor/#/' /* 'http://localhost:5173/wp-content/themes/popularfx/vue-app/#/' */;

    // Elimina slash final de la base y slash inicial de la ruta
    const baseClean = base.replace(/\/$/, '');
    const rutaClean = ruta.replace(/^\//, '');
    return `${baseClean}/${rutaClean}`;
};