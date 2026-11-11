import { getSku } from "./store-skus.js";
import { signDownloadToken, expiryFromNow, DEFAULT_TTL_SEC } from "./download-token.js";

export const EVENT_KV_PREFIX = "stripe:evt:";
export const EVENT_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
export const FROM_DEFAULT = "Digital Underground <notify@digitalundergroundstore.com>";

export function getKv(env) {
  // Event idempotency only. Do not use DOWNLOADS_KV (product files) here.
  return env?.COMMUNITY_KV || null;
}

export function originFrom(request) {
  try {
    const u = new URL(request.url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return u.origin;
    return "https://digitalundergroundstore.com";
  } catch {
    return "https://digitalundergroundstore.com";
  }
}

export function sessionSku(session) {
  return (
    session?.metadata?.sku ||
    session?.payment_intent?.metadata?.sku ||
    session?.client_reference_id ||
    ""
  );
}

export function sessionEmail(session) {
  return (
    session?.customer_details?.email ||
    session?.customer_email ||
    session?.customer_details?.customer_email ||
    ""
  ).trim();
}

export function isPaidSession(session) {
  const st = session?.payment_status || session?.status;
  return st === "paid" || st === "complete" || st === "no_payment_required";
}

export function downloadUrls(origin, token, skuRec) {
  const base = `${origin}/api/store/download?t=${encodeURIComponent(token)}`;
  return (skuRec.files || []).map((f) => ({
    id: f.id,
    filename: f.filename,
    url: `${base}&file=${encodeURIComponent(f.id)}`,
  }));
}

export function deliveryEmail({ title, links, thanksUrl }) {
  const lines = links.map((l) => `- ${l.filename}: ${l.url}`).join("\n");
  const subject = `Your ${title} download`;
  const text = [
    `Thank you for buying ${title} from Digital Underground.`,
    "",
    "Your download links (they expire in 72 hours):",
    lines,
    "",
    "Need them again later? Open this page and use the same email you used at checkout:",
    thanksUrl,
    "",
    "If a link expires, that page will issue a fresh one after it confirms your payment.",
    "",
    "Questions: digitalunderground.store@proton.me",
    "",
    "— Digital Underground",
  ].join("\n");
  return { subject, text };
}

export async function sendResend(env, { to, subject, text }) {
  const apiKey = env?.RESEND_API_KEY;
  const from = env?.COMMUNITY_NOTIFY_FROM || FROM_DEFAULT;
  if (!apiKey) return { sent: false, reason: "no_mail_configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const out = { sent: res.ok, status: res.status, provider: "resend" };
  if (!res.ok) {
    try { out.detail = (await res.text()).slice(0, 300); } catch (_) {}
  }
  return out;
}

/** Idempotent fulfillment for a paid Checkout Session. Returns { ok, duplicate, email }. */
export async function fulfillPaidSession(env, session, { request, sendEmail = sendResend } = {}) {
  const sku = sessionSku(session);
  const rec = getSku(sku);
  const email = sessionEmail(session);
  if (!rec) return { ok: false, error: "unknown_sku", sku };
  if (!email) return { ok: false, error: "missing_email" };
  if (!isPaidSession(session)) return { ok: false, error: "not_paid" };
  const secret = env?.DOWNLOAD_SIGNING_SECRET;
  if (!secret) return { ok: false, error: "missing_signing_secret" };
  const exp = expiryFromNow(DEFAULT_TTL_SEC);
  const token = await signDownloadToken(secret, { sku, exp, sid: session.id });
  const origin = request ? originFrom(request) : "https://digitalundergroundstore.com";
  const links = downloadUrls(origin, token, rec);
  const thanksUrl = `${origin}/thanks/?sku=${encodeURIComponent(sku)}`;
  const mail = deliveryEmail({ title: rec.title, links, thanksUrl });
  const emailResult = await sendEmail(env, { to: email, subject: mail.subject, text: mail.text });
  return { ok: true, sku, email, token, links, thanksUrl, emailResult };
}

export async function alreadyProcessed(kv, eventId) {
  if (!kv || !eventId) return false;
  const hit = await kv.get(EVENT_KV_PREFIX + eventId);
  return !!hit;
}

export async function markProcessed(kv, eventId) {
  if (!kv || !eventId) return;
  await kv.put(EVENT_KV_PREFIX + eventId, "1", { expirationTtl: EVENT_TTL_SEC });
}
