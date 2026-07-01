// Service Worker DartPoint
const CACHE = "dartpoint-v4";

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

// Clic sur une notification (ex : "C'est à toi de jouer") → focus/ouvre l'appli
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
