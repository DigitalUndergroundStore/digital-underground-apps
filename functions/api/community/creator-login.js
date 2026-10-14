import { communitySiteOrigin, getKv, json, sendCommunityEmail, checkRate, clientIp } from "../../_lib/community.js";
import { creatorIdsForEmail, signMagic } from "../../_lib/creator.js";

/**
 * POST /api/community/creator-login { email }
 * Email magic-link login. OFF unless COMMUNITY_MAGIC_LINK=1 (needs a verified Resend domain).
 * Always returns the same response, so it cannot be used to discover who has an account.
 */
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (env?.COMMUNITY_MAGIC_LINK !== "1") {
    return json({ enabled: false, message: "Email login is not available yet. Use your private dashboard link." });
  }
  const generic = { enabled: true, message: "If that email has listings, a sign-in link is on its way." };
  if (!checkRate("login:" + clientIp(request))) return json(generic);
  const kv = getKv(env);
  let body = {};
  try { body = await request.json(); } catch (_) {}
  try {
    const ids = kv ? await creatorIdsForEmail(kv, body.email) : [];
    if (ids.length) {
      const signed = await signMagic(env, ids[ids.length - 1]);
      const link = `${communitySiteOrigin(env, request)}/community/dashboard/#m=${encodeURIComponent(signed)}`;
      context.waitUntil(
        sendCommunityEmail(env, {
          to: String(body.email).trim().toLowerCase(),
          subject: "Your Digital Underground creator dashboard link",
          text: `Sign in to your creator dashboard (link expires in 30 minutes):\n${link}\n\nIf you did not request this, ignore this email.`,
        })
      );
    }
  } catch (e) {
    console.error("creator login error", e);
  }
  return json(generic);
}
