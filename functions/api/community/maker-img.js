/** GET /api/community/maker-img?slug=<slug>&k=logo|banner&v=<ver> — approved maker profile images only. */
import { getKv } from "../../_lib/community.js";
import { liveImage, validSlug } from "../../_lib/makers.js";
const TYPES = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "", k = url.searchParams.get("k") || "";
  if (!validSlug(slug) || (k !== "logo" && k !== "banner")) return new Response("Not found", { status: 404 });
  const cache = caches.default;
  const hit = await cache.match(request).catch(() => null);
  if (hit) return hit;
  const kv = getKv(env);
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(kv ? await liveImage(kv, slug, k) : "");
  if (!m) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const bin = atob(m[2]); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const res = new Response(bytes, { headers: { "Content-Type": TYPES[m[1]], "Cache-Control": "public, max-age=604800", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  context.waitUntil(cache.put(request, res.clone()).catch(() => {}));
  return res;
}
