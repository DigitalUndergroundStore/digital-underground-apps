import { hmacSha256, bytesToBase64Url, base64UrlToBytes, timingSafeEqualBytes, utf8 } from "./crypto-util.js";

export const DEFAULT_TTL_SEC = 72 * 60 * 60; // 72 hours

export async function signDownloadToken(secret, { sku, exp, sid, file } = {}) {
  if (!secret) throw new Error("missing_signing_secret");
  const payload = bytesToBase64Url(utf8(JSON.stringify({ sku, exp, sid, file: file || undefined })));
  const sig = bytesToBase64Url(await hmacSha256(secret, payload));
  return `${payload}.${sig}`;
}

export async function verifyDownloadToken(secret, token, nowSec = Math.floor(Date.now() / 1000)) {
  if (!secret) return { ok: false, error: "missing_signing_secret" };
  const raw = String(token || "");
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return { ok: false, error: "bad_token" };
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  let sigBytes;
  try { sigBytes = base64UrlToBytes(sig); } catch { return { ok: false, error: "bad_token" }; }
  const expected = await hmacSha256(secret, payload);
  if (!timingSafeEqualBytes(expected, sigBytes)) return { ok: false, error: "bad_signature" };
  let data;
  try { data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))); } catch { return { ok: false, error: "bad_payload" }; }
  if (!data || !data.sku || !data.exp || !data.sid) return { ok: false, error: "bad_payload" };
  if (Number(data.exp) <= nowSec) return { ok: false, error: "expired" };
  return { ok: true, sku: data.sku, exp: Number(data.exp), sid: String(data.sid), file: data.file || null };
}

export function expiryFromNow(ttlSec = DEFAULT_TTL_SEC, nowSec = Math.floor(Date.now() / 1000)) {
  return nowSec + ttlSec;
}
