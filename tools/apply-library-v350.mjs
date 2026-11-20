/**
 * v3.5.0 library overhaul — replace gimmicky recipes with classics, tag existing classics.
 */
import fs from "fs";
import path from "path";
import { loadAllRecipes } from "./load-all-recipes.mjs";
import { writeRecipeFiles } from "./write-recipe-files.mjs";
import { REPLACEMENT_QUEUE } from "./library-v350-replacements.mjs";

const CLASSIC_NAME =
  /meatloaf|pot roast|shepherd|grilled cheese|cheeseburger|spaghetti|lasagna|chili|taco|fajita|roast chicken|pork chop|chicken parm|bbq|beef stew|chicken noodle|mac and cheese|butter chicken|tourtière|tourtiere|poutine|butter tart|pancake|omelette|fish and chips|sloppy joe|chicken pot pie|meatball|fried rice|stir.fry|bangers|split pea|meat sauce|burgers|enchilada|pot pie|maple.*salmon|chicken dinner|beef and broccoli|tomato soup|waffles|french toast|blt|reuben|hot dog|club sandwich|meat sauce|pot roast|tuna casserole|grilled cheese/i;

function shouldReplace(r) {
  const n = r.name;
  if (/\b(smoothie bowl|poke bowl|poke |lunch jar|grain bowl|burrito bowl|power bowl)\b/i.test(n)) return true;
  if (/\bbowls\b/i.test(n) && !/soup/i.test(n)) return true;
  if (/General Tso's Cauliflower|Harissa Roasted Cauliflower|Hawaiian Ahi|Mango Lassi/i.test(n)) return true;
  if (/Persian Herb Rice with Eggs|Tunisian Couscous Shakshuka|Israeli Shakshuka Toast/i.test(n)) return true;
  if (/Peanut Noodle Lunch Jars|Midnight Chili Nachos/i.test(n)) return true;
  if (/Ethiopian Berbere Lentil Bowl|Cuban Mojo Pork Bowls|Korean Beef Rice Bowls|Chipotle Lime Rice Bowls/i.test(n)) return true;
  if (/Ginger Scallion Noodle Bowls|Peanut Noodle Bowls|Teriyaki Tofu Bowls|Crispy Tofu Banh Mi Bowls/i.test(n)) return true;
  if (/Miso Ramen Bowls|Mediterranean Grain Lunch Bowls|Beef Burrito Bowls|Breakfast Burrito Bowls/i.test(n)) return true;
  if (/Chickpea Grain Bowls|Shepherd's Pie Potato Bowls|Bangers and Mash Bowls/i.test(n)) return true;
  return false;
}

function ensureClassicTag(r) {
  if (!Array.isArray(r.tags)) r.tags = [];
  const has = r.tags.includes("classic");
  if (!has && (CLASSIC_NAME.test(r.name) || r.tags.includes("canadian"))) {
    r.tags.push("classic");
  }
  if (r.tags.includes("classic") && !r.tags.includes("collection-classic")) {
    r.tags.push("collection-classic");
  }
}

const recipes = loadAllRecipes();
const toReplace = recipes.filter(shouldReplace);
const manifest = { removed: [], added: [], photoIds: [] };

let q = 0;
for (const old of toReplace) {
  if (q >= REPLACEMENT_QUEUE.length) break;
  const neu = REPLACEMENT_QUEUE[q++];
  manifest.removed.push({ id: old.id, name: old.name });
  manifest.added.push({ id: old.id, name: neu.name });
  manifest.photoIds.push(old.id);
  Object.assign(old, neu, { id: old.id, photoKey: old.id });
}

recipes.forEach(ensureClassicTag);

writeRecipeFiles(recipes);

const outDir = "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "library-v350-manifest.json"), JSON.stringify(manifest, null, 2));

console.log("Replaced", manifest.removed.length, "recipes. Total library:", recipes.length);
console.log("Photo re-curate IDs:", manifest.photoIds.join(", "));
