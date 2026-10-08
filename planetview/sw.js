const CACHE = "planetview-v2";
const BASE = new URL("./", self.location).pathname;

function under(suffix) {
  return `${BASE}${suffix.replace(/^\//, "")}`;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function cacheable(url) {
  const path = url.pathname;
  return (
    path.startsWith(under("globe/")) ||
    path.startsWith(under("geo/")) ||
    path.startsWith(under("moon-sites/")) ||
    path.startsWith(under("icons/")) ||
    path === under("manifest.webmanifest")
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith(under("api/")) || url.pathname.startsWith("/__grok/")) return;

  const shell = new URL("./", self.location).href;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(shell, copy));
          return response;
        })
        .catch(() => caches.match(shell)),
    );
    return;
  }

  if (!cacheable(url)) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
