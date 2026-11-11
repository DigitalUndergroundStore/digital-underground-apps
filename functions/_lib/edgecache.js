// Short edge cache (Cache API) with stale-while-revalidate for public, non-personalized GETs.
// Audit Nov 4 2026: home SSR, /api/community/listings were uncached (1-10s TTFB).
const STAMP = "x-du-cached-at";
export async function edgeCached(context, key, ttl, swr, produce) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (!cache) return produce();
  const req = new Request(key, { method: "GET" });
  const store = async () => {
    const res = await produce();
    if (res.status !== 200 || res.headers.has("set-cookie")) return res;
    const copy = new Response(res.clone().body, res);
    copy.headers.set(STAMP, String(Date.now()));
    copy.headers.set("Cache-Control", `public, max-age=${ttl + swr}`); // edge storage lifetime only
    await cache.put(req, copy).catch(() => {});
    const out = new Response(res.body, res); out.headers.set("x-du-cache", "MISS"); return out;
  };
  let hit = null;
  try { hit = await cache.match(req); } catch {}
  if (hit) {
    const age = (Date.now() - Number(hit.headers.get(STAMP) || 0)) / 1000;
    if (age < ttl + swr) {
      const out = new Response(hit.body, hit);
      out.headers.delete(STAMP);
      out.headers.set("Cache-Control", `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr}`);
      out.headers.set("x-du-cache", age < ttl ? "HIT" : "STALE");
      if (age >= ttl && context.waitUntil) context.waitUntil(store().catch(() => {}));
      return out;
    }
  }
  const res = await store();
  const out = new Response(res.body, res);
  if (res.status === 200) out.headers.set("Cache-Control", `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr}`);
  return out;
}

// Session cookies that mean the response must not be stored or served from the public edge cache.
export const AUTH_COOKIES = ["du_creator", "du_owner_sess"];

export function hasAuthCookie(request) {
  const c = request && request.headers ? (request.headers.get("Cookie") || request.headers.get("cookie") || "") : "";
  if (!c) return false;
  return AUTH_COOKIES.some((name) => new RegExp("(?:^|;\\s*)" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=", "i").test(c));
}
