/* Bhāgavatam PWA service worker — precache the whole app (incl. the slimmed ~12.5MB DB, 4.3MB gz)
   so the FIRST visit caches everything and every later visit is instant + fully offline. tanpura.wav
   is runtime-cached on first play. Bump CACHE on every deploy to push updates (activate purges old). */
const CACHE = 'bhag-v7';
const SHELL = ['./', './index.html', './app.css', './app.js', './normalize.js',
  './sql-wasm.js', './sql-wasm.wasm', './manifest.webmanifest', './bhagavatam.db'];

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
