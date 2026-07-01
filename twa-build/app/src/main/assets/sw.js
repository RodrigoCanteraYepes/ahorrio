// Service Worker for Ahorrio v1.0.
// Strategy: network-first for JS/CSS (always fetch fresh),
// cache-first for static assets (icons, fonts).

var CACHE_NAME = "ahorrio-v2";

// --- Install: skip waiting immediately ---
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

// --- Activate: delete ALL old caches, then claim clients ---
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// --- Fetch: network-first for everything ---
self.addEventListener("fetch", function (event) {
  var request = event.request;

  // Only GET requests
  if (request.method !== "GET") return;

  // Only same-origin
  if (!request.url.startsWith(self.location.origin)) return;

  // Network-first: try network, fall back to cache
  event.respondWith(
    fetch(request).then(function (response) {
      // Cache successful responses
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(function () {
      // Network failed: try cache
      return caches.match(request);
    })
  );
});
