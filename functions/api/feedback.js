// Unified product feedback ingest -> owner dashboard (Feedback & support inbox).
// Public POST (CORS) for any product page/game, plus server-to-server forwards with FEEDBACK_INGEST_TOKEN.
import { getKv, ownerAlertEmail, sendCommunityEmail, clientIp, normalizeEmail } from "../_lib/community.js";
import { storeSupportMessage } from "../_lib/owner.js";
import { rateHit } from "../_lib/ratelimit.js";
import { attachVerification, resolveSubmitter, issueConfirmEmail } from "../_lib/feedback-verify.js";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
const j = (o, s = 200) => Response.json(o, { status: s, headers: CORS });
const clip = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").trim().slice(0, n);
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env, waitUntil }) {
  const kv = getKv(env);
  if (!kv) return j({ ok: false, error: "Storage not ready." }, 503);
  const raw = await request.text();
  if (raw.length > 8000) return j({ ok: false, error: "Too long." }, 413);
  let b; try { b = JSON.parse(raw); } catch { return j({ ok: false, error: "Bad request." }, 400); }
  if (b.website) return j({ ok: true });
  const auth = request.headers.get("Authorization") || "";
  const trusted = !!env.FEEDBACK_INGEST_TOKEN && auth === "Bearer " + env.FEEDBACK_INGEST_TOKEN;
  if (!trusted) {
    const r = await rateHit(env, "fb:" + clientIp(request), 5, 900);
    if (!r.ok) return j({ ok: false, error: "Too many messages. Try again later." }, 429);
  }
  const message = clip(b.message, 5000);
  const product = clip(b.product, 80) || "Unknown product";
  if (message.length < 3) return j({ ok: false, error: "Please write a message." }, 400);
  const kind = clip(b.type || b.kind, 30);
  const typedContact = clip(b.email || b.contact, 200);
  const name = clip(b.name, 80);
  const later = typeof waitUntil === "function" ? waitUntil : (p) => p;
  // Typed email is not used for identity when a creator session is present.
  const submitter = trusted ? null : await resolveSubmitter(request, env, kv);
  const identity = submitter ? submitter.email : typedContact;
  const row = await storeSupportMessage(kv, {
    subject: `${product} feedback${kind ? " [" + kind + "]" : ""}${name ? " from " + name : ""}`,
    message, replyTo: identity, product, kind, listingName: product,
    creatorId: submitter ? submitter.acct.id : "",
    source: trusted ? clip(b.source, 40) || "forward" : clip(b.source, 40) || "web",
    meta: { page: clip(b.page, 300), version: clip(b.version, 20), name, extId: clip(b.id, 80) },
    createdAt: Date.parse(b.ts) || Date.now(),
  });
  if (submitter) {
    await attachVerification(kv, row, {
      verified: "account",
      verifiedEmail: submitter.email,
      replyTo: submitter.email,
      creatorId: submitter.acct.id,
    });
  } else {
    await attachVerification(kv, row, { verified: false });
    if (!trusted && normalizeEmail(typedContact)) {
      const sendMail = typeof env?.feedbackSendMail === "function"
        ? env.feedbackSendMail
        : (opts) => sendCommunityEmail(env, opts);
      later(issueConfirmEmail({
        env, kv, request, messageId: row.id, email: typedContact, ip: clientIp(request), sendMail,
      }).catch(() => {}));
    }
  }
  if (!b.noEmail) {
    const text = [`New feedback: ${product}${kind ? " (" + kind + ")" : ""}`, `From: ${name || "(anonymous)"}${identity ? " <" + identity + ">" : ""}`, "", message, "", "Owner dashboard: https://digitalundergroundstore.com/owner/"].join("\n");
    later(sendCommunityEmail(env, { to: ownerAlertEmail(env), subject: `Feedback: ${product}`, text, replyTo: /@/.test(identity) ? identity : undefined }).catch(() => {}));
  }
  return j({ ok: true, id: row.id });
}
export const onRequest = () => j({ error: "POST only" }, 405);
