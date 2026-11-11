import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifyStripeSignature, signStripePayload } from "../functions/_lib/stripe-signature.js";
import { signDownloadToken, verifyDownloadToken, expiryFromNow } from "../functions/_lib/download-token.js";
import { fulfillPaidSession, alreadyProcessed, markProcessed, EVENT_KV_PREFIX } from "../functions/_lib/fulfillment.js";
import { onRequest as onWebhook } from "../functions/api/stripe/webhook.js";
import { onRequest as onDownload } from "../functions/api/store/download.js";
import { memoryKv } from "./memory-kv.js";

const root = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(root, "../fixtures/null-harbor-sample.epub"));

let failed = 0;
function check(name, cond, extra) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name, extra || "");
  } else console.log("ok", name);
}

const secret = "whsec_test_null_harbor_pilot";
const signSecret = "download-sign-test-secret-null-harbor";

function paidSession(overrides = {}) {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    payment_status: "paid",
    status: "complete",
    customer_details: { email: "buyer@example.com" },
    metadata: { sku: "null-harbor" },
    ...overrides,
  };
}

function eventFor(session, id = "evt_test_1") {
  return {
    id,
    object: "event",
    type: "checkout.session.completed",
    data: { object: session },
  };
}

const now = 1_700_000_000;

// --- signature verification ---
{
  const body = JSON.stringify({ id: "evt_a", type: "checkout.session.completed" });
  const header = await signStripePayload(body, secret, now);
  const ok = await verifyStripeSignature(body, header, secret, now);
  check("valid signature", ok.ok === true);

  const bad = await verifyStripeSignature(body + "x", header, secret, now);
  check("tampered body rejected", bad.ok === false && bad.error === "bad_signature");

  const wrongSecret = await verifyStripeSignature(body, header, "whsec_other", now);
  check("wrong secret rejected", wrongSecret.ok === false);

  const stale = await verifyStripeSignature(body, header, secret, now + 400);
  check("expired timestamp rejected", stale.ok === false && stale.error === "expired");

  const noHeader = await verifyStripeSignature(body, "", secret, now);
  check("missing header rejected", noHeader.ok === false);
}

// --- token signing / expiry ---
{
  const exp = expiryFromNow(60, now);
  const token = await signDownloadToken(signSecret, { sku: "null-harbor", exp, sid: "cs_test_123" });
  const ok = await verifyDownloadToken(signSecret, token, now);
  check("valid token", ok.ok && ok.sku === "null-harbor" && ok.sid === "cs_test_123");

  const expired = await verifyDownloadToken(signSecret, token, exp + 1);
  check("expired token rejected", expired.ok === false && expired.error === "expired");

  const [payload, sig] = token.split(".");
  const flipped = payload + "." + (sig[0] === "A" ? "B" : "A") + sig.slice(1);
  const bad = await verifyDownloadToken(signSecret, flipped, now);
  check("tampered token rejected", bad.ok === false);

  const wrong = await verifyDownloadToken("other-secret", token, now);
  check("wrong signing secret rejected", wrong.ok === false);
}

// --- idempotency (fulfillment + kv) ---
{
  const kv = memoryKv();
  check("first event not processed", (await alreadyProcessed(kv, "evt_1")) === false);
  await markProcessed(kv, "evt_1");
  check("second lookup is processed", (await alreadyProcessed(kv, "evt_1")) === true);
  check("other event still fresh", (await alreadyProcessed(kv, "evt_2")) === false);
}

