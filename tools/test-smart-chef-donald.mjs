/**
 * Donald's Pixel pantry — 20 unique Smart Chef recipes with sanity checks.
 */
import fs from "fs";
import path from "path";
import vm from "vm";

const ROOT = path.resolve("/workspace/pw-v322/jhagho");

function loadSmartChef() {
  const ctx = {
    window: {},
    console,
    localStorage: {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = v; },
      removeItem(k) { delete this._data[k]; },
    },
    PW_STARTERS: [],
    PW_V1_ORIGINALS: [],
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const file of [
    "js/pantry-normalize.js",
    "js/pantry.js",
    "js/smart-chef.js",
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx);
  }
  return { PW: ctx.window.PW, SC: ctx.window.PW_SMART_CHEF };
}

const DONALD_PANTRY = [
  "mustard",
  "ribs",
  "hamburger",
  "tortilla",
  "white onion",
  "pork chops",
  "eggs",
  "cheddar",
  "chicken broth",
  "peanut butter",
  "bread",
  "garlic",
  "ground beef",
].map((item) => ({ id: "p_" + item, item }));

function sanityCheck(recipe, templateId) {
  const lines = (recipe.ingredients || []).map((i) => `${i.qty || ""} ${i.unit || ""} ${i.item}`.trim().toLowerCase());
  const blob = lines.join(" | ");
  const name = String(recipe.name || "").toLowerCase();
  if (templateId === "frittata" && (blob.includes("peanut") || name.includes("peanut"))) {
    throw new Error("peanut in frittata: " + recipe.name);
  }
  if (templateId === "grain-bowl" && blob.includes("bread")) {
    throw new Error("bread in grain bowl: " + recipe.name);
  }
  for (const line of lines) {
    if (/\d+\s+clove\s+onion/.test(line) || /clove\s+onion/.test(line)) {
      throw new Error("cloves onion: " + line);
    }
  }
  for (const line of lines) {
    if (/^\d+\s+peanut butter$/.test(line) || /^\d+\s+onion$/.test(line)) {
      throw new Error("bare unit line: " + line);
    }
  }
  if (!recipe.steps?.length) throw new Error("no steps");
  if (!recipe.ingredients?.length) throw new Error("no ingredients");
}

const { PW, SC } = loadSmartChef();

const have = PW.suggestRecipes([], DONALD_PANTRY);
if (!have.length) {
  console.log("Note: suggestRecipes empty without recipe library (OK for Smart Chef-only test)");
}

const rejectHashes = [];
const seen = new Set();
const titles = [];
let failed = 0;

for (let i = 0; i < 20; i++) {
  const out = SC.generate(DONALD_PANTRY, {
    servings: 4,
    variation: i * 7,
    rejectHashes,
    existingRecipes: [],
  });
  if (out.error) {
    failed++;
    console.error("FAIL gen", i + 1, out.error);
    continue;
  }
  try {
    sanityCheck(out.recipe, out.templateId);
    if (i < 8 && /\b(zesty|grain bowl)\b/i.test(out.recipe.name)) {
      throw new Error("novelty name in first 8: " + out.recipe.name);
    }
  } catch (err) {
    failed++;
    console.error("FAIL sanity", i + 1, err.message);
    continue;
  }
  const fp = out.fingerprint;
  if (seen.has(fp)) {
    failed++;
    console.error("FAIL duplicate fingerprint", i + 1, fp);
    continue;
  }
  seen.add(fp);
  rejectHashes.push(fp);
  SC.persistHash(fp);
  titles.push({ n: i + 1, name: out.recipe.name, template: out.templateId, profile: out.profileId, missing: out.missing.length });
  console.log("OK", i + 1, out.recipe.name, `[${out.templateId}/${out.profileId}]`, "missing:", out.missing.length);
}

const ribsPantry = [
  { id: "p_ribs", item: "ribs" },
  { id: "p_mustard", item: "mustard" },
  { id: "p_bbq", item: "barbecue sauce" },
  { id: "p_paprika", item: "paprika" },
  { id: "p_sugar", item: "brown sugar" },
  { id: "p_onion", item: "white onion" },
].concat(DONALD_PANTRY.filter((p) => !["ribs", "mustard"].includes(p.item)));

for (let attempt = 0; attempt < 30; attempt++) {
  const ribs = SC.generate(ribsPantry, { variation: attempt, servings: 4, existingRecipes: [], rejectHashes: [] });
  if (ribs.error) continue;
  if (ribs.recipe.name.indexOf("BBQ") === -1 && ribs.templateId !== "bbq-ribs") continue;
  const blob = (ribs.recipe.ingredients || []).map((i) => `${i.qty} ${i.unit} ${i.item}`).join(" | ");
  if (/black bean/i.test(blob)) {
    console.error("FAIL ribs recipe contains black beans:", blob);
    process.exit(1);
  }
  const verrs = SC.validateTemplateRecipe(ribs.recipe, ribs.templateId);
  if (verrs.length) {
    console.error("FAIL ribs validation:", verrs, blob);
    process.exit(1);
  }
  console.log("OK Oven-Baked BBQ Ribs pantry check:", ribs.recipe.name);
  break;
}

if (failed) {
  console.error("\n" + failed + " failures");
  process.exit(1);
}
console.log("\n20/20 passed");
fs.writeFileSync(
  "/opt/cursor/artifacts/smart-chef-donald-20.json",
  JSON.stringify({ pantry: DONALD_PANTRY.map((p) => p.item), recipes: titles }, null, 2)
);
