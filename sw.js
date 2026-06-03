const CACHE = 'sigo-v3';
const BASE = new URL('./', self.location.href).href;
const SHELL = ['', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'].map(f => BASE + f);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const { hostname } = new URL(e.request.url);

  // Let API calls pass through — localStorage handles offline data display
  if (
    hostname.includes('open-meteo.com') ||
    hostname.includes('nominatim.openstreetmap.org') ||
    hostname.includes('waqi.info')
  ) {
    return;
  }

  // Navigation: network first, fall back to cached shell
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(BASE))
    );
    return;
  }

  // Static assets: cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
