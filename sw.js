importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });

// Cache para la shell de la app: HTML, CSS, JS principal
workbox.precaching.precacheAndRoute([]); // ← Workbox llenará esto automáticamente con una lista de archivos.

// Estrategia CacheFirst para archivos estáticos
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new workbox.strategies.CacheFirst()
);

// Estrategia NetworkOnly para las APIs de Supabase
workbox.routing.registerRoute(
  ({ url }) => url.href.includes('bmmzvqfordvjgzkxzosu.supabase.co'),
  new workbox.strategies.NetworkOnly()
);
