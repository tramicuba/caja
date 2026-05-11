// offline-sync.js
importScripts? false;

(function() {
  const DB_NAME = 'NostalgiaSyncDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'pending_operations';

  let dbPromise = null;
  let syncInProgress = false;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { autoIncrement: true });
        }
      };
    });
    return dbPromise;
  }

  async function addOperation(operation) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(operation);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAllOperations() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteOperation(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function processQueue() {
    if (syncInProgress) return;
    if (!navigator.onLine) {
      console.log("offline-sync: Sin conexión, esperando...");
      return;
    }
    syncInProgress = true;
    try {
      const pending = await getAllOperations();
      if (pending.length === 0) {
        console.log("offline-sync: Cola vacía");
        return;
      }
      console.log(`offline-sync: Procesando ${pending.length} operaciones...`);
      for (const op of pending) {
        try {
          // Ejecutar la operación según su tipo
          if (op.type === 'VENTA') {
            await ejecutarVentaSupabase(op.data);
          } else if (op.type === 'AJUSTE_STOCK') {
            await ejecutarAjusteStockSupabase(op.data);
          } else {
            console.warn(`Tipo desconocido: ${op.type}`);
          }
          // Eliminar si fue exitosa
          await deleteOperation(op.id);
        } catch (err) {
          console.error(`Error operación ${op.id}:`, err);
          // Si falla por validación (ej. producto no existe), eliminar igual?
          // Por ahora lo dejamos para reintentar después
          break; // detener cola para no relentizar
        }
      }
    } catch (err) {
      console.error("offline-sync: error procesando cola", err);
    } finally {
      syncInProgress = false;
      // Si aún hay pendientes, volver a intentar en 5 segundos
      const remaining = await getAllOperations();
      if (remaining.length > 0) {
        setTimeout(processQueue, 5000);
      }
    }
  }

  // Funciones reales que llaman a Supabase (deben definirse después de tener la instancia)
  // Se inyectarán desde config-auth.js o simplemente se usarán globalmente
  async function ejecutarVentaSupabase(data) {
    const sb = window.supabaseInstance;
    if (!sb) throw new Error("Supabase no inicializado");
    const { error } = await sb.from('ventas').insert([data]);
    if (error) throw error;
    // También actualizar stock (opcional, se hace en el mismo flujo)
    const { error: updateStock } = await sb.from('productos')
      .update({ stock: sb.raw('stock - ?', data.cantidad) })
      .eq('id', data.producto_id);
    if (updateStock) throw updateStock;
  }

  async function ejecutarAjusteStockSupabase(data) {
    const sb = window.supabaseInstance;
    if (!sb) throw new Error("Supabase no inicializado");
    // Insertar ajuste
    const { error: insertErr } = await sb.from('ajustes_stock').insert([data]);
    if (insertErr) throw insertErr;
    // Actualizar stock del producto
    const delta = data.cantidad_signed;
    const { error: updateErr } = await sb.from('productos')
      .update({ stock: sb.raw('stock + ?', delta) })
      .eq('id', data.producto_id);
    if (updateErr) throw updateErr;
  }

  // Exponer métodos globalmente
  window.NostalgiaSync = {
    addOperation,
    processQueue,
    getPendingCount: async () => (await getAllOperations()).length,
  };

  // Escuchar cambios de conexión
  window.addEventListener('online', () => {
    console.log("offline-sync: Conexión recuperada, sincronizando...");
    processQueue();
  });
  window.addEventListener('load', () => {
    if (navigator.onLine) processQueue();
  });
})();
