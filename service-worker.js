const CACHE_NAME = "my-cache-v1";

const urlsToCache = [
  "/stock-invoice/",
  "/stock-invoice/index.html",
  "/stock-invoice/stock.png"
];

// Install → cache files
self.addEventListener("install", event => {
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

// Fetch → serve from cache
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});