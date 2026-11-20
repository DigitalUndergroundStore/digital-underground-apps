import fs from "fs";
import path from "path";
import vm from "vm";

const ROOT = path.resolve("/workspace/pw-v322/jhagho");
const ctx = { window: {}, console, localStorage: { _data: {}, getItem(k) { return this._data[k] ?? null; }, setItem(k, v) { this._data[k] = v; } }, PW_STARTERS: [], PW_V1_ORIGINALS: [] };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["js/pantry-normalize.js", "js/pantry.js", "js/smart-chef.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
}
const SC = ctx.window.PW_SMART_CHEF;
const pantry = ["mustard", "ribs", "hamburger", "tortilla", "white onion", "pork chops", "eggs", "cheddar", "chicken broth", "peanut butter", "bread", "garlic"].map((item) => ({ id: "p_" + item, item }));
const reject = [];
const examples = [];
for (let v = 0; v < 30 && examples.length < 5; v++) {
  const out = SC.generate(pantry, { variation: v * 11, rejectHashes: reject, existingRecipes: [] });
  if (out.error) continue;
  reject.push(out.fingerprint);
  examples.push({
    name: out.recipe.name,
    template: out.templateId,
    profile: out.profileId,
    minutes: out.recipe.minutes,
    missing: out.missing,
    ingredients: out.recipe.ingredients.map((i) => [i.qty, i.unit, i.item].filter(Boolean).join(" ")),
    steps: out.recipe.steps,
  });
}
fs.writeFileSync("/opt/cursor/artifacts/smart-chef-5-examples.json", JSON.stringify(examples, null, 2));
console.log(JSON.stringify(examples, null, 2));
