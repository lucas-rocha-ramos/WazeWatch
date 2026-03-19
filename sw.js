const CACHE_NAME = 'watchnav-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalação: Salva os arquivos básicos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar Requisições (Estratégia: Network First, fallback to Cache)
// Para os blocos do mapa (tiles), tentamos usar do cache se estiver offline.
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Se for uma requisição para os mapas do CartoDB/OSM
  if (requestUrl.hostname.includes('cartocdn.com') || requestUrl.hostname.includes('openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Retorna do cache se existir
        }
        // Se não tiver no cache, busca na internet e salva para a próxima vez
        return fetch(event.request).then((networkResponse) => {
          return caches.open('watchnav-map-tiles').then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          // Se falhar e não tiver cache, ignora graciosamente
          return new Response('');
        });
      })
    );
  } else {
    // Para o resto do app (HTML, CSS, JS)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
