#!/usr/bin/env node
import fs from "fs";
import path from "path";
import vm from "vm";

const ROOT = path.resolve("/workspace/pw-v322/jhagho");

function loadPw() {
  const ctx = { window: {}, console, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const file of [
    "js/recipes.js",
    "js/recipes-extra.js",
    "js/recipes-batch1.js",
    "js/recipes-batch2.js",
    "js/pantry-normalize.js",
    "js/pantry-match.js",
    "js/pantry.js",
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx);
  }
  return ctx.window.PW;
}

const PW = loadPw();
const pantry = [
  { id: "p1", item: "ground beef" },
  { id: "p2", item: "hamburger buns" },
  { id: "p3", item: "cheddar" },
  { id: "p4", item: "onion" },
];
const fresh = PW.freshState();
const rows = PW.suggestRecipes(fresh.recipes, pantry, fresh.assumeStaples);
const burger = rows.find((r) => /cheeseburger/i.test(r.name));
if (!burger) {
  console.error("FAIL: no cheeseburger match");
  console.error("Top:", rows.slice(0, 8).map((r) => r.name));
  process.exit(1);
}
if (!burger.ready) {
  console.error("FAIL: expected Ready, got", burger);
  process.exit(1);
}
for (let i = 1; i < Math.min(5, rows.length); i++) {
  if (rows[i].missing < rows[i - 1].missing) {
    console.error("FAIL: sort by missing");
    process.exit(1);
  }
}
console.log("OK:", burger.name, burger.badge);
