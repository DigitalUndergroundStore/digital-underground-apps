import assert from "node:assert/strict";
import { sanitizeProfile, cleanText, cleanUrl, slugify, makerSlugFor, MAX_LOGO_BYTES } from "../../_lib/makers.js";
assert.equal(slugify("Kerzy Labs"), "kerzy-labs");
assert.equal(slugify("Wolfitway"), "wolfitway");
assert.equal(cleanText('<script>alert(1)</script>Hi <b>x</b> me@x.com', 100), "alert(1)Hi x");
assert.equal(cleanUrl("http://x.com"), null);
assert.equal(cleanUrl("javascript:alert(1)"), null);
assert.equal(cleanUrl("https://user:pw@x.com"), null);
assert.equal(cleanUrl("https://127.0.0.1/"), null);
assert.equal(cleanUrl("https://wolfitway.com"), "https://wolfitway.com/");
assert.ok(sanitizeProfile({ name: "A", website: "http://a.com" }).error);
assert.ok(sanitizeProfile({ name: "A", socials: { x: "data:text/html,hi" } }).error);
assert.ok(sanitizeProfile({ name: "A", logo: "data:image/svg+xml;base64,AAAA" }).error);
assert.ok(sanitizeProfile({ name: "A", logo: "data:image/png;base64," + "A".repeat(Math.ceil(MAX_LOGO_BYTES * 4 / 3) + 8) }).error);
const ok = sanitizeProfile({ name: " Wolf ", bio: "Hello\u202e kerzydon@gmail.com", website: "https://wolfitway.com", socials: { x: "https://x.com/Wolfitway", evil: "https://e.com" } });
assert.equal(ok.profile.name, "Wolf"); assert.ok(!ok.profile.bio.includes("@")); assert.deepEqual(Object.keys(ok.profile.socials), ["x"]);
assert.equal(makerSlugFor({ id: "cm_kerzy_quadpong", makerName: "x" }), "kerzy-labs");
assert.equal(makerSlugFor({ id: "a", makerName: "Wolfitway" }), "wolfitway");
assert.equal(makerSlugFor({ id: "a", makerName: "Nobody" }), null);
console.log("makers tests ok");
// moderation flow with an in-memory KV
import { submitProfile, approveProfile, liveProfile, listPendingProfiles } from "../../_lib/makers.js";
const mem = new Map();
const kv = { get: async (k, t) => (mem.has(k) ? (t === "json" ? JSON.parse(mem.get(k)) : mem.get(k)) : null), put: async (k, v) => void mem.set(k, v), delete: async (k) => void mem.delete(k) };
const env = { AI: null };
const acct = { id: "ca_testtesttest" };
const r = await submitProfile(env, kv, acct, "wolfitway", sanitizeProfile({ name: "Wolfitway", bio: "New" }).profile);
assert.ok(r.ok);
assert.notEqual((await liveProfile(kv, "wolfitway")).bio, "New"); // still the seed until approved
assert.equal((await listPendingProfiles(kv)).length, 1);
assert.ok((await submitProfile(env, kv, { id: "ca_otherotherot" }, "wolfitway", { name: "x", socials: {} })).error); // other account blocked
await approveProfile(kv, "wolfitway");
const live = await liveProfile(kv, "wolfitway");
assert.equal(live.bio, "New"); assert.equal(live.logo, "/makers/media/wolfitway-logo.webp");
assert.equal((await listPendingProfiles(kv)).length, 0);
console.log("moderation flow ok");
