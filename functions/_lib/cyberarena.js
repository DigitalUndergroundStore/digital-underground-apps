// CyberArena shared high scores. Storage: the marketplace's COMMUNITY_KV namespace, keys prefixed "ca:".
// Anti-cheat is deliberately light: server-issued one-shot match tokens, server-side timing,
// plausibility caps, per-IP rate limits and a server-computed score. No secrets reach the client.
export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra } });

export const kvOf = (env) => env && env.COMMUNITY_KV;
export const ipOf = (req) => req.headers.get("CF-Connecting-IP") || "unknown";

const buckets = new Map();
export function rateOk(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return b.n <= max;
}
// Cross-isolate limit backed by KV (coarse, eventually consistent).
export async function kvRateOk(kv, key, max, windowSec) {
  const slot = Math.floor(Date.now() / 1000 / windowSec);
  const k = `ca:rl:${key}:${slot}`;
  const n = parseInt((await kv.get(k)) || "0", 10);
  if (n >= max) return false;
  await kv.put(k, String(n + 1), { expirationTtl: Math.max(60, windowSec * 2) });
  return true;
}

const BAD = ["fuck","fuk","fck","shit","bitch","cunt","dick","cock","pussy","asshole","bastard","whore","slut","fag","nigg","nigga","retard","rape","nazi","hitler","kike","spic","chink","twat","wank","porn","penis","vagina","cum","jizz","dildo","anal","tits","boob","sex","kkk","isis","pedo"];
const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "|": "i" };
export function cleanCallsign(raw) {
  let s = String(raw || "").normalize("NFKC").replace(/[^A-Za-z0-9 _\-.]/g, "").replace(/\s+/g, " ").trim();
  if (s.length < 2 || s.length > 16) return { error: "Callsign must be 2–16 letters, numbers, spaces, - _ or ." };
  const flat = s.toLowerCase().replace(/[0-9@$!|]/g, (c) => LEET[c] || c).replace(/[^a-z]/g, "");
  if (BAD.some((w) => flat.includes(w))) return { error: "Pick a different callsign." };
  return { name: s };
}

export function computeScore({ kills, deaths, bestStreak }) {
  return Math.max(0, kills * 100 + bestStreak * 50 - deaths * 25);
}

export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t - y0) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, "0")}`;
}
export const boardKey = (which) => (which === "weekly" ? `ca:board:w:${isoWeek()}` : "ca:board:all");

export async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
export const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function readBoard(kv, which) {
  const b = await kv.get(boardKey(which), "json");
  return Array.isArray(b) ? b : [];
}
export const publicEntry = (e, i) => ({ rank: i + 1, name: e.name, score: e.score, kills: e.kills, deaths: e.deaths, streak: e.streak, time: e.time, at: e.at });
export function youOf(board, pidh) {
  const i = pidh ? board.findIndex((e) => e.pidh === pidh) : -1;
  return i < 0 ? null : publicEntry(board[i], i);
}
