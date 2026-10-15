/**
 * Creator accounts (passwordless manage links), creator-scoped listing access,
 * support messages, and cheap KV analytics for the Developer Marketplace.
 *
 * Keys:
 *   creator:{acctId}  { id, tokenHash, listingIds[], support: {day, n}, createdAt }
 *   stats:{YYYYMMDD}  { [listingId]: { i, v, c } }   one key per UTC day (1 write per beacon)
 *
 * Manage token format: "{acctId}.{secret}". Only SHA-256(secret) is stored; the
 * presented secret's hash is compared in constant time.
 *
 * Sessions: signed HttpOnly cookie du_creator (180 days), set after submit, link visit or email code.
 * Email code login is built but OFF: set COMMUNITY_EMAIL_LOGIN=1 (after a sending domain is
 * verified in Resend) to enable POST /api/community/creator-login.
 */
import {
  hmacHex,
  kvGetListing,
  normalizeEmail,
  sendCommunityEmail,
  timingSafeEqualStr,
  communitySiteOrigin,
} from "./community.js";
import { runBlocklist } from "./community-screening.js";

const ACCT_PREFIX = "creator:";
const STATS_PREFIX = "stats:";
export const SUPPORT_PER_DAY = 5;
export const EDITS_PER_DAY = 20;

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function utcDay(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10).replace(/-/g, "");
}

export async function getAccount(kv, acctId) {
  if (!/^ca_[A-Za-z0-9_-]{8,40}$/.test(acctId || "")) return null;
  const row = await kv.get(ACCT_PREFIX + acctId, "json");
  return row && typeof row === "object" ? row : null;
}

export async function putAccount(kv, acct) {
  await kv.put(ACCT_PREFIX + acct.id, JSON.stringify(acct));
}

/** Create an account (or rotate its token). Returns { acct, token }. Token is never stored. */
export async function issueAccountToken(kv, acct) {
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const row = acct || {
    id: "ca_" + b64url(crypto.getRandomValues(new Uint8Array(12))),
    listingIds: [],
    createdAt: Date.now(),
  };
  row.tokenHash = await sha256Hex(secret);
  row.tokenIssuedAt = Date.now();
  await putAccount(kv, row);
  return { acct: row, token: `${row.id}.${secret}` };
}

export function dashboardUrl(env, request, token) {
  return `${communitySiteOrigin(env, request)}/community/dashboard/?k=${encodeURIComponent(token)}`;
}

export const SESSION_COOKIE = "du_creator";
const SESSION_DAYS = 180;

export async function signSession(env, acctId) {
  const secret = env?.COMMUNITY_ADMIN_TOKEN;
  if (!secret || !acctId) return null;
  const exp = String(Date.now() + SESSION_DAYS * 86400000);
  const sig = await hmacHex(secret, `sess:${acctId}:${exp}`);
  return `${acctId}.${exp}.${sig}`;
}

async function verifySession(env, value) {
  const secret = env?.COMMUNITY_ADMIN_TOKEN;
  const [acctId, exp, sig] = String(value || "").split(".");
  if (!secret || !acctId || !exp || !sig || !(Number(exp) > Date.now())) return null;
  const expected = await hmacHex(secret, `sess:${acctId}:${exp}`);
  return timingSafeEqualStr(expected, sig) ? acctId : null;
}

