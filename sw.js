/* Bhāgavatam PWA service worker — cache app shell + DB for offline reading. */
const CACHE = 'bhag-v3';
const SHELL = ['./', './index.html', './app.css', './app.js', './normalize.js',
  './manifest.webmanifest', './bhagavatam.db', './tanpura.wav'];

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
