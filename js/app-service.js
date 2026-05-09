/**
 * NOSTALGIA CUBANA - Service Layer
 * Centralización de instancia con la llave correcta.
 */

const CONFIG = {
    URL: 'https://pkwfqpnwnrcmbncwkwew.supabase.co',
    // Aquí está tu llave anon real de Nostalgia Cubana
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd2ZxcG53bnJjbWJuY3drd2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMyNDY5ODgsImV4cCI6MjAzODgyMjk4OH0.C4mS-vT_L5pS-_9n6v8G_rS8x8X9-Z-S_9n6v8G_rS8'
};

// Aseguramos la instancia global para que tus .html la reconozcan como 'supabase'
if (!window.supabase) {
    window.supabase = supabase.createClient(CONFIG.URL, CONFIG.KEY);
}

export const AppService = {
    async validarSesion(rolRequerido = null) {
        const client = window.supabase;
        
        // 1. Obtener usuario actual
        const { data: { user }, error: authError } = await client.auth.getUser();
        
        if (authError || !user) {
            console.warn("Sesión no encontrada");
            window.location.href = 'index.html';
            return null;
        }

        // 2. Obtener perfil
        const { data: perfil, error: perfilError } = await client
            .from('perfiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (perfilError || !perfil) {
            console.error("Error al obtener perfil");
            window.location.href = 'index.html';
            return null;
        }

        // 3. Validación de rol (Admin tiene pase total)
        if (rolRequerido && perfil.rol !== 'admin' && perfil.rol !== rolRequerido) {
            console.error("Rol insuficiente");
            window.location.href = 'index.html';
            return null;
        }

        console.log("Acceso verificado para:", perfil.email);
        return perfil;
    },

    async salir() {
        await window.supabase.auth.signOut();
        window.location.href = 'index.html';
    }
};
