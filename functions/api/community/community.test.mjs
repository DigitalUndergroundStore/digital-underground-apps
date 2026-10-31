import {
  appendRefParam,
  contactsToCsv,
  isValidEmail,
  normalizeXHandle,
  publicListing,
  validateSubmission,
} from "../../_lib/community.js";

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

check("ref param", appendRefParam("https://example.com/path").includes("ref=digitalunderground"));
check("ref param keeps query", appendRefParam("https://example.com/?x=1").includes("x=1"));

check("x handle", normalizeXHandle("@Maker_Name") === "Maker_Name");
check("x handle reject", normalizeXHandle("bad!handle") === "");

const good = validateSubmission({
  name: "Test App",
  projectUrl: "https://example.com/app",
  makerName: "Maker",
  email: "maker@example.com",
  category: "apps",
  stage: "beta",
  pitchShort: "Short pitch",
  descriptionLong: "Longer text",
  imageUrl: "https://example.com/cover.png",
  terms: true,
});
check("valid submission", good.listing && good.listing.status === "pending");

const honeypot = validateSubmission({
  website: "spam",
  name: "x",
  projectUrl: "https://example.com",
  makerName: "m",
  email: "a@b.co",
  category: "apps",
  stage: "beta",
  pitchShort: "p",
  descriptionLong: "d",
  imageUrl: "https://example.com/i.png",
  terms: true,
});
check("honeypot", honeypot.error && honeypot.status === 400);

const badEmail = validateSubmission({
  name: "Test App",
  projectUrl: "https://example.com/app",
  makerName: "Maker",
  email: "not-an-email",
  category: "apps",
  stage: "beta",
  pitchShort: "Short pitch",
  descriptionLong: "Longer text",
  imageUrl: "https://example.com/cover.png",
  terms: true,
});
check("reject bad email", badEmail.error && badEmail.status === 400);

check("isValidEmail ok", isValidEmail("Maker@Example.com") === true);
check("isValidEmail bad", isValidEmail("nope") === false);

const pub = publicListing({
  id: "cm_x",
  name: "N",
  makerName: "M",
  email: "secret@example.com",
  category: "apps",
  stage: "beta",
  priceLabel: "Free",
  pitchShort: "p",
  imageUrl: "https://example.com/i.png",
  projectUrl: "https://example.com",
  visitUrl: "https://example.com/?ref=digitalunderground",
});
check("publicListing strips email", !("email" in pub) && !JSON.stringify(pub).includes("secret@"));

const csv = contactsToCsv([{
  email: "a@example.com",
  name: "A",
  listingIds: ["cm_1"],
  first_seen: 1,
  last_seen: 2,
  source: "developer-marketplace",
}]);
check("csv header", csv.startsWith("email,name,listing_ids,"));
check("csv row", csv.includes("a@example.com") && csv.includes("cm_1"));

if (failed) {
  process.exit(1);
}

{
  const { normalizeStage, publicListing: pl } = await import("../../_lib/community.js");
  const ok = (n, c) => console.log((c ? "ok " : "FAIL ") + n);
  ok("stage key", normalizeStage("beta") === "Beta / testing");
  ok("stage label", normalizeStage("In development") === "In development");
  ok("stage bad", normalizeStage("alpha") === "");
  ok("stage default released", pl({ id: "x", stage: undefined }).stage === "Released");
  ok("stage legacy kept", pl({ id: "x", stage: "In testing / development" }).stage === "In testing / development");
}

// --- Maker welcome / you're-live emails (idempotency) ---
{
  const {
    makerWelcomeEmail, makerLiveEmail, listingPublicUrl,
    sendMakerWelcome, sendMakerLiveEmail, notifyMakerApproved, kvGetListing,
  } = await import("../../_lib/community.js");
  let wfail = 0;
  const wok = (n, c) => { if (!c) wfail++; console.log((c ? "ok " : "FAIL ") + n); };
  const memKv = () => { const m = new Map(); return {
    async get(k, t) { const v = m.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; },
    async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list() { return { keys: [], list_complete: true }; } }; };
  const env = { RESEND_API_KEY: "test", COMMUNITY_SITE_URL: "https://du.test" };
  let sends = 0, mailOk = true;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { sends++; return { ok: mailOk, status: mailOk ? 200 : 500, text: async () => "" }; };
  try {
    wok("public url", listingPublicUrl("cm_1", env) === "https://du.test/community/p/?id=cm_1");
    const pend = makerWelcomeEmail({ id: "a", name: "Tool\nX", makerName: "Ann", status: "pending" }, env);
    wok("welcome pending copy", /in review/.test(pend.text) && !/\n.*Tool\nX/.test(pend.subject) && pend.subject.includes("Tool X"));
    const live = makerWelcomeEmail({ id: "a", name: "Tool", status: "approved" }, env);
    wok("welcome approved has link", live.text.includes("https://du.test/community/p/?id=a"));
    wok("live email subject", makerLiveEmail({ id: "a", name: "Tool" }, env).subject === "Tool is live on Digital Underground");

    const kv = memKv();
    const L = { id: "p1", name: "P", email: "M@Ex.com", status: "pending" };
    await kv.put("community:item:p1", JSON.stringify(L));
    const w1 = await sendMakerWelcome(env, kv, L, null);
    const w2 = await sendMakerWelcome(env, kv, { ...L }, null);
    wok("welcome sent once", w1.sent && !w2.sent && sends === 1);
    wok("welcome flag stored", !!(await kvGetListing(kv, "p1")).welcomeEmailSentAt);

    const appr = { ...(await kvGetListing(kv, "p1")), status: "approved" };
    await kv.put("community:item:p1", JSON.stringify(appr));
    const l1 = await notifyMakerApproved(env, kv, appr, null, "pending");
    const l2 = await notifyMakerApproved(env, kv, { ...appr }, null, "pending");
    wok("live sent once on double approve", l1.sent && !l2.sent && sends === 2);
    const l3 = await sendMakerLiveEmail(env, kv, { id: "q", email: "a@b.co", status: "approved" }, null, "approved");
    wok("no live on approved→approved", !l3.sent && l3.reason === "not_pending_transition");

    const kv2 = memKv();
    const A = { id: "a1", name: "A", email: "a@b.co", status: "approved" };
    await kv2.put("community:item:a1", JSON.stringify(A));
    await sendMakerWelcome(env, kv2, A, null);
    const s0 = sends;
    const r = await notifyMakerApproved(env, kv2, { ...(await kvGetListing(kv2, "a1")) }, null, "pending");
    wok("auto-approve welcome covers live", !r.sent && sends === s0);

    const kv3 = memKv();
    const F = { id: "f1", name: "F", email: "f@b.co", status: "pending" };
    await kv3.put("community:item:f1", JSON.stringify(F));
    mailOk = false;
    const f1 = await sendMakerWelcome(env, kv3, F, null);
    wok("failed send releases flag", !f1.sent && !(await kvGetListing(kv3, "f1")).welcomeEmailSentAt);
    mailOk = true;
    const f2 = await sendMakerWelcome(env, kv3, { ...F }, null);
    wok("retry after failure sends", f2.sent);
    wok("no email skipped", (await sendMakerWelcome(env, kv3, { id: "z" }, null)).reason === "no_email");
    wok("rejected not welcomed", (await sendMakerWelcome(env, kv3, { id: "z", email: "a@b.co", status: "rejected" }, null)).reason === "not_welcome_status");
  } finally { globalThis.fetch = realFetch; }
  if (wfail) process.exit(1);
}
