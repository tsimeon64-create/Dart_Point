// Service Worker DartPoint
const CACHE = "dartpoint-v2";

self.addEventListener("install", () => {
  // Ne pas skipWaiting automatiquement — attendre l'action utilisateur
});

self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// Écoute le message "SKIP_WAITING" envoyé depuis l'app
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
