import fs from "fs";
import vm from "vm";

const root = new URL("../jhagho/js/", import.meta.url);
const ctx = { PW_STARTERS: undefined };
const files = ["recipes.js", "recipes-extra.js"];
for (const f of files) {
  vm.runInNewContext(fs.readFileSync(new URL(f, root), "utf8"), ctx);
}
const starters = ctx.PW_STARTERS;
console.log("recipe_count", starters.length);
console.log("ids", starters[0].id, "...", starters[starters.length - 1].id);

// Load pantry aisleOf
const pantryCode = fs.readFileSync(new URL("pantry.js", root), "utf8");
const pw = {};
vm.runInNewContext(pantryCode + "; globalThis.PW = PW;", { PW: undefined, window: {} });
// pantry attaches to window.PW - need different approach
const sandbox = { window: {} };
vm.runInNewContext(pantryCode, sandbox);
const PW = sandbox.window.PW;

const other = [];
for (const r of starters) {
  for (const ing of r.ingredients || []) {
    const aisle = PW.aisleOf(ing.item, ing.unit);
    if (aisle === "other") other.push(`${r.id}: ${ing.item}`);
  }
}
const uniq = [...new Set(other)];
console.log("aisle_other_count", uniq.length);
if (uniq.length) console.log(uniq.slice(0, 30).join("\n"));
