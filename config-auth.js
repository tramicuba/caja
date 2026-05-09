(function() {
    const URL_PROYECTO = 'https://pkwfqpnwnrcmbncwkwew.supabase.co';
    const KEY_PROYECTO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd2ZxcG53bnJjbWJuY3drd2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NTAxODEsImV4cCI6MjA5MzQyNjE4MX0._8QVetaDX1buaLN6kKpQatH8hGas_VL-zCuyDk4B3s4';

    if (!window.sb) {
        window.sb = window.supabase.createClient(URL_PROYECTO, KEY_PROYECTO);
    }
})();

async function validarAccesoGlobal() {
    const { data: { user }, error } = await window.sb.auth.getUser();
    if (error || !user) { window.location.href = 'index.html'; return null; }

    const { data: profile } = await window.sb.from('perfiles').select('*').eq('id', user.id).single();
    if (!profile) { window.location.href = 'index.html'; return null; }

    return profile;
}
