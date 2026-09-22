/* sw.js - the service worker: the game keeps working with no network.

   The version string is written by build.py from the hash of the built
   page, so every build gets a cache of its own and the old ones are
   dropped when this worker activates. In the source folder the string
   stays 05b8646e1c36, which is fine: there the page is many small files
   and only the ones listed here are ever served from the cache. */

var VERSION = '05b8646e1c36';
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

/* Only what was precached is answered by this worker. The page itself
   (a navigation) goes to the network first, with a short timeout, and to
   the cache only when the network fails, so a new build shows on the very
   next load and the game still opens with no network. The icons and the
   manifest, which never change between builds, come cache first. */
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

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    promise.then(function (v) { clearTimeout(t); resolve(v); },
                 function (err) { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', function (e) {
  if (!handled(e.request)) return;
  var isPage = e.request.mode === 'navigate';
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(e.request, { ignoreSearch: true }).then(function (hit) {
        /* the page is asked for afresh, past the browser's own cache, so
           the ten minutes GitHub allows it do not add to the wait */
        var ask = isPage ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : e.request;
        var live = fetch(ask).then(function (res) {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        });
        if (!isPage) return hit || live.catch(function () { return hit; });
        return withTimeout(live, 4000).catch(function () {
          return hit || live;
        });
      });
    })
  );
});
