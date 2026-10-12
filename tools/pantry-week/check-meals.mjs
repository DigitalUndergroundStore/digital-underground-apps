#!/usr/bin/env node
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JS_DIR = path.resolve(__dirname, "../../src/jhagho/js");
const recipes = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

let src = fs.readFileSync(path.join(JS_DIR, "meal-category.js"), "utf8");
src = src.replace("window.PW_MEAL", "global.PW_MEAL");
const ctx = { global: {}, window: {} };
ctx.global = ctx;
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);

const bad = [];
for (const r of recipes) {
  const meals = (r.tags || []).filter((t) => ["breakfast", "lunch", "dinner"].includes(t));
  if (meals.length !== 1) bad.push(`${r.id}: meal tags ${JSON.stringify(meals)}`);
  const want = ctx.PW_MEAL.inferMealCategory(r);
  if (meals[0] !== want) bad.push(`${r.id}: expected ${want} got ${meals[0]}`);
}
process.stdout.write(JSON.stringify(bad));
