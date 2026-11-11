// Marketplace listing order (not the League). Deterministic at request time, no cron:
//  1. non-Featured listings live < 24h (liveAt / ownerApprovedAt), newest first, with isNew = true
//     (Featured / curated keep their badge but do NOT get this top bump — they stay in rotation)
//  2. existing pinned.json order
//  3. everyone else in a seeded shuffle keyed on floor(now / 48h); curated picks sort after makers' own listings.
export const NEW_MS = 24 * 60 * 60 * 1000;
export const ROTATE_MS = 48 * 60 * 60 * 1000;
/** Manual Featured picks (badge + spotlight). Keep in sync with assets/du-featured/du-featured.js + index.html. */
export const FEATURED_IDS = [
  "cm_kerzy_neonbastion", // Rival Lanes
];
export const liveTime = (r) => Number(r && (r.liveAt || r.ownerApprovedAt)) || 0;
export const isNewListing = (r, now = Date.now()) => { const t = liveTime(r); return t > 0 && t <= now + 60000 && now - t < NEW_MS; };
export const isFeaturedListing = (r) => !!(r && (r.curated || FEATURED_IDS.includes(r.id)));

function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
const mix = (x) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; return (x ^ (x >>> 16)) >>> 0; };

export function orderListings(rows, { pinned = [], now = Date.now() } = {}) {
  const win = Math.floor(now / ROTATE_MS);
  const key = (r) => mix(hash(String(r.id)) ^ mix(win + 0x9e3779b9));
  const fresh = [], pin = [], rest = [];
  for (const r of rows) {
    // Featured/curated: keep badge client-side, but never float to the top via the 24h bump
    if (isNewListing(r, now) && !isFeaturedListing(r)) fresh.push({ ...r, isNew: true });
    else if (pinned.includes(r.id)) pin.push({ ...r, isNew: false });
    else rest.push({ ...r, isNew: isNewListing(r, now) && isFeaturedListing(r) ? true : false });
  }
  fresh.sort((a, b) => liveTime(b) - liveTime(a) || String(a.id).localeCompare(String(b.id)));
  pin.sort((a, b) => pinned.indexOf(a.id) - pinned.indexOf(b.id));
  rest.sort((a, b) => (a.curated ? 1 : 0) - (b.curated ? 1 : 0) || key(a) - key(b) || String(a.id).localeCompare(String(b.id)));
  return [...fresh, ...pin, ...rest];
}
