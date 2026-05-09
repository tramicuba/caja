// config-auth.js - UNIFICADO
(function() {
    const URL_PROYECTO = 'https://pkwfqpnwnrcmbncwkwew.supabase.co';
    const KEY_PROYECTO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd2ZxcG53bnJjbWJuY3drd2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NTAxODEsImV4cCI6MjA5MzQyNjE4MX0._8QVetaDX1buaLN6kKpQatH8hGas_VL-zCuyDk4B3s4';

    if (!window.sb) {
        window.sb = supabase.createClient(URL_PROYECTO, KEY_PROYECTO);
    }
})();

async function validarAccesoGlobal() {
    const client = window.sb;
    const { data: { user }, error: authError } = await client.auth.getUser();
    
    if (authError || !user) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: profile } = await client.from('perfiles').select('*').eq('id', user.id).single();

    if (!profile || profile.eliminado) {
        await client.auth.signOut();
        window.location.href = 'index.html';
        return null;
    }

    // Validación de suscripción
    if (profile.rol !== 'superadmin') {
        const adminId = profile.rol === 'dependiente' ? profile.admin_id : profile.id;
        const { data: admin } = await client.from('perfiles').select('vencimiento').eq('id', adminId).single();
        
        if (admin && new Date() > new Date(admin.vencimiento)) {
            alert("Suscripción vencida.");
            window.location.href = 'index.html';
            return null;
        }
    }
    return profile;
}
