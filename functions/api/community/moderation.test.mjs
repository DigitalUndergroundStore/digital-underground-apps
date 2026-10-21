// node --test functions/api/community/moderation.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { isReturningMaker, screenedStatus, saveListing, kvGetListing, kvGetIndex } from "../../_lib/community.js";
import { addReport, shouldFlag, resolveReport, hiddenByReports, reportThreshold } from "../../_lib/reports.js";

function memKv() { const m = new Map(); return { m, async get(k, t) { const v = m.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } }; }
const env = {}; // no mail configured: notify is a no-op

test("screenedStatus: only returning makers auto-approve", () => {
  assert.equal(screenedStatus("approved", true), "approved");
  assert.equal(screenedStatus("approved", false), "pending");
  assert.equal(screenedStatus("pending", true), "pending");
  assert.equal(screenedStatus("rejected", true), "rejected");
});

test("isReturningMaker: needs another approved listing on the same verified account", async () => {
  const kv = memKv();
  const acct = { id: "ca_1", listingIds: ["cm_a", "cm_b"] };
  assert.equal(await isReturningMaker(kv, acct, "cm_b"), false);
  await saveListing(kv, { id: "cm_a", creatorId: "ca_1", status: "pending" });
  assert.equal(await isReturningMaker(kv, acct, "cm_b"), false, "pending doesn't count");
  await saveListing(kv, { id: "cm_a", creatorId: "ca_1", status: "approved" });
  assert.equal(await isReturningMaker(kv, acct, "cm_b"), true);
  assert.equal(await isReturningMaker(kv, acct, "cm_a"), false, "own listing excluded");
  await saveListing(kv, { id: "cm_a", creatorId: "ca_1", status: "unpublished", ownerApprovedAt: 1 });
  assert.equal(await isReturningMaker(kv, acct, "cm_b"), true, "previously owner-approved counts");
  await saveListing(kv, { id: "cm_a", creatorId: "ca_1", status: "flagged", ownerApprovedAt: 1 });
  assert.equal(await isReturningMaker(kv, acct, "cm_b"), false, "flagged doesn't count");
  await saveListing(kv, { id: "cm_a", creatorId: "ca_other", status: "approved" });
  assert.equal(await isReturningMaker(kv, acct, "cm_b"), false, "other account's row doesn't count");
});

test("reports: 2 distinct reporters hide, same reporter twice doesn't", async () => {
  const kv = memKv();
  assert.equal(reportThreshold(env), 2);
  await saveListing(kv, { id: "cm_x", name: "X", status: "approved" });
  let r = await addReport(env, kv, { id: "cm_x", name: "X", reason: "Broken link", by: "h1" });
  assert.equal(r.flagged, false);
  r = await addReport(env, kv, { id: "cm_x", name: "X", reason: "Broken link", by: "h1" });
  assert.equal(r.duplicate, true);
  r = await addReport(env, kv, { id: "cm_x", name: "X", reason: "Misleading", by: "h2" });
  assert.equal(r.flagged, true);
  assert.equal((await kvGetListing(kv, "cm_x")).status, "flagged");
  assert.ok((await kvGetIndex(kv)).flagged.includes("cm_x"));
  await resolveReport(kv, "cm_x", "restore");
  assert.equal((await kvGetListing(kv, "cm_x")).status, "approved");
  r = await addReport(env, kv, { id: "cm_x", name: "X", reason: "Other", by: "h1" });
  assert.equal(r.flagged, false, "count resets after restore");
});

test("reports: one Spam or scam report hides; remove keeps data", async () => {
  const kv = memKv();
  await saveListing(kv, { id: "cm_y", name: "Y", status: "approved" });
  const r = await addReport(env, kv, { id: "cm_y", name: "Y", reason: "Spam or scam", by: "h9" });
  assert.equal(r.flagged, true);
  await resolveReport(kv, "cm_y", "remove");
  const row = await kvGetListing(kv, "cm_y");
  assert.equal(row.status, "rejected");
  assert.ok(row, "never deleted");
});

test("reports: seeded listing hidden via map; threshold configurable", async () => {
  const kv = memKv();
  await addReport({ REPORT_THRESHOLD: "3" }, kv, { id: "cm_s", name: "S", seed: true, reason: "Other", by: "a" });
  await addReport({ REPORT_THRESHOLD: "3" }, kv, { id: "cm_s", name: "S", seed: true, reason: "Other", by: "b" });
  assert.equal((await hiddenByReports(kv)).has("cm_s"), false);
  await addReport({ REPORT_THRESHOLD: "3" }, kv, { id: "cm_s", name: "S", seed: true, reason: "Other", by: "c" });
  assert.equal((await hiddenByReports(kv)).has("cm_s"), true);
  assert.equal(shouldFlag({ state: "open", reports: [] }, 2), false);
});
