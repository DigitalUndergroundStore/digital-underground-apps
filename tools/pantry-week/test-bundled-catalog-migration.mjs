#!/usr/bin/env node
/** Upgrade path: stale pantry_week_v2 localStorage → syncBundledRecipes restores cuisine counts. */
import fs from "fs";
import vm from "vm";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JS = path.resolve(__dirname, "../../src/jhagho/js");
const ORDER = [
  "recipes.js",
  "recipes-extra.js",
  "recipes-batch1.js",
  "recipes-batch2.js",
  "recipes-batch3.js",
  "recipes-batch4.js",
  "recipes-batch5.js",
  "recipes-batch6.js",
];

const store = {};
const localStorage = {
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem(k, v) {
    store[k] = String(v);
  },
  removeItem(k) {
    delete store[k];
  },
};

const ctx = { window: {}, PW_STARTERS: [], localStorage };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ORDER) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(JS, "meal-category.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(JS, "pantry.js"), "utf8"), ctx);

const PW = ctx.PW;
const errs = [];

function cuisineCounts(recipes) {
  const counts = {};
  for (const r of recipes) {
    if (!PW.recipePlanEligible(r)) continue;
    const id = PW.recipePlanCuisine(r);
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

function simulatePre3121Library(recipes) {
  const cuisineTags = new Set(PW.PLAN_CUISINE_TAGS);
  return recipes.map((r) => {
    const copy = PW.clone(r);
    copy.tags = (copy.tags || []).filter((t) => !cuisineTags.has(t));
    if (!copy.tags.includes("other")) copy.tags.push("other");
    return copy;
  });
}

const staleState = PW.normalize({
  version: 2,
  recipes: simulatePre3121Library(PW.STARTERS),
  week: PW.blankWeek(),
  checked: {},
  extras: [],
  pantry: [],
  hideChecked: false,
  tipSeen: true,
  bundledCatalogVersion: "",
});

const staleCounts = cuisineCounts(staleState.recipes);
const staleEligible = Object.values(staleCounts).reduce((a, b) => a + b, 0);
if ((staleCounts.canadian || 0) !== 0 || (staleCounts.american || 0) !== 0 || staleCounts.other < 800) {
  errs.push(
    `stale sim: expected canadian 0 american 0 other dominant got ${JSON.stringify({
      canadian: staleCounts.canadian,
      american: staleCounts.american,
      other: staleCounts.other,
      eligible: staleEligible,
    })}`
  );
}

store[PW.KEY] = JSON.stringify(staleState);
const loaded = PW.load();
const freshCounts = cuisineCounts(loaded.recipes);

const expect = { american: 466, canadian: 52, other: 133 };
for (const [id, n] of Object.entries(expect)) {
  if (freshCounts[id] !== n) errs.push(`after load ${id}: got ${freshCounts[id]} want ${n}`);
}
if (!PW.lastCatalogRefresh) errs.push("PW.lastCatalogRefresh should be true");
if (loaded.bundledCatalogVersion !== PW.BUNDLED_CATALOG_VERSION) {
  errs.push(`bundledCatalogVersion ${loaded.bundledCatalogVersion}`);
}

const starter = PW.STARTERS[0];
const edited = PW.clone(starter);
edited.name = edited.name + " (my tweak)";
const mixed = PW.normalize({
  version: 2,
  recipes: [edited].concat(simulatePre3121Library(PW.STARTERS.slice(1))),
  week: PW.blankWeek(),
  bundledCatalogVersion: "",
});
const preserved = PW.syncBundledRecipes(mixed);
const kept = preserved.recipes.find((r) => r.id === starter.id);
if (!kept || kept.name !== edited.name) errs.push("user-edited starter should be preserved");

console.log(JSON.stringify({ errs, staleOther: staleCounts.other, freshCounts, lastCatalogRefresh: PW.lastCatalogRefresh }, null, 2));
process.exit(errs.length ? 1 : 0);
