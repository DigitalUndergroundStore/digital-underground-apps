import { checkRate, clientIp, getKv, json, normalizeEmail, sendCommunityEmail } from "../../_lib/community.js";
import {
  accountIdForLogin,
  checkPassword,
  createOtp,
  emailLoginEnabled,
  getAccount,
  loginAllowed,
  MIN_PASSWORD,
  sessionCookie,
  setCredentials,
  validPassword,
  verifyOtp,
} from "../../_lib/creator.js";

/**
 * Creator dashboard sign-in.
 *   POST { email, password }               -> sets the 180-day session cookie
 *   POST { action:"forgot", email }        -> emails a 6-digit reset code (needs COMMUNITY_EMAIL_LOGIN=1)
 *   POST { action:"reset", email, code, password } -> sets a new password + signs in
 *   POST {}                                -> { resetByEmail: bool }
 * Responses never reveal whether an email has an account.
 */
const BAD_LOGIN = { ok: false, error: "Email or password is incorrect." };
const SENT = { ok: true, message: "If that email has a creator account, we sent a 6-digit code. It expires in 10 minutes." };
const BAD_CODE = { ok: false, error: "That code is not valid or has expired." };

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not configured." }, 503);
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const resetByEmail = emailLoginEnabled(env);
  const email = normalizeEmail(body.email);
  const ip = clientIp(request);

  if (!body.action && body.password == null && !body.email) return json({ resetByEmail });

  if (!body.action) {
    if (!email || typeof body.password !== "string") return json(BAD_LOGIN, 400);
    if (!loginAllowed(ip, email)) return json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, 429);
    const acct = await checkPassword(kv, email, body.password);
    if (!acct) return json(BAD_LOGIN, 400);
    const cookie = await sessionCookie(env, acct.id);
    return json({ ok: true }, 200, cookie ? { "Set-Cookie": cookie } : {});
  }

  if (!resetByEmail) {
    return json({ ok: false, resetByEmail: false, error: "Password reset by email is not available yet. Email support at digitalunderground.store@proton.me." }, 400);
  }

  if (body.action === "forgot") {
    if (!email) return json({ ok: false, error: "Enter a valid email." }, 400);
    if (!checkRate("otps:" + ip)) return json(SENT);
    try {
      const id = await accountIdForLogin(kv, email);
      if (id) {
        const code = await createOtp(env, kv, email, id);
        if (code) {
          context.waitUntil(
            sendCommunityEmail(env, {
              to: email,
              subject: `Your Digital Underground reset code: ${code}`,
              text: `Your creator dashboard password reset code is ${code}\n\nIt expires in 10 minutes. If you did not request it, ignore this email.`,
            }).catch(() => {})
          );
        }
      }
    } catch (e) {
      console.error("creator forgot error", e);
    }
    return json(SENT);
  }

  if (body.action === "reset") {
    if (!validPassword(body.password)) return json({ ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` }, 400);
    if (!email || !checkRate("otpv:" + ip)) return json(BAD_CODE, 400);
    const acctId = await verifyOtp(env, kv, email, String(body.code || ""));
    const acct = acctId ? await getAccount(kv, acctId) : null;
    if (!acct) return json(BAD_CODE, 400);
    await setCredentials(kv, acct, email, body.password);
    const cookie = await sessionCookie(env, acct.id);
    return json({ ok: true }, 200, cookie ? { "Set-Cookie": cookie } : {});
  }

  return json({ ok: false, error: "Unknown action." }, 400);
}
