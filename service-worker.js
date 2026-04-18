const CACHE_NAME = "stockinvoice-cache-v2";

const urlsToCache = [
  "/stock-invoice/",
  "/stock-invoice/index.html",
  "/stock-invoice/stock.png"
];

// Install → cache files
self.addEventListener("install", event => {
  // Skip waiting so the new service worker activates immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (e) {
          console.log("Skip caching:", url);
        }
      }
    })
  );
});

// Activate → clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => {
      // Take control of all open clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch → network-first strategy (try network, fall back to cache)
// This ensures localStorage data is always loaded from the latest page
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If we got a valid response, clone it and update the cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, fall back to cache (offline mode)
        return caches.match(event.request);
      })
  );
});