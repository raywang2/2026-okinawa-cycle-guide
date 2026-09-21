const VERSION = 'okinawa-v1';
const BASE = new URL('./', self.location).href;
// The production build replaces this list with its hashed JS/CSS entry files.
const PRECACHE = ['index.html', 'src/style.css', 'assets/main.js', 'assets/route-link.js', 'assets/pwa.js', 'assets/vendor/leaflet.js', 'assets/vendor/leaflet.css', 'app.webmanifest', 'assets/icon-192.png', 'assets/icon-512.png', 'public/data/routes.json', 'public/data/ramen.json', ...[1, 2, 3, 4, 5].map(day => `public/routes/generated/day-0${day}.gpx`)];
const CACHE = `${VERSION}-${new URL(BASE).pathname}`;
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(PRECACHE.map(path => new URL(path, BASE).href));
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('okinawa-') && key.endsWith(new URL(BASE).pathname) && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => { if (event.data === 'ACTIVATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  // Do not prefetch/cache third-party map tiles or intercept other GitHub Pages sites.
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw Error('Unavailable');
      if (request.mode === 'navigate' || /\.(?:js|css|json|gpx|png|jpg|jpeg|webp|svg|webmanifest)$/.test(url.pathname)) {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        const images = keys.filter(key => /\/images\//.test(key.url));
        if (images.length > 160) await cache.delete(images[0]);
      }
      return response;
    } catch {
      return await cache.match(request) || (request.mode === 'navigate' ? await cache.match(new URL('index.html', BASE)) : null) || Response.error();
    }
  })());
});
