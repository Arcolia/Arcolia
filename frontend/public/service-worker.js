const CACHE_NAME = 'arcolia-v2';
const STATIC_ASSETS = [
  '/static/js/',
  '/static/css/',
  '/static/media/'
];

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Fetch event - network-first for HTML/API, cache-first for static assets only
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Always go to network for API calls and HTML navigation
  if (event.request.url.includes('/api/') || 
      event.request.mode === 'navigate' ||
      event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // For static assets, use cache-first
  const isStaticAsset = STATIC_ASSETS.some(path => url.pathname.includes(path));
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  // Default: network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Activate event - clean up old caches and claim clients immediately
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
    }).then(() => self.clients.claim())
  );
});
