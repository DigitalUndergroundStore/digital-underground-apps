const CACHE = "planetview-v15-3d";
const BASE = new URL("./", self.location).pathname;

function under(suffix) {
  return `${BASE}${suffix.replace(/^\//, "")}`;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        under("version.json"),
        under("manifest.webmanifest"),
        under("icons/icon-192.png"),
        under("icons/icon-512.png"),
      ]),
    ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  // GitHub Pages serves several apps from one origin. Drop only this app's old caches.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("planetview-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
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
    path.startsWith(under("assets/")) ||
    path.startsWith(under("stories/")) ||
    path === under("manifest.webmanifest")
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith(under("api/"))) return;

  const shell = new URL("./", self.location).href;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(shell, copy));
          }
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
