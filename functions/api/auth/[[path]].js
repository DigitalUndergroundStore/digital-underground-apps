/**
 * PREVIEW ONLY (do not deploy). /api/auth/*
 *   GET  /api/auth/providers                 -> { google: bool, x: bool }  (which OAuth apps are configured)
 *   GET  /api/auth/{google|x}/start?next=/.. -> 302 to provider
 *   GET  /api/auth/{google|x}/callback       -> session cookie, or /login/?mfa=<ticket> when 2FA is on
 *   POST /api/auth/login   { email, password }        -> { ok } | { mfa: true, ticket }
 *   POST /api/auth/signup  { email, password }        -> { ok }
 *   POST /api/auth/2fa     { ticket, code }           -> { ok } (finishes a 2FA login)
 *   POST /api/auth/totp/setup | enable {code} | disable {code}   (signed-in creator)
 */
import { clientIp, getKv, json, normalizeEmail } from "../../_lib/community.js";
import { accountIdForLogin, authCreator, checkPassword, getAccount, loginAllowed, MIN_PASSWORD, putAccount, sessionCookie, setCredentials, validPassword } from "../../_lib/creator.js";
import { accountForIdentity, checkTotp, configured, finishOAuth, limits, mfaTicket, newTotpSecret, openSecret, otpauthUri, PROVIDERS, readMfaTicket, sealSecret, startOAuth } from "../../_lib/auth.js";

