// PrimeOps moved to https://primeops-next.netlify.app.
// This replacement worker removes the old app's offline copy and unregisters itself,
// then reloads open pages so they follow the redirect to the new address.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
    } catch (_) {}
  })());
});
// No fetch handler: every request goes straight to the network, where the redirect applies.
