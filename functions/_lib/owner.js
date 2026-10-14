/**
 * Owner dashboard auth (passcode + 30-day session cookie) and overview helpers.
 */
import {
  getKv,
  json,
  kvGetIndex,
  kvGetListing,
  listContacts,
  timingSafeEqualStr,
  contactsToCsv,
} from "./community.js";
import { readStats, utcDay } from "./creator.js";

export const OWNER_COOKIE = "du_owner_sess";
export const SESSION_DAYS = 30;
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** @type {Map<string, { count: number; reset: number }>} */
const loginByIp = new Map();

/** SHA-256 hex via Web Crypto. */
export async function sha256Hex(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashOwnerPasscode(passcode) {
  const norm = String(passcode || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  return sha256Hex("du-owner-v1:" + norm);
}

export async function verifyOwnerPasscode(env, passcode) {
  const expected = env?.OWNER_PASS_HASH;
  if (!expected || typeof expected !== "string") return false;
  const norm = String(passcode || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  const presented = await sha256Hex("du-owner-v1:" + norm);
  return timingSafeEqualStr(presented, expected);
}

export function checkLoginRate(ip) {
  const now = Date.now();
  let b = loginByIp.get(ip);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + LOGIN_WINDOW_MS };
    loginByIp.set(ip, b);
  }
  b.count += 1;
  return b.count <= LOGIN_LIMIT;
}

async function hmacSession(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sessionSecret(env) {
  return env?.OWNER_SESSION_SECRET || env?.OWNER_PASS_HASH || env?.COMMUNITY_ADMIN_TOKEN || "";
}

export async function mintOwnerSession(env) {
  const secret = sessionSecret(env);
  if (!secret) return null;
  const exp = String(Date.now() + SESSION_DAYS * 86400000);
  const payload = `v1.${exp}`;
  const sig = await hmacSession(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyOwnerSession(env, cookieVal) {
  const secret = sessionSecret(env);
  if (!secret || !cookieVal) return false;
  const parts = String(cookieVal).split(".");
  if (parts.length !== 3) return false;
  const [v, exp, sig] = parts;
  if (v !== "v1") return false;
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return false;
  const expected = await hmacSession(secret, `${v}.${exp}`);
  return timingSafeEqualStr(expected, sig);
}

export function parseCookies(request) {
  const raw = request.headers.get("Cookie") || "";
  const out = {};
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function ownerSessionCookie(value, { clear = false } = {}) {
  const maxAge = clear ? 0 : SESSION_DAYS * 86400;
  const parts = [
    `${OWNER_COOKIE}=${clear ? "" : encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  return parts.join("; ");
}

/** Owner session cookie OR existing admin Bearer token (Gerold). */
export async function ownerAuthorized(request, env) {
  if (env?.COMMUNITY_ADMIN_TOKEN) {
    const auth = request.headers.get("Authorization") || "";
    if (auth.startsWith("Bearer ") && timingSafeEqualStr(auth.slice(7), env.COMMUNITY_ADMIN_TOKEN)) {
      return true;
    }
  }
  const cookies = parseCookies(request);
  return verifyOwnerSession(env, cookies[OWNER_COOKIE]);
}

export function unauthorized() {
  return json({ error: "Please sign in." }, 401);
}

// ---------- Support inbox KV ----------
const SUPPORT_PREFIX = "support:msg:";
const SUPPORT_INDEX = "support:index";

export async function storeSupportMessage(kv, msg) {
  const id = msg.id || `sup_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  const row = {
    id,
    subject: msg.subject || "(no subject)",
    message: msg.message || "",
    replyTo: msg.replyTo || "",
    creatorId: msg.creatorId || "",
    listingId: msg.listingId || "",
    listingName: msg.listingName || "",
    status: "open",
    createdAt: msg.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  await kv.put(SUPPORT_PREFIX + id, JSON.stringify(row));
  const idx = (await kv.get(SUPPORT_INDEX, "json")) || { open: [], done: [] };
  idx.open = Array.isArray(idx.open) ? idx.open.filter((x) => x !== id) : [];
  idx.done = Array.isArray(idx.done) ? idx.done.filter((x) => x !== id) : [];
  idx.open.unshift(id);
  idx.open = idx.open.slice(0, 500);
  await kv.put(SUPPORT_INDEX, JSON.stringify(idx));
  return row;
}

export async function listSupportMessages(kv, { status = "open" } = {}) {
  const idx = (await kv.get(SUPPORT_INDEX, "json")) || { open: [], done: [] };
  const ids = status === "done" ? idx.done || [] : status === "all" ? [...(idx.open || []), ...(idx.done || [])] : idx.open || [];
  const out = [];
  for (const id of ids.slice(0, 200)) {
    const row = await kv.get(SUPPORT_PREFIX + id, "json");
    if (row) out.push(row);
  }
  return out;
}

export async function markSupportDone(kv, id) {
  const row = await kv.get(SUPPORT_PREFIX + id, "json");
  if (!row) return null;
  row.status = "done";
  row.updatedAt = Date.now();
  await kv.put(SUPPORT_PREFIX + id, JSON.stringify(row));
  const idx = (await kv.get(SUPPORT_INDEX, "json")) || { open: [], done: [] };
  idx.open = (idx.open || []).filter((x) => x !== id);
  idx.done = (idx.done || []).filter((x) => x !== id);
  idx.done.unshift(id);
  idx.done = idx.done.slice(0, 500);
  await kv.put(SUPPORT_INDEX, JSON.stringify(idx));
  return row;
}

// ---------- Overview ----------

async function countListingsSince(kv, index, sinceMs) {
  let n = 0;
  const ids = [...(index.pending || []), ...(index.approved || []), ...(index.rejected || []), ...(index.unpublished || [])];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = await kvGetListing(kv, id);
    if (row && (row.createdAt || 0) >= sinceMs) n += 1;
  }
  return n;
}

export async function buildOverview(kv, env) {
  const index = await kvGetIndex(kv);
  const pending = index.pending || [];
  const now = Date.now();
  const startToday = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );
  const start7 = now - 7 * 86400000;

  const contacts = await listContacts(kv);
  const contactsToday = contacts.filter((c) => (c.first_seen || 0) >= startToday).length;
  const contacts7 = contacts.filter((c) => (c.first_seen || 0) >= start7).length;

  const supportOpen = await listSupportMessages(kv, { status: "open" });
  const supportAll = await listSupportMessages(kv, { status: "all" });
  const supportToday = supportAll.filter((m) => (m.createdAt || 0) >= startToday).length;
  const support7 = supportAll.filter((m) => (m.createdAt || 0) >= start7).length;

  const submissionsToday = await countListingsSince(kv, index, startToday);
  const submissions7 = await countListingsSince(kv, index, start7);

  // Aggregate stats for all known listing ids (approved + others with stats)
  const allIds = [
    ...new Set([
      ...(index.approved || []),
      ...(index.pending || []),
      ...(index.unpublished || []),
    ]),
  ].slice(0, 80);
  const stats = allIds.length ? await readStats(kv, allIds, 7) : {};
  let viewsToday = 0,
    clicksToday = 0,
    views7 = 0,
    clicks7 = 0;
  const todayKey = utcDay();
  for (const id of allIds) {
    const s = stats[id];
    if (!s) continue;
    views7 += s.totals.v || 0;
    clicks7 += s.totals.c || 0;
    const day = (s.days || []).find((d) => d.d === todayKey);
    if (day) {
      viewsToday += day.v || 0;
      clicksToday += day.c || 0;
    }
  }

  const backup = await fetchBackupMeta(env);

  return {
    pendingCount: pending.length,
    needsAttention: pending.length + supportOpen.length,
    today: {
      views: viewsToday,
      clicks: clicksToday,
      submissions: submissionsToday,
      contacts: contactsToday,
      support: supportToday,
    },
    last7: {
      views: views7,
      clicks: clicks7,
      submissions: submissions7,
      contacts: contacts7,
      support: support7,
    },
    supportOpen: supportOpen.length,
    contactsTotal: contacts.length,
    listingsLive: (index.approved || []).length,
    backup,
  };
}

export async function fetchBackupMeta(env) {
  const base = env?.BACKUP_WORKER_URL || "https://du-backup.digitalunderground-store.workers.dev";
  const token = env?.BACKUP_ADMIN_TOKEN || env?.COMMUNITY_ADMIN_TOKEN;
  if (!token) return { lastSnapshot: null, ok: false, reason: "no_token" };
  try {
    const res = await fetch(`${base}/snapshots`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { lastSnapshot: null, ok: false, status: res.status };
    const data = await res.json();
    const dates = (data.snapshots || []).map((s) => s.date).filter(Boolean).sort();
    const last = dates.length ? dates[dates.length - 1] : null;
    return { lastSnapshot: last, ok: true, count: dates.length };
  } catch (e) {
    return { lastSnapshot: null, ok: false, reason: "fetch_failed" };
  }
}

export async function listAllListings(kv) {
  const index = await kvGetIndex(kv);
  const buckets = [
    ["pending", index.pending],
    ["approved", index.approved],
    ["rejected", index.rejected],
    ["unpublished", index.unpublished],
  ];
  const out = [];
  const seen = new Set();
  for (const [status, ids] of buckets) {
    for (const id of ids || []) {
      if (seen.has(id)) continue;
      seen.add(id);
      const row = await kvGetListing(kv, id);
      if (row) out.push(row);
      else out.push({ id, status, missing: true });
    }
  }
  out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return out;
}

export { contactsToCsv, getKv, json, listContacts, readStats, kvGetIndex, kvGetListing };
