import {
  appendRefParam,
  contactsToCsv,
  isValidEmail,
  listingPublicUrl,
  makerLiveEmail,
  makerWelcomeEmail,
  normalizeXHandle,
  notifySubmission,
  publicListing,
  sendMakerLiveEmail,
  sendMakerWelcome,
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

const pending = {
  id: "cm_test",
  status: "pending",
  name: "Signal\nKit",
  makerName: "Ada",
  email: "Ada@Example.com",
};
const welcome = makerWelcomeEmail(pending, {}, null);
check("welcome subject", welcome.subject === "Welcome to Digital Underground — next steps for Signal Kit");
check("welcome pending copy", welcome.text.startsWith("Hi Ada,") && welcome.text.includes("Your listing is in review. We'll email you when it's live."));
check("welcome pending hides live url", !welcome.text.includes("Your listing is live.") && !welcome.text.includes("/community/p/"));
check(
  "welcome links",
  welcome.text.includes("https://digitalundergroundstore.com/community/dashboard/") &&
    welcome.text.includes("https://digitalundergroundstore.com/community/dashboard/#profile") &&
    welcome.text.includes("https://digitalundergroundstore.com/league/") &&
    welcome.text.includes("https://digitalundergroundstore.com/how-it-works/") &&
    welcome.text.includes("digitalunderground.store@proton.me")
);
check("welcome has no private link", !welcome.text.includes("?k=") && !/password/i.test(welcome.text) && !welcome.subject.includes("\n"));

const approved = { ...pending, status: "approved", name: "Signal Kit" };
const welcomeLive = makerWelcomeEmail(approved, {}, null);
check(
  "welcome live url",
  welcomeLive.text.includes("Your listing is live.") &&
    welcomeLive.text.includes(listingPublicUrl("cm_test", {}, null)) &&
    welcomeLive.text.includes("Share your listing link")
);
const live = makerLiveEmail(approved, {}, null);
check("live subject", live.subject === "Signal Kit is live on Digital Underground");
check("live is short", live.text.includes(listingPublicUrl("cm_test", {}, null)) && !live.text.includes("What to do next") && !live.text.includes("How it works"));
check("public flags stay private", !("welcomeEmailSentAt" in publicListing({ ...approved, email: "secret@example.com", welcomeEmailSentAt: 1, liveEmailSentAt: 2 })));

function memoryKv() {
  const store = new Map();
  return {
    store,
    async get(k, t) {
      if (!store.has(k)) return null;
      const v = store.get(k);
      return t === "json" ? JSON.parse(v) : v;
    },
    async put(k, v) {
      store.set(k, v);
    },
    async delete(k) {
      store.delete(k);
    },
  };
}

const kv = memoryKv();
const sent = [];
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  sent.push({ url, body: JSON.parse(init.body) });
  return { ok: true, status: 200, text: async () => "" };
};
const env = { RESEND_API_KEY: "test-key" };
try {
  const row = { ...pending, name: "Signal Kit", email: "ada@example.com" };
  const first = await sendMakerWelcome(env, kv, row, null);
  const second = await sendMakerWelcome(env, kv, row, null);
  const saved = await kv.get("community:item:cm_test", "json");
  check("welcome sends once", first.sent === true && second.reason === "already_sent" && sent.length === 1);
  check("welcome flag only", saved.welcomeEmailSentAt && !saved.liveEmailSentAt);
  check("welcome recipient", sent[0].body.to[0] === "ada@example.com" && sent[0].body.subject.startsWith("Welcome to Digital Underground"));
  check("welcome body has no token", !sent[0].body.text.includes("?k=") && sent[0].body.reply_to === "digitalunderground.store@proton.me");

  const auto = { id: "cm_auto", status: "approved", name: "Auto", makerName: "Bea", email: "bea@example.com" };
  const autoWelcome = await sendMakerWelcome(env, kv, auto, null);
  const autoSaved = await kv.get("community:item:cm_auto", "json");
  const beforeLive = sent.length;
  const skippedLive = await sendMakerLiveEmail(env, kv, { ...auto, ...autoSaved, status: "approved" }, null, "pending");
  check("auto-approve welcome covers live", autoWelcome.sent === true && autoSaved.welcomeEmailSentAt && autoSaved.liveEmailSentAt);
  check("no second live email", skippedLive.reason === "already_sent" && sent.length === beforeLive);

  const held = { id: "cm_held", status: "pending", name: "Held", makerName: "Cam", email: "cam@example.com" };
  await sendMakerWelcome(env, kv, held, null);
  held.status = "approved";
  const wentLive = await sendMakerLiveEmail(env, kv, held, null, "pending");
  const again = await sendMakerLiveEmail(env, kv, held, null, "pending");
  const notTransition = await sendMakerLiveEmail(env, kv, held, null, "approved");
  const heldSaved = await kv.get("community:item:cm_held", "json");
  check("live after pending", wentLive.sent === true && heldSaved.liveEmailSentAt && again.reason === "already_sent");
  check("live skips non-pending", notTransition.reason === "not_pending_transition");
  const liveMail = sent.find((m) => m.body.subject === "Held is live on Digital Underground");
  check("live mail once", liveMail && liveMail.body.to[0] === "cam@example.com" && !liveMail.body.text.includes("What to do next"));

  const rejected = { id: "cm_no", status: "rejected", name: "Nope", makerName: "Dee", email: "dee@example.com" };
  const beforeReject = sent.length;
  const noWelcome = await sendMakerWelcome(env, kv, rejected, null);
  check("no welcome when rejected", noWelcome.reason === "not_welcome_status" && sent.length === beforeReject);

  const bad = { id: "cm_bad", status: "pending", name: "Bad", makerName: "Eve", email: "not-an-email" };
  const badOut = await sendMakerWelcome(env, kv, bad, null);
  check("no welcome without email", badOut.reason === "no_email");

  globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => "nope" });
  const fail = { id: "cm_fail", status: "pending", name: "Fail", makerName: "Fae", email: "fae@example.com" };
  const failedSend = await sendMakerWelcome(env, kv, fail, null);
  const failSaved = await kv.get("community:item:cm_fail", "json");
  check("failed send clears flag", failedSend.sent === false && !failSaved.welcomeEmailSentAt);

  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  const boom = { id: "cm_boom", status: "pending", name: "Boom", makerName: "Gia", email: "gia@example.com" };
  let threw = false;
  try {
    await sendMakerWelcome(env, kv, boom, null);
  } catch {
    threw = true;
  }
  const boomSaved = await kv.get("community:item:cm_boom", "json");
  check("thrown send clears flag", threw && !boomSaved.welcomeEmailSentAt);

  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => "" });
  const ownerSent = [];
  globalThis.fetch = async (url, init) => {
    ownerSent.push(JSON.parse(init.body));
    return { ok: true, status: 200, text: async () => "" };
  };
  const owner = await notifySubmission(env, { ...row, status: "pending", pitchShort: "hi", projectUrl: "https://example.com", category: "apps" }, null);
  check("owner notify unchanged", owner.sent === true && ownerSent[0].to[0] === "digitalunderground.store@proton.me" && ownerSent[0].subject.startsWith("[Community]"));
} finally {
  globalThis.fetch = origFetch;
}

if (failed) {
  process.exit(1);
}
