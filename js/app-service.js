// /js/app-service.js

const CONFIG = {
    URL: 'https://pkwfqpnwnrcmbncwkwew.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Tu clave anon
    APP_VERSION: "1.0.0"
};

// Instancia ÚNICA global
if (!window.sb) {
    window.sb = supabase.createClient(CONFIG.URL, CONFIG.KEY);
}

export const AppService = {
    // Verificar sesión y rol (Mejora de validarAccesoGlobal)
    async validarSesion(rolRequerido) {
        const { data: { user }, error } = await window.sb.auth.getUser();
        if (error || !user) {
            window.location.href = 'index.html';
            return null;
        }

        const { data: perfil } = await window.sb
            .from('perfiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!perfil || perfil.eliminado || (rolRequerido && perfil.rol !== rolRequerido)) {
            await window.sb.auth.signOut();
            window.location.href = 'index.html';
            return null;
        }
        return perfil;
    },

    // Cerrar sesión centralizado
    async salir() {
        await window.sb.auth.signOut();
        window.location.href = 'index.html';
    }
};
