/**
 * GET /api/community/img?id=<listingId>&v=<version>
 * Serves a listing's uploaded (data: URI) image as a real image file, so /api/community/listings
 * stays small. Approved listings only. Edge-cached per URL; `v` changes whenever the listing is edited.
 */
import { getKv, kvGetListing } from "../../_lib/community.js";

const TYPES = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(id)) return new Response("Not found", { status: 404 });
  const cache = caches.default;
  const hit = await cache.match(request).catch(() => null);
  if (hit) return hit;
  const kv = getKv(env);
  const row = kv ? await kvGetListing(kv, id) : null;
  const m = row && row.status === "approved" && typeof row.imageUrl === "string"
    ? /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/i.exec(row.imageUrl)
    : null;
  if (!m) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const res = new Response(bytes, {
    headers: {
      "Content-Type": TYPES[m[1].toLowerCase()],
      "Cache-Control": url.searchParams.get("v") ? "public, max-age=604800" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
  context.waitUntil(cache.put(request, res.clone()).catch(() => {}));
  return res;
}
