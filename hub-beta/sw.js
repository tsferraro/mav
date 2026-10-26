/* Hub Mandū · Beta — guarda a casca do Hub para abrir sem rede. Rede primeiro (o Beta muda a toda hora),
   cópia guardada só quando a rede falha. Não guarda os apps (outra origem: Apps Script). */
var CACHE = 'hub-mandu-20261026-1459';
var CASCA = ['./', 'index.html', 'hub.css?v=20261026-1459', 'hub.js?v=20261026-1459', 'manifest.webmanifest',
  'img/cena-trabalhar.webp', 'img/cena-aprender.webp', 'img/cena-administrar.webp',
  'img/faixa-trabalhar.webp', 'img/faixa-aprender.webp', 'img/faixa-administrar.webp',
  'icones/u-mandu-32.png', 'icones/u-mandu-180.png', 'icones/u-mandu-192.png', 'icones/u-mandu-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CASCA); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('hub-mandu-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(fetch(r).then(function (resp) {
    if (resp && resp.ok) { var copia = resp.clone(); caches.open(CACHE).then(function (c) { c.put(r, copia); }); }
    return resp;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: r.mode === 'navigate' }).then(function (m) { return m || caches.match('index.html'); });
  }));
});
