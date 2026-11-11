/**
 * Flag library recipes that feel random vs familiar North American / home weeknight cooking.
 */
import fs from "fs";
import path from "path";
import vm from "vm";

const ROOT = path.resolve("/workspace/pw-v322/jhagho/js");
const LOAD_ORDER = ["recipes.js", "recipes-extra.js", "recipes-batch1.js", "recipes-batch2.js"];

function loadAllRecipes() {
  const ctx = { window: {}, console, PW_STARTERS: [], PW_V1_ORIGINALS: [] };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of LOAD_ORDER) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
  }
  return ctx.window.PW_STARTERS || [];
}

const CLASSIC_NA = /meatloaf|pot roast|shepherd|grilled cheese|spaghetti|meat sauce|roast chicken|pork chop|cheeseburger|beef stew|chili|tacos|bbq|mac and cheese|fried chicken|meatball|lasagna|meat pie|fish and chips|bacon and eggs|sloppy joe|tuna casserole|chicken pot pie/i;

const TRENDY_BOWL = /grain bowl|poke bowl|burrito bowl|power bowl|smoothie bowl|rice bowl|noodle bowl|bibimbap bowl/i;
const NICHE_FUSION = /deconstructed|molecular|sushi-grade|poke |acai /i;

function classify(r) {
  const name = r.name || "";
  if (CLASSIC_NA.test(name)) return null;
  const reasons = [];
  if (TRENDY_BOWL.test(name)) reasons.push("trendy bowl format (consider classic plate dinner)");
  if (NICHE_FUSION.test(name)) reasons.push("niche/fusion positioning");
  if (/^\w+ \w+ \w+ \w+ \w+ \w+ \w+/.test(name) && name.length > 48) reasons.push("long word-salad title");
  if (/bowl/i.test(name) && !/salad/i.test(name) && !CLASSIC_NA.test(name)) {
    reasons.push("bowl-style (lower priority vs roast/plate dinners for Canadian home list)");
  }
  return reasons.length ? reasons : null;
}

const recipes = loadAllRecipes();
const flagged = [];
recipes.forEach((r) => {
  const reasons = classify(r);
  if (reasons) flagged.push({ id: r.id, name: r.name, reasons });
});

flagged.sort((a, b) => a.name.localeCompare(b.name));
console.log("Library size:", recipes.length);
console.log("Suggested review (not auto-delete):", flagged.length);
flagged.forEach((row) => console.log(row.id, "—", row.name, "→", row.reasons.join("; ")));

const replaceCandidates = flagged.filter((r) =>
  r.reasons.some((x) => x.indexOf("trendy bowl") !== -1 || x.indexOf("niche") !== -1)
);

const out = {
  total: recipes.length,
  flagged,
  priorityReplaceCandidates: replaceCandidates,
  note: "Ethnic staples (e.g. Pad Thai, Butter Chicken, Shakshuka) are fine; candidates are mainly grain/burrito/poke/smoothie bowls that read as app filler vs Canadian grocery classics."
};
fs.writeFileSync("/opt/cursor/artifacts/recipe-library-audit.json", JSON.stringify(out, null, 2));
