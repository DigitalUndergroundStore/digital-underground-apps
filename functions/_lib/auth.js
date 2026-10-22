/**
 * PREVIEW ONLY (do not deploy). Unified login / sign-up for creator accounts.
 * - Email + password: reuses creator.js PBKDF2-SHA256 (100k, 16-byte salt) so every existing
 *   creator login keeps working unchanged (acct.pw = { hash, salt, iter }).
 * - OAuth 2.0 (Authorization Code + PKCE + state bound to a cookie): Google and X.
 *   Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, X_CLIENT_ID, X_CLIENT_SECRET.
 *   Redirect URIs: {origin}/api/auth/google/callback, {origin}/api/auth/x/callback.
 * - Account linking: a provider identity maps to one account (oauth:{p}:{sub}). A first-time
 *   provider login whose email the provider has VERIFIED links to the account that owns that
 *   email; otherwise a new account is created. Unverified emails never link.
 * - Optional TOTP 2FA (RFC 6238, SHA-1, 30 s, 6 digits). Secret stored AES-GCM encrypted.
 * - Accounts without an email (X sign-in) can add one on Security; the confirm link sets it, or merges
 *   into the account that already owns that email, so every sign-in method opens one account.
 * - No magic links.
 */
import { hmacHex, normalizeEmail, timingSafeEqualStr } from "./community.js";
import { accountIdForLogin, getAccount, putAccount, sha256Hex, syncListingEmails, linkContactToCreator } from "./creator.js";
import { kvGetListing, kvPutListing } from "./community.js";
import { rateAll, ipRules } from "./ratelimit.js";

export const enc = new TextEncoder();
export function b64url(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64url(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); const bin = atob(s + "===".slice((s.length + 3) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); }
const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));

// ---------- rate limits ----------
export const limits = {
  signup: (env, ip, email) => rateAll(env, [...ipRules("signup:ip", ip, 5, 3600), ["signup:em:" + email, 3, 3600]]),
  totp: (env, ip, acctId) => rateAll(env, [...ipRules("totp:ip", ip, 10, 900), ["totp:acct:" + acctId, 6, 900]]),
  oauth: (env, ip) => rateAll(env, ipRules("oauth:ip", ip, 20, 600)),
  addEmail: (env, ip, acctId) => rateAll(env, [...ipRules("addem:ip", ip, 5, 3600), ["addem:acct:" + acctId, 3, 3600]]),
  forgot: (env, ip, email) => rateAll(env, [...ipRules("forgot:ip", ip, 5, 3600), ["forgot:em:" + email, 3, 3600]]),
  reset: (env, ip) => rateAll(env, ipRules("reset:ip", ip, 10, 900)),
};

// ---------- OAuth providers ----------
export const PROVIDERS = {
  google: {
    id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    extra: { prompt: "select_account" },
    async profile(at) {
      const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: "Bearer " + at } });
      if (!r.ok) throw new Error("google userinfo " + r.status);
      const d = await r.json();
      return { sub: String(d.sub), email: d.email_verified ? normalizeEmail(d.email) : "", name: d.name || "" };
    },
  },
  x: {
    id: "X_CLIENT_ID", secret: "X_CLIENT_SECRET",
    authorize: "https://x.com/i/oauth2/authorize",
    token: "https://api.x.com/2/oauth2/token",
    scope: "users.read tweet.read", // spec: Read scope only. confirmed_email is not requested, so X logins never auto-link by email.
    basicAuth: true,
    async profile(at) {
      const r = await fetch("https://api.x.com/2/users/me?user.fields=name,username", { headers: { Authorization: "Bearer " + at } });
      if (!r.ok) throw new Error("x users/me " + r.status);
      const d = (await r.json()).data || {};
      // X only returns confirmed_email when the app has "Request email" enabled; it is verified by X.
      return { sub: String(d.id), email: normalizeEmail(d.confirmed_email || ""), name: d.name || d.username || "" };
    },
  },
};

export const redirectUri = (origin, p) => `${origin}/api/auth/${p}/callback`;
export const configured = (env, p) => !!(env?.[PROVIDERS[p].id] && env?.[PROVIDERS[p].secret]);

