const CACHE_NAME = 'aylan-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/logo.jpeg',
];

const MAX_CACHE_ITEMS = 50;

// Helper to trim cache size
const trimCache = (cacheName, maxItems) => {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => {
          trimCache(cacheName, maxItems);
        });
      }
    });
  });
};

// Install Event: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static resources');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: cache-first for static, network-first for documents
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and API/auth/admin calls
  if (request.method !== 'GET' || 
      url.pathname.startsWith('/api') || 
      url.pathname.startsWith('/_next/data') || 
      url.pathname.includes('/better-auth') || 
      url.pathname.startsWith('/prisma')) {
    return;
  }

  // Check if it's a local static asset (JS, CSS, font, images)
  const isStaticAsset = 
    url.origin === self.location.origin && 
    (url.pathname.startsWith('/_next/static') || 
     url.pathname.match(/\.(js|css|woff2?|png|jpe?g|gif|svg|ico)$/));

  if (isStaticAsset) {
    // Cache-first, then network (Stale-While-Revalidate)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch new version in background to update cache
          fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* Ignore network errors in background fetch */});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
            trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
          });
          return networkResponse;
        });
      })
    );
  } else {
    // Network-first, then cache for pages/documents
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache the response if it's a valid HTML page
          if (networkResponse.status === 200 && networkResponse.headers.get('content-type')?.includes('text/html')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
              trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If offline and request is HTML document, fallback to '/offline'
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline');
            }
          });
        })
    );
  }
});
