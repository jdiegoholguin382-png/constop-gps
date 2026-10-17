/* Constop GPS — funciona sin internet. Sube el número de versión al publicar cambios. */
const VERSION = 'constop-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const TILES = 'campo-tiles';
const MAX_TILES = 3000;

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trim() {
  const c = await caches.open(TILES); const ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_TILES; i++) await c.delete(ks[i]);
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const isTile = /arcgisonline\.com|tile\.openstreetmap\.org|opentopomap\.org/.test(u.host);
  const isFont = /fonts\.(googleapis|gstatic)\.com/.test(u.host);
  if (isTile || isFont) {
    // Mapas y fuentes: lo que ya viste queda guardado para usarlo sin señal en campo.
    e.respondWith(caches.open(isTile ? TILES : VERSION).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok || r.type === 'opaque') { c.put(e.request, r.clone()); if (isTile) trim(); } return r; }
      catch (err) { return hit || Response.error(); }
    }));
    return;
  }
  if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  }
});
