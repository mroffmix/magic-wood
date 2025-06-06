const CACHE_NAME = 'magic-wood-v2';
const VERSION = '1.0.2'; // Update this when you want to notify users of new version
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/magic-wood.png',
  // Built assets will be cached dynamically
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Store version info in cache
        const versionResponse = new Response(VERSION, {
          headers: { 'Content-Type': 'text/plain' }
        });
        cache.put('APP_VERSION', versionResponse);
        
        return cache.addAll(urlsToCache);
      })
  );
  // Take control immediately
  self.skipWaiting();
});

// Fetch event - cache-first strategy for offline support
self.addEventListener('fetch', (event) => {
  // Skip caching for non-http(s) requests (chrome-extension, etc.)
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Try to fetch from network and cache the response
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses or non-basic types
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Only cache http(s) requests
            if (event.request.url.startsWith('http')) {
              // Clone the response before caching
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch((error) => {
                  console.warn('Failed to cache response:', error);
                });
            }
            
            return response;
          })
          .catch(() => {
            // Network failed, try to return cached fallback
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html') || caches.match('/');
            }
            // For other requests, just fail gracefully
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// Activate event - clean up old caches and take control
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
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Message event - simplified cache updates
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    console.log('Processing cache update request');
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        // Cache the basic resources
        return cache.addAll(urlsToCache);
      }).then(() => {
        console.log('Cache update completed');
      }).catch((error) => {
        console.error('Cache update failed:', error);
      })
    );
  }
});