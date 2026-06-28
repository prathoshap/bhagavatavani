/* Bhāgavatam PWA service worker — precache the whole app (incl. the slimmed ~12.5MB DB, 4.3MB gz)
   so the FIRST visit caches everything and every later visit is instant + fully offline.
   CODE (html/js/css) is served stale-while-revalidate: cache instantly, refresh in the background, so
   a code update shows on the NEXT load with NO version bump and NO DB re-download. The big stable
   assets (DB, wasm, tanpura) are cache-first. ONLY bump CACHE when the DB / precache list changes. */
const CACHE = 'bhag-v10';
const SHELL = ['./', './index.html', './app.css', './app.js', './normalize.js',
  './sql-wasm.js', './sql-wasm.wasm', './manifest.webmanifest', './bhagavatam.db'];
const CODE = new Set(['/', '/index.html', '/app.js', '/app.css', '/normalize.js']);   // stale-while-revalidate

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;            // cross-origin (R2 .m4a etc.) → browser default
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request);
    if (CODE.has(u.pathname)){                          // stale-while-revalidate: serve cache, refresh in bg
      const fresh = fetch(e.request).then(r => { if (r && r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => null);
      return cached || (await fresh) || cache.match('/index.html');
    }
    if (cached) return cached;                          // cache-first for DB / wasm / tanpura / manifest
    const resp = await fetch(e.request).catch(() => null);
    if (resp && resp.ok) cache.put(e.request, resp.clone());
    return resp || cache.match('/index.html');
  }));
});