// --- end-to-end fake signed event ---
{
  const kv = memoryKv();
  const sent = [];
  const env = {
    STRIPE_WEBHOOK_SECRET: secret,
    DOWNLOAD_SIGNING_SECRET: signSecret,
    COMMUNITY_KV: kv,
    RESEND_API_KEY: "re_test_fake",
    DOWNLOADS_KV: memoryKv({ "null-harbor/Null-Harbor.epub": fixture }),
  };

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("api.resend.com")) {
      sent.push(JSON.parse(opts.body));
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    }
    return realFetch(url, opts);
  };

  const session = paidSession();
  const ev = eventFor(session, "evt_e2e_1");
  const raw = JSON.stringify(ev);
  const header = await signStripePayload(raw, secret, Math.floor(Date.now() / 1000));

  const req = (body, hdrs) =>
    onWebhook({
      request: new Request("https://digitalundergroundstore.com/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "Stripe-Signature": hdrs },
        body,
      }),
      env,
    });

  const res1 = await req(raw, header);
  const j1 = await res1.json();
  check("e2e webhook 200", res1.status === 200 && j1.ok === true && j1.sku === "null-harbor");
  check("e2e emailed once", sent.length === 1 && sent[0].to[0] === "buyer@example.com");
  check("e2e from notify@", String(sent[0].from).includes("notify@digitalundergroundstore.com"));
  check("e2e email has download and thanks", /\/api\/store\/download\?t=/.test(sent[0].text) && sent[0].text.includes("/thanks/?sku=null-harbor"));

  const res2 = await req(raw, header);
  const j2 = await res2.json();
  check("e2e second delivery is idempotent", res2.status === 200 && j2.duplicate === true);
  check("e2e no second email", sent.length === 1);

  const unsigned = await req(raw, "");
  check("e2e unsigned rejected", unsigned.status === 400);

  const m = sent[0].text.match(/\/api\/store\/download\?t=([^\s&]+)/);
  check("e2e token in email", !!m);
  if (m) {
    const token = decodeURIComponent(m[1]);
    const dl = await onDownload({
      request: new Request("https://digitalundergroundstore.com/api/store/download?t=" + encodeURIComponent(token) + "&file=epub"),
      env,
    });
    const bytes = Buffer.from(await dl.arrayBuffer());
    const srcSha = createHash("sha256").update(fixture).digest("hex");
    const dlSha = createHash("sha256").update(bytes).digest("hex");
    check("e2e download 200", dl.status === 200);
    check("e2e download bytes", bytes.equals(fixture));
    check("e2e download sha256", dlSha === srcSha && dlSha.length === 64);
    check("e2e content-disposition", (dl.headers.get("content-disposition") || "").includes("Null-Harbor.epub"));

    const staleTok = await signDownloadToken(signSecret, { sku: "null-harbor", exp: now - 10, sid: "cs_test_123" });
    const stale = await onDownload({
      request: new Request("https://digitalundergroundstore.com/api/store/download?t=" + encodeURIComponent(staleTok)),
      env,
    });
    check("e2e expired download 403", stale.status === 403);
  }

  globalThis.fetch = realFetch;
}


// --- second SKU: He Came Home Without Her (same webhook, per-SKU config) ---
{
  const fixtureEpub = readFileSync(join(root, "../fixtures/he-came-home-sample.epub"));
  const fixtureDocx = readFileSync(join(root, "../fixtures/he-came-home-sample.docx"));
  const kv = memoryKv();
  const sent = [];
  const env = {
    STRIPE_WEBHOOK_SECRET: secret,
    DOWNLOAD_SIGNING_SECRET: signSecret,
    COMMUNITY_KV: kv,
    RESEND_API_KEY: "re_test_fake",
    DOWNLOADS_KV: memoryKv({
      "he-came-home-without-her/He-Came-Home-Without-Her.epub": fixtureEpub,
      "he-came-home-without-her/He-Came-Home-Without-Her.docx": fixtureDocx,
    }),
  };

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("api.resend.com")) {
      sent.push(JSON.parse(opts.body));
      return new Response(JSON.stringify({ id: "email_2" }), { status: 200 });
    }
    return realFetch(url, opts);
  };

  const session = paidSession({
    id: "cs_test_hch_1",
    metadata: { sku: "he-came-home-without-her" },
  });
  const ev = eventFor(session, "evt_e2e_hch_1");
  const raw = JSON.stringify(ev);
  const header = await signStripePayload(raw, secret, Math.floor(Date.now() / 1000));

  const req = (body, hdrs) =>
    onWebhook({
      request: new Request("https://digitalundergroundstore.com/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "Stripe-Signature": hdrs },
        body,
      }),
      env,
    });

  const res1 = await req(raw, header);
  const j1 = await res1.json();
  check("hch e2e webhook 200", res1.status === 200 && j1.ok === true && j1.sku === "he-came-home-without-her");
  check("hch e2e emailed once", sent.length === 1 && sent[0].to[0] === "buyer@example.com");
  check("hch e2e subject", sent[0].subject === "Your He Came Home Without Her download");
  check("hch e2e email thanks sku", sent[0].text.includes("/thanks/?sku=he-came-home-without-her"));

  const res2 = await req(raw, header);
  const j2 = await res2.json();
  check("hch e2e idempotent", res2.status === 200 && j2.duplicate === true);
  check("hch e2e no second email", sent.length === 1);

  const unknown = eventFor(paidSession({ id: "cs_x", metadata: { sku: "not-a-sku" } }), "evt_unknown_sku");
  const rawU = JSON.stringify(unknown);
  const headerU = await signStripePayload(rawU, secret, Math.floor(Date.now() / 1000));
  const resU = await req(rawU, headerU);
  const jU = await resU.json();
  check("unknown sku is not fulfilled", resU.status === 500 && jU.ok === false);

  const urls = [...sent[0].text.matchAll(/\/api\/store\/download\?t=([^\s&]+)&file=([^\s]+)/g)];
  check("hch e2e two file links", urls.length === 2);
  for (const m of urls) {
    const token = decodeURIComponent(m[1]);
    const fileId = decodeURIComponent(m[2]);
    const dl = await onDownload({
      request: new Request("https://digitalundergroundstore.com/api/store/download?t=" + encodeURIComponent(token) + "&file=" + encodeURIComponent(fileId)),
      env,
    });
    const bytes = Buffer.from(await dl.arrayBuffer());
    const src = fileId === "docx" ? fixtureDocx : fixtureEpub;
    const srcSha = createHash("sha256").update(src).digest("hex");
    const dlSha = createHash("sha256").update(bytes).digest("hex");
    check("hch download " + fileId + " 200", dl.status === 200);
    check("hch download " + fileId + " sha256", dlSha === srcSha && bytes.equals(src));
  }

  globalThis.fetch = realFetch;
}


