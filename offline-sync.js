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
    if (!navigator.onLine) return;
    syncInProgress = true;
    try {
      const pending = await getAllOperations();
      if (pending.length === 0) return;
      for (const op of pending) {
        try {
          if (op.type === 'VENTA') {
            await ejecutarVentaSupabase(op.data);
          } else if (op.type === 'AJUSTE_STOCK') {
            await ejecutarAjusteStockSupabase(op.data);
          } else {
            console.warn(`Tipo desconocido: ${op.type}`);
          }
          await deleteOperation(op.id);
        } catch (err) {
          console.error(`Error operación ${op.id}:`, err);
          break;
        }
      }
    } catch (err) {
      console.error("offline-sync error:", err);
    } finally {
      syncInProgress = false;
      const remaining = await getAllOperations();
      if (remaining.length > 0) setTimeout(processQueue, 5000);
    }
  }

  async function ejecutarVentaSupabase(data) {
    const sb = window.supabaseInstance;
    if (!sb) throw new Error("Supabase no inicializado");
    const { error } = await sb.from('ventas').insert([data]);
    if (error) throw error;
    const { error: updateStock } = await sb.from('productos')
      .update({ stock: sb.raw('stock - ?', data.cantidad) })
      .eq('id', data.producto_id);
    if (updateStock) throw updateStock;
  }

  async function ejecutarAjusteStockSupabase(data) {
    const sb = window.supabaseInstance;
    if (!sb) throw new Error("Supabase no inicializado");
    const { error: insertErr } = await sb.from('ajustes_stock').insert([data]);
    if (insertErr) throw insertErr;
    const { error: updateErr } = await sb.from('productos')
      .update({ stock: sb.raw('stock + ?', data.cantidad_signed) })
      .eq('id', data.producto_id);
    if (updateErr) throw updateErr;
  }

  window.NostalgiaSync = {
    addOperation,
    processQueue,
    getPendingCount: async () => (await getAllOperations()).length,
  };

  window.addEventListener('online', () => { processQueue(); });
  window.addEventListener('load', () => { if (navigator.onLine) processQueue(); });
})();
