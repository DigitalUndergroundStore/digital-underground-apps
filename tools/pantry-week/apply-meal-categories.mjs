#!/usr/bin/env node
/** Rewrite library tags: exactly one breakfast/lunch/dinner per recipe. */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JS_DIR = path.resolve(__dirname, "../../src/jhagho/js");

const FILES = [
  { name: "recipes.js", arrayRe: /var\s+PW_STARTERS\s*=\s*\[/ },
  { name: "recipes-extra.js", arrayRe: /var\s+extra\s*=\s*\[/ },
  { name: "recipes-batch1.js", arrayRe: /var\s+extra\s*=\s*\[/ },
  { name: "recipes-batch2.js", arrayRe: /var\s+extra\s*=\s*\[/ },
  { name: "recipes-batch3.js", arrayRe: /var\s+extra\s*=\s*\[/ },
  { name: "recipes-batch4.js", arrayRe: /var\s+extra\s*=\s*\[/ },
  { name: "recipes-batch5.js", arrayRe: /var\s+extra\s*=\s*\[/ },
  { name: "recipes-batch6.js", arrayRe: /var\s+extra\s*=\s*\[/ },
];

function loadMealLib() {
  let src = fs.readFileSync(path.join(JS_DIR, "meal-category.js"), "utf8");
  src = src.replace("window.PW_MEAL", "global.PW_MEAL");
  const ctx = { global: {}, window: {} };
  ctx.global = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.PW_MEAL;
}

function arrayBounds(text, openIdx) {
  let depth = 0;
  let inStr = false;
  let strQuote = "";
  let escape = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === strQuote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      strQuote = ch;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const PW_MEAL = loadMealLib();
let changed = 0;

for (const { name, arrayRe } of FILES) {
  const filePath = path.join(JS_DIR, name);
  let text = fs.readFileSync(filePath, "utf8");
  const m = arrayRe.exec(text);
  if (!m) throw new Error(`no array in ${name}`);
  const open = text.indexOf("[", m.index);
  const close = arrayBounds(text, open);
  if (close < 0) throw new Error(`no close bracket in ${name}`);
  const jsonish = text.slice(open, close + 1);
  let recipes;
  try {
    recipes = vm.runInNewContext(`(${jsonish})`, {});
  } catch (e) {
    throw new Error(`${name}: ${e.message}`);
  }
  for (const r of recipes) {
    const before = JSON.stringify(r.tags || []);
    r.tags = PW_MEAL.scrubMealTags(r.tags || [], r);
    if (JSON.stringify(r.tags) !== before) changed++;
  }
  const body = JSON.stringify(recipes, null, 2);
  text = text.slice(0, open) + body + text.slice(close + 1);
  fs.writeFileSync(filePath, text);
}

process.stdout.write(`updated tag sets on ${changed} recipe objects\n`);
