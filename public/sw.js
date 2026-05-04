// Service Worker DartPoint
const CACHE = "dartpoint-v3";

self.addEventListener("install", () => {
  // Activation immédiate sans attendre l'action utilisateur
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
