/* Box & Go offline cache. Only encrypted/app-shell files are cached; nothing here can read the tool. */
var CACHE = "box-and-go-202610072058-123673fa";
var FILES = ["index.html", "unlock.js?v=202610072058-123673fa", "app.bin?v=202610072058-123673fa", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf("box-and-go-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var url = new URL(req.url); if (url.origin !== location.origin || url.pathname.indexOf(new URL("./", location).pathname) !== 0) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: req.mode === "navigate" }).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok && res.type === "basic") c.put(req, res.clone()); return res; });
      if (hit) { net.catch(function () {}); return hit; }
      return net.catch(function () { return req.mode === "navigate" ? c.match("index.html") : Response.error(); });
    });
  }));
});
