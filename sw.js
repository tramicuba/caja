importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });

// Precarga de la shell de la app (se llenará automáticamente en el registro)
workbox.precaching.precacheAndRoute([]);

// Estrategia CacheFirst para archivos estáticos (CSS, JS, HTML)
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'document' ||
                    request.destination === 'script' ||
                    request.destination === 'style',
  new workbox.strategies.CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
      }),
    ],
  })
);

// Estrategia NetworkOnly para las APIs de Supabase (no cachear datos sensibles)
workbox.routing.registerRoute(
  ({ url }) => url.href.includes('supabase.co'),
  new workbox.strategies.NetworkOnly()
);

// Para el resto de recursos, usar NetworkFirst (imágenes, etc.)
workbox.routing.setDefaultHandler(
  new workbox.strategies.NetworkFirst({
    cacheName: 'others',
    networkTimeoutSeconds: 3,
  })
);
