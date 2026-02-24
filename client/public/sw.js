const CACHE_NAME = 'zenith-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/pwa-512.png',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/App.css',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
