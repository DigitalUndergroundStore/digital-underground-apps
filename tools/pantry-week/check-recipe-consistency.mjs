#!/usr/bin/env node
/** Ingredient tokens vs steps + plan-meal eligibility for the full library. */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JS_DIR = path.resolve(__dirname, "../../src/jhagho/js");
const recipes = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

let mealSrc = fs.readFileSync(path.join(JS_DIR, "meal-category.js"), "utf8");
mealSrc = mealSrc.replace("window.PW_MEAL", "global.PW_MEAL");
const ctx = { global: {}, window: {} };
ctx.global = ctx;
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(mealSrc + "\nglobal.window = global;", ctx);

const STOP = new Set([
  "optional",
  "fresh",
  "large",
  "small",
  "medium",
  "chopped",
  "with",
  "taste",
  "divided",
  "finely",
  "ground",
  "stick",
  "cup",
  "teaspoon",
  "tablespoon",
]);

function tokens(item) {
  return String(item || "")
    .toLowerCase()
    .match(/[a-z]{3,}/g)
    ?.filter((w) => !STOP.has(w)) || [];
}

function ingredientInSteps(item, blob) {
  const plain = String(item || "").trim().toLowerCase();
  if (/^(salt|pepper|sugar|water|oil|butter|flour|garlic|onion)(\s+to\s+taste)?\.?$/i.test(plain)) {
    return true;
  }
  const words = tokens(item);
  if (!words.length) return true;
  for (const w of words) {
    if (blob.includes(w)) return true;
  }
  return false;
}

const errors = [];
const warnings = [];
let nonMeals = 0;
let ingMiss = 0;

for (const r of recipes) {
  const rid = r.id;
  const num = parseInt(String(rid).replace("r", ""), 10) || 0;
  if (!ctx.PW_MEAL.recipePlanEligible(r)) {
    nonMeals++;
    errors.push(`${rid}: non-meal (${ctx.PW_MEAL.inferNonMealKind(r)}) ${r.name}`);
  }
  const meals = (r.tags || []).filter((t) => ["breakfast", "lunch", "dinner"].includes(t));
  if (meals.length !== 1) errors.push(`${rid}: meal tags ${JSON.stringify(meals)}`);
  const want = ctx.PW_MEAL.inferMealCategory(r);
  if (meals[0] !== want) errors.push(`${rid}: expected ${want} got ${meals[0]}`);

  const stepsBlob = (r.steps || []).join(" ").toLowerCase();
  for (const ing of r.ingredients || []) {
    const item = ing.item || ing.name || "";
    if (!item || num < 249) continue;
    if (!ingredientInSteps(item, stepsBlob)) {
      ingMiss++;
      if (warnings.length < 40) warnings.push(`${rid}: ingredient not in steps — ${item}`);
    }
  }
}

process.stdout.write(
  JSON.stringify(
    {
      recipeCount: recipes.length,
      nonMealCount: nonMeals,
      ingredientStepMisses: ingMiss,
      errors,
      warnings,
    },
    null,
    2
  )
);
