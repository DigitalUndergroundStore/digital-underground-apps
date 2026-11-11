import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "./maker-contacts.js";
import { listingPrettyPath } from "../../_lib/community.js";

// Synthetic credential only. Never use a production token in tests.
const TEST_TOKEN = "fake-elle-unit-test-token-not-for-production";
function fixture(rows = [], index = {}, extra = {}) {
  const records = new Map(Object.entries({
    "community:index": { approved: rows.map((r) => r.id), ...index }, ...extra,
  }));
  for (const row of rows) records.set(`community:item:${row.id}`, row);
  const reads = [];
  const kv = {
    async get(key, type) { assert.equal(type, "json"); reads.push(key); return records.get(key) ?? null; },
    async put() { assert.fail("must never write KV"); },
    async delete() { assert.fail("must never delete KV"); },
    async list() { assert.fail("must only use indexed records"); },
  };
  return { env: { COMMUNITY_KV: kv, ELLE_MAKER_CONTACTS_TOKEN: TEST_TOKEN }, reads };
}
const row = (id, more = {}) => ({ id, status: "approved", name: "Café App!", makerName: "Independent", email: " Maker@Example.com ", ...more });
async function call(env, token = TEST_TOKEN, method = "GET", extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  if (token != null) headers.set("X-Elle-Token", token);
  const response = await onRequest({ env, request: new Request("https://digitalundergroundstore.com/api/internal/maker-contacts", { method, headers }) });
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  return response;
}

test("auth fails closed before touching KV; no admin/owner fallback", async () => {
  for (const expected of [undefined, "", " ", 123]) {
    const f = fixture(); f.env.ELLE_MAKER_CONTACTS_TOKEN = expected;
    assert.equal((await call(f.env)).status, 401); assert.deepEqual(f.reads, []);
  }
  for (const token of [null, "wrong", TEST_TOKEN + "extra", TEST_TOKEN.slice(0, -1)]) {
    const f = fixture();
    assert.equal((await call(f.env, token, "GET", { Authorization: "Basic fake", "X-Community-Admin-Token": TEST_TOKEN })).status, 401);
    assert.deepEqual(f.reads, []);
  }
});

test("only GET; no CORS preflight and no KV reads on other methods", async () => {
  const f = fixture();
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
    const response = await call(f.env, TEST_TOKEN, method);
    assert.equal(response.status, 405); assert.equal(response.headers.get("Allow"), "GET");
  }
  assert.deepEqual(f.reads, []);
});

test("good token returns exactly six fields, normalized email, ISO dates and stable order", async () => {
  const f = fixture([
    row("cm_test_cc", { makerName: "Zed", liveAt: "2026-11-01T12:00:00Z", customer: "private", creatorId: "private" }),
    row("cm_test_bb", { name: "Beta", ownerApprovedAt: 1793534400000, emailOptOut: true }),
    row("cm_test_aa", { name: "Alpha" }),
  ]);
  const response = await call(f.env); assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.map((r) => r.productName), ["Alpha", "Beta", "Café App!"]);
  for (const contact of data) {
    assert.deepEqual(Object.keys(contact).sort(), ["email", "emailOptOut", "listingUrl", "liveAt", "makerName", "productName"]);
    assert.equal(contact.email, "maker@example.com");
  }
  assert.equal(data[0].liveAt, ""); assert.equal(data[0].emailOptOut, false);
  assert.equal(data[1].liveAt, new Date(1793534400000).toISOString()); assert.equal(data[1].emailOptOut, true);
  assert.equal(data[2].liveAt, "2026-11-01T12:00:00.000Z");
  assert.equal(data[2].listingUrl, "https://digitalundergroundstore.com/community/p/cafe-app-cc/");
  assert.equal(f.reads.filter((k) => k === "sub:maker@example.com").length, 1);
});

test("excludes house accounts case insensitively by name, slug and owner seed", async () => {
  const houses = [
    { makerName: " DIGITAL UNDERGROUND " }, { makerName: "kErZy LaBs" },
    { makerSlug: "Digital-Underground" }, { makerSlug: "KERZY-LABS" },
  ];
  const f = fixture([...houses.map((h, i) => row(`cm_house_${i}`, h)), row("cm_kerzy_seed"), row("cm_test_independent")]);
  const data = await (await call(f.env)).json(); assert.equal(data.length, 1);
  assert.ok(data[0].listingUrl.endsWith("-independent/"));
});

