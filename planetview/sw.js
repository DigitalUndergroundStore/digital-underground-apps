const CACHE = "planetview-v1-autoupdate10";
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
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clients) => {
        for (const c of clients) {
          try {
            c.postMessage({ type: "PV_FORCE_RELOAD", v: "autoupdate10" });
          } catch (e) {}
          try {
            if (c.navigate) c.navigate(c.url);
          } catch (e) {}
        }
      }),
  );
});

function cacheable(url) {
  const path = url.pathname;
  if (/\.(?:js|mjs|css|html|json|webmanifest)$/i.test(path)) return false;
  return (
    path.startsWith(under("globe/")) ||
    path.startsWith(under("geo/")) ||
    path.startsWith(under("moon-sites/")) ||
    path.startsWith(under("icons/")) ||
    path.startsWith(under("audio/")) ||
    path.startsWith(under("stories/"))
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith(under("api/"))) return;

  // Always network for JS/CSS/HTML — never Cache API.
  if (/\.(?:js|mjs|css|html|json|webmanifest)$/i.test(url.pathname) || event.request.mode === "navigate") {
    if (event.request.mode === "navigate") {
      const shell = new URL("./", self.location).href;
      event.respondWith(
        fetch(event.request, { cache: "no-store" })
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
    event.respondWith(fetch(event.request, { cache: "no-store" }));
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

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data && e.data.type === "CLEAR_CACHES") {
    e.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});
