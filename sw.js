const CACHE_NAME = 'praticamente-v1';
const ASSETS = [
  'celular.html',
  'Eneagrama.png',
  'PNL.png',
  'estoicismo.png',
  'curso.png',
  'livros.png'
];

// Instala e armazena os arquivos offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Faz o app carregar os arquivos do cachê quando estiver sem internet
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
