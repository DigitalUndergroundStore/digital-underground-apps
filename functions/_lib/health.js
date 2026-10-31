/**
 * Owner health + growth signals (first-party only).
 * - Server error log: errlog:{YYYYMMDD} { n, paths{}, last } written by _middleware.js only when an
 *   /api/ request returns 5xx or throws (capped per day so it can't eat the free KV write budget).
 * - Probes: GET key public URLs from the Worker, report status + latency.
 */
import { utcDay } from "./creator.js";
import { SOFT_CAP, SAMPLE } from "./storestats.js";

const ERR_PREFIX = "errlog:";
const ERR_CAP = 150;

export async function recordServerError(kv, path, status) {
  try {
    const key = ERR_PREFIX + utcDay();
    const row = (await kv.get(key, "json")) || { n: 0, paths: {}, codes: {} };
    if (row.n >= ERR_CAP) return;
    row.n += 1;
    const p = String(path || "?").replace(/\/[A-Za-z0-9_-]{16,}/g, "/:id").slice(0, 80);
    if (p in row.paths || Object.keys(row.paths).length < 40) row.paths[p] = (row.paths[p] || 0) + 1;
    row.codes[status] = (row.codes[status] || 0) + 1;
    row.last = { at: Date.now(), path: p, status };
    await kv.put(key, JSON.stringify(row), { expirationTtl: 60 * 86400 });
  } catch (_) {}
}

export async function readErrors(kv, days = 14) {
  const keys = [];
  for (let d = days - 1; d >= 0; d--) keys.push(utcDay(Date.now() - d * 86400000));
  const rows = await Promise.all(keys.map((k) => kv.get(ERR_PREFIX + k, "json")));
  const paths = {}; let last = null;
  const chart = keys.map((k, i) => {
    const r = rows[i] || {};
    for (const [p, v] of Object.entries(r.paths || {})) paths[p] = (paths[p] || 0) + v;
    if (r.last && (!last || r.last.at > last.at)) last = r.last;
    return { d: k, n: r.n || 0 };
  });
  const total = chart.reduce((a, d) => a + d.n, 0);
  return { chart, total, today: chart[chart.length - 1].n, last7: chart.slice(-7).reduce((a, d) => a + d.n, 0), cap: ERR_CAP,
    paths: Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ k, v })), last };
}

export const PROBES = [
  { name: "Marketplace home", path: "/" },
  { name: "Store", path: "/store/" },
  { name: "Store tracker", path: "/store/track.js" },
  { name: "Pantry Week", path: "/pantry-week/" },
  { name: "League", path: "/league/" },
  { name: "League API", path: "/api/league" },
  { name: "Nav API", path: "/api/nav" },
  { name: "Owner login", path: "/owner/" },
  { name: "Search Console file", path: "/google3b2bd1b363483359" },
];
const SLOW_MS = 1500;

export async function runProbes(origin) {
  return Promise.all(PROBES.map(async (p) => {
    const t0 = Date.now();
    try {
      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(origin + p.path, { headers: { "User-Agent": "DU-owner-health/1 (bot)", "Cache-Control": "no-cache" }, redirect: "follow", signal: ctl.signal });
      await r.arrayBuffer().catch(() => null);
      clearTimeout(tm);
      const ms = Date.now() - t0;
      // /owner/ is Basic-Auth gated: 401/403 means the gate is up, not that Owner is down.
      const authChallengeOk = p.path === "/owner/" && (r.status === 401 || r.status === 403);
      const up = r.ok || authChallengeOk;
      return { ...p, status: r.status, ms, state: !up ? "fail" : ms > SLOW_MS ? "slow" : "ok" };
    } catch (e) {
      return { ...p, status: 0, ms: Date.now() - t0, state: "fail", error: e && e.name === "AbortError" ? "timeout" : "network" };
    }
  }));
}

function dayOf(ts) { return utcDay(ts); }
function series(rows, getTs, days = 30, extra) {
  const keys = []; for (let d = days - 1; d >= 0; d--) keys.push(utcDay(Date.now() - d * 86400000));
  const m = Object.fromEntries(keys.map((k) => [k, { d: k, n: 0 }]));
  for (const r of rows) { const ts = getTs(r); if (!ts) continue; const k = dayOf(ts); if (m[k]) { m[k].n += 1; if (extra) extra(m[k], r); } }
  return keys.map((k) => m[k]);
}

export function subscriberSummary(subs) {
  const now = Date.now(), s7 = now - 7 * 864e5, s30 = now - 30 * 864e5;
  const active = subs.filter((s) => s.status === "subscribed").length;
  const src = {};
  for (const s of subs) if ((s.at || 0) >= s30) src[s.source || "unknown"] = (src[s.source || "unknown"] || 0) + 1;
  return {
    total: subs.length, active, unsubscribed: subs.length - active,
    last7: subs.filter((s) => (s.at || 0) >= s7).length, last30: subs.filter((s) => (s.at || 0) >= s30).length,
    unsub30: subs.filter((s) => (s.unsubAt || 0) >= s30).length,
    lastAt: subs.reduce((a, s) => Math.max(a, s.at || 0), 0) || null,
    chart: series(subs, (s) => s.at),
    sources: Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ k, v })),
  };
}

export function feedbackSummary(msgs) {
  const now = Date.now(), s7 = now - 7 * 864e5, s30 = now - 30 * 864e5;
  const open = msgs.filter((m) => m.status !== "done");
  const prod = {}, src = {};
  for (const m of msgs) if ((m.createdAt || 0) >= s30) {
    const p = m.product || m.listingName || "General"; prod[p] = (prod[p] || 0) + 1;
    const s = m.source || (m.creatorId ? "marketplace" : "support form"); src[s] = (src[s] || 0) + 1;
  }
  const oldestOpen = open.reduce((a, m) => (m.createdAt && (!a || m.createdAt < a) ? m.createdAt : a), null);
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ k, v }));
  return {
    open: open.length, done: msgs.length - open.length, total: msgs.length,
    last7: msgs.filter((m) => (m.createdAt || 0) >= s7).length, last30: msgs.filter((m) => (m.createdAt || 0) >= s30).length,
    oldestOpenAt: oldestOpen, oldestOpenDays: oldestOpen ? Math.floor((now - oldestOpen) / 864e5) : 0,
    chart: series(msgs, (m) => m.createdAt), products: top(prod), sources: top(src),
  };
}

export { SOFT_CAP, SAMPLE };
