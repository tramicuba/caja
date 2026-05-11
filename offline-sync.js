// offline-sync.js
import { openDB } from 'idb';

let dbPromise = openDB('NostalgiaSyncDB', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('pending_operations')) {
      db.createObjectStore('pending_operations', { autoIncrement: true });
    }
  },
});

async function addOperation(operation) {
  const db = await dbPromise;
  const tx = db.transaction('pending_operations', 'readwrite');
  const store = tx.objectStore('pending_operations');
  await store.add(operation);
  await tx.done;
  console.log('Operación encolada:', operation);
  if (navigator.onLine) { processQueue(); }
}

async function processQueue() {
  if (!navigator.onLine) return;
  const db = await dbPromise;
  const tx = db.transaction('pending_operations', 'readonly');
  const store = tx.objectStore('pending_operations');
  let pending = await store.getAll();
  await tx.done;

  if (pending.length === 0) return;

  console.log(`Procesando ${pending.length} operaciones pendientes...`);
  for (let op of pending) {
    try {
      // 🔄 Aquí es donde se conecta con tu código existente.
      // Debes llamar a las funciones reales de Supabase para:
      // - Crear la venta (sb.from('ventas').insert(op.data))
      console.log(`Enviando operación ${op.id} a Supabase...`);
      // await executeSupabaseOperation(op); <- Tu código real aquí

      // Si todo salió bien, eliminar de la cola
      const deleteTx = db.transaction('pending_operations', 'readwrite');
      await deleteTx.store.delete(op.id);
      await deleteTx.done;
    } catch (error) {
      console.error(`Error con operación ${op.id}:`, error);
      break;
    }
  }
}

window.addEventListener('online', () => processQueue());
