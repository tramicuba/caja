// config-auth.js
(function() {
    // 1. Configuración de conexión única
    const URL_PROYECTO = 'https://pkwfqpnwnrcmbncwkwew.supabase.co';
    const KEY_PROYECTO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd2ZxcG53bnJjbWJuY3drd2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NTAxODEsImV4cCI6MjA5MzQyNjE4MX0._8QVetaDX1buaLN6kKpQatH8hGas_VL-zCuyDk4B3s4';

    // 2. Creamos la instancia global que ya estamos usando en los HTML
    if (!window.supabaseInstance) {
        window.supabaseInstance = window.supabase.createClient(URL_PROYECTO, KEY_PROYECTO);
    }
})();

/**
 * Función global para verificar suscripción y sesión
 * La usaremos en todas las páginas para proteger el acceso.
 */
async function validarAccesoGlobal() {
    const supabase = window.supabaseInstance;
    
    // Verificar si hay usuario logueado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        window.location.href = 'index.html';
        return null;
    }

    // Obtener perfil y vencimiento
    const { data: profile, error: profError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profError || !profile) {
        console.error("Error al obtener perfil");
        return null;
    }

    // Lógica de vencimiento (Admin o Dependiente)
    const targetId = profile.rol === 'dependiente' ? profile.admin_id : profile.id;
    const { data: admin } = await supabase
        .from('perfiles')
        .select('vencimiento')
        .eq('id', targetId)
        .single();

    if (admin && admin.vencimiento) {
        const fechaVence = new Date(admin.vencimiento);
        const hoy = new Date();
        
        if (hoy > fechaVence) {
            alert("Suscripción vencida. Contacta a soporte.");
            window.location.href = 'index.html';
            return null;
        }
    }

    return profile; // Devolvemos el perfil para usarlo en la página
}
