importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });

workbox.precaching.precacheAndRoute([]);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'document' ||
                    request.destination === 'script' ||
                    request.destination === 'style',
  new workbox.strategies.CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ url }) => url.href.includes('supabase.co'),
  new workbox.strategies.NetworkOnly()
);

workbox.routing.setDefaultHandler(
  new workbox.strategies.NetworkFirst({
    cacheName: 'others',
    networkTimeoutSeconds: 3,
  })
);