export async function startOAuth(env, kv, origin, p, next, linkAcctId) {
  const cfg = PROVIDERS[p];
  const state = b64url(rnd(24)), verifier = b64url(rnd(48));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(verifier))));
  await kv.put("oauthst:" + state, JSON.stringify({ p, verifier, next, link: linkAcctId || "" }), { expirationTtl: 600 });
  const q = new URLSearchParams({ response_type: "code", client_id: env[cfg.id], redirect_uri: redirectUri(origin, p), scope: cfg.scope,
    state, code_challenge: challenge, code_challenge_method: "S256", ...(cfg.extra || {}) });
  return { url: `${cfg.authorize}?${q}`, cookie: `du_oauth=${state}; Max-Age=600; Path=/api/auth/; HttpOnly; Secure; SameSite=Lax` };
}

export async function finishOAuth(env, kv, origin, p, url, cookieState) {
  const state = url.searchParams.get("state") || "", code = url.searchParams.get("code") || "";
  if (!state || !code || !timingSafeEqualStr(state, cookieState || "")) return { error: "state" };
  const st = await kv.get("oauthst:" + state, "json");
  await kv.delete("oauthst:" + state);
  if (!st || st.p !== p) return { error: "state" };
  const cfg = PROVIDERS[p];
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin, p), code_verifier: st.verifier });
  // Confidential clients: X wants HTTP Basic (client_id:client_secret); Google takes client_id/secret in the body.
  const headers = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (cfg.basicAuth) headers.Authorization = "Basic " + btoa(`${encodeURIComponent(env[cfg.id])}:${encodeURIComponent(env[cfg.secret])}`);
  else { body.set("client_id", env[cfg.id]); body.set("client_secret", env[cfg.secret]); }
  const r = await fetch(cfg.token, { method: "POST", headers, body });
  if (!r.ok) return { error: "token" };
  const tok = await r.json();
  const prof = await cfg.profile(tok.access_token);
  if (!prof.sub) return { error: "profile" };
  return { prof, next: st.next, link: st.link || "" };
}

export const loginKey = async (e) => "login:" + (await sha256Hex("login|" + e));
const identKey = (p, sub) => `oauth:${p}:${sub}`;

/**
 * Link a provider identity to the signed-in account ("Link X / Google" on Security).
 * If the identity already belongs to another account, that account is merged in only when it
 * has no email of its own (an orphan X-only account); otherwise it is refused.
 */
export async function linkIdentity(kv, acct, p, prof) {
  const k = identKey(p, prof.sub);
  const otherId = await kv.get(k);
  if (otherId && otherId !== acct.id) {
    const other = await getAccount(kv, otherId);
    if (other && !other.mergedInto) {
      if (other.email) return { error: "linked-elsewhere" };
      await mergeAccounts(kv, other, acct);
    }
  }
  acct.identities = { ...(acct.identities || {}), [p]: { sub: prof.sub, linkedAt: acct.identities?.[p]?.linkedAt || Date.now() } };
  if (!acct.displayName && prof.name) acct.displayName = String(prof.name).slice(0, 80);
  await putAccount(kv, acct);
  await kv.put(k, acct.id);
  return { ok: true };
}

/** Move identities and listings from `from` into `to`; `from` becomes a pointer (mergedInto) and its sessions end. */
export async function mergeAccounts(kv, from, to) {
  if (!from || !to || from.id === to.id) return;
  for (const [p, v] of Object.entries(from.identities || {})) {
    if (!v?.sub) continue;
    if (!to.identities?.[p]) to.identities = { ...(to.identities || {}), [p]: v };
    await kv.put(identKey(p, v.sub), to.id);
  }
  const ids = Array.isArray(to.listingIds) ? to.listingIds : [];
  for (const id of from.listingIds || []) {
    const row = await kvGetListing(kv, id);
    if (row && row.creatorId === from.id) { row.creatorId = to.id; await kvPutListing(kv, row); }
    if (!ids.includes(id)) ids.push(id);
  }
  to.listingIds = ids.slice(-50);
  if (!to.displayName && from.displayName) to.displayName = from.displayName;
  for (const f of ["logo", "banner", "bio", "makerName"]) if (from[f] && !to[f]) to[f] = from[f];
  from.mergedInto = to.id; from.mergedAt = Date.now(); from.identities = {}; from.listingIds = [];
  from.sessVer = (from.sessVer || 0) + 1;
  await putAccount(kv, from);
  await putAccount(kv, to);
  if (to.email) await syncListingEmails(kv, to);
}

