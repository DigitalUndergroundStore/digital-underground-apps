import assert from "node:assert/strict";
import { orderListings, isNewListing, NEW_MS, ROTATE_MS } from "../../_lib/order.js";
const now = 100 * ROTATE_MS + 1000;
const rows = Array.from({ length: 12 }, (_, i) => ({ id: "cm_" + i, name: "L" + i, liveAt: now - 30 * 86400000 }));
rows.push({ id: "cm_new_old", liveAt: now - 20 * 3600000 }, { id: "cm_new_fresh", ownerApprovedAt: now - 3600000 }, { id: "cm_pin" }, { id: "cm_cur", curated: true });
const o = orderListings(rows, { pinned: ["cm_pin"], now });
assert.deepEqual(o.slice(0, 3).map((r) => r.id), ["cm_new_fresh", "cm_new_old", "cm_pin"]);
assert.ok(o[0].isNew && o[1].isNew && !o[2].isNew && !o[3].isNew);
assert.equal(o.at(-1).id, "cm_cur"); // curated picks stay after makers' listings
// same window -> same order; other window -> different rotation
const ids = (n) => orderListings(rows, { pinned: ["cm_pin"], now: n }).map((r) => r.id).join();
assert.equal(ids(now), ids(now + 60000));
const old = rows.filter((r) => !r.id.startsWith("cm_new"));
const ids2 = (n) => orderListings(old, { now: n }).map((r) => r.id).join();
assert.equal(ids2(now), ids2(now + ROTATE_MS - 5000));
assert.notEqual(ids2(now), ids2(now + ROTATE_MS));
// New pill expires after 24h, then joins rotation
assert.equal(isNewListing({ liveAt: now - NEW_MS - 1 }, now), false);
const later = orderListings(rows, { now: now + NEW_MS });
assert.ok(!later.some((r) => r.isNew));
console.log("order tests ok");
