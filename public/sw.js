// Service Worker DartPoint — minimal pour activer l'installation PWA
const CACHE = "dartpoint-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", e => {
  // Laisser passer toutes les requêtes réseau normalement
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