// --- third SKU: Reply Forge (same webhook, per-SKU config) ---
{
  const fixtureZip = readFileSync(join(root, "../fixtures/reply-forge-sample.zip"));
  const kv = memoryKv();
  const sent = [];
  const env = {
    STRIPE_WEBHOOK_SECRET: secret,
    DOWNLOAD_SIGNING_SECRET: signSecret,
    COMMUNITY_KV: kv,
    RESEND_API_KEY: "re_test_fake",
    DOWNLOADS_KV: memoryKv({
      "reply-forge/Reply-Forge-v1.1.zip": fixtureZip,
    }),
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("api.resend.com")) {
      sent.push(JSON.parse(opts.body));
      return new Response(JSON.stringify({ id: "email_3" }), { status: 200 });
    }
    return realFetch(url, opts);
  };
  const session = paidSession({
    id: "cs_test_rf_1",
    metadata: { sku: "reply-forge" },
  });
  const ev = eventFor(session, "evt_e2e_rf_1");
  const raw = JSON.stringify(ev);
  const header = await signStripePayload(raw, secret, Math.floor(Date.now() / 1000));
  const req = (body, hdrs) =>
    onWebhook({
      request: new Request("https://digitalundergroundstore.com/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "Stripe-Signature": hdrs },
        body,
      }),
      env,
    });
  const res1 = await req(raw, header);
  const j1 = await res1.json();
  check("rf e2e webhook 200", res1.status === 200 && j1.ok === true && j1.sku === "reply-forge");
  check("rf e2e subject", sent.length === 1 && sent[0].subject === "Your Reply Forge download");
  check("rf e2e thanks sku", sent[0].text.includes("/thanks/?sku=reply-forge"));
  const m = sent[0].text.match(/\/api\/store\/download\?t=([^\s&]+)&file=zip/);
  check("rf e2e zip link", !!m);
  if (m) {
    const token = decodeURIComponent(m[1]);
    const dl = await onDownload({
      request: new Request("https://digitalundergroundstore.com/api/store/download?t=" + encodeURIComponent(token) + "&file=zip"),
      env,
    });
    const bytes = Buffer.from(await dl.arrayBuffer());
    const srcSha = createHash("sha256").update(fixtureZip).digest("hex");
    const dlSha = createHash("sha256").update(bytes).digest("hex");
    check("rf download zip 200", dl.status === 200);
    check("rf download zip sha256", dlSha === srcSha && bytes.equals(fixtureZip));
    check("rf content-type zip", (dl.headers.get("content-type") || "").includes("application/zip"));
  }
  const res2 = await req(raw, header);
  const j2 = await res2.json();
  check("rf e2e idempotent", res2.status === 200 && j2.duplicate === true);
  globalThis.fetch = realFetch;
}


