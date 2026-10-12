#!/usr/bin/env node
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

const ctx = { window: {}, PW_STARTERS: [] };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ORDER) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(JS, "meal-category.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(JS, "pantry.js"), "utf8"), ctx);

const PW = ctx.PW;
const recipes = ctx.PW_STARTERS;
const errs = [];

for (const r of recipes) {
  const meals = (r.tags || []).filter((t) => ["breakfast", "lunch", "dinner"].includes(t));
  if (meals.length !== 1) errs.push(`${r.id}: tags ${meals.join(",")}`);
  if (!PW.recipeFitsSlot(r, meals[0])) errs.push(`${r.id}: fits own slot`);
}

const week = PW.fillSimpleWeek(PW.blankWeek(), recipes, { scope: "all", replaceAll: true });
for (const day of PW.DAYS) {
  for (const slot of PW.SLOTS) {
    const cell = week[day][slot];
    if (!cell || !cell.recipeId) continue;
    const recipe = recipes.find((r) => r.id === cell.recipeId);
    if (!recipe) {
      errs.push(`${day} ${slot}: missing recipe`);
      continue;
    }
    if (!PW.recipeFitsSlot(recipe, slot)) {
      errs.push(`${day} ${slot}: ${recipe.name} (${PW.recipeMealType(recipe)})`);
    }
  }
}

const g = recipes.find((r) => r.name.includes("Greek Yogurt"));
const s = recipes.find((r) => r.name === "Garlic Shrimp Skillet");
const a = recipes.find((r) => r.name.includes("Ají de Gallina"));
if (!g || PW.recipeMealType(g) !== "breakfast") errs.push("Greek Yogurt Parfaits meal");
if (!s || PW.recipeMealType(s) !== "dinner") errs.push("Garlic Shrimp meal");
if (!a || PW.recipeMealType(a) !== "dinner") errs.push("Ají de Gallina meal");

console.log(JSON.stringify({ errs, filledSlots: PW.DAYS.length * PW.SLOTS.length }, null, 2));
process.exit(errs.length ? 1 : 0);
