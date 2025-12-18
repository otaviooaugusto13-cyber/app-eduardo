// Arquivo: sw.js
const CACHE_NAME = 'praticamente-v1';

// Instala o Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
});

// Responde às requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});