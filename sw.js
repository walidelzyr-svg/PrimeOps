const CACHE = 'primeops-v6';
const FILES = ['./index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try to fetch the latest version.
// Only fall back to the cached copy if the network is unavailable.
self.addEventListener('fetch', (e) => {
  // guest.html is a separate, lightweight, always-fresh page for guests --
  // never cache it or serve a stale copy, even offline. Staff testing this
  // app on the same device would otherwise have this service worker
  // intercept guest.html too and risk serving an old cached version.
  if (e.request.url.includes('guest.html')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Only GET responses are cacheable -- the Cache API rejects
        // POST/PUT/etc (e.g. Supabase's auth token-refresh calls),
        // which is what was throwing the console error.
        if (e.request.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, resClone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
