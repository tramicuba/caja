// config-auth.js
(function() {
    const URL_PROYECTO = 'https://bmmzvqfordvjgzkxzosu.supabase.co';
    const KEY_PROYECTO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbXp2cWZvcmR2amd6a3h6b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjAwODYsImV4cCI6MjA5NDA5NjA4Nn0.4mqHOHnoKamDBC78QY8A78bfGLL4GllvyHPLKrvBpAU';

    if (!window.supabaseInstance) {
        window.supabaseInstance = window.supabase.createClient(URL_PROYECTO, KEY_PROYECTO);
    }
})();

// Función global de escape HTML
window.escapeHtml = function(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
};

// Función global de validación de acceso y suscripción
window.validarAccesoGlobal = async function(rolesPermitidos = []) {
    const supabase = window.supabaseInstance;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: profile, error: profError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profError || !profile) {
        window.location.href = 'index.html';
        return null;
    }

    // Validar eliminado
    if (profile.eliminado === true) {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
        return null;
    }

    // Validar vencimiento (para admins y dependientes)
    if (profile.rol !== 'superadmin') {
        const ownerId = profile.rol === 'dependiente' ? profile.admin_id : profile.id;
        const { data: admin } = await supabase
            .from('perfiles')
            .select('vencimiento')
            .eq('id', ownerId)
            .single();

        if (admin && admin.vencimiento) {
            const hoy = new Date();
            const vence = new Date(admin.vencimiento);
            if (hoy > vence) {
                alert('Suscripción vencida. Contacta a soporte.');
                window.location.href = 'index.html';
                return null;
            }
        }
    }

    // Validar roles permitidos
    if (rolesPermitidos.length && !rolesPermitidos.includes(profile.rol)) {
        window.location.href = 'index.html';
        return null;
    }

    return profile;
};

// Función para cerrar sesión
window.cerrarSesion = async function() {
    await window.supabaseInstance.auth.signOut();
    window.location.href = 'index.html';
};
