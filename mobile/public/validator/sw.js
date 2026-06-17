const CACHE_NAME = 'ldn-validator-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/index.css',
  './css/leaflet.css',
  './css/all.min.css',
  './js/leaflet.js',
  './js/app.js',
  './js/navigation.js',
  './js/offline-manager.js',
  './js/munsell-db.js',
  './js/soil-analyzer.js',
  './manifest.json',
  './preloaded_points.geojson',
  './preloaded_roads.geojson',
  './webfonts/fa-solid-900.woff2',
  './webfonts/fa-regular-400.woff2',
  './webfonts/fa-brands-400.woff2'
];

// Install Event - Caching App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Pre-caching Core App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && !key.startsWith('ldn-tiles')) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve from cache first, fallback to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Special caching strategy for Map Tiles (CartoDB, Esri, OSM, Google)
  if (
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('basemaps.cartocdn') ||
    url.hostname.includes('google.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If not in cache, fetch it from network and cache it
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open('ldn-tiles-manual').then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // If offline and not in cache, return an SVG tile placeholder directly
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="%231e293b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23475569" font-family="monospace" font-size="12">Offline Map Tile</text></svg>';
          return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
        });
      })
    );
    return;
  }

  // Standard caching for app assets
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback for document pages if completely offline
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
