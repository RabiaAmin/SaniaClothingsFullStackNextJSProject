self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('sania-')).map((key) => caches.delete(key)))
      ),
    ])
  );
});

// Keep all authenticated pages, API calls, and deployment assets network-authoritative.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
