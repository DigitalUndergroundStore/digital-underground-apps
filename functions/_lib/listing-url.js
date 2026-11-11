// Pretty listing URLs: /community/p/<name-slug>-<id-tail>/ (Nov 2 2026, SEO).
// Stateless: the same formula runs in browser JS (see assets/listing-url.js), so no lookup table.
// Old /community/p/?id=<id> links 301 here (functions/community/p/index.js).
import { getKv, listApproved, isRetired, dedupeListings } from "./community.js";
const SITE = "https://digitalundergroundstore.com";
const slugBase = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, "");
export const idTail = (id) => String(id || "").split("_").pop().toLowerCase().replace(/[^a-z0-9]/g, "");
export function listingSlug(row) {
  const b = slugBase(row && row.name), t = idTail(row && row.id);
  return b && b !== t ? `${b}-${t}` : t;
}
export const listingPath = (row) => `/community/p/${listingSlug(row)}/`;
export const listingUrl = (row) => SITE + listingPath(row);

/** Approved, non-retired listings: owner's static seed + live KV (KV wins). */
export async function allPublicListings(context) {
  const by = {};
  const kv = getKv(context.env);
  const [stat, live] = await Promise.all([
    context.env.ASSETS.fetch(new URL("/community/listings.json", context.request.url)).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    kv ? listApproved(kv, context.env).catch(() => []) : [],
  ]);
  for (const x of Array.isArray(stat) ? stat : stat.listings || []) if (x && x.id && (x.status || "approved") === "approved") by[x.id] = x;
  for (const x of live) if (x && x.id) by[x.id] = x;
  const out = dedupeListings(Object.values(by).filter((r) => !r.hidden && !isRetired(r)));
  if (live && live.dupOf) for (const [id, keep] of live.dupOf) if (!out.dupOf.has(id)) out.dupOf.set(id, keep);
  return out;
}
