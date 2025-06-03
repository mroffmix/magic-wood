const CACHE_NAME = 'magic-wood-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.ts',
  '/src/App.vue',
  '/src/assets/main.css',
  '/src/assets/base.css',
  '/public/favicon.ico',
  '/public/magic-wood.png',
  '/src/assets/map/Sectors.svg',
  '/src/routes-data/filled_routes.json',
  '/src/routes-data/filled_routes_full.json',
  '/src/routes-data/mapping.json',
  '/src/routes-data/routes.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return the main page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Activate event - clean up old caches
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
});

// Message event - handle cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache);
      })
    );
  }
});