/**
 * Feedback sender verification: signed-in creator sessions, and
 * one-click email confirmation for unsigned submissions.
 *
 * Support rows are stored at support:msg:{id} (same key as _lib/owner.js).
 * This module does not edit functions/_lib/owner.js (release allowlist forbids it);
 * it patches verification fields onto the row after storeSupportMessage.
 *
 * Confirm tokens: feedback:confirm:{64-hex}, 48h TTL, single use.
 */
import { communitySiteOrigin, normalizeEmail, clientIp } from "./community.js";
import { authCreator } from "./creator.js";
import { rateAll, ipHash } from "./ratelimit.js";

export const SUPPORT_MSG_PREFIX = "support:msg:";
export const CONFIRM_PREFIX = "feedback:confirm:";
export const CONFIRM_TTL_SEC = 48 * 3600;
export const CONFIRM_EMAIL_LIMIT = 3;
export const CONFIRM_IP_LIMIT = 8;
export const CONFIRM_WINDOW_SEC = 86400;

export async function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Write verification fields onto an already-stored support row. */
export async function attachVerification(kv, row, fields, now = Date.now()) {
  Object.assign(row, fields);
  row.updatedAt = now;
  await kv.put(SUPPORT_MSG_PREFIX + row.id, JSON.stringify(row));
  return row;
}

/**
 * If the request carries a valid creator session (cookie or manage link)
 * and that account has an email, return { acct, email, verified: "account" }.
 */
export async function resolveSubmitter(request, env, kv) {
  const acct = await authCreator(request, env, kv);
  const email = acct ? normalizeEmail(acct.email) : "";
  if (acct && email) return { acct, email, verified: "account" };
  return null;
}

export async function canSendConfirm(env, email, ip) {
  const addr = normalizeEmail(email);
  if (!addr) return false;
  const r = await rateAll(env, [
    [`fbconfirm:e:${ipHash(addr)}`, CONFIRM_EMAIL_LIMIT, CONFIRM_WINDOW_SEC],
    [`fbconfirm:ip:${ipHash(ip || "unknown")}`, CONFIRM_IP_LIMIT, CONFIRM_WINDOW_SEC],
  ]);
  return r.ok;
}

export function confirmUrl(env, request, token) {
  return `${communitySiteOrigin(env, request)}/api/feedback-confirm?t=${encodeURIComponent(token)}`;
}

export function confirmEmailText(link) {
  return [
    "Please confirm you sent this feedback to Digital Underground",
    "",
    link,
    "",
    "This link expires in 48 hours and can only be used once. If you did not send this, you can ignore this email.",
  ].join("\n");
}

/**
 * Issue a single-use confirm token and send the email via `sendMail`.
 * Does not send when the address is invalid or the per-email / per-IP
 * daily cap is reached. Never throws on mail failure.
 */
export async function issueConfirmEmail({ env, kv, request, messageId, email, ip, sendMail, now }) {
  const addr = normalizeEmail(email);
  if (!addr) return { sent: false, reason: "invalid_email" };
  if (!(await canSendConfirm(env, addr, ip || clientIp(request)))) {
    return { sent: false, reason: "rate_limited" };
  }
  const token = await randomToken();
  const exp = (now || Date.now()) + CONFIRM_TTL_SEC * 1000;
  await kv.put(CONFIRM_PREFIX + token, JSON.stringify({ id: messageId, email: addr, exp }), {
    expirationTtl: CONFIRM_TTL_SEC,
  });
  const link = confirmUrl(env, request, token);
  let result = { sent: false };
  try {
    result = (await sendMail({
      to: addr,
      subject: "Confirm your feedback to Digital Underground",
      text: confirmEmailText(link),
    })) || { sent: false };
  } catch (_) {
    result = { sent: false, reason: "send_failed" };
  }
  return { sent: !!result.sent, reason: result.reason || (result.sent ? undefined : "send_failed") };
}

/**
 * Consume a confirm token (single use). Returns { ok, error?, row? }.
 * error: invalid | expired
 */
export async function consumeConfirmToken(kv, token, now = Date.now()) {
  const t = String(token || "").trim();
  if (!/^[0-9a-f]{64}$/i.test(t)) return { ok: false, error: "invalid" };
  const key = CONFIRM_PREFIX + t.toLowerCase();
  const rec = await kv.get(key, "json");
  if (!rec || typeof rec !== "object") return { ok: false, error: "invalid" };
  await kv.delete(key);
  if (!rec.exp || rec.exp <= now) return { ok: false, error: "expired" };
  const row = await kv.get(SUPPORT_MSG_PREFIX + rec.id, "json");
  if (!row) return { ok: false, error: "invalid" };
  if (row.verified !== "account") {
    row.verified = "email";
    row.verifiedEmail = rec.email;
    if (!row.replyTo) row.replyTo = rec.email;
    row.updatedAt = now;
    await kv.put(SUPPORT_MSG_PREFIX + row.id, JSON.stringify(row));
  }
  return { ok: true, row };
}

/** True when this GET looks like a prefetch / prerender, not a user click. */
export function isPrefetchRequest(request) {
  const purpose = `${request.headers.get("Purpose") || ""} ${request.headers.get("Sec-Purpose") || ""}`.toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("prerender")) return true;
  const dest = (request.headers.get("Sec-Fetch-Dest") || "").toLowerCase();
  if (dest === "empty" && (request.headers.get("Sec-Fetch-Mode") || "") === "no-cors") return true;
  return false;
}
