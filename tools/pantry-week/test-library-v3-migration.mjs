#!/usr/bin/env node
/** v3.13 library refresh: untouched old starters are replaced, retired ones dropped (and cleared
    from the plan), edited ones kept; breakfast never gets desserts. */
import fs from "fs"; import vm from "vm"; import path from "path"; import { fileURLToPath } from "url";
import { execSync } from "child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../.."); const JS = path.join(ROOT, "src/jhagho/js");
const FILES = ["recipes.js","recipes-extra.js",...[1,2,3,4,5,6].map((i)=>`recipes-batch${i}.js`)];
function mk(code) {
  const store = {}; const ctx = { PW_STARTERS: [], localStorage: { getItem:(k)=>store[k]??null, setItem:(k,v)=>{store[k]=String(v)}, removeItem:(k)=>{delete store[k]} } };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(code, ctx); return { ctx, store };
}
// The v3.12.3 library (commit a1e6bc4) as shipped.
let old = ""; for (const f of FILES) old += execSync(`git show a1e6bc4:src/jhagho/js/${f}`, { cwd: ROOT, maxBuffer: 1e8 }).toString() + "\n";
const oldCtx = mk(old + ";this.S=PW_STARTERS").ctx; const OLD = oldCtx.S;
let cur = ""; for (const f of [...FILES, "catalog-history.js", "meal-category.js", "pantry.js"]) cur += fs.readFileSync(path.join(JS, f), "utf8") + "\n";
const { ctx, store } = mk(cur); const PW = ctx.PW; const errs = [];
const cookie = OLD.find((r) => /Oatmeal Chocolate Chip Cookies/i.test(r.name));
const curIds = new Set(PW.STARTERS.map((r) => r.id));
const retired = OLD.filter((r) => !curIds.has(r.id));
const kept = OLD.find((r) => curIds.has(r.id) && PW.STARTERS.find((s) => s.id === r.id).name !== r.name) || OLD.find((r) => curIds.has(r.id));
const edited = PW.clone(retired[1]); edited.steps = edited.steps.concat(["My own extra step."]);
const editedStarter = PW.clone(OLD.find((r) => curIds.has(r.id) && r.id !== kept.id)); editedStarter.name += " (Mom's)";
const week = PW.blankWeek(); week[PW.DAYS[0]].breakfast.recipeId = cookie ? cookie.id : retired[0].id; week[PW.DAYS[1]].dinner.recipeId = kept.id;
const saved = { version: 2, recipes: [PW.clone(retired[0]), PW.clone(kept), edited, editedStarter, ...(cookie ? [PW.clone(cookie)] : [])], week, checked: {}, extras: [], pantry: [], bundledCatalogVersion: "plan-cuisine-v2" };
store[PW.KEY] = JSON.stringify(saved);
const st = PW.load(); const ids = new Set(st.recipes.map((r) => r.id));
if (ids.has(retired[0].id)) errs.push("retired untouched recipe still in library: " + retired[0].name);
if (cookie && ids.has(cookie.id)) errs.push("cookie still in library");
if (!ids.has(edited.id)) errs.push("edited retired recipe was dropped");
const es = st.recipes.find((r) => r.id === editedStarter.id); if (!es || es.name !== editedStarter.name) errs.push("edited starter overwritten");
const k = st.recipes.find((r) => r.id === kept.id); const bundled = PW.STARTERS.find((r) => r.id === kept.id);
if (!k || k.name !== bundled.name) errs.push(`untouched starter not refreshed: ${k && k.name} vs ${bundled.name}`);
if (st.week[PW.DAYS[0]].breakfast.recipeId) errs.push("plan slot still points at retired recipe");
if (st.week[PW.DAYS[1]].dinner.recipeId !== kept.id) errs.push("valid plan slot lost");
if (st.recipes.length !== PW.STARTERS.length + 1) errs.push(`library size ${st.recipes.length} want ${PW.STARTERS.length + 1}`);
// Old library through the new guard: no dessert fits any slot.
const M = ctx.PW_MEAL; const leaks = [];
for (const r of OLD) for (const s of ["breakfast","lunch","dinner"]) if (/cookie|brownie|cake(?!s? ?(pan|crab|fish|potato))|muffin|fudge|ice cream/i.test(r.name) && !/pancake|crab cake|fish ?cake|potato cake|griddle|corn ?cake|johnny|rice cake/i.test(r.name) && M.recipeFitsMealSlot(r, s)) leaks.push(`${s}: ${r.name}`);
if (leaks.length) errs.push("guard leaks: " + leaks.slice(0, 10).join("; "));
for (const r of PW.STARTERS) if (!M.recipeFitsMealSlot(r, r.meal)) errs.push("bundled recipe rejected by its own slot: " + r.name);
console.log(JSON.stringify({ errs, retiredInOld: retired.length, refreshed: kept.name + " -> " + bundled.name }, null, 2));
process.exit(errs.length ? 1 : 0);
