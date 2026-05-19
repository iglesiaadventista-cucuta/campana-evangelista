const CACHE_NAME = "seven-connect-v1";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "SEVEN-CONNECT", {
      body: data.body || "Tienes pendientes de seguimiento espiritual.",
      icon: "./manifest-icon-192.maskable.png",
      badge: "./manifest-icon-192.maskable.png"
    })
  );
});
