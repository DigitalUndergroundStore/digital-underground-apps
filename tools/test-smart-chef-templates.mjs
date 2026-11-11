/**
 * Validate every Smart Chef template: units, step/ingredient alignment, no off-role items.
 */
import fs from "fs";
import path from "path";
import vm from "vm";

const ROOT = path.resolve("/workspace/pw-v322/jhagho");

function load() {
  const ctx = { window: {}, console, localStorage: { _data: {}, getItem(k) { return this._data[k] ?? null; }, setItem(k, v) { this._data[k] = v; }, removeItem(k) { delete this._data[k]; } } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const file of ["js/pantry-normalize.js", "js/pantry.js", "js/smart-chef.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx);
  }
  return ctx.window.PW_SMART_CHEF;
}

const SC = load();
const failures = SC.validateAllTemplates();
if (failures.length) {
  console.error("Template validation failures:", failures.length);
  failures.forEach((f) => console.error(JSON.stringify(f, null, 2)));
  process.exit(1);
}
console.log("All Smart Chef templates passed validation (" + SC.templates.length + " templates)");
