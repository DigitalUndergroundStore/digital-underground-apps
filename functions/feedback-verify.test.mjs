// Isolated tests for feedback sender verification. Mail is always mocked; no real email is sent.
import { issueAccountToken, putAccount, sessionCookie } from "./_lib/creator.js";
import { CONFIRM_PREFIX, SUPPORT_MSG_PREFIX, consumeConfirmToken, issueConfirmEmail, isPrefetchRequest } from "./_lib/feedback-verify.js";
import { onRequestPost } from "./api/feedback.js";
import { onRequestGet } from "./api/feedback-confirm.js";

const store = new Map();
const kv = {
  get: async (k, t) => (store.has(k) ? (t === "json" ? JSON.parse(store.get(k)) : store.get(k)) : null),
  put: async (k, v) => { store.set(k, typeof v === "string" ? v : JSON.stringify(v)); },
  delete: async (k) => store.delete(k),
};

let failed = 0;
const check = (n, c) => { if (!c) { failed++; console.error("FAIL", n); } else console.log("ok", n); };

const mail = [];
const sendMail = async (opts) => { mail.push({ to: opts.to, subject: opts.subject, text: opts.text }); return { sent: true, provider: "mock" }; };

const pending = [];
const waitUntil = (p) => { pending.push(Promise.resolve(p)); };
const flush = async () => { while (pending.length) await pending.shift(); };

const envBase = () => ({ COMMUNITY_KV: kv, COMMUNITY_ADMIN_TOKEN: "test-community-admin-token", feedbackSendMail: sendMail });

