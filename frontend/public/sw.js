// Service worker mínimo: hace la app instalable. A propósito NO guarda nada en caché:
// los datos de beneficiarios son sensibles y siempre deben venir del servidor.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request));
});
