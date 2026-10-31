/**
 * PREVIEW ONLY (do not deploy). /api/auth/*
 *   GET  /api/auth/providers                 -> { google: bool, x: bool }  (which OAuth apps are configured)
 *   GET  /api/auth/{google|x}/start?next=/.. -> 302 to provider
 *   GET  /api/auth/{google|x}/callback       -> session cookie, or /login/?mfa=<ticket> when 2FA is on
 *   POST /api/auth/login   { email, password }        -> { ok } | { mfa: true, ticket }
 *   POST /api/auth/signup  { email, password }        -> { ok }
 *   POST /api/auth/2fa     { ticket, code }           -> { ok } (finishes a 2FA login)
 *   POST /api/auth/2fa     { ticket, code }           -> code may be a 6-digit TOTP or a one-time backup code
 *   GET  /api/auth/security                          -> { email, totp, backupLeft, identities } (signed-in)
 *   POST /api/auth/totp/setup | enable {code} | disable {code}   (signed-in creator; enable returns 10 backup codes once)
 *   POST /api/auth/backup/regenerate { code }        -> { codes } (signed-in, 2FA on; old codes stop working)
 *   POST /api/auth/forgot  { email }                 -> always { ok } (emails a 1 h single-use reset link if the account exists)
 *   GET  /api/auth/{google|x}/start?link=1      -> (signed-in) links that sign-in to the current account
 *   POST /api/auth/email/add    { email }         -> (signed-in, account has no email) emails a 1 h confirm link
 *   POST /api/auth/email/verify { token }         -> sets the email, or merges into the account that owns it
 *   POST /api/auth/reset   { token, password }       -> { ok } (sets password, signs out every session)
 */
import { clientIp, getKv, json, normalizeEmail, sendCommunityEmail } from "../../_lib/community.js";
import { accountIdForLogin, authCreator, checkPassword, getAccount, loginAllowed, MIN_PASSWORD, putAccount, sessionCookie, setCredentials, validPassword } from "../../_lib/creator.js";
import { accountForIdentity, checkTotp, configured, finishOAuth, limits, mfaTicket, newTotpSecret, openSecret, otpauthUri, PROVIDERS, readMfaTicket, sealSecret, startOAuth, newBackupCodes, useBackupCode, looksLikeBackup, createResetToken, takeResetToken, RESET_TTL, linkIdentity, createEmailToken, takeEmailToken, confirmEmail, EMAIL_TTL } from "../../_lib/auth.js";

