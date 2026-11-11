// Homepage cover URLs: remap known heavy/local assets, and send the first eager
// third-party covers through /api/community/img so LCP is same-origin and cacheable.
export const EAGER_COVER_COUNT = 4;

export const COVER_REMAP = {
  "https://food-hunt.org/og-image.png": "/community/media/food-hunt-cover.webp?v=20261107a",
  "https://digitalundergroundstore.com/community/media/cyberarena-cover.png": "/community/media/cyberarena-cover.webp?v=20261107a",
};

function pathOnly(u) {
  return String(u).split("?")[0];
}

export function isAlreadyProxiedCover(u) {
  return /^\/api\/community\/(img|gimg)\b/i.test(u) || /\/api\/community\/(img|gimg)\?/i.test(u);
}

export function isSameOriginCover(u) {
  if (!u) return false;
  if (isAlreadyProxiedCover(u)) return true;
  if (u.startsWith("/") && !u.startsWith("//")) return true;
  try {
    const p = new URL(u, "https://digitalundergroundstore.com");
    return /^(www\.)?digitalundergroundstore\.com$/i.test(p.hostname);
  } catch {
    return false;
  }
}

/** Stable cache-busting token from the source URL so a new cover gets a new proxy URL. */
export function coverVersion(u) {
  const k = pathOnly(u);
  return String(k.length) + "-" + k.slice(-32);
}

/**
 * @param {string} u
 * @param {{ id?: string, index?: number }} [opts]
 */
export function coverSrc(u, opts = {}) {
  if (!u) return u;
  const k = pathOnly(u);
  if (COVER_REMAP[k]) return COVER_REMAP[k];
  const index = opts.index;
  if (typeof index === "number" && index >= EAGER_COVER_COUNT) return u;
  const id = opts.id;
  if (id && /^https:\/\//i.test(u) && !isSameOriginCover(u)) {
    return `/api/community/img?id=${encodeURIComponent(id)}&v=${encodeURIComponent(coverVersion(u))}`;
  }
  return u;
}
