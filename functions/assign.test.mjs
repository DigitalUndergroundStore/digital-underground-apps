import assert from "node:assert/strict";
import { assignListingsToEmail, accountIdForLogin, getAccount, setCredentials, checkPassword } from "../../_lib/creator.js";
const mem = new Map();
const kv = { get: async (k, t) => (mem.has(k) ? (t === "json" ? JSON.parse(mem.get(k)) : mem.get(k)) : null), put: async (k, v) => void mem.set(k, v), delete: async (k) => void mem.delete(k) };
for (const id of ["cm_a1", "cm_a2"]) mem.set("community:item:" + id, JSON.stringify({ id, status: "approved", makerName: "Wolfitway", email: "dan@wolfitway.com" }));
mem.set("community:item:cm_b", JSON.stringify({ id: "cm_b", creatorId: "ca_someoneelse1" }));
const r = await assignListingsToEmail(kv, "Dan@Wolfitway.com", ["cm_a1", "cm_a2", "cm_b", "cm_x"]);
assert.ok(r.ok); assert.deepEqual(r.assigned, ["cm_a1", "cm_a2"]); assert.equal(r.skipped.length, 2); assert.equal(r.hasPassword, false);
assert.equal(await accountIdForLogin(kv, "dan@wolfitway.com"), r.creatorId);
const acct = await getAccount(kv, r.creatorId);
assert.deepEqual(acct.listingIds, ["cm_a1", "cm_a2"]);
assert.equal(JSON.parse(mem.get("community:item:cm_a1")).creatorId, acct.id);
assert.equal(await checkPassword(kv, "dan@wolfitway.com", "anything123"), null); // no password until reset
const again = await assignListingsToEmail(kv, "dan@wolfitway.com", ["cm_a1"]); assert.equal(again.creatorId, r.creatorId); // idempotent
assert.ok((await setCredentials(kv, acct, "dan@wolfitway.com", "newpassword1")).ok); // what the reset-code flow does
assert.equal((await checkPassword(kv, "dan@wolfitway.com", "newpassword1")).id, acct.id);
console.log("assign tests ok");