export async function sessionCookie(env, acctId) {
  const v = await signSession(env, acctId);
  if (!v) return null;
  return `${SESSION_COOKIE}=${v}; Max-Age=${SESSION_DAYS * 86400}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}

/**
 * Resolve the creator from Authorization: Creator <manage token> (private link),
 * or the signed session cookie. Returns { acct, via } or null. Generic failure.
 */
export async function authCreatorEx(request, env, kv) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Creator ")) {
    const tok = auth.slice(8).trim();
    const dot = tok.indexOf(".");
    const acctId = dot > 0 ? tok.slice(0, dot) : "";
    const secret = dot > 0 ? tok.slice(dot + 1) : "";
    const acct = acctId ? await getAccount(kv, acctId) : null;
    const presented = await sha256Hex(secret || "x");
    // Always compare (dummy hash when no account) so timing does not reveal existence.
    const ok = timingSafeEqualStr(presented, acct?.tokenHash || "0".repeat(64)) && !!acct && secret.length >= 32;
    if (ok) return { acct, via: "link" };
  }
  const sess = readCookie(request, SESSION_COOKIE);
  if (sess) {
    const acctId = await verifySession(env, sess);
    const acct = acctId ? await getAccount(kv, acctId) : null;
    if (acct) return { acct, via: "cookie" };
  }
  return null;
}

export async function authCreator(request, env, kv) {
  const r = await authCreatorEx(request, env, kv);
  return r ? r.acct : null;
}

export async function attachListing(kv, acct, listingId) {
  const ids = Array.isArray(acct.listingIds) ? acct.listingIds : [];
  if (!ids.includes(listingId)) ids.push(listingId);
  acct.listingIds = ids.slice(-50);
  await putAccount(kv, acct);
}

/** Load a listing only if it belongs to this creator. */
export async function ownedListing(kv, acct, id) {
  if (!acct || !id || !(acct.listingIds || []).includes(id)) return null;
  const row = await kvGetListing(kv, id);
  return row && row.creatorId === acct.id ? row : null;
}

/** Creator-safe view: status + reasons, no internal screening detail, no email. */
export function creatorListing(row) {
  return {
    id: row.id,
    status: row.status,
    name: row.name,
    projectUrl: row.projectUrl,
    pitchShort: row.pitchShort,
    descriptionLong: row.descriptionLong,
    imageUrl: row.imageUrl && row.imageUrl.startsWith("https://") ? row.imageUrl : row.imageUrl ? "(uploaded image)" : "",
    imagePreview: row.imageUrl || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    category: row.category,
    priceLabel: row.priceLabel,
    reasons: row.status === "approved" ? [] : row.screening?.reasons || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Per-listing edit budget stored on the listing itself (no extra KV write). */
export function takeEditBudget(row) {
  const day = utcDay();
  const b = row.editBudget && row.editBudget.day === day ? row.editBudget : { day, n: 0 };
  if (b.n >= EDITS_PER_DAY) return false;
  b.n += 1;
  row.editBudget = b;
  return true;
}

// ---------- Analytics ----------

const MAX_IDS_PER_BEACON = 60;
/** In-isolate dedupe of identical beacons (cheap guard against hammering). */
const recentBeacons = new Map();

/**
 * events: { i: [ids], v: [ids], c: [ids] }. One read + one write per beacon.
 * Only ids in the approved index are counted.
 */
export async function recordEvents(kv, approvedIds, events, ip) {
  const allowed = new Set(approvedIds);
  const pick = (arr) =>
    (Array.isArray(arr) ? arr : []).filter((x) => typeof x === "string" && allowed.has(x)).slice(0, MAX_IDS_PER_BEACON);
  const i = [...new Set(pick(events?.i))];
  const v = [...new Set(pick(events?.v))].slice(0, 3);
  const c = pick(events?.c).slice(0, 5);
  if (!i.length && !v.length && !c.length) return { counted: 0 };

  const sig = `${ip}|${i.join()}|${v.join()}|${c.join()}`;
  const now = Date.now();
  if (recentBeacons.has(sig) && now - recentBeacons.get(sig) < 10_000) return { counted: 0, deduped: true };
  recentBeacons.set(sig, now);
  if (recentBeacons.size > 5000) recentBeacons.clear();

  const key = STATS_PREFIX + utcDay(now);
  const day = (await kv.get(key, "json")) || {};
  const bump = (id, f) => {
    const r = day[id] || (day[id] = { i: 0, v: 0, c: 0 });
    r[f] += 1;
  };
  i.forEach((id) => bump(id, "i"));
  v.forEach((id) => bump(id, "v"));
  c.forEach((id) => bump(id, "c"));
  await kv.put(key, JSON.stringify(day), { expirationTtl: 400 * 86400 });
  return { counted: i.length + v.length + c.length };
}

/** 30-day series per listing for the given ids. 30 KV reads, no writes. */
export async function readStats(kv, ids, days = 30) {
  const want = new Set(ids);
  const out = {};
  for (const id of ids) out[id] = { days: [], totals: { i: 0, v: 0, c: 0 } };
  const now = Date.now();
  const keys = [];
  for (let d = days - 1; d >= 0; d--) keys.push(utcDay(now - d * 86400000));
  const rows = await Promise.all(keys.map((k) => kv.get(STATS_PREFIX + k, "json")));
  keys.forEach((k, idx) => {
    const row = rows[idx] || {};
    for (const id of want) {
      const r = row[id] || { i: 0, v: 0, c: 0 };
      out[id].days.push({ d: k, i: r.i || 0, v: r.v || 0, c: r.c || 0 });
      out[id].totals.i += r.i || 0;
      out[id].totals.v += r.v || 0;
      out[id].totals.c += r.c || 0;
    }
  });
  return out;
}

/** Remove a listing's counters from the last N days (used on delete). */
export async function purgeStats(kv, id, days = 35) {
  const now = Date.now();
  for (let d = 0; d < days; d++) {
    const key = STATS_PREFIX + utcDay(now - d * 86400000);
    const row = await kv.get(key, "json");
    if (row && row[id]) {
      delete row[id];
      await kv.put(key, JSON.stringify(row), { expirationTtl: 400 * 86400 });
    }
  }
}

// ---------- Support ----------

export function screenSupportMessage(subject, message) {
  const text = `${subject}\n${message}`;
  const block = runBlocklist(text.toLowerCase());
  if (block.decision === "rejected") return "Your message was flagged by our filters. Email us directly instead.";
  const links = (text.match(/https?:\/\//gi) || []).length;
  if (links > 5) return "Too many links in the message.";
  if (/(.)\1{30,}/.test(text)) return "Message looks like spam.";
  return "";
}

export function takeSupportBudget(acct) {
  const day = utcDay();
  const b = acct.support && acct.support.day === day ? acct.support : { day, n: 0 };
  if (b.n >= SUPPORT_PER_DAY) return false;
  b.n += 1;
  acct.support = b;
  return true;
}

export async function sendSupportEmail(env, { acct, replyTo, subject, message, listing }) {
  const to = env?.COMMUNITY_NOTIFY_EMAIL || "digitalunderground.store@proton.me";
  const lines = [
    "Creator support message (Developer Marketplace dashboard)",
    `Creator account: ${acct.id}`,
    `Reply-to: ${replyTo || "(none on file)"}`,
    listing ? `Listing: ${listing.name} (${listing.id}) — status ${listing.status}` : "Listing: (none selected)",
    "",
    message,
  ];
  return sendCommunityEmail(env, {
    to,
    subject: `[Creator support] ${subject}`,
    text: lines.join("\n"),
    replyTo,
  });
}

// ---------- Email one-time code login (off unless COMMUNITY_EMAIL_LOGIN=1) ----------

const OTP_TTL_S = 600;
const OTP_MAX_TRIES = 5;

export function emailLoginEnabled(env) {
  return env?.COMMUNITY_EMAIL_LOGIN === "1";
}

async function otpKey(email) {
  return "otp:" + (await sha256Hex("otp|" + email));
}

/** Create a 6-digit code for an email. Returns the code, or null if one was sent < 60s ago. */
export async function createOtp(env, kv, email, acctId) {
  const key = await otpKey(email);
  const prev = await kv.get(key, "json");
  if (prev && Date.now() - prev.sentAt < 60_000) return null;
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  const code = String(n).padStart(6, "0");
  const codeHash = await hmacHex(env.COMMUNITY_ADMIN_TOKEN, `otp:${email}:${code}`);
  await kv.put(key, JSON.stringify({ codeHash, acctId, tries: 0, sentAt: Date.now(), exp: Date.now() + OTP_TTL_S * 1000 }), {
    expirationTtl: OTP_TTL_S,
  });
  return code;
}

/** Verify a code. Returns acctId or null. Burns the code after success or 5 wrong tries. */
export async function verifyOtp(env, kv, email, code) {
  const key = await otpKey(email);
  const row = await kv.get(key, "json");
  const presented = await hmacHex(env.COMMUNITY_ADMIN_TOKEN, `otp:${email}:${String(code || "").trim()}`);
  const match = timingSafeEqualStr(presented, row?.codeHash || "0".repeat(64));
  if (!row || row.exp < Date.now()) return null;
  if (match && row.tries < OTP_MAX_TRIES) {
    await kv.delete(key);
    return row.acctId;
  }
  row.tries += 1;
  if (row.tries >= OTP_MAX_TRIES) await kv.delete(key);
  else await kv.put(key, JSON.stringify(row), { expirationTtl: Math.max(60, Math.ceil((row.exp - Date.now()) / 1000)) });
  return null;
}

/** Look up creator ids for an email via the contacts store (contact.creatorIds). */
export async function creatorIdsForEmail(kv, email) {
  const e = normalizeEmail(email);
  if (!e) return [];
  const row = await kv.get("contact:" + e, "json");
  return Array.isArray(row?.creatorIds) ? row.creatorIds : [];
}

export async function linkContactToCreator(kv, email, acctId) {
  const e = normalizeEmail(email);
  if (!e) return;
  const row = await kv.get("contact:" + e, "json");
  if (!row || typeof row !== "object") return;
  const ids = Array.isArray(row.creatorIds) ? row.creatorIds : [];
  if (!ids.includes(acctId)) {
    ids.push(acctId);
    row.creatorIds = ids;
    await kv.put("contact:" + e, JSON.stringify(row));
  }
}
