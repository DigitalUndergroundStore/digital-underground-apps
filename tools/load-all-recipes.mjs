import fs from "fs";
import path from "path";
import vm from "vm";

const ROOT = path.resolve("/workspace/pw-v322/jhagho/js");
const ORDER = ["recipes.js", "recipes-extra.js", "recipes-batch1.js", "recipes-batch2.js"];

export function loadAllRecipes() {
  const ctx = { window: {}, console, PW_STARTERS: [], PW_V1_ORIGINALS: [] };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ORDER) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
  }
  return ctx.window.PW_STARTERS || [];
}

export function fileForId(id) {
  const n = parseInt(String(id).replace(/^r/, ""), 10);
  if (n <= 36) return "recipes.js";
  if (n <= 126) return "recipes-extra.js";
  if (n <= 200) return "recipes-batch1.js";
  return "recipes-batch2.js";
}

export { ROOT, ORDER };