// ---------- Add / confirm an email on an account that has none (e.g. X sign-in) ----------
export const EMAIL_TTL = 3600;
export async function createEmailToken(kv, acctId, email) {
  const tok = b64url(rnd(32));
  await kv.put("emailver:" + (await sha256Hex("emailver|" + tok)), JSON.stringify({ acctId, email }), { expirationTtl: EMAIL_TTL });
  return tok;
}
export async function takeEmailToken(kv, tok, acctId) {
  if (typeof tok !== "string" || tok.length < 40 || tok.length > 64) return null;
  const k = "emailver:" + (await sha256Hex("emailver|" + tok));
  const v = await kv.get(k, "json");
  if (!v || v.acctId !== acctId) return null;
  await kv.delete(k);
  return v && v.acctId && v.email ? v : null;
}
/**
 * Confirm the email: set it on the account, or, when another account already owns that email,
 * merge this account into it so every sign-in (email, Google, X) opens the same account.
 * Returns the account the user should now be signed in as.
 */
export async function confirmEmail(kv, acctId, email) {
  let acct = await getAccount(kv, acctId);
  if (acct?.mergedInto) acct = await getAccount(kv, acct.mergedInto);
  if (!acct) return { error: "gone" };
  const ownerId = await accountIdForLogin(kv, email);
  if (ownerId && ownerId !== acct.id) {
    const owner = await getAccount(kv, ownerId);
    if (owner) { await mergeAccounts(kv, acct, owner); await linkContactToCreator(kv, email, owner.id); return { acct: owner, merged: true }; }
  }
  if (acct.email && acct.email !== email) return { error: "has-email" };
  acct.email = email; acct.emailVerifiedAt = Date.now();
  await putAccount(kv, acct);
  await kv.put(await loginKey(email), acct.id);
  await syncListingEmails(kv, acct);
  await linkContactToCreator(kv, email, acct.id);
  return { acct, merged: false };
}

/** Find or create the account for a provider identity, linking by verified email. */
export async function accountForIdentity(kv, p, prof) {
  const k = identKey(p, prof.sub);
  let id = await kv.get(k);
  let acct = id ? await getAccount(kv, id) : null;
  if (acct?.mergedInto) acct = await getAccount(kv, acct.mergedInto);
  if (!acct && prof.email) { id = await accountIdForLogin(kv, prof.email); acct = id ? await getAccount(kv, id) : null; }
  // A verified provider email links to the account that owns it, and fills in the email on accounts that have none.
  if (acct && prof.email && !acct.email && !(await accountIdForLogin(kv, prof.email))) { acct.email = prof.email; await kv.put(await loginKey(prof.email), acct.id); }
  let created = false;
  if (!acct) {
    acct = { id: "ca_" + b64url(rnd(12)), listingIds: [], createdAt: Date.now(), ...(prof.email ? { email: prof.email } : {}) };
    created = true;
    if (prof.email) await kv.put(await loginKey(prof.email), acct.id);
  }
  acct.identities = { ...(acct.identities || {}), [p]: { sub: prof.sub, linkedAt: acct.identities?.[p]?.linkedAt || Date.now() } };
  if (!acct.displayName && prof.name) acct.displayName = String(prof.name).slice(0, 80);
  await putAccount(kv, acct);
  await kv.put(k, acct.id);
  return { acct, created, needsEmail: !acct.email };
}

// ---------- 2FA ticket (password ok / OAuth ok, TOTP pending) ----------
export async function mfaTicket(env, acct) {
  const exp = String(Date.now() + 5 * 60_000), n = b64url(rnd(9));
  return `${acct.id}.${exp}.${n}.${await hmacHex(env.COMMUNITY_ADMIN_TOKEN, `mfa:${acct.id}:${exp}:${n}:${acct.sessVer || 0}`)}`;
}
export async function readMfaTicket(env, kv, t) {
  const [id, exp, n, sig] = String(t || "").split(".");
  if (!id || !(Number(exp) > Date.now()) || !sig) return null;
  const acct = await getAccount(kv, id);
  if (!acct) return null;
  const ok = timingSafeEqualStr(sig, await hmacHex(env.COMMUNITY_ADMIN_TOKEN, `mfa:${id}:${exp}:${n}:${acct.sessVer || 0}`));
  return ok ? acct : null;
}

