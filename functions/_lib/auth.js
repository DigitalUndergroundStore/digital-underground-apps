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
 * - No magic links.
 */
import { hmacHex, normalizeEmail, timingSafeEqualStr } from "./community.js";
import { accountIdForLogin, getAccount, putAccount, sha256Hex } from "./creator.js";
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
    scope: "users.read tweet.read users.email",
    basicAuth: true,
    async profile(at) {
      const r = await fetch("https://api.x.com/2/users/me?user.fields=confirmed_email,name,username", { headers: { Authorization: "Bearer " + at } });
      if (!r.ok) throw new Error("x users/me " + r.status);
      const d = (await r.json()).data || {};
      // X only returns confirmed_email when the app has "Request email" enabled; it is verified by X.
      return { sub: String(d.id), email: normalizeEmail(d.confirmed_email || ""), name: d.name || d.username || "" };
    },
  },
};

export const redirectUri = (origin, p) => `${origin}/api/auth/${p}/callback`;
export const configured = (env, p) => !!(env?.[PROVIDERS[p].id] && env?.[PROVIDERS[p].secret]);

export async function startOAuth(env, kv, origin, p, next) {
  const cfg = PROVIDERS[p];
  const state = b64url(rnd(24)), verifier = b64url(rnd(48));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(verifier))));
  await kv.put("oauthst:" + state, JSON.stringify({ p, verifier, next }), { expirationTtl: 600 });
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
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin, p), code_verifier: st.verifier, client_id: env[cfg.id] });
  const headers = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (cfg.basicAuth) headers.Authorization = "Basic " + btoa(`${env[cfg.id]}:${env[cfg.secret]}`);
  else body.set("client_secret", env[cfg.secret]);
  const r = await fetch(cfg.token, { method: "POST", headers, body });
  if (!r.ok) return { error: "token" };
  const tok = await r.json();
  const prof = await cfg.profile(tok.access_token);
  if (!prof.sub) return { error: "profile" };
  return { prof, next: st.next };
}

const loginKey = async (e) => "login:" + (await sha256Hex("login|" + e));
const identKey = (p, sub) => `oauth:${p}:${sub}`;

/** Find or create the account for a provider identity, linking by verified email. */
export async function accountForIdentity(kv, p, prof) {
  const k = identKey(p, prof.sub);
  let id = await kv.get(k);
  let acct = id ? await getAccount(kv, id) : null;
  if (!acct && prof.email) { id = await accountIdForLogin(kv, prof.email); acct = id ? await getAccount(kv, id) : null; }
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
  return { acct, created };
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
