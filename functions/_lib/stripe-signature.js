import { hmacSha256, bytesToHex, timingSafeEqualHex } from "./crypto-util.js";

const DEFAULT_TOLERANCE_SEC = 300;

/** Parse Stripe-Signature header "t=...,v1=...,v1=..." */
export function parseStripeSignature(header) {
  const out = { t: null, v1: [] };
  for (const part of String(header || "").split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") out.t = v;
    else if (k === "v1") out.v1.push(v);
  }
  return out;
}

/**
 * Verify a Stripe webhook signature the same way stripe-node does:
 * HMAC-SHA256(secret, `${t}.${rawBody}`) compared to any v1 signature.
 * `secret` is the full `whsec_...` value (not decoded).
 */
export async function verifyStripeSignature(rawBody, header, secret, nowSec = Math.floor(Date.now() / 1000), toleranceSec = DEFAULT_TOLERANCE_SEC) {
  if (!secret) return { ok: false, error: "missing_secret" };
  const parsed = parseStripeSignature(header);
  if (!parsed.t || !parsed.v1.length) return { ok: false, error: "bad_header" };
  const ts = Number(parsed.t);
  if (!Number.isFinite(ts)) return { ok: false, error: "bad_timestamp" };
  if (Math.abs(nowSec - ts) > toleranceSec) return { ok: false, error: "expired" };
  const expected = bytesToHex(await hmacSha256(secret, `${parsed.t}.${rawBody}`));
  for (const sig of parsed.v1) {
    if (timingSafeEqualHex(expected, sig.toLowerCase())) return { ok: true, timestamp: ts };
  }
  return { ok: false, error: "bad_signature" };
}

/** Build a Stripe-Signature header for tests (does not talk to Stripe). */
export async function signStripePayload(rawBody, secret, timestampSec = Math.floor(Date.now() / 1000)) {
  const v1 = bytesToHex(await hmacSha256(secret, `${timestampSec}.${rawBody}`));
  return `t=${timestampSec},v1=${v1}`;
}
