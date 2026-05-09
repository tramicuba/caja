// config-auth.js
(function() {
    // Configuración de conexión única
    const URL_PROYECTO = 'https://pkwfqpnwnrcmbncwkwew.supabase.co';
    const KEY_PROYECTO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd2ZxcG53bnJjbWJuY3drd2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NTAxODEsImV4cCI6MjA5MzQyNjE4MX0._8QVetaDX1buaLN6kKpQatH8hGas_VL-zCuyDk4B3s4';

    // Creamos la instancia global única 'sb'
    if (!window.sb) {
        window.sb = window.supabase.createClient(URL_PROYECTO, KEY_PROYECTO);
    }
})();

/**
 * Función maestra para proteger las páginas
 */
async function validarAccesoGlobal() {
    const client = window.sb;
    
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: profile, error: profError } = await client
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profError || !profile || profile.eliminado) {
        await client.auth.signOut();
        window.location.href = 'index.html';
        return null;
    }

    // Validación de Suscripción (excepto Superadmin)
    if (profile.rol !== 'superadmin') {
        const targetId = profile.rol === 'dependiente' ? profile.admin_id : profile.id;
        const { data: admin } = await client
            .from('perfiles')
            .select('vencimiento')
            .eq('id', targetId)
            .single();

        if (admin && admin.vencimiento) {
            if (new Date() > new Date(admin.vencimiento)) {
                alert("Suscripción vencida. Contacta a soporte.");
                window.location.href = 'index.html';
                return null;
            }
        }
    }
    return profile;
}
