import { listingPath } from "./listing-url.js";
/**
 * Maker League: free weekly vote. Weeks run Friday 00:00 to Thursday 11:59 PM America/Toronto
 * (i.e. they end at the Friday 00:00 instant) and are computed from the date (no cron).
 * Week id = the Friday the week starts, as YYYY-MM-DD. Transition: the launch week keeps id
 * 2026-10-19 (its votes are already keyed that way) and runs until Fri 2026-10-30 00:00 (Thu Oct 29 11:59 PM).
 * KV keys (COMMUNITY_KV): lg:v:<week>:<ipHash>:<slot 0-2> -> listingId (up to IP_VOTES per hashed IP) (metadata {l, ign}),
 * lg:c:<week>:<cookieHash> -> "1", lg:w:<week> -> cached final winner of a finished week.
 */
const TZ = "America/Toronto";
const DAY = 86400000;
const LAUNCH_WEEK = "2026-10-19", FIRST_FRI = "2026-10-30";

function etParts(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return p;
}
const ymd = (p) => `${p.year}-${p.month}-${p.day}`;
const DOW = { Fri: 0, Sat: 1, Sun: 2, Mon: 3, Tue: 4, Wed: 5, Thu: 6 };
const addDays = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * DAY).toISOString().slice(0, 10);

/** Week id (Toronto Friday start date) for a timestamp. */
export function weekOf(t = Date.now()) {
  const p = etParts(t);
  const fri = addDays(ymd(p), -DOW[p.weekday]);
  return fri < FIRST_FRI && fri >= "2026-10-16" && ymd(p) >= LAUNCH_WEEK ? LAUNCH_WEEK : fri;
}
export function prevWeek(week) { return week === FIRST_FRI ? LAUNCH_WEEK : addDays(week, -7); }
/** Exact UTC instant the week ends: the next Friday 00:00 Toronto (= Thursday 11:59:59 PM). */
export function weekEndsAt(week) {
  const next = week === LAUNCH_WEEK ? FIRST_FRI : addDays(week, 7);
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
export async function tally(kv, week, seen) {
  const counts = new Map(); let cursor;
  do {
    const r = await kv.list({ prefix: `lg:v:${week}:`, cursor, limit: 1000 });
    for (const k of r.keys) { if (seen) seen.add(k.name); const m = k.metadata || {}; if (m.l && !m.ign) counts.set(m.l, (counts.get(m.l) || 0) + 1); }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return counts;
}

/** Digital Underground (the owner's own products) stay on the marketplace but are not in the League. Kerzy Labs games remain eligible. */
export function isKerzy(l) { return /^cm_kerzy_/.test(l.id) || /kerzy/i.test(l.makerName || "") || l.makerSlug === "kerzy-labs"; }
export function isOwnDU(l) { return /^digital\s*underground$/i.test((l.makerName || "").trim()) || l.makerSlug === "digital-underground"; }
/** Live, maker-made listings (excludes DU-curated third-party picks and Digital Underground's own products). Same source as the marketplace. */
export async function eligible(origin) {
  try {
    const r = await fetch(`${origin}/api/community/listings`, { headers: { accept: "application/json" } });
    const d = await r.json();
    return (d.listings || []).filter((l) => l && l.id && !l.hidden && !l.curated && l.name && !isOwnDU(l));
  } catch { return []; }
}

const card = (l, votes) => ({ id: l.id, name: l.name, makerName: l.makerName, pitchShort: l.pitchShort, imageUrl: l.imageUrl, url: listingPath(l), votes });

/** Standings: most votes first, ties by name. Only listings with votes are ranked. */
export function rank(list, counts) {
  return list.filter((l) => counts.get(l.id)).map((l) => card(l, counts.get(l.id)))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}

/** Winner of the previous (finished) week; cached in KV once computed since a finished week can't change. */
export async function lastWinner(kv, origin, now = Date.now(), listP = null) {
  const getList = () => listP || (listP = eligible(origin));
  const wk = prevWeek(weekOf(now));
  let w = null;
  const cached = await kv.get(`lg:w:${wk}`, "json");
  if (cached) w = cached;
  else {
    const counts = await tally(kv, wk);
    const top = rank(await getList(), counts)[0] || null;
    w = { week: wk, id: top ? top.id : null, votes: top ? top.votes : 0 };
    await kv.put(`lg:w:${wk}`, JSON.stringify(w));
  }
  if (!w.id) return null;
  const live = (await getList()).find((l) => l.id === w.id); // still live? show current listing text/image
  return live ? { week: wk, ...card(live, w.votes) } : null;
}
