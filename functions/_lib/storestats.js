/**
 * First-party storefront analytics (free, KV). One rollup key per UTC day:
 *   storestats:{YYYYMMDD} { n, pv, s, c, pages{}, refs{}, clicks{}, dev{m,d},
 *     sv, pv4, b, ex, q, pg4{}, land{}, bl{}, exits{}, quiet{} }
 * Exit / bounce fields only come from track.js v4 beacons (sv = visits, pv4 = views measured that way):
 *   ex/exits{} = views where the visitor left the site from that page, q/quiet{} = of those, left without clicking out to a product,
 *   b/bl{} = bounces (landed on that page and left the site from it), land{} = visits that landed on that page.
 * One beacon per page visit (sent on page hide) = one KV write. To stay inside the free
 * 1,000 writes/day shared with the rest of the site, after SOFT_CAP writes in a day we keep
 * 1 in SAMPLE beacons and weight them by SAMPLE, so totals stay roughly right.
 */
import { utcDay } from "./creator.js";

const PREFIX = "storestats:";
export const SOFT_CAP = 350;
export const SAMPLE = 5;
const MAX_KEYS = 60;

function bump(map, key, w) {
  if (!key) return;
  key = String(key).slice(0, 80);
  if (!(key in map) && Object.keys(map).length >= MAX_KEYS) key = "(other)";
  map[key] = (map[key] || 0) + w;
}

export async function recordStoreBeacon(kv, b) {
  const key = PREFIX + utcDay();
  const row = (await kv.get(key, "json")) || { n: 0, pv: 0, s: 0, c: 0, pages: {}, refs: {}, clicks: {}, dev: { m: 0, d: 0 } };
  let w = 1;
  if (row.n >= SOFT_CAP) { if (Math.random() >= 1 / SAMPLE) return false; w = SAMPLE; }
  row.n += 1;
  if (b.fx && b.v4) {
    // The visitor came back and opened another page: undo the exit (and bounce) recorded for this page.
    const dec = (o, k) => { if (o && o[k]) o[k] = Math.max(0, o[k] - w); };
    const p = b.path || "/store/";
    row.ex = Math.max(0, (row.ex || 0) - w); dec(row.exits, p);
    if (!b.ox) { row.q = Math.max(0, (row.q || 0) - w); dec(row.quiet, p); }
    if (b.s) { row.b = Math.max(0, (row.b || 0) - w); dec(row.bl, p); }
  }
  if (b.pv && b.v4) {
    for (const k of ["pg4", "land", "bl", "exits", "quiet"]) row[k] = row[k] || {};
    const p = b.path || "/store/";
    row.pv4 = (row.pv4 || 0) + w; bump(row.pg4, p, w);
    if (b.s) { row.sv = (row.sv || 0) + w; bump(row.land, p, w); }
    if (b.ex) {
      row.ex = (row.ex || 0) + w; bump(row.exits, p, w);
      if (!b.ox) { row.q = (row.q || 0) + w; bump(row.quiet, p, w); }
      if (b.s) { row.b = (row.b || 0) + w; bump(row.bl, p, w); }
    }
  }
  if (b.pv) {
    row.pv += w;
    bump(row.pages, b.path || "/store/", w);
    bump(row.refs, b.ref || "direct", w);
    row.dev[b.m ? "m" : "d"] = (row.dev[b.m ? "m" : "d"] || 0) + w;
    if (b.s) row.s += w;
  }
  for (const c of (b.clicks || []).slice(0, 10)) { row.c += w; bump(row.clicks, c, w); }
  await kv.put(key, JSON.stringify(row), { expirationTtl: 400 * 86400 });
  return true;
}

function top(map, n = 10) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));
}

export async function readStoreStats(kv, days = 30) {
  const now = Date.now(), keys = [];
  for (let d = days - 1; d >= 0; d--) keys.push(utcDay(now - d * 86400000));
  const rows = await Promise.all(keys.map((k) => kv.get(PREFIX + k, "json")));
  const pages = {}, refs = {}, clicks = {}, dev = { m: 0, d: 0 };
  const pg4 = {}, land = {}, bl = {}, exits = {}, quiet = {};
  const chart = keys.map((k, i) => {
    const r = rows[i] || {};
    for (const [m, src] of [[pages, r.pages], [refs, r.refs], [clicks, r.clicks], [pg4, r.pg4], [land, r.land], [bl, r.bl], [exits, r.exits], [quiet, r.quiet]]) for (const [kk, v] of Object.entries(src || {})) m[kk] = (m[kk] || 0) + v;
    dev.m += (r.dev && r.dev.m) || 0; dev.d += (r.dev && r.dev.d) || 0;
    return { d: k, pv: r.pv || 0, s: r.s || 0, c: r.c || 0, sv: r.sv || 0, pv4: r.pv4 || 0, b: r.b || 0, ex: r.ex || 0, q: r.q || 0 };
  });
  const pct = (a, b) => (b ? Math.round((Math.min(a, b) / b) * 1000) / 10 : 0);
  // Where people leave: every page with exits, with its exit rate (exits / views of that page).
  const exitPages = Object.entries(exits).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([k, v]) => ({ k, exits: v, quiet: quiet[k] || 0, views: pg4[k] || 0, rate: pct(v, pg4[k] || 0) }));
  // Bounce rate per landing page: landed there and left without opening a second page.
  const landPages = Object.entries(land).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([k, v]) => ({ k, visits: v, bounces: bl[k] || 0, rate: pct(bl[k] || 0, v) }));
  const t = (k) => chart.reduce((a, d) => a + (d[k] || 0), 0);
  const firstDay = (chart.find((d) => d.pv4 > 0) || {}).d || null;
  const behaviour = { visits: t("sv"), views: t("pv4"), bounces: t("b"), exits: t("ex"), quiet: t("q"), bounceRate: pct(t("b"), t("sv")), since: firstDay };
  return { chart, pages: top(pages), refs: top(refs), clicks: top(clicks, 15), dev, since: keys[0], behaviour, exitPages, landPages };
}
