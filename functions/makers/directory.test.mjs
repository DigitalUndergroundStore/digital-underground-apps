import assert from "node:assert/strict";
import { showInCreatorDirectory, onRequestGet } from "./[[path]].js";

for (const maker of [
  { slug: "digital-underground", name: "House account" },
  { slug: "other", name: "Digital Underground" },
  { name: "  DIGITAL   UNDERGROUND  ", auto: true },
  { name: "DigitalUnderground", auto: true },
]) assert.equal(showInCreatorDirectory(maker), false);
for (const maker of [
  { slug: "kerzy-labs", name: "Kerzy Labs" },
  { slug: "croxy", name: "Croxy" },
  { name: "Independent maker", auto: true },
]) assert.equal(showInCreatorDirectory(maker), true);

// No network or Cloudflare: assets, cache, and waitUntil are local stubs.
const rows = [
  { id: "cm_du_test", name: "Airhand", makerName: "Digital Underground", pitchShort: "Test", status: "approved" },
  { id: "cm_kerzy_test", name: "Test game", makerName: "Kerzy Labs", pitchShort: "Test", status: "approved" },
  { id: "cm_auto_test", name: "Auto project", makerName: "Independent maker", pitchShort: "Test", status: "approved" },
  { id: "cm_auto_du", name: "Auto house project", makerName: "Digital   Underground", pitchShort: "Test", status: "approved" },
];
const keys = [];
globalThis.caches = { default: {
  match: async (key) => { keys.push(key.url); return null; },
  put: async () => {},
} };
async function render(path) {
  const pending = [];
  const response = await onRequestGet({
    request: new Request("https://example.test" + path),
    env: { ASSETS: { fetch: async () => Response.json(rows.map(r => ({ ...r }))) } },
    waitUntil: (promise) => pending.push(promise),
    next: () => { throw new Error("Unexpected static fallback"); },
  });
  await Promise.all(pending);
  assert.equal(response.status, 200);
  return response.text();
}
const directory = await render("/makers/");
const jsonld = JSON.parse(directory.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
assert.equal(jsonld.mainEntity.numberOfItems, 2);
assert.deepEqual(jsonld.mainEntity.itemListElement.map(m => m.name).sort(), ["Independent maker", "Kerzy Labs"]);
assert.match(directory, />2 creators<\/p>/);
assert.doesNotMatch(directory, /class="mk-card-a" href="\/makers\/digital-underground\//);
for (const slug of ["digital-underground", "kerzy-labs", "wolfitway"]) {
  const page = await render(`/makers/${slug}/`);
  assert.doesNotMatch(page, /data-pv-cta|pv-cta\.js/);
  assert.equal((page.match(/Get PlanetView Live free/g) || []).length, 1);
  if (slug === "digital-underground") assert.match(page, /Airhand/);
}
assert.ok(keys.every(key => key.endsWith("?v=dir-swr-8")));
console.log("creator directory and profile regressions ok");
