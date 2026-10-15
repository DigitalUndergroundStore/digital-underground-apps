/**
 * Creator API keys (free: KV only).
 *   apikey:{sha256(key)}  { id, creatorId, label, last4, createdAt, revoked }
 *   creator account: acct.apiKeys = [{ id, hash, label, last4, createdAt }]
 *   apirl:{keyId}:h:{YYYYMMDDHH}, apirl:{keyId}:d:{YYYYMMDD}  write counters (TTL)
 * Keys are shown once; only the hash is stored.
 */
import { sha256Hex, getAccount, putAccount, utcDay } from "./creator.js";

export const WRITES_PER_HOUR = 10;
export const WRITES_PER_DAY = 50;
export const MAX_KEYS = 5;
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function rand(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  let s = ""; for (const x of b) s += ALPH[x % ALPH.length]; return s;
}

export async function createKey(kv, acct, label) {
  acct.apiKeys = (acct.apiKeys || []).filter(Boolean);
  if (acct.apiKeys.length >= MAX_KEYS) return { error: `You can have up to ${MAX_KEYS} keys. Revoke one first.` };
  const key = "duk_" + rand(40);
  const hash = await sha256Hex("du-apikey-v1:" + key);
  const rec = { id: "k_" + rand(10), creatorId: acct.id, label: String(label || "API key").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 40) || "API key", last4: key.slice(-4), createdAt: Date.now(), revoked: false };
  await kv.put("apikey:" + hash, JSON.stringify(rec));
  acct.apiKeys.push({ id: rec.id, hash, label: rec.label, last4: rec.last4, createdAt: rec.createdAt });
  await putAccount(kv, acct);
  return { key, info: publicKey(rec) };
}

export function publicKey(k) { return { id: k.id, label: k.label, last4: k.last4, createdAt: k.createdAt }; }

export async function revokeKey(kv, acct, keyId) {
  const k = (acct.apiKeys || []).find((x) => x.id === keyId);
  if (!k) return false;
  await kv.delete("apikey:" + k.hash);
  acct.apiKeys = acct.apiKeys.filter((x) => x.id !== keyId);
  await putAccount(kv, acct);
  return true;
}

/** Owner: list every key (no secrets; hashes stay server-side). */
export async function listAllKeys(kv) {
  const out = [];
  let cursor;
  do {
    const r = await kv.list({ prefix: "apikey:", cursor });
    for (const k of r.keys) {
      const rec = await kv.get(k.name, "json");
      if (rec) out.push({ ...publicKey(rec), creatorId: rec.creatorId });
    }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor && out.length < 500);
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export async function ownerRevoke(kv, keyId) {
  const all = await kv.list({ prefix: "apikey:" });
  for (const k of all.keys) {
    const rec = await kv.get(k.name, "json");
    if (rec && rec.id === keyId) {
      await kv.delete(k.name);
      const acct = await getAccount(kv, rec.creatorId);
      if (acct) { acct.apiKeys = (acct.apiKeys || []).filter((x) => x.id !== keyId); await putAccount(kv, acct); }
      return true;
    }
  }
  return false;
}

/** Bearer auth -> { acct, key } or null. */
export async function authKey(request, kv) {
  const h = request.headers.get("Authorization") || "";
  const m = /^Bearer\s+(duk_[A-Za-z0-9]{20,80})\s*$/.exec(h);
  if (!m) return null;
  const hash = await sha256Hex("du-apikey-v1:" + m[1]);
  const rec = await kv.get("apikey:" + hash, "json");
  if (!rec || rec.revoked) return null;
  const acct = await getAccount(kv, rec.creatorId);
  if (!acct || !(acct.apiKeys || []).some((x) => x.id === rec.id)) return null;
  return { acct, key: rec };
}

/** Counts one write; returns { ok, retryAfter, remainingHour, remainingDay }. */
export async function takeWrite(kv, keyId) {
  const now = new Date();
  const hourKey = `apirl:${keyId}:h:${utcDay(now.getTime())}${String(now.getUTCHours()).padStart(2, "0")}`;
  const dayKey = `apirl:${keyId}:d:${utcDay(now.getTime())}`;
  const [h, d] = await Promise.all([kv.get(hourKey), kv.get(dayKey)]);
  const hn = +h || 0, dn = +d || 0;
  if (hn >= WRITES_PER_HOUR) return { ok: false, retryAfter: 3600 - now.getUTCMinutes() * 60 - now.getUTCSeconds(), remainingHour: 0, remainingDay: Math.max(0, WRITES_PER_DAY - dn) };
  if (dn >= WRITES_PER_DAY) return { ok: false, retryAfter: 86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60), remainingHour: WRITES_PER_HOUR - hn, remainingDay: 0 };
  await Promise.all([kv.put(hourKey, String(hn + 1), { expirationTtl: 7200 }), kv.put(dayKey, String(dn + 1), { expirationTtl: 2 * 86400 })]);
  return { ok: true, remainingHour: WRITES_PER_HOUR - hn - 1, remainingDay: WRITES_PER_DAY - dn - 1 };
}
