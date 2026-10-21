/**
 * Maker League: free weekly vote. Weeks start Monday 00:00 America/New_York and are computed
 * from the date (no cron). Week id = that Monday as YYYY-MM-DD.
 * KV keys (COMMUNITY_KV): lg:v:<week>:<ipHash>:<slot 0-2> -> listingId (up to IP_VOTES per hashed IP) (metadata {l, ign}),
 * lg:c:<week>:<cookieHash> -> "1", lg:w:<week> -> cached final winner of a finished week.
 */
const TZ = "America/New_York";
const DAY = 86400000;

function etParts(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return p;
}
const ymd = (p) => `${p.year}-${p.month}-${p.day}`;
const DOW = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Week id (ET Monday date) for a timestamp. */
export function weekOf(t = Date.now()) {
  const p = etParts(t);
  // Walk back by whole days to Monday in ET (noon anchor avoids DST edge issues).
  const noon = Date.UTC(+p.year, +p.month - 1, +p.day, 12);
  const mon = new Date(noon - DOW[p.weekday] * DAY);
  return mon.toISOString().slice(0, 10);
}
export function prevWeek(week) { return new Date(Date.parse(week + "T12:00:00Z") - 7 * DAY).toISOString().slice(0, 10); }
/** Exact UTC instant of the next Monday 00:00 ET after this week. */
export function weekEndsAt(week) {
  const next = new Date(Date.parse(week + "T12:00:00Z") + 7 * DAY).toISOString().slice(0, 10);
  for (const off of [4, 5]) { // EDT = UTC-4, EST = UTC-5
    const t = Date.parse(next + "T00:00:00Z") + off * 3600000;
    const p = etParts(t);
    if (ymd(p) === next && p.hour === "00" && p.minute === "00") return t;
  }
  return Date.parse(next + "T05:00:00Z");
}

export async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Counts per listing for a week (ignored votes excluded). */
export async function tally(kv, week) {
  const counts = new Map(); let cursor;
  do {
    const r = await kv.list({ prefix: `lg:v:${week}:`, cursor, limit: 1000 });
    for (const k of r.keys) { const m = k.metadata || {}; if (m.l && !m.ign) counts.set(m.l, (counts.get(m.l) || 0) + 1); }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return counts;
}

/** Kerzy Labs and Digital Underground (the owner's own products) stay on the marketplace but are not in the League. */
export function isKerzy(l) { return /^cm_kerzy_/.test(l.id) || /kerzy/i.test(l.makerName || "") || l.makerSlug === "kerzy-labs"; }
export function isOwnDU(l) { return /^digital\s*underground$/i.test((l.makerName || "").trim()) || l.makerSlug === "digital-underground"; }
/** Live, maker-made listings (excludes DU-curated third-party picks and Kerzy Labs). Same source as the marketplace. */
export async function eligible(origin) {
  try {
    const r = await fetch(`${origin}/api/community/listings`, { headers: { accept: "application/json" } });
    const d = await r.json();
    return (d.listings || []).filter((l) => l && l.id && !l.hidden && !l.curated && l.name && !isKerzy(l) && !isOwnDU(l));
  } catch { return []; }
}

const card = (l, votes) => ({ id: l.id, name: l.name, makerName: l.makerName, pitchShort: l.pitchShort, imageUrl: l.imageUrl, url: `/community/p/?id=${encodeURIComponent(l.id)}`, votes });

/** Standings: most votes first, ties by name. Only listings with votes are ranked. */
export function rank(list, counts) {
  return list.filter((l) => counts.get(l.id)).map((l) => card(l, counts.get(l.id)))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}

/** Winner of the previous (finished) week; cached in KV once computed since a finished week can't change. */
export async function lastWinner(kv, origin, now = Date.now()) {
  const wk = prevWeek(weekOf(now));
  let w = null;
  const cached = await kv.get(`lg:w:${wk}`, "json");
  if (cached) w = cached;
  else {
    const counts = await tally(kv, wk);
    const top = rank(await eligible(origin), counts)[0] || null;
    w = { week: wk, id: top ? top.id : null, votes: top ? top.votes : 0 };
    await kv.put(`lg:w:${wk}`, JSON.stringify(w));
  }
  if (!w.id) return null;
  const live = (await eligible(origin)).find((l) => l.id === w.id); // still live? show current listing text/image
  return live ? { week: wk, ...card(live, w.votes) } : null;
}
