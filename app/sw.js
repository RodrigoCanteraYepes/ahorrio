// Service Worker for Control de Gastos v0.1.
// Strategy: app-shell precache on install + stale-while-revalidate
// for same-origin GET requests. The manifest is intentionally NOT
// precached (the browser fetches it fresh). See design.md section 6.

var CACHE_SHELL = "ahorrio-shell-v1";
var CACHE_RUNTIME = "ahorrio-runtime-v1";

var SHELL_FILES = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/main.js",
  "./js/router.js",
  "./js/storage.js",
  "./js/totals.js",
  "./js/categories.js",
  "./js/format.js",
  "./js/views/dashboard.js",
  "./js/views/add.js",
  "./js/views/month-selector.js"
];

// --- Install: precache the app shell, then skipWaiting ---

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// --- Activate: delete old caches, then claim clients ---

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_SHELL && key !== CACHE_RUNTIME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// --- Fetch: stale-while-revalidate for same-origin GET ---

self.addEventListener("fetch", function (event) {
  var request = event.request;

  // Only GET requests
  if (request.method !== "GET") return;

  // Only same-origin
  if (!request.url.startsWith(self.location.origin)) return;

  // Skip the manifest (always fetch fresh)
  if (request.url.endsWith(".webmanifest")) return;

  event.respondWith(
    caches.open(CACHE_RUNTIME).then(function (cache) {
      return cache.match(request).then(function (cached) {
        var networkFetch = fetch(request).then(function (response) {
          // Only cache successful same-origin responses
          if (response && response.status === 200 && response.type === "basic") {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(function () {
          // Network failed: fall back to the shell precache by path
          return caches.match(request, { cacheName: CACHE_SHELL });
        });

        // Return cached immediately if available, update in background
        return cached || networkFetch;
      });
    })
  );
});
