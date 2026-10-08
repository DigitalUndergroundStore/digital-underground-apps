/* Cork's offline shell. Only this folder is cached, so a /cork/ install
   does not handle the rest of the site. Gumroad is never intercepted. */
var CACHE = "cork-shell-v2";
var SHELL = [
  "index.html",
  "Cork.html",
  "config.js",
  "scoring.js",
  "checkouts.js",
  "license.js",
  "app.js",
  "sw.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

function inApp(url) {
  return url.origin === self.location.origin &&
    url.pathname.indexOf(new URL("./", self.location).pathname) === 0;
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf("cork-shell-") === 0 && key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  var url;
  if (req.method !== "GET") return;
  url = new URL(req.url);
  if (!inApp(url)) return;
  event.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) {
        return cache.put(req, copy);
      }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("index.html");
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});