function submitReq({ body, cookie, ip = "203.0.113.10", auth }) {
  const headers = { "Content-Type": "application/json", "CF-Connecting-IP": ip };
  if (cookie) headers.Cookie = cookie;
  if (auth) headers.Authorization = auth;
  return new Request("https://digitalundergroundstore.com/api/feedback", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function confirmReq(token, { method = "GET", prefetch = false, mode } = {}) {
  const headers = {};
  if (prefetch) { headers.Purpose = "prefetch"; headers["Sec-Purpose"] = "prefetch"; }
  if (mode) headers["Sec-Fetch-Mode"] = mode;
  return new Request("https://digitalundergroundstore.com/api/feedback-confirm?t=" + token, { method, headers });
}

async function supportRow(id) {
  return kv.get(SUPPORT_MSG_PREFIX + id, "json");
}

function tokensFor(id) {
  const out = [];
  for (const [k, v] of store.entries()) {
    if (!k.startsWith(CONFIRM_PREFIX)) continue;
    const rec = JSON.parse(v);
    if (rec.id === id) out.push(k.slice(CONFIRM_PREFIX.length));
  }
  return out;
}

function lastMail() { return mail[mail.length - 1]; }

function mask(s) {
  const v = String(s || "");
  const at = v.indexOf("@");
  if (at > 0) return v.slice(0, 1) + "***" + v.slice(at);
  return v.length <= 8 ? "(redacted)" : v.slice(0, 4) + "…";
}

// --- unsigned submit: Unverified + confirmation email attempted ---
mail.length = 0;
const unsignedBody = { message: "The listing name looks off", product: "Marketplace", email: "sender1@example.com", noEmail: true };
const unsignedRes = await onRequestPost({ request: submitReq({ body: unsignedBody, ip: "203.0.113.21" }), env: envBase(), waitUntil });
const unsignedJson = await unsignedRes.json();
await flush();
const unsignedRow = await supportRow(unsignedJson.id);
const unsignedToks = tokensFor(unsignedJson.id);
check("unsigned ok", unsignedJson.ok && unsignedRes.status === 200 && unsignedJson.id);
check("unsigned unverified", unsignedRow && unsignedRow.verified === false);
check("unsigned typed replyTo only", unsignedRow.replyTo === "sender1@example.com" && !unsignedRow.verifiedEmail);
check("unsigned confirm mailed", mail.length === 1 && mail[0].subject === "Confirm your feedback to Digital Underground");
check("unsigned mail text", mail[0].text.startsWith("Please confirm you sent this feedback to Digital Underground") && mail[0].text.includes("/api/feedback-confirm?t="));
check("unsigned mail has no message body", !mail[0].text.includes("The listing name looks off"));
check("unsigned token stored", unsignedToks.length === 1 && /^[0-9a-f]{64}$/.test(unsignedToks[0]));

// --- token click -> verified email ---
const clickRes = await onRequestGet({ request: confirmReq(unsignedToks[0], { mode: "navigate" }), env: envBase() });
const clickText = await clickRes.text();
const afterClick = await supportRow(unsignedJson.id);
check("click ok", clickRes.status === 200 && clickText.includes("Your feedback has been confirmed"));
check("click verified email", afterClick.verified === "email" && afterClick.verifiedEmail === "sender1@example.com");

// --- reused token rejected ---
const reuseRes = await onRequestGet({ request: confirmReq(unsignedToks[0], { mode: "navigate" }), env: envBase() });
const reuseText = await reuseRes.text();
check("reuse rejected", reuseRes.status === 400 && reuseText.includes("already been used"));
const afterReuse = await supportRow(unsignedJson.id);
check("reuse did not clear verification", afterReuse.verified === "email");

// --- expired token rejected ---
mail.length = 0;
const expBody = { message: "Need a status update", product: "Marketplace", email: "sender2@example.com", noEmail: true };
const expRes = await onRequestPost({ request: submitReq({ body: expBody, ip: "203.0.113.22" }), env: envBase(), waitUntil });
const expJson = await expRes.json();
await flush();
const expToks = tokensFor(expJson.id);
const expKey = CONFIRM_PREFIX + expToks[0];
const expRec = JSON.parse(store.get(expKey));
expRec.exp = Date.now() - 1000;
store.set(expKey, JSON.stringify(expRec));
const expired = await consumeConfirmToken(kv, expToks[0], Date.now());
const expRow = await supportRow(expJson.id);
check("expired rejected", expired.ok === false && expired.error === "expired");
check("expired still unverified", expRow.verified === false);
check("expired token gone", !(await kv.get(expKey, "json")));

// --- invalid / missing token ---
const missing = await onRequestGet({ request: confirmReq("", { mode: "navigate" }), env: envBase() });
const bad = await onRequestGet({ request: confirmReq("zzzz", { mode: "navigate" }), env: envBase() });
check("missing token rejected", missing.status === 400);
check("short token rejected", bad.status === 400);

// --- signed-in submit: Verified (account), typed email ignored, no confirm mail ---
mail.length = 0;
const { acct } = await issueAccountToken(kv, null);
acct.email = "Maker.Account@example.com";
await putAccount(kv, acct);
const cookieHeader = await sessionCookie({ COMMUNITY_ADMIN_TOKEN: "test-community-admin-token" }, acct, kv);
const cookie = cookieHeader.split(";")[0];
const signedBody = { message: "Please move our contact email", product: "Marketplace", email: "typed-other@example.com", noEmail: true };
const signedRes = await onRequestPost({ request: submitReq({ body: signedBody, cookie, ip: "203.0.113.23" }), env: envBase(), waitUntil });
const signedJson = await signedRes.json();
await flush();
const signedRow = await supportRow(signedJson.id);
check("signed ok", signedJson.ok && signedJson.id);
check("signed verified account", signedRow.verified === "account" && signedRow.verifiedEmail === "maker.account@example.com");
check("signed ignores typed email", signedRow.replyTo === "maker.account@example.com" && signedRow.creatorId === acct.id);
check("signed no confirm mail", mail.length === 0 && tokensFor(signedJson.id).length === 0);

// --- prefetch does not consume the token ---
mail.length = 0;
const pfBody = { message: "Prefetch should not confirm", product: "Marketplace", email: "sender3@example.com", noEmail: true };
const pfRes = await onRequestPost({ request: submitReq({ body: pfBody, ip: "203.0.113.24" }), env: envBase(), waitUntil });
const pfJson = await pfRes.json();
await flush();
const pfToks = tokensFor(pfJson.id);
const pfPrefetch = await onRequestGet({ request: confirmReq(pfToks[0], { prefetch: true }), env: envBase() });
const pfRow = await supportRow(pfJson.id);
check("prefetch does not verify", pfPrefetch.status === 200 && pfRow.verified === false && tokensFor(pfJson.id).length === 1);
const pfClick = await onRequestGet({ request: confirmReq(pfToks[0], { mode: "navigate" }), env: envBase() });
const pfAfter = await supportRow(pfJson.id);
check("prefetch then real click verifies", pfClick.status === 200 && pfAfter.verified === "email");

// --- rate limit: 4th confirmation email to the same address is not sent ---
mail.length = 0;
const rateEmail = "ratecheck@example.com";
const rateIds = [];
for (let i = 0; i < 4; i++) {
  const r = await onRequestPost({
    request: submitReq({ body: { message: "Rate limit check message " + i, product: "Marketplace", email: rateEmail, noEmail: true }, ip: "203.0.113.30" }),
    env: envBase(),
    waitUntil,
  });
  const j = await r.json();
  rateIds.push(j.id);
  await flush();
}
check("rate limit allows 3 confirm emails", mail.length === 3);
check("rate limit blocks the 4th", tokensFor(rateIds[3]).length === 0);
const fourth = await supportRow(rateIds[3]);
check("rate limited message still stored unverified", fourth && fourth.verified === false && fourth.replyTo === rateEmail);

// --- unsigned with no email: unverified, no mail ---
const beforeNo = mail.length;
const noMailRes = await onRequestPost({ request: submitReq({ body: { message: "Just a note with no contact", product: "Marketplace", noEmail: true }, ip: "203.0.113.25" }), env: envBase(), waitUntil });
const noMailJson = await noMailRes.json();
await flush();
const noMailRow = await supportRow(noMailJson.id);
check("no email unverified", noMailRow.verified === false && !noMailRow.replyTo);
check("no email no confirm", mail.length === beforeNo && tokensFor(noMailJson.id).length === 0);

// --- issueConfirmEmail itself does not send when mocked to fail, token may still exist ---
// (submit path already covers mock send; this asserts the helper rate-limits invalid addresses)
const invalid = await issueConfirmEmail({ env: envBase(), kv, request: submitReq({ body: {}, ip: "203.0.113.26" }), messageId: "sup_x", email: "not-an-email", ip: "203.0.113.26", sendMail });
check("invalid address no send", invalid.sent === false && invalid.reason === "invalid_email");

check("prefetch helper", isPrefetchRequest(confirmReq("ab", { prefetch: true })) && !isPrefetchRequest(confirmReq("ab", { mode: "navigate" })));

if (failed) {
  console.error("failed", failed);
  process.exit(1);
}
console.log("all passed");
process.exit(0);
