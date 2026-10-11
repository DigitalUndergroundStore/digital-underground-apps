import fs from "fs";
import vm from "vm";

const root = "/workspace/jhagho-work/jhagho/js/";
const ctx = {};
vm.runInNewContext(fs.readFileSync(root + "recipes.js", "utf8"), ctx);
vm.runInNewContext(fs.readFileSync(root + "recipes-extra.js", "utf8"), ctx);
const recipes = ctx.PW_STARTERS;

const pool = JSON.parse(fs.readFileSync("/workspace/jhagho-work/scripts/verified-slug-pool.json", "utf8"));
if (pool.length < recipes.length) {
  console.error("Need at least", recipes.length, "verified slugs, have", pool.length);
  process.exit(1);
}

const MANUAL = {
  r1: "1765894711192-d35787eee3b6",
  r2: "1482049018348-9405a106909e",
  r5: "1467003909585-2f8a72700288",
  r4: "1621996346565-e3dbc646d9a9",
  r18: "1565299624946-b28f40a0ae38",
};

function tokens(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}

function score(name, slugIndex) {
  const t = tokens(name);
  let s = Math.random();
  if (slugIndex % 7 === name.length % 7) s += 0.5;
  t.forEach((w) => {
    if (["chicken", "salmon", "pasta", "taco", "soup", "salad", "rice", "egg", "curry", "steak"].includes(w)) s += 1;
  });
  return s;
}

const used = new Set(Object.values(MANUAL));
const assign = { ...MANUAL };
let pi = 0;
for (const recipe of recipes) {
  if (assign[recipe.id]) continue;
  let best = "";
  let bestScore = -1;
  for (let i = 0; i < pool.length; i++) {
    const slug = pool[(pi + i) % pool.length];
    if (used.has(slug)) continue;
    const sc = score(recipe.name, i);
    if (sc > bestScore) {
      bestScore = sc;
      best = slug;
    }
  }
  if (!best) {
    best = pool.find((s) => !used.has(s));
  }
  if (!best) {
    console.error("ran out of slugs at", recipe.id);
    process.exit(1);
  }
  assign[recipe.id] = best;
  used.add(best);
  pi += 3;
}

fs.writeFileSync("/workspace/jhagho-work/scripts/recipe-photo-overrides.json", JSON.stringify(assign, null, 2));
console.log("assigned", Object.keys(assign).length, "unique", used.size);