const safeNext = (n) => (typeof n === "string" && /^\/(?!\/)[\w\-./?=&%#]*$/.test(n) ? n : "/community/dashboard/");
const cookieOf = (req, name) => { for (const p of (req.headers.get("Cookie") || "").split(";")) { const i = p.indexOf("="); if (i > 0 && p.slice(0, i).trim() === name) return p.slice(i + 1).trim(); } return ""; };
const redirect = (to, cookies = []) => { const h = new Headers({ Location: to, "Cache-Control": "no-store" }); for (const c of cookies) h.append("Set-Cookie", c); return new Response(null, { status: 302, headers: h }); };
const mailReady = (env) => !!(env.RESEND_API_KEY || env.COMMUNITY_MAILCHANNELS === "1");
const NO_MAIL_MSG = "Password reset by email is coming soon. Contact digitalunderground.store@proton.me for help.";
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
    if (path === "providers") return json({ google: configured(env, "google"), x: configured(env, "x"), resetEmail: mailReady(env) });
    if (path === "security") {
      const acct = await authCreator(request, env, kv);
      if (!acct) return json({ ok: false, error: "Log in first." }, 401);
      return json({ ok: true, email: acct.email || "", hasPassword: !!acct.pw, totp: !!acct.totp?.enabled,
        backupLeft: acct.backup?.hashes?.length || 0, identities: Object.keys(acct.identities || {}) }, 200, { "Cache-Control": "no-store" });
    }
    if (PROVIDERS[p] && step === "start") {
      if (!configured(env, p)) return redirect(`/login/?err=${p}-unavailable`);
      if (!(await limits.oauth(env, ip)).ok) return redirect("/login/?err=rate");
      let linkId = "";
      if (url.searchParams.get("link") === "1") {
        const me = await authCreator(request, env, kv);
        if (!me) return redirect("/login/?next=" + encodeURIComponent("/login/security/"));
        linkId = me.id;
      }
      try {
        const { url: to, cookie } = await startOAuth(env, kv, origin, p, safeNext(url.searchParams.get("next")), linkId);
        return redirect(to, [cookie]);
      } catch (e) {
        console.error("oauth start failed", p, e && e.message);
        return redirect(`/login/?err=${p}-unavailable`);
      }
    }
    if (PROVIDERS[p] && step === "callback") {
      const clear = "du_oauth=; Max-Age=0; Path=/api/auth/; HttpOnly; Secure; SameSite=Lax";
      if (url.searchParams.get("error")) return redirect("/login/?err=cancelled", [clear]);
      let r;
      try { r = await finishOAuth(env, kv, origin, p, url, cookieOf(request, "du_oauth")); } catch (e) { r = { error: "provider" }; }
      if (r.error) return redirect(`/login/?err=${r.error}`, [clear]);
      if (r.link) {
        // Link mode: only for the account that started it, and only while still signed in as it.
        const me = await authCreator(request, env, kv);
        if (!me || me.id !== r.link) return redirect("/login/?next=" + encodeURIComponent("/login/security/"), [clear]);
        const l = await linkIdentity(kv, me, p, r.prof);
        return redirect(`/login/security/?${l.error ? "err=" + l.error : "linked=" + p}`, [clear]);
      }
      const { acct, needsEmail } = await accountForIdentity(kv, p, r.prof);
      const next = needsEmail ? "/login/security/?addemail=1" : r.next;
      if (acct.totp?.enabled) return redirect(`/login/?mfa=${encodeURIComponent(await mfaTicket(env, acct))}&next=${encodeURIComponent(next)}`, [clear]);
      const c = await sessionCookie(env, acct);
      return redirect(next, [clear, ...(c ? [c] : [])]);
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
    let usedBackup = false;
    if (looksLikeBackup(body.code)) usedBackup = await useBackupCode(env, acct, body.code);
    if (!usedBackup) {
      const s = await checkTotp(await openSecret(env, acct.totp.secret), body.code, acct.totp.lastStep ?? -1);
      if (s < 0) return json({ ok: false, error: "That code isn't right. Use your authenticator app or a backup code." }, 400);
      acct.totp.lastStep = s;
    }
    await putAccount(kv, acct);
    const c = await sessionCookie(env, acct);
    return json({ ok: true, ...(usedBackup ? { backupLeft: acct.backup.hashes.length } : {}) }, 200, c ? { "Set-Cookie": c } : {});
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
    if (step === "enable" && acct.totp.enabled) return json({ ok: false, error: "2FA is already on." }, 400);
    // Disabling also accepts a backup code (lost phone).
    const viaBackup = step === "disable" && acct.totp.enabled && looksLikeBackup(body.code) && (await useBackupCode(env, acct, body.code));
    const s = viaBackup ? 0 : await checkTotp(await openSecret(env, acct.totp.secret), body.code, acct.totp.lastStep ?? -1);
    if (s < 0) return json({ ok: false, error: "That code isn't right." }, 400);
    let codes;
    if (step === "enable") { acct.totp = { ...acct.totp, enabled: true, lastStep: s, enabledAt: Date.now() }; codes = await newBackupCodes(env, acct); }
    else if (step === "disable") { delete acct.totp; delete acct.backup; }
    else return json({ error: "Not found." }, 404);
    await putAccount(kv, acct);
    return json({ ok: true, enabled: step === "enable", ...(codes ? { codes } : {}) });
  }

  if (path === "backup/regenerate") {
    const acct = await authCreator(request, env, kv);
    if (!acct) return json({ ok: false, error: "Log in first." }, 401);
    if (!acct.totp?.enabled) return json({ ok: false, error: "Turn on 2FA first." }, 400);
    if (!(await limits.totp(env, ip, acct.id)).ok) return TOO_MANY();
    const s = await checkTotp(await openSecret(env, acct.totp.secret), body.code, acct.totp.lastStep ?? -1);
    if (s < 0) return json({ ok: false, error: "Enter a current code from your authenticator app." }, 400);
    acct.totp.lastStep = s;
    const codes = await newBackupCodes(env, acct);
    await putAccount(kv, acct);
    return json({ ok: true, codes });
  }

  if (path === "forgot") {
    const generic = json({ ok: true, message: "If that email has an account, a reset link is on its way. It works for 1 hour." });
    // No mail provider: same answer for every email, and never claim a message was sent.
    if (!mailReady(env)) return json({ ok: false, unavailable: true, message: NO_MAIL_MSG });
    if (!email) return json({ ok: false, error: "Enter a valid email." }, 400);
    if (!(await limits.forgot(env, ip, email)).ok) return TOO_MANY(60);
    const id = await accountIdForLogin(kv, email);
    const acct = id ? await getAccount(kv, id) : null;
    if (!acct || acct.email !== email) return generic; // no account enumeration
    const tok = await createResetToken(kv, acct.id);
    const link = `${origin}/login/?reset=${encodeURIComponent(tok)}`;
    const r = await sendCommunityEmail(env, { to: email, subject: "Reset your Digital Underground password",
      text: `Someone (hopefully you) asked to reset the password for your Digital Underground creator account.\n\nReset it here (works once, for ${RESET_TTL / 60} minutes):\n${link}\n\nIf you didn't ask for this, ignore this email. Your password stays the same.\n\nDigital Underground\nhttps://digitalundergroundstore.com/` });
    if (!r.sent) console.log("pw reset mail not sent", r.reason || r.status); // never log the link/token
    return generic;
  }

  if (path === "email/add") {
    const acct = await authCreator(request, env, kv);
    if (!acct) return json({ ok: false, error: "Log in first." }, 401);
    if (acct.email) return json({ ok: false, error: "Your account already has an email." }, 400);
    if (!mailReady(env)) return json({ ok: false, error: NO_MAIL_MSG }, 503);
    if (!email) return json({ ok: false, error: "Enter a valid email." }, 400);
    if (!(await limits.addEmail(env, ip, acct.id)).ok) return TOO_MANY(60);
    const tok = await createEmailToken(kv, acct.id, email);
    const link = `${origin}/login/security/?verify=${encodeURIComponent(tok)}`;
    const r = await sendCommunityEmail(env, { to: email, subject: "Confirm your email for Digital Underground",
      text: `Confirm this email for your Digital Underground creator account (works once, for ${EMAIL_TTL / 60} minutes; open it in the browser where you're logged in):\n${link}\n\nOnce it's confirmed, logging in with this email, Google or X all open the same account. If you already have an account with this email, the two are joined into one, with all your listings.\n\nIf you didn't ask for this, ignore this email.\n\nDigital Underground\nhttps://digitalundergroundstore.com/` });
    if (!r.sent) { console.log("email confirm not sent", r.reason || r.status); return json({ ok: false, error: "We couldn't send the email right now. Try again in a few minutes." }, 502); }
    return json({ ok: true, message: "Check your inbox for a confirm link. It works for 1 hour." });
  }

  if (path === "email/verify") {
    if (!(await limits.reset(env, ip)).ok) return TOO_MANY();
    // Must be opened while signed in to the account that asked, so a forwarded link can't join someone else's X to your account.
    const me = await authCreator(request, env, kv);
    if (!me) return json({ ok: false, needLogin: true, error: "Log in with the account that asked (for example with X), then open the link again." }, 401);
    const t = await takeEmailToken(kv, body.token, me.id);
    if (!t) return json({ ok: false, error: "That confirm link is invalid or expired. Ask for a new one." }, 400);
    const r = await confirmEmail(kv, t.acctId, normalizeEmail(t.email));
    if (r.error) return json({ ok: false, error: "That confirm link no longer applies. Log in and try again." }, 400);
    const msg = r.merged ? "Email confirmed. Your accounts are now one: email, Google and X all open it, with all your listings." : "Email confirmed. Logging in with this email, Google or X now opens this same account.";
    if (r.acct.totp?.enabled) return json({ ok: true, merged: r.merged, login: true, message: msg + " Log in to continue." }, 200, { "Set-Cookie": "du_creator=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax" });
    const c = await sessionCookie(env, r.acct);
    return json({ ok: true, merged: r.merged, email: r.acct.email, message: msg }, 200, c ? { "Set-Cookie": c } : {});
  }

  if (path === "reset") {
    if (!(await limits.reset(env, ip)).ok) return TOO_MANY();
    if (!validPassword(body.password)) return json({ ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` }, 400);
    const id = await takeResetToken(kv, body.token);
    const acct = id ? await getAccount(kv, id) : null;
    if (!acct || !acct.email) return json({ ok: false, error: "That reset link is invalid or expired. Ask for a new one." }, 400);
    acct.sessVer = (acct.sessVer || 0) + 1; // sign out everywhere
    const r = await setCredentials(kv, acct, acct.email, body.password);
    if (r.error) return json({ ok: false, error: r.error }, 400);
    return json({ ok: true, message: "Password updated. Log in with your new password." });
  }
  return json({ error: "Not found." }, 404);
}