// --- additional HTML-tool SKUs (same webhook, per-SKU config) ---
{
  const extras = [
    { sku: "scope-lock", title: "Scope Lock", fixture: "scope-lock-sample.zip", filename: "Scope-Lock-v1.1.zip", key: "scope-lock/Scope-Lock-v1.1.zip" },
    { sku: "rate-wire", title: "Rate Wire", fixture: "rate-wire-sample.zip", filename: "Rate-Wire-v1.1.zip", key: "rate-wire/Rate-Wire-v1.1.zip" },
    { sku: "invoice-desk", title: "Invoice Desk", fixture: "invoice-desk-sample.zip", filename: "Invoice-Desk-v1.1.zip", key: "invoice-desk/Invoice-Desk-v1.1.zip" },
    { sku: "focus-gate", title: "Focus Gate", fixture: "focus-gate-sample.zip", filename: "Focus-Gate-v1.1.zip", key: "focus-gate/Focus-Gate-v1.1.zip" },
    { sku: "box-go", title: "Box & Go", fixture: "box-go-sample.zip", filename: "Box-and-Go-v1.1.zip", key: "box-go/Box-and-Go-v1.1.zip" },
    { sku: "packlane", title: "Packlane", fixture: "packlane-sample.zip", filename: "Packlane-v1.1.zip", key: "packlane/Packlane-v1.1.zip" },
    { sku: "streak-kit", title: "Streak Kit", fixture: "streak-kit-sample.zip", filename: "Streak-Kit-v1.1.zip", key: "streak-kit/Streak-Kit-v1.1.zip" },
    { sku: "launch-ledger", title: "Launch Ledger", fixture: "launch-ledger-sample.zip", filename: "Launch-Ledger-v1.1.zip", key: "launch-ledger/Launch-Ledger-v1.1.zip" },
  ];
  for (const spec of extras) {
    const fixtureZip = readFileSync(join(root, "../fixtures/" + spec.fixture));
    const kv = memoryKv();
    const sent = [];
    const env = {
      STRIPE_WEBHOOK_SECRET: secret,
      DOWNLOAD_SIGNING_SECRET: signSecret,
      COMMUNITY_KV: kv,
      RESEND_API_KEY: "re_test_fake",
      DOWNLOADS_KV: memoryKv({ [spec.key]: fixtureZip }),
    };
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      if (String(url).includes("api.resend.com")) {
        sent.push(JSON.parse(opts.body));
        return new Response(JSON.stringify({ id: "email_x" }), { status: 200 });
      }
      return realFetch(url, opts);
    };
    const session = paidSession({ id: "cs_test_" + spec.sku, metadata: { sku: spec.sku } });
    const ev = eventFor(session, "evt_e2e_" + spec.sku);
    const raw = JSON.stringify(ev);
    const header = await signStripePayload(raw, secret, Math.floor(Date.now() / 1000));
    const req = (body, hdrs) =>
      onWebhook({
        request: new Request("https://digitalundergroundstore.com/api/stripe/webhook", {
          method: "POST",
          headers: { "content-type": "application/json", "Stripe-Signature": hdrs },
          body,
        }),
        env,
      });
    const res1 = await req(raw, header);
    const j1 = await res1.json();
    check(spec.sku + " e2e webhook 200", res1.status === 200 && j1.ok === true && j1.sku === spec.sku);
    check(spec.sku + " e2e subject", sent.length === 1 && sent[0].subject === "Your " + spec.title + " download");
    check(spec.sku + " e2e thanks sku", sent[0].text.includes("/thanks/?sku=" + spec.sku));
    const m = sent[0].text.match(/\/api\/store\/download\?t=([^\s&]+)&file=zip/);
    check(spec.sku + " e2e zip link", !!m);
    if (m) {
      const token = decodeURIComponent(m[1]);
      const dl = await onDownload({
        request: new Request("https://digitalundergroundstore.com/api/store/download?t=" + encodeURIComponent(token) + "&file=zip"),
        env,
      });
      const bytes = Buffer.from(await dl.arrayBuffer());
      const srcSha = createHash("sha256").update(fixtureZip).digest("hex");
      const dlSha = createHash("sha256").update(bytes).digest("hex");
      check(spec.sku + " download zip 200", dl.status === 200);
      check(spec.sku + " download zip sha256", dlSha === srcSha && bytes.equals(fixtureZip));
      check(spec.sku + " content-type zip", (dl.headers.get("content-type") || "").includes("application/zip"));
    }
    const res2 = await req(raw, header);
    const j2 = await res2.json();
    check(spec.sku + " e2e idempotent", res2.status === 200 && j2.duplicate === true);
    globalThis.fetch = realFetch;
  }
}

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all tests passed");
