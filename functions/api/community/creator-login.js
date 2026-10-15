import { checkRate, clientIp, getKv, json, normalizeEmail, sendCommunityEmail } from "../../_lib/community.js";
import { createOtp, creatorIdsForEmail, emailLoginEnabled, sessionCookie, verifyOtp } from "../../_lib/creator.js";

/**
 * Email one-time-code sign-in for the creator dashboard.
 *   POST { email }        -> sends a 6-digit code (10 min) if the email has a creator account
 *   POST { email, code }  -> sets the session cookie on success
 * OFF unless COMMUNITY_EMAIL_LOGIN=1 (needs a verified Resend sending domain).
 * Responses never reveal whether the email has an account.
 */
const SENT = { enabled: true, ok: true, message: "If that email has listings, we sent a 6-digit code. It expires in 10 minutes." };
const BAD = { enabled: true, ok: false, error: "That code is not valid or has expired." };

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!emailLoginEnabled(env)) {
    return json({ enabled: false, message: "Email sign-in is not available yet. Use your private dashboard link." });
  }
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not configured." }, 503);
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const email = normalizeEmail(body.email);
  const ip = clientIp(request);

  if (body.code != null) {
    if (!checkRate("otpv:" + ip) || !email) return json(BAD, 400);
    const acctId = await verifyOtp(env, kv, email, String(body.code));
    if (!acctId) return json(BAD, 400);
    const cookie = await sessionCookie(env, acctId);
    return json({ enabled: true, ok: true }, 200, cookie ? { "Set-Cookie": cookie } : {});
  }

  if (!email) return json({ enabled: true, ok: false, error: "Enter a valid email." }, 400);
  if (!checkRate("otps:" + ip)) return json(SENT);
  try {
    const ids = await creatorIdsForEmail(kv, email);
    if (ids.length) {
      const code = await createOtp(env, kv, email, ids[ids.length - 1]);
      if (code) {
        context.waitUntil(
          sendCommunityEmail(env, {
            to: email,
            subject: `Your Digital Underground sign-in code: ${code}`,
            text: `Your creator dashboard sign-in code is ${code}\n\nIt expires in 10 minutes. If you did not request it, ignore this email.\n\nhttps://digitalundergroundstore.com/community/dashboard/`,
          }).catch(() => {})
        );
      }
    }
  } catch (e) {
    console.error("creator login error", e);
  }
  return json(SENT);
}
