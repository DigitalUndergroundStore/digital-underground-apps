/**
 * Share-button clicks for the owner HUD.
 * One KV key, one read + one write per accepted beacon. No email, no chat.
 *
 * share:stats {
 *   total, bySurface: { listing, league, featured, nav, other },
 *   byDay: { YYYYMMDD: { total, listing, league, featured, nav, other } },
 *   recent: [{ t, surface, path, id?, title? }]
 * }
 */

export const SHARE_STATS_KEY = "share:stats";
export const SHARE_SURFACES = ["listing", "league", "featured", "nav", "other"];
const MAX_RECENT = 40;
const MAX_DAYS = 14;
const MAX_PER_HOUR = 120;
const DEDUPE_MS = 2000;

const recentHits = new Map();
/** @type {Map<string, { count: number, reset: number }>} */
const rateByIp = new Map();

function utcDay(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10).replace(/-/g, "");
}

function zeroSurfaces() {
  return { listing: 0, league: 0, featured: 0, nav: 0, other: 0 };
}

function zeroDay() {
  return { total: 0, ...zeroSurfaces() };
}

function emptyStats() {
  return { total: 0, bySurface: zeroSurfaces(), byDay: {}, recent: [] };
}

function stripEmail(text) {
  return String(text || "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "");
}

export function cleanSharePath(raw) {
  let path = stripEmail(String(raw || "")).split("?")[0].split("#")[0].trim();
  if (!path.startsWith("/")) return "";
  if (path.includes("\\") || path.includes("..")) return "";
  if (path.length > 200) path = path.slice(0, 200);
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(path)) return "";
  return path;
}

export function cleanShareId(raw) {
  const id = String(raw || "").trim();
  if (!id) return "";
  return /^cm_[A-Za-z0-9_-]{4,48}$/.test(id) ? id : "";
}

export function cleanShareTitle(raw) {
  const title = stripEmail(String(raw || ""))
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  return title;
}

export function cleanShareSurface(raw) {
  const surface = String(raw || "").trim().toLowerCase();
  return SHARE_SURFACES.includes(surface) ? surface : "";
}

/** Returns a stored event, or null when the beacon should be ignored. */
export function sanitizeShareEvent(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const surface = cleanShareSurface(body.surface);
  const path = cleanSharePath(body.path);
  if (!surface || !path) return null;
  const event = { t: Date.now(), surface, path };
  const id = cleanShareId(body.id);
  const title = cleanShareTitle(body.title);
  if (id) event.id = id;
  if (title) event.title = title;
  return event;
}

function allow(ip, event) {
  const now = Date.now();
  const sig = `${ip}|${event.surface}|${event.path}|${event.id || ""}`;
  const prev = recentHits.get(sig) || 0;
  if (now - prev < DEDUPE_MS) return false;
  recentHits.set(sig, now);
  if (recentHits.size > 5000) recentHits.clear();

  let bucket = rateByIp.get(ip);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + 60 * 60 * 1000 };
    rateByIp.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > MAX_PER_HOUR) return false;
  if (rateByIp.size > 5000) rateByIp.clear();
  return true;
}

function normalize(row) {
  const base = emptyStats();
  if (!row || typeof row !== "object") return base;
  base.total = Number.isFinite(row.total) ? row.total : 0;
  for (const surface of SHARE_SURFACES) {
    const n = row.bySurface && row.bySurface[surface];
    base.bySurface[surface] = Number.isFinite(n) ? n : 0;
  }
  if (row.byDay && typeof row.byDay === "object") {
    for (const [day, val] of Object.entries(row.byDay)) {
      if (!/^\d{8}$/.test(day) || !val || typeof val !== "object") continue;
      const item = zeroDay();
      item.total = Number.isFinite(val.total) ? val.total : 0;
      for (const surface of SHARE_SURFACES) {
        item[surface] = Number.isFinite(val[surface]) ? val[surface] : 0;
      }
      base.byDay[day] = item;
    }
  }
  base.recent = Array.isArray(row.recent)
    ? row.recent.filter((ev) => ev && typeof ev.t === "number" && cleanShareSurface(ev.surface) && cleanSharePath(ev.path)).slice(0, MAX_RECENT)
    : [];
  return base;
}

function sumDays(byDay, days) {
  const out = { total: 0, bySurface: zeroSurfaces() };
  const now = Date.now();
  for (let i = 0; i < days; i++) {
    const day = byDay[utcDay(now - i * 86400000)];
    if (!day) continue;
    out.total += day.total || 0;
    for (const surface of SHARE_SURFACES) out.bySurface[surface] += day[surface] || 0;
  }
  return out;
}

export function presentShareStats(row, recentLimit = 40) {
  const stats = normalize(row);
  const todayKey = utcDay();
  const today = stats.byDay[todayKey] || zeroDay();
  return {
    total: stats.total,
    bySurface: stats.bySurface,
    today: today.total,
    todayBySurface: {
      listing: today.listing,
      league: today.league,
      featured: today.featured,
      nav: today.nav,
      other: today.other,
    },
    last7: sumDays(stats.byDay, 7),
    recent: stats.recent.slice(0, recentLimit).map((ev) => {
      const item = { t: ev.t, surface: ev.surface, path: ev.path };
      if (ev.id) item.id = ev.id;
      if (ev.title) item.title = ev.title;
      return item;
    }),
  };
}

export async function readShareStats(kv, recentLimit = 40) {
  if (!kv) return presentShareStats(null, recentLimit);
  const row = await kv.get(SHARE_STATS_KEY, "json");
  return presentShareStats(row, recentLimit);
}

function pruneDays(byDay) {
  const keys = Object.keys(byDay).sort();
  while (keys.length > MAX_DAYS) {
    delete byDay[keys.shift()];
  }
}

/**
 * Persist one share click. Returns { counted } .
 * Dropped duplicates and over-limit bursts still count as not stored.
 */
export async function recordShare(kv, body, ip = "unknown") {
  const event = sanitizeShareEvent(body);
  if (!event || !kv) return { counted: 0 };
  if (!allow(String(ip || "unknown"), event)) return { counted: 0, deduped: true };

  const row = normalize(await kv.get(SHARE_STATS_KEY, "json"));
  const dayKey = utcDay(event.t);
  const day = row.byDay[dayKey] || (row.byDay[dayKey] = zeroDay());
  day.total += 1;
  day[event.surface] += 1;
  row.total += 1;
  row.bySurface[event.surface] += 1;
  row.recent.unshift(event);
  if (row.recent.length > MAX_RECENT) row.recent.length = MAX_RECENT;
  pruneDays(row.byDay);
  await kv.put(SHARE_STATS_KEY, JSON.stringify(row));
  return { counted: 1 };
}
