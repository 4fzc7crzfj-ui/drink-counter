/* Tap Drink 2 only. Scope is this folder.
   Never delete caches that do not start with "tapdrink2-".
   The root Tap Drink app keeps its own cache (drinks-v*) and this file must not touch it. */
var CACHE = 'tapdrink2-v5';
var FILES = [
  './',
  './index.html',
  './economy.js',
  './manifest.json',
  './icon-180.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.ico'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key.indexOf('tapdrink2-') === 0 && key !== CACHE;
    }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/tapdrink2/') === -1) return;
  event.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () {});
    }
    return res;
  }).catch(function () { return caches.match(req); }));
});