// ---------- TOTP ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function b32encode(bytes) { let bits = 0, v = 0, out = ""; for (const b of bytes) { v = (v << 8) | b; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) out += B32[(v << (5 - bits)) & 31]; return out; }
function b32decode(s) { let bits = 0, v = 0; const out = []; for (const c of s.replace(/=+$/, "").toUpperCase()) { const i = B32.indexOf(c); if (i < 0) continue; v = (v << 5) | i; bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); }

export async function totpAt(secretB32, step) {
  const key = await crypto.subtle.importKey("raw", b32decode(secretB32), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const msg = new ArrayBuffer(8); new DataView(msg).setUint32(4, step);
  new DataView(msg).setUint32(0, Math.floor(step / 2 ** 32));
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000).padStart(6, "0");
}
/** Accepts the current step +/- 1; rejects reuse of the last accepted step. Returns step or -1. */
export async function checkTotp(secretB32, code, lastStep = -1, now = Date.now()) {
  code = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return -1;
  const s = Math.floor(now / 30000);
  for (const d of [0, -1, 1]) if (s + d > lastStep && timingSafeEqualStr(await totpAt(secretB32, s + d), code)) return s + d;
  return -1;
}

async function aesKey(env) {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode("totp-key|" + env.COMMUNITY_ADMIN_TOKEN));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealSecret(env, s) { const iv = rnd(12); const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(env), enc.encode(s)); return b64url(iv) + "." + b64url(new Uint8Array(ct)); }
export async function openSecret(env, v) { const [iv, ct] = String(v).split("."); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64url(iv) }, await aesKey(env), unb64url(ct))); }

export function otpauthUri(secret, label) {
  return `otpauth://totp/${encodeURIComponent("Digital Underground:" + label)}?secret=${secret}&issuer=${encodeURIComponent("Digital Underground")}&algorithm=SHA1&digits=6&period=30`;
}
export const newTotpSecret = () => b32encode(rnd(20));

// ---------- Backup codes (10 one-time codes, stored as HMAC-SHA256 hashes) ----------
const BC_ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
const normCode = (c) => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const hashBackup = (env, c) => hmacHex(env.COMMUNITY_ADMIN_TOKEN, "bc|" + normCode(c));
export const looksLikeBackup = (c) => normCode(c).length === 10;
/** Returns plaintext codes (show once) and stores only hashes on acct.backup. Caller saves acct. */
export async function newBackupCodes(env, acct) {
  const codes = [];
  for (let i = 0; i < 10; i++) { const b = rnd(10); let c = ""; for (const x of b) c += BC_ALPHA[x % BC_ALPHA.length]; codes.push(c.slice(0, 5) + "-" + c.slice(5)); }
  acct.backup = { hashes: await Promise.all(codes.map((c) => hashBackup(env, c))), createdAt: Date.now() };
  return codes;
}
/** Consumes a backup code. Returns true when it matched (and removes it). Caller saves acct. */
export async function useBackupCode(env, acct, code) {
  const list = acct.backup?.hashes || [];
  if (!looksLikeBackup(code) || !list.length) return false;
  const h = await hashBackup(env, code);
  let hit = -1;
  list.forEach((x, i) => { if (timingSafeEqualStr(x, h)) hit = i; });
  if (hit < 0) return false;
  list.splice(hit, 1); acct.backup.hashes = list; acct.backup.usedAt = Date.now();
  return true;
}

// ---------- Password reset tokens (KV, 1 h TTL, single use; only the SHA-256 of the token is stored) ----------
export const RESET_TTL = 3600;
export async function createResetToken(kv, acctId) {
  const tok = b64url(rnd(32));
  await kv.put("pwreset:" + (await sha256Hex("pwreset|" + tok)), acctId, { expirationTtl: RESET_TTL });
  return tok;
}
export async function takeResetToken(kv, tok, consume = true) {
  if (typeof tok !== "string" || tok.length < 40 || tok.length > 64) return null;
  const k = "pwreset:" + (await sha256Hex("pwreset|" + tok));
  const id = await kv.get(k);
  if (id && consume) await kv.delete(k);
  return id || null;
}
