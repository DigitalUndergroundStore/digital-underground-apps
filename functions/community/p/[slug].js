// /community/p/<name-slug>-<id-tail>/ : pretty, crawlable listing pages (Nov 2 2026).
// Serves the same client shell as /community/p/?id=, with the id pre-set and per-listing meta injected.
// Unknown slugs and real files (detail.css, wolf-sniff/) fall through to static assets.
import { allPublicListings, listingSlug, idTail } from "../../_lib/listing-url.js";
import { renderListing } from "./index.js";
import { edgeCached, hasAuthCookie } from "../../_lib/edgecache.js";

export const LISTING_CACHE_TTL = 120;
export const LISTING_CACHE_SWR = 600;

export function listingCacheKey(origin, slug) {
  return origin + "/__du_cache/listing-ssr-v1/" + slug;
}

export async function cachedListingGet(context, produce) {
  if (hasAuthCookie(context.request)) {
    const res = await produce();
    if (res.status !== 200) return res;
    const h = new Headers(res.headers);
    h.set("Cache-Control", "private, no-store");
    h.set("x-du-cache", "BYPASS");
    return new Response(res.body, { status: res.status, headers: h });
  }
  const url = new URL(context.request.url);
  const slug = String(context.params.slug || "").toLowerCase();
  return edgeCached(context, listingCacheKey(url.origin, slug), LISTING_CACHE_TTL, LISTING_CACHE_SWR, produce);
}

export async function onRequestGet(context) {
  return cachedListingGet(context, () => renderPretty(context));
}

async function renderPretty(context) {
  const slug = String(context.params.slug || "").toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || slug === "wolf-sniff") return context.next();
  const rows = await allPublicListings(context).catch(() => []);
  let row = rows.find((r) => listingSlug(r) === slug);
  if (!row) { // renamed listing: match on the id tail, then 301 to the current slug
    const t = slug.split("-").pop();
    row = rows.find((r) => idTail(r.id) === t);
    if (!row && rows.dupOf) for (const [id, keep] of rows.dupOf) if (idTail(id) === t) { row = keep; break; } // double-submit: send to the kept copy
    if (!row) return context.next();
  }
  const url = new URL(context.request.url);
  const want = `/community/p/${listingSlug(row)}/`;
  if (url.pathname !== want) return Response.redirect(new URL(want + url.search, url).toString(), 301);
  const shell = await context.env.ASSETS.fetch(new URL("/community/p/", url));
  let html = (await shell.text())
    .replace('href="../community.css', 'href="/community/community.css').replace('href="detail.css', 'href="/community/p/detail.css')
    .replace("<script>\n(function () {", `<script>window.__DU_LID=${JSON.stringify(row.id)};</script>\n<script>\n(function () {`);
  const h = new Headers(shell.headers); h.delete("content-length"); h.set("content-type", "text/html; charset=utf-8");
  return renderListing(new Response(html, { status: 200, headers: h }), row, row.id);
}
