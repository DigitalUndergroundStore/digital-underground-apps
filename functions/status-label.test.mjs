import assert from "node:assert/strict";
import { normalizeStatusLabel, validateSubmission, publicListing } from "../../_lib/community.js";
import { submissionTextBundle } from "../../_lib/community-screening.js";
assert.equal(normalizeStatusLabel("  Needs   testers  "), "Needs testers");
assert.equal(normalizeStatusLabel("<script>alert(1)</script>"), "scriptalert(1)/script".slice(0, 24));
assert.ok(!normalizeStatusLabel('<img src=x onerror="a">').includes("<"));
assert.equal(normalizeStatusLabel("x".repeat(60)).length, 24);
assert.equal(normalizeStatusLabel(null), "");
assert.equal(normalizeStatusLabel("\u202eBeta\u0000"), "Beta");
const base = { name: "T", projectUrl: "https://e.com", makerName: "M", email: "m@e.com", category: "apps", stage: "beta", pitchShort: "p", descriptionLong: "d", terms: true, imageUrl: "https://e.com/i.png" };
assert.equal(validateSubmission({ ...base, statusLabel: " v1.5 " }).listing.statusLabel, "v1.5");
assert.equal(validateSubmission(base).listing.statusLabel, undefined);
assert.equal(publicListing({ id: "a", statusLabel: "In testing" }).statusLabel, "In testing");
assert.equal(publicListing({ id: "a" }).statusLabel, null);
assert.ok(submissionTextBundle({ name: "T", statusLabel: "Needs testers" }).text.includes("Needs testers")); // screened with other text
console.log("status label tests ok");