const safeNext = (n) => (typeof n === "string" && /^\/(?!\/)[\w\-./?=&%#]*$/.test(n) ? n : "/community/dashboard/");
const cookieOf = (req, name) => { for (const p of (req.headers.get("Cookie") || "").split(";")) { const i = p.indexOf("="); if (i > 0 && p.slice(0, i).trim() === name) return p.slice(i + 1).trim(); } return ""; };
const redirect = (to, cookies = []) => { const h = new Headers({ Location: to, "Cache-Control": "no-store" }); for (const c of cookies) h.append("Set-Cookie", c); return new Response(null, { status: 302, headers: h }); };
const TOO_MANY = (m = 15) => json({ ok: false, error: `Too many attempts. Try again in ${m} minutes.` }, 429);

async function signedIn(env, acct, extra = {}) {
  if (acct.totp?.enabled) return json({ ok: false, mfa: true, ticket: await mfaTicket(env, acct) });
  const c = await sessionCookie(env, acct);
  return json({ ok: true, ...extra }, 200, c ? { "Set-Cookie": c } : {});
}

export async function onRequest({ request, env, params }) {
  const kv = getKv(env);
  if (!kv || !env.COMMUNITY_ADMIN_TOKEN) return json({ error: "Auth not configured." }, 503);
  const url = new URL(request.url), origin = url.origin, ip = clientIp(request);
  const path = (params.path || []).join("/");
  const [p, step] = path.split("/");

  if (request.method === "GET") {
    if (path === "providers") return json({ google: configured(env, "google"), x: configured(env, "x") });
    if (PROVIDERS[p] && step === "start") {
      if (!configured(env, p)) return redirect(`/login/?err=${p}-unavailable`);
      if (!(await limits.oauth(env, ip)).ok) return redirect("/login/?err=rate");
      const { url: to, cookie } = await startOAuth(env, kv, origin, p, safeNext(url.searchParams.get("next")));
      return redirect(to, [cookie]);
    }
    if (PROVIDERS[p] && step === "callback") {
      const clear = "du_oauth=; Max-Age=0; Path=/api/auth/; HttpOnly; Secure; SameSite=Lax";
      if (url.searchParams.get("error")) return redirect("/login/?err=cancelled", [clear]);
      let r;
      try { r = await finishOAuth(env, kv, origin, p, url, cookieOf(request, "du_oauth")); } catch (e) { r = { error: "provider" }; }
      if (r.error) return redirect(`/login/?err=${r.error}`, [clear]);
      const { acct } = await accountForIdentity(kv, p, r.prof);
      if (acct.totp?.enabled) return redirect(`/login/?mfa=${encodeURIComponent(await mfaTicket(env, acct))}&next=${encodeURIComponent(r.next)}`, [clear]);
      const c = await sessionCookie(env, acct);
      return redirect(r.next, [clear, ...(c ? [c] : [])]);
    }
    return json({ error: "Not found." }, 404);
  }
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  let body = {}; try { body = await request.json(); } catch (_) {}
  const email = normalizeEmail(body.email);

  if (path === "login") {
    if (!email || typeof body.password !== "string") return json({ ok: false, error: "Email or password is incorrect." }, 400);
    if (!(await loginAllowed(env, ip, email))) return TOO_MANY();
    const acct = await checkPassword(kv, email, body.password); // same PBKDF2 path as the current creator login
    if (!acct) return json({ ok: false, error: "Email or password is incorrect." }, 400);
    return signedIn(env, acct);
  }

  if (path === "signup") {
    if (!email) return json({ ok: false, error: "Enter a valid email." }, 400);
    if (!validPassword(body.password)) return json({ ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` }, 400);
    if (!(await limits.signup(env, ip, email)).ok) return TOO_MANY(60);
    if (await accountIdForLogin(kv, email)) {
      // Never let sign-up set a password on an existing account (that would be a takeover).
      return json({ ok: false, exists: true, error: "That email already has an account. Log in, continue with Google or X, or use Forgot password." }, 409);
    }
    const acct = { id: "ca_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16), listingIds: [], createdAt: Date.now() };
    const r = await setCredentials(kv, acct, email, body.password);
    if (r.error) return json({ ok: false, error: r.error }, 400);
    return signedIn(env, acct, { created: true });
  }

  if (path === "2fa") {
    const acct = await readMfaTicket(env, kv, body.ticket);
    if (!acct || !acct.totp?.enabled) return json({ ok: false, error: "That sign-in expired. Start again." }, 400);
    if (!(await limits.totp(env, ip, acct.id)).ok) return TOO_MANY();
    const s = await checkTotp(await openSecret(env, acct.totp.secret), body.code, acct.totp.lastStep ?? -1);
    if (s < 0) return json({ ok: false, error: "That code isn't right. Check your authenticator app." }, 400);
    acct.totp.lastStep = s; await putAccount(kv, acct);
    const c = await sessionCookie(env, acct);
    return json({ ok: true }, 200, c ? { "Set-Cookie": c } : {});
  }

  if (path.startsWith("totp/")) {
    const acct = await authCreator(request, env, kv);
    if (!acct) return json({ ok: false, error: "Log in first." }, 401);
    if (!(await limits.totp(env, ip, acct.id)).ok) return TOO_MANY();
    if (step === "setup") {
      if (acct.totp?.enabled) return json({ ok: false, error: "2FA is already on." }, 400);
      const secret = newTotpSecret();
      acct.totp = { enabled: false, secret: await sealSecret(env, secret) }; await putAccount(kv, acct);
      return json({ ok: true, secret, otpauth: otpauthUri(secret, acct.email || acct.id) });
    }
    if (!acct.totp?.secret) return json({ ok: false, error: "Start 2FA setup first." }, 400);
    const s = await checkTotp(await openSecret(env, acct.totp.secret), body.code, acct.totp.lastStep ?? -1);
    if (s < 0) return json({ ok: false, error: "That code isn't right." }, 400);
    if (step === "enable") { acct.totp = { ...acct.totp, enabled: true, lastStep: s, enabledAt: Date.now() }; }
    else if (step === "disable") { delete acct.totp; }
    else return json({ error: "Not found." }, 404);
    await putAccount(kv, acct);
    return json({ ok: true, enabled: step === "enable" });
  }
  return json({ error: "Not found." }, 404);
}
