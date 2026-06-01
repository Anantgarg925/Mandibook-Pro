const CACHE_NAME = 'mandibook-pro-cache-v1';

// We simply need a valid fetch event listener for Chrome to recognize it as a PWA
// and trigger the beforeinstallprompt event. 
// We are handling actual offline bill storage manually via IDB in our app code.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser do its default network request,
  // but if it fails, try to return from cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
