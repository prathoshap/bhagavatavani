/* Bhāgavatam PWA service worker — cache the app shell for offline + instant repeat loads.
   The big binaries (bhagavatam.db ~25MB, tanpura.wav) are NOT precached here — they're cached at
   runtime by the cache-first fetch handler on first request, so install stays fast and the DB
   isn't downloaded twice. Bump CACHE on every deploy to push updates (activate purges old caches). */
const CACHE = 'bhag-v4';
const SHELL = ['./', './index.html', './app.css', './app.js', './normalize.js',
  './sql-wasm.js', './sql-wasm.wasm', './manifest.webmanifest'];

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
  // R2 recitation audio (.m4a) → network only; local tanpura.wav stays cacheable
  if (u.pathname.endsWith('.m4a')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    if (resp.ok && u.origin === location.origin) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return resp;
  }).catch(() => caches.match('./index.html'))));
});
