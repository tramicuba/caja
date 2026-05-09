/**
 * NOSTALGIA CUBANA - Core Service v2.0
 * Centraliza: Supabase, Seguridad y Actualizaciones.
 */

const CONFIG = {
    URL: 'https://pkwfqpnwnrcmbncwkwew.supabase.co',
    KEY: 'TU_ANON_KEY_AQUI', // Asegúrate de poner tu clave real aquí
    VERSION: 1
};

// Instancia única Global (Evita el SyntaxError de 'supabase already declared')
if (!window.sb) {
    window.sb = supabase.createClient(CONFIG.URL, CONFIG.KEY);
}

export const AppService = {
    /**
     * Valida la sesión y el permiso de forma flexible.
     * @param {string} rolRequerido - El rol necesario (admin, dependiente)
     */
    async validarSesion(rolRequerido = null) {
        try {
            // 1. Obtener usuario de Auth
            const { data: { user }, error: authError } = await window.sb.auth.getUser();

            if (authError || !user) {
                console.warn("🔐 Sin sesión activa. Redirigiendo a login...");
                window.location.href = 'index.html';
                return null;
            }

            // 2. Obtener perfil de la tabla 'perfiles'
            const { data: perfil, error: perfilError } = await window.sb
                .from('perfiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (perfilError || !perfil) {
                console.error("❌ Perfil no encontrado en la base de datos:", perfilError);
                // Si el perfil no existe, cerramos sesión por seguridad
                await window.sb.auth.signOut();
                window.location.href = 'index.html';
                return null;
            }

            // 3. Lógica de Permisos Flexible
            if (rolRequerido) {
                const esAdmin = perfil.rol === 'admin';
                const esRolCorrecto = perfil.rol === rolRequerido;

                // REGLA: El 'admin' puede entrar a TODO. 
                // El 'dependiente' solo a lo que se le pida.
                if (!esAdmin && !esRolCorrecto) {
                    console.error(`🚫 Acceso denegado. Eres '${perfil.rol}' y se requiere '${rolRequerido}'`);
                    alert("No tienes permisos para acceder a esta sección.");
                    window.location.href = esAdmin ? 'admin.html' : 'caja.html';
                    return null;
                }
            }

            console.log(`✅ Bienvenido, ${perfil.nombre || perfil.email} (${perfil.rol})`);
            return perfil;

        } catch (err) {
            console.error("💥 Error crítico en validación:", err);
            window.location.href = 'index.html';
            return null;
        }
    },

    async salir() {
        await window.sb.auth.signOut();
        window.location.href = 'index.html';
    }
};
