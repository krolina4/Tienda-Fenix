// Service worker: lets the app shell open even with zero connectivity,
// once it has been opened at least once with internet. The actual data
// (residents, balances, movements) is handled separately by Firestore's
// own offline cache — this only makes sure the page itself can load.

const CACHE_NAME = 'tienda-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each file individually so one failure (e.g. a font host
      // being briefly unreachable) doesn't break the whole install.
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => { /* ignore, will try again on fetch */ })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        // Keep the cached copy fresh for next time we're offline.
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
