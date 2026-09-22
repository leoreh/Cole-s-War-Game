/* sw.js - the service worker: the game keeps working with no network.

   The version string is written by build.py from the hash of the built
   page, so every build gets a cache of its own and the old ones are
   dropped when this worker activates. In the source folder the string
   stays 7f7b33eb749c, which is fine: there the page is many small files
   and only the ones listed here are ever served from the cache. */

var VERSION = '7f7b33eb749c';
var CACHE = 'wargame-' + VERSION;

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      /* one missing icon must not fail the whole install */
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () { });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE && k.indexOf('wargame-') === 0) return caches.delete(k);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Only what was precached is answered from the cache, and then cache first
   with a refresh in the background, so the next load has the new page. */
function handled(request) {
  if (request.method !== 'GET') return false;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (request.mode === 'navigate') return true;
  var base = new URL('./', self.location.href).pathname;
  var rest = url.pathname.indexOf(base) === 0 ? url.pathname.slice(base.length) : null;
  if (rest === null) return false;
  return ASSETS.indexOf('./' + rest) >= 0 || (rest === '' && ASSETS.indexOf('./') >= 0);
}

self.addEventListener('fetch', function (e) {
  if (!handled(e.request)) return;
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(e.request, { ignoreSearch: true }).then(function (hit) {
        var live = fetch(e.request).then(function (res) {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || live;
      });
    })
  );
});
