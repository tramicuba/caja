/**
 * app-service.js
 * Núcleo de servicios centralizados para Nostalgia Cubana.
 * Maneja la conexión a Supabase, autenticación y lógica de negocio.
 * Reemplaza a config-auth.js
 */

const AppService = (function() {
    // 1. Credenciales (Fase 1: Se mantienen aquí temporalmente, luego irán al Proxy)
    const URL_PROYECTO = 'https://pkwfqpnwnrcmbncwkwew.supabase.co';
    const KEY_PROYECTO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd2ZxcG53bnJjbWJuY3drd2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NTAxODEsImV4cCI6MjA5MzQyNjE4MX0._8QVetaDX1buaLN6kKpQatH8hGas_VL-zCuyDk4B3s4';

    // 2. Instancia privada (Evita el error de "identificador duplicado")
    let supabase = null;

    function initSupabase() {
        if (!supabase && window.supabase) {
            supabase = window.supabase.createClient(URL_PROYECTO, KEY_PROYECTO);
        }
        return supabase;
    }

    initSupabase();

    return {
        // Exponemos la instancia cruda SOLO como transición temporal para los HTML antiguos
        get sb() { return supabase; },

        // ==========================================
        // 🔐 MÓDULO DE AUTENTICACIÓN Y SESIÓN
        // ==========================================
        auth: {
            async login(email, password) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw new Error("Credenciales inválidas o error de red.");
                return data;
            },

            async logout() {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            },

            async getCurrentUser() {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error || !user) return null;
                return user;
            },

            /**
             * Centraliza la validación de acceso que antes estaba repetida en cada HTML.
             * @param {string} rolEsperado - Ej: 'superadmin', 'admin', 'dependiente' (Opcional)
             */
            async validarSesion(rolEsperado = null) {
                const user = await this.getCurrentUser();
                if (!user) {
                    window.location.href = 'index.html';
                    return null;
                }

                // Optimización: Solo pedimos los campos estrictamente necesarios
                const { data: perfil, error } = await supabase
                    .from('perfiles')
                    .select('id, rol, admin_id, eliminado')
                    .eq('id', user.id)
                    .single();

                if (error || !perfil) {
                    window.location.href = 'index.html';
                    return null;
                }

                if (perfil.eliminado) {
                    alert("Esta cuenta ha sido desactivada por el administrador.");
                    await this.logout();
                    return null;
                }

                if (rolEsperado && perfil.rol !== rolEsperado) {
                    alert(`Acceso denegado. Se requieren permisos de ${rolEsperado}.`);
                    window.location.href = 'index.html';
                    return null;
                }

                // Lógica de vencimiento (Excepto superadmin)
                if (perfil.rol !== 'superadmin') {
                    const targetId = perfil.rol === 'dependiente' ? perfil.admin_id : perfil.id;
                    const { data: admin } = await supabase
                        .from('perfiles')
                        .select('vencimiento')
                        .eq('id', targetId)
                        .single();
                    
                    if (admin && admin.vencimiento) {
                        const fechaVence = new Date(admin.vencimiento);
                        if (new Date() > fechaVence) {
                            alert("Suscripción vencida. Contacta a soporte Nostalgia Cubana.");
                            await this.logout();
                            return null;
                        }
                    }
                }

                return { user, perfil };
            }
        },

        // ==========================================
        // 📦 MÓDULO DE INVENTARIO
        // ==========================================
        inventario: {
            /**
             * Obtiene productos de forma optimizada para Cuba (ahorra datos).
             */
            async obtenerProductos(ownerId) {
                const { data, error } = await supabase
                    .from('productos')
                    .select('id, nombre, precio, stock, precio_compra') // No pedimos created_at ni campos extra
                    .eq('owner_id', ownerId)
                    .order('nombre', { ascending: true });
                
                if (error) throw error;
                return data;
            }
        },

        // ==========================================
        // 💵 MÓDULO DE CAJA Y VENTAS
        // ==========================================
        ventas: {
            /**
             * Lógica atómica simulada (Antes de implementar RPC en base de datos)
             */
            async registrarVenta(datosVenta) {
                const { productoId, cantidad, precioTotal, costoUnitario, ganancia, vendedorId, ownerId, turnoId } = datosVenta;

                // 1. Verificación de seguridad: Evitar vender si no hay stock real en DB
                const { data: prod } = await supabase.from('productos').select('stock').eq('id', productoId).single();
                if (!prod || prod.stock < cantidad) {
                    throw new Error("Stock insuficiente para completar la venta en el servidor.");
                }

                // 2. Insertar en tabla ventas
                const { error: ventaError } = await supabase.from('ventas').insert([{
                    producto_id: productoId,
                    cantidad: cantidad,
                    precio_total: precioTotal,
                    costo_unitario: costoUnitario,
                    ganancia: ganancia,
                    vendedor_id: vendedorId,
                    owner_id: ownerId,
                    turno_id: turnoId,
                    created_at: new Date().toISOString()
                }]);

                if (ventaError) throw ventaError;

                // 3. Descontar Stock
                const { error: stockError } = await supabase
                    .from('productos')
                    .update({ stock: prod.stock - cantidad })
                    .eq('id', productoId);

                if (stockError) {
                    console.error("Fallo crítico al descontar stock tras venta:", stockError);
                    // Aquí en Fase 2 pondremos un rollback/RPC, pero por ahora lanzamos el error
                    throw new Error("Venta procesada, pero error sincronizando inventario.");
                }

                return true;
            }
        },

        // ==========================================
        // 🕒 MÓDULO DE TURNOS
        // ==========================================
        turnos: {
            async obtenerTurnoActivo(vendedorId) {
                const { data, error } = await supabase
                    .from('turnos')
                    .select('id, fondo_inicial, fecha_inicio')
                    .eq('vendedor_id', vendedorId)
                    .is('fecha_fin', null)
                    .single();
                
                // Si no hay turnos activos, Supabase lanza error (código PGRST116), lo ignoramos
                if (error && error.code !== 'PGRST116') throw error;
                return data || null;
            }
        }
    };
})();

// Inyectar el servicio globalmente
window.AppService = AppService;
