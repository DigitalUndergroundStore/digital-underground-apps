/* due-desk offline shell — version 202610072058-0bf4bd7e. Regenerate: python3 tools/generate-hosted-sw.py */
/* Hosted buyer app service worker — generated; do not edit by hand.
   Regenerate with: python3 tools/generate-hosted-sw.py <slug> */
var VERSION = "202610072058-0bf4bd7e";
var CACHE = "due-desk-" + VERSION;
var PREFIX = "due-desk-";
var FILES = [
 "index.html",
 "unlock.js?v=202610072058-0bf4bd7e",
 "app.bin?v=202610072058-0bf4bd7e",
 "manifest.webmanifest",
 "icons/icon-180.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "version.json"
];

function inScope(url) {
  return url.origin === self.location.origin &&
    url.pathname.indexOf(new URL("./", self.location).pathname) === 0;
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) {
          return k.indexOf(PREFIX) === 0 && k !== CACHE;
        }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (!inScope(url)) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put(req, copy);
          }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match("index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        });
        if (hit) {
          net.catch(function () {});
          return hit;
        }
        return net.catch(function () {
          return Response.error();
        });
      });
    })
  );
});
