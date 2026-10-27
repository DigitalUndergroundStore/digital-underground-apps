import { onRequest as admin } from "./admin.js";
import { onRequest as submit } from "./submit.js";
import { authCreator, issueAccountToken, setCredentials } from "../../_lib/creator.js";
import { kvGetListing, saveListing } from "../../_lib/community.js";

const store = new Map();
const kv = {
  get: async (k, t) => (store.has(k) ? (t === "json" ? JSON.parse(store.get(k)) : store.get(k)) : null),
  put: async (k, v) => store.set(k, v),
  delete: async (k) => store.delete(k),
  list: async () => ({ keys: [], list_complete: true }),
};
const env = {
  COMMUNITY_KV: kv,
  COMMUNITY_ADMIN_TOKEN: "test-admin-token",
  COMMUNITY_SITE_URL: "https://digitalundergroundstore.com",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
};

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

function post(body, token = env.COMMUNITY_ADMIN_TOKEN) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  return new Request("https://digitalundergroundstore.com/api/community/admin", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const listingBody = {
  name: "Yes Reply App",
  projectUrl: "https://Example.com/app/",
  makerName: "Ada Maker",
  email: "Ada@Example.com",
  category: "apps",
  pitchShort: "A short pitch for the marketplace card.",
  descriptionLong: "A longer description for the product page.",
  imageUrl: "https://example.com/logo.png",
  terms: true,
  password: "should-not-be-stored",
};

async function call(body, token) {
  const res = await admin({ request: post(body, token), env });
  const data = await res.json();
  return { res, data };
}

const unauth = await call({ action: "create_listing", ...listingBody }, "");
check("no token rejected", unauth.res.status === 401 && store.size === 0);

const badToken = await call({ action: "create_listing", ...listingBody }, "nope");
check("wrong token rejected", badToken.res.status === 401 && store.size === 0);

const incomplete = await call({ action: "create_listing", ...listingBody, imageUrl: "", pitchShort: "" });
check("incomplete rejected", incomplete.res.status === 400 && incomplete.data.error && store.size === 0);

const origFetch = globalThis.fetch;
let fetches = 0;
globalThis.fetch = async (...args) => {
  fetches += 1;
  return origFetch(...args);
};

const created = await call({ action: "create_listing", ...listingBody });
check("created", created.res.status === 200 && created.data.ok && created.data.created && !created.data.existing);
check("approved product page", created.data.status === "approved" && created.data.productPageLive === true);
check("product url", created.data.productUrl === "https://digitalundergroundstore.com/community/p/?id=" + encodeURIComponent(created.data.id));
check("dashboard url", typeof created.data.dashboardUrl === "string" && created.data.dashboardUrl.startsWith("https://digitalundergroundstore.com/community/dashboard/?k="));
check("new account token", created.data.newAccount === true && created.data.tokenIssued === true && created.data.creatorId.startsWith("ca_"));
check("no outbound fetch", fetches === 0);
globalThis.fetch = origFetch;

const token1 = new URL(created.data.dashboardUrl).searchParams.get("k");
const secret1 = token1.slice(token1.indexOf(".") + 1);
check("secret not stored", secret1.length >= 32 && ![...store.values()].some((v) => String(v).includes(secret1) || String(v).includes("should-not-be-stored")));
check("listing id shape", /^cm_[a-z0-9_]{4,40}$/.test(created.data.id));

const req = (h) => ({ headers: new Headers(h ? { Authorization: h } : {}) });
check("dashboard token auths", (await authCreator(req("Creator " + token1), env, kv))?.id === created.data.creatorId);

const row = await kvGetListing(kv, created.data.id);
check("listing linked", row && row.creatorId === created.data.creatorId && row.email === "ada@example.com" && row.status === "approved" && row.source === "admin");
const acctRaw = await kv.get("creator:" + created.data.creatorId, "json");
check("account owns listing", acctRaw.listingIds.includes(created.data.id) && !acctRaw.pw && !acctRaw.email);
const contact = await kv.get("contact:ada@example.com", "json");
check("contact linked", contact.listingIds.includes(created.data.id) && contact.creatorIds.includes(created.data.creatorId));

const again = await call({
  action: "create",
  ...listingBody,
  projectUrl: "https://example.com/app?ref=digitalunderground",
  email: "ada@example.com",
});
check("idempotent same url", again.data.existing === true && again.data.created === false && again.data.id === created.data.id && again.data.creatorId === created.data.creatorId);
check("idempotent does not rotate", again.data.tokenIssued === false && again.data.dashboardUrl === null && typeof again.data.dashboardAccess === "string");
check("original token still works", (await authCreator(req("Creator " + token1), env, kv))?.id === created.data.creatorId);

const rotated = await call({ action: "create_listing", ...listingBody, issueToken: true });
const token2 = new URL(rotated.data.dashboardUrl).searchParams.get("k");
check("issueToken rotates", rotated.data.tokenIssued === true && rotated.data.existing === true && token2 !== token1);
check("new token works", (await authCreator(req("Creator " + token2), env, kv))?.id === created.data.creatorId);
check("old token stops", !(await authCreator(req("Creator " + token1), env, kv)));

const second = await call({
  action: "create_listing",
  ...listingBody,
  name: "Other Tool",
  projectUrl: "https://example.com/other",
});
check("second product same account", second.data.created === true && second.data.creatorId === created.data.creatorId && second.data.newAccount === false && second.data.tokenIssued === false && second.data.id !== created.data.id);
const acctAfter = await kv.get("creator:" + created.data.creatorId, "json");
check("both listings on account", acctAfter.listingIds.includes(created.data.id) && acctAfter.listingIds.includes(second.data.id));

const pending = {
  id: "cm_pendingorphan1",
  status: "pending",
  name: "Queued",
  projectUrl: "https://example.com/queued",
  visitUrl: "https://example.com/queued?ref=digitalunderground",
  makerName: "Bea",
  email: "bea@example.com",
  category: "other",
  priceLabel: "See site",
  pitchShort: "Queued pitch",
  descriptionLong: "Queued description long enough.",
  imageUrl: "https://example.com/bea.png",
  tags: [],
  createdAt: 1,
  updatedAt: 1,
};
await saveListing(kv, pending);
const adopted = await call({
  action: "create_listing",
  name: pending.name,
  projectUrl: "https://example.com/queued/",
  makerName: pending.makerName,
  email: "Bea@Example.com",
  category: "other",
  pitchShort: pending.pitchShort,
  descriptionLong: pending.descriptionLong,
  imageUrl: pending.imageUrl,
  terms: true,
});
check("adopts existing pending", adopted.data.existing === true && adopted.data.id === pending.id && adopted.data.status === "pending" && adopted.data.productPageLive === false);
check("orphan gets account", adopted.data.newAccount === true && adopted.data.tokenIssued === true && adopted.data.creatorId);
const adoptedRow = await kvGetListing(kv, pending.id);
check("orphan creator id saved", adoptedRow.creatorId === adopted.data.creatorId && adoptedRow.status === "pending");

const follow = await call({ action: "issue_creator_token", id: second.data.id });
check("follow-up issue_creator_token", follow.res.status === 200 && follow.data.dashboardUrl.startsWith("https://digitalundergroundstore.com/community/dashboard/?k=") && follow.data.creatorId === created.data.creatorId);

const login = await issueAccountToken(kv, null);
await setCredentials(kv, login.acct, "cara@example.com", "password12");
const cara = await call({
  action: "create_listing",
  ...listingBody,
  name: "Cara App",
  projectUrl: "https://example.com/cara",
  makerName: "Cara",
  email: "Cara@Example.com",
});
check("reuses password account", cara.data.created === true && cara.data.creatorId === login.acct.id && cara.data.newAccount === false && cara.data.tokenIssued === false);
check("existing login link stays valid", (await authCreator(req("Creator " + login.token), env, kv))?.id === login.acct.id);
const caraRow = await kvGetListing(kv, cara.data.id);
check("password account owns listing", caraRow.creatorId === login.acct.id && caraRow.status === "approved");

const submitRes = await submit({
  request: new Request("https://digitalundergroundstore.com/api/community/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...listingBody, projectUrl: "https://example.com/public-still-gated" }),
  }),
  env,
});
const submitData = await submitRes.json();
check("public submit still requires turnstile", submitRes.status === 400 && /security check/i.test(submitData.error || ""));

if (failed) process.exit(1);