test("excludes non-live, hidden, reported, retired, missing and no-email listings; preserves two products per maker", async () => {
  const rows = [
    ...["pending", "unpublished", "flagged", "rejected", "draft"].map((status) => row(`cm_bad_${status}`, { status })),
    row("cm_test_hidden", { hidden: true }), row("cm_test_reported"), row("cm_test_flagindex"),
    row("cm_test_rejectindex"), row("cm_test_unpubindex"), row("cm_kerzy_easytracker", { makerName: "Other" }),
    row("cm_test_noemail", { email: "" }), row("cm_test_invalid", { email: "not-an-email" }),
    row("cm_test_first"), row("cm_test_second", { status: "live" }),
    row("cm_test_third", { status: "published" }), row("cm_test_legacy", { status: undefined }),
  ];
  const f = fixture(rows, {
    approved: [...rows.map((r) => r.id), "cm_missing_item", "cm_test_first"],
    flagged: ["cm_test_flagindex"], rejected: ["cm_test_rejectindex"], unpublished: ["cm_test_unpubindex"],
  }, { "community:reports": { cm_test_reported: { seed: true, state: "removed" } } });
  const data = await (await call(f.env)).json();
  assert.equal(data.length, 4);
  assert.deepEqual(data.map((r) => r.listingUrl.split("-").pop()), ["first/", "legacy/", "second/", "third/"]);
});

test("explicit live status is accepted from other index buckets; unindexed records are not enumerated", async () => {
  const f = fixture([row("cm_test_live", { status: "live" }), row("cm_test_orphan")], { approved: [], pending: ["cm_test_live"] });
  const data = await (await call(f.env)).json(); assert.equal(data.length, 1);
  assert.ok(!f.reads.includes("community:item:cm_test_orphan"));
});

test("subscriber unsubscribe and explicit listing opt-out are honored absolutely", async () => {
  const f = fixture([
    row("cm_test_unsub"), row("cm_test_optout", { email: "two@example.com", emailOptOut: true }),
    row("cm_test_active", { email: "three@example.com" }), row("cm_test_none", { email: "four@example.com" }),
  ], {}, { "sub:maker@example.com": { status: "unsubscribed" }, "sub:two@example.com": { status: "active" }, "sub:three@example.com": { status: "active" } });
  const data = await (await call(f.env)).json();
  const byEmail = Object.fromEntries(data.map((r) => [r.email, r.emailOptOut]));
  assert.deepEqual(byEmail, { "three@example.com": false, "four@example.com": false, "two@example.com": true, "maker@example.com": true });
});

test("pretty path matches existing public algorithms, including accents, max 48 and equal tail", () => {
  const existing = (r) => { const b = String(r?.name || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, ""); const t = String(r?.id || "").split("_").pop().toLowerCase().replace(/[^a-z0-9]/g, ""); return "/community/p/" + (b && b !== t ? b + "-" + t : t) + "/"; };
  for (const name of ["Café App!", "TAIL", "---", "", "a ".repeat(100)]) {
    const listing = row("cm_test_tail", { name }); assert.equal(listingPrettyPath(listing), existing(listing));
  }
  assert.equal(listingPrettyPath(row("cm_test_tail", { name: "Tail" })), "/community/p/tail/");
});

test("KV and opt-out failures fail closed without partial contacts or writes", async () => {
  assert.equal((await call({ ELLE_MAKER_CONTACTS_TOKEN: TEST_TOKEN })).status, 503);
  for (const key of ["community:index", "community:reports", "community:item:cm_test_fail", "sub:maker@example.com"]) {
    const f = fixture([row("cm_test_fail")]); const get = f.env.COMMUNITY_KV.get;
    f.env.COMMUNITY_KV.get = async (k, t) => { if (k === key) throw new Error("synthetic KV failure"); return get(k, t); };
    const response = await call(f.env); assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Contacts unavailable." });
  }
});

test("invalid liveAt falls back to approval time or an empty string", async () => {
  const f = fixture([row("cm_test_fallback", { liveAt: "invalid", ownerApprovedAt: 1793534400000 }), row("cm_test_empty", { liveAt: {}, ownerApprovedAt: "bad" })]);
  const data = await (await call(f.env)).json();
  assert.equal(data.find((r) => r.listingUrl.endsWith("-fallback/")).liveAt, new Date(1793534400000).toISOString());
  assert.equal(data.find((r) => r.listingUrl.endsWith("-empty/")).liveAt, "");
});
