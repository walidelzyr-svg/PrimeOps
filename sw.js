// PrimeOps service worker.
//
// Caches ONLY the same-origin static app shell (index.html, manifest.json,
// icon.svg). It never intercepts or stores cross-origin requests (Supabase
// REST / Auth / Storage / Edge Functions, Google, the esm.sh module) or any
// non-GET request, so no per-user, RLS-scoped, authenticated, or guest/staff
// data — and no tokens or private attachments — can ever enter the Cache API
// or be served across sessions or accounts on a shared device.
// guest.html is always fetched fresh and never cached.
const CACHE = 'primeops-v18'; // Batch 8 (2026-10-21): new cache name so every device picks up the new app files
const SHELL = ['./index.html', './manifest.json', './icon.svg'];
// The only same-origin pathnames we are allowed to cache (the static shell).
const SHELL_PATHS = new Set(['/', '/index.html', '/manifest.json', '/icon.svg']);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Delete every other cache. This also purges caches left by older service
  // worker versions that may have stored API responses, cleaning up affected
  // devices the moment this version activates.
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Only ever intercept same-origin GET requests. Everything else — all
  // cross-origin traffic (Supabase REST/Auth/Storage/Edge, Google Translate,
  // esm.sh) and every non-GET request — is left entirely to the browser and is
  // NEVER stored. This is what keeps guest/staff data, PINs, tokens, and
  // attachments out of the cache and prevents cross-session/account exposure.
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return; // no respondWith -> normal browser fetch, nothing cached by the SW
  }

  // guest.html is a separate, always-fresh page: fetch live, never cache.
  if (url.pathname.endsWith('/guest.html')) {
    e.respondWith(fetch(req));
    return;
  }

  // Only the explicitly approved static shell is cached (network-first, with an
  // offline fallback to the cached shell). Any other same-origin GET goes to
  // the network uncached.
  if (!SHELL_PATHS.has(url.pathname)) {
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
  );
});
