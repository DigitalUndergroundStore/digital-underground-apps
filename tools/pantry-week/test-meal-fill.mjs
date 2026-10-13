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

const PW_MEAL = ctx.PW_MEAL;

for (const r of recipes) {
  const meals = (r.tags || []).filter((t) => ["breakfast", "lunch", "dinner"].includes(t));
  if (meals.length !== 1) errs.push(`${r.id}: tags ${meals.join(",")}`);
  if (!PW_MEAL.recipePlanEligible(r)) continue;
  if (!PW.recipeFitsSlot(r, meals[0])) errs.push(`${r.id}: fits own slot`);
}

const RUNS = 48;
const runIdSets = [];
const idRunHits = new Map();
for (let run = 0; run < RUNS; run++) {
  const w = PW.fillSimpleWeek(PW.blankWeek(), recipes, { scope: "all", replaceAll: true });
  const ids = [];
  const seenInWeek = new Set();
  for (const day of PW.DAYS) {
    for (const slot of PW.SLOTS) {
      const cell = w[day][slot];
      if (cell && cell.recipeId) {
        ids.push(cell.recipeId);
        if (seenInWeek.has(cell.recipeId)) {
          errs.push(`fillSimpleWeek: duplicate ${cell.recipeId} in one week (run ${run})`);
        }
        seenInWeek.add(cell.recipeId);
        idRunHits.set(cell.recipeId, (idRunHits.get(cell.recipeId) || 0) + 1);
      }
    }
  }
  runIdSets.push(ids.sort().join("|"));
}
const uniqueRuns = new Set(runIdSets);
const minUniqueWeeks = Math.max(12, Math.floor(RUNS * 0.65));
if (uniqueRuns.size < minUniqueWeeks) {
  errs.push(
    `fillSimpleWeek: only ${uniqueRuns.size}/${RUNS} unique weeks (need >= ${minUniqueWeeks})`
  );
}
const distinctRecipes = idRunHits.size;
const minDistinct = Math.min(180, Math.floor(recipes.length * 0.12));
if (distinctRecipes < minDistinct) {
  errs.push(
    `fillSimpleWeek: only ${distinctRecipes} distinct recipes across ${RUNS} runs (need >= ${minDistinct})`
  );
}
let dominated = null;
let dominatedHits = 0;
for (const [id, hits] of idRunHits) {
  if (hits > dominatedHits) {
    dominatedHits = hits;
    dominated = id;
  }
}
const maxShare = dominatedHits / (RUNS * PW.DAYS.length * PW.SLOTS.length);
if (maxShare > 0.08) {
  errs.push(
    `fillSimpleWeek: recipe ${dominated} in ${dominatedHits} slots (${(maxShare * 100).toFixed(1)}% of fills, max 8%)`
  );
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
    if (!PW_MEAL.recipePlanEligible(recipe)) {
      errs.push(`${day} ${slot}: non-meal ${recipe.name}`);
    }
  }
}

const g = recipes.find((r) => r.name.includes("Greek Yogurt"));
const s = recipes.find((r) => r.name === "Garlic Shrimp Skillet");
const a = recipes.find((r) => r.name.includes("Ají de Gallina"));
if (!g || PW.recipeMealType(g) !== "breakfast") errs.push("Greek Yogurt Parfaits meal");
if (!s || PW.recipeMealType(s) !== "dinner") errs.push("Garlic Shrimp meal");
if (!a || PW.recipeMealType(a) !== "dinner") errs.push("Ají de Gallina meal");

const CANADIAN_RUNS = 24;
for (let run = 0; run < CANADIAN_RUNS; run++) {
  const fillResult = PW.fillSimpleWeek(PW.blankWeek(), recipes, {
    scope: "dinner",
    replaceAll: true,
    cuisineFilters: ["canadian"],
    returnMeta: true,
  });
  const week = fillResult.week || fillResult;
  for (const day of PW.DAYS) {
    const cell = week[day].dinner;
    if (!cell || !cell.recipeId) continue;
    const recipe = recipes.find((r) => r.id === cell.recipeId);
    if (!recipe) {
      errs.push(`canadian fill: missing ${cell.recipeId}`);
      continue;
    }
    if (PW.recipePlanCuisine(recipe) !== "canadian") {
      errs.push(
        `canadian fill run ${run}: ${recipe.id} ${recipe.name} tagged ${PW.recipePlanCuisine(recipe)}`
      );
    }
  }
}

console.log(
  JSON.stringify(
    {
      errs,
      filledSlots: PW.DAYS.length * PW.SLOTS.length,
      recipeCount: recipes.length,
      fillRuns: RUNS,
      uniqueWeeks: uniqueRuns.size,
      distinctRecipesAcrossRuns: distinctRecipes,
      topRecipeSlotShare: maxShare,
    },
    null,
    2
  )
);
process.exit(errs.length ? 1 : 0);
