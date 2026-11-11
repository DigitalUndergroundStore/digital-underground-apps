/**
 * GET /api/community/img?id=<listingId>&v=<version>
 * Serves a listing's cover as a real image file, so /api/community/listings stays small
 * and first-card third-party covers can be same-origin + long-cached.
 * Approved listings only. Data: URI uploads are decoded here; https covers are fetched
 * with SSRF-safe checks and a short 302 fallback to the original URL if the fetch fails.
 */
import { getKv, kvGetListing } from "../../_lib/community.js";

const TYPES = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
const MAX_PROXY_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_HOPS = 3;
const UA = "DigitalUnderground-CoverProxy/1.0";

function imgHeaders(type, cacheControl) {
  return {
    "Content-Type": type,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
}

function typeFromContentType(ct) {
  const m = /^image\/(jpeg|jpg|png|webp|gif)\b/i.exec(String(ct || "").split(";")[0].trim());
  if (!m) return null;
  const k = m[1].toLowerCase() === "jpg" ? "jpeg" : m[1].toLowerCase();
  return TYPES[k] || null;
}

/** Public https hosts only. No credentials, IPs, localhost, or private-looking names. */
export function isSafeCoverTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (!h || h.startsWith("[") || h.includes(":")) return false; // IPv6 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || /^\d+$/.test(h) || /^0x[0-9a-f]+$/i.test(h)) return false;
  if (!h.includes(".")) return false;
  if (h === "localhost" || h.endsWith(".localhost")) return false;
  if (/(^|\.)(local|internal|intranet|lan|home|corp|localdomain|arpa)$/.test(h)) return false;
  // Don't proxy our own image endpoint (redirect loops).
  if (/^(www\.)?digitalundergroundstore\.com$/i.test(h) && /^\/api\/community\/img\/?$/i.test(u.pathname)) return false;
  return true;
}

export function hostedFallback(hosted) {
  return new Response(null, { status: 302, headers: { Location: hosted, "Cache-Control": "public, max-age=60" } });
}

export async function fetchCoverBytes(hosted, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let target = hosted;
    let response;
    for (let hop = 0; ; hop++) {
      if (!isSafeCoverTarget(target)) throw new Error("unsafe host");
      response = await fetchImpl(target, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        credentials: "omit",
        headers: { "User-Agent": UA, Accept: "image/webp,image/jpeg,image/png,image/gif,*/*;q=0.8" },
      });
      if (response.status >= 300 && response.status <= 399) {
        const loc = response.headers.get("Location");
        try { if (response.body) await response.body.cancel(); } catch { /* ignore */ }
        if (!loc) throw new Error("redirect without location");
        if (hop >= MAX_HOPS) throw new Error("too many redirects");
        target = new URL(loc, target).toString();
        continue;
      }
      break;
    }
    if (!response.ok) {
      try { if (response.body) await response.body.cancel(); } catch { /* ignore */ }
      throw new Error("http " + response.status);
    }
    const type = typeFromContentType(response.headers.get("content-type"));
    if (!type) {
      try { if (response.body) await response.body.cancel(); } catch { /* ignore */ }
      throw new Error("not a raster image");
    }
    const len = Number(response.headers.get("content-length") || 0);
    if (len > MAX_PROXY_BYTES) {
      try { if (response.body) await response.body.cancel(); } catch { /* ignore */ }
      throw new Error("too large");
    }
    const buf = await response.arrayBuffer();
    if (buf.byteLength > MAX_PROXY_BYTES) throw new Error("too large");
    if (buf.byteLength < 24) throw new Error("too small");
    return { bytes: new Uint8Array(buf), type };
  } finally {
    clearTimeout(timer);
  }
}

export async function serveHostedCover(hosted, requestUrl, { fetchImpl = fetch, cache = null } = {}) {
  if (!isSafeCoverTarget(hosted)) return hostedFallback(hosted);
  const long = requestUrl.searchParams.get("v") ? "public, max-age=604800, s-maxage=604800" : "public, max-age=86400, s-maxage=86400";
  const cacheKey = cache ? new Request(requestUrl.origin + "/api/community/img?__proxy=" + encodeURIComponent(hosted), { method: "GET" }) : null;
  if (cache && cacheKey) {
    const hit = await cache.match(cacheKey).catch(() => null);
    if (hit) return hit;
  }
  try {
    const { bytes, type } = await fetchCoverBytes(hosted, fetchImpl);
    const res = new Response(bytes, { headers: imgHeaders(type, long) });
    if (cache && cacheKey) await cache.put(cacheKey, res.clone()).catch(() => {});
    return res;
  } catch {
    return hostedFallback(hosted);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(id)) return new Response("Not found", { status: 404 });
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const hit = cache ? await cache.match(request).catch(() => null) : null;
  if (hit) return hit;
  const kv = getKv(env);
  const row = kv ? await kvGetListing(kv, id) : null;
  const m = row && row.status === "approved" && typeof row.imageUrl === "string"
    ? /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/i.exec(row.imageUrl)
    : null;
  if (!m) {
    const hosted = row && row.status === "approved" && typeof row.imageUrl === "string" && /^https:\/\//i.test(row.imageUrl) ? row.imageUrl : null;
    if (!hosted) {
      const loc = new URL("/assets/logo/du-mark.png", url.origin).toString();
      return new Response(null, { status: 302, headers: { Location: loc, "Cache-Control": "no-store" } });
    }
    const res = await serveHostedCover(hosted, url, { cache });
    if (cache && res.status === 200) context.waitUntil && context.waitUntil(cache.put(request, res.clone()).catch(() => {}));
    return res;
  }
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const res = new Response(bytes, {
    headers: imgHeaders(TYPES[m[1].toLowerCase()], url.searchParams.get("v") ? "public, max-age=604800" : "public, max-age=3600"),
  });
  if (cache) context.waitUntil && context.waitUntil(cache.put(request, res.clone()).catch(() => {}));
  return res;
}
