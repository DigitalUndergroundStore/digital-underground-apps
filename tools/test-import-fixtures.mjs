/**
 * Smoke-test import parsers against pw-v322/jhagho/test-fixtures/import/
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { createRequire } from "module";
import { DecompressionStream } from "node:stream/web";

const ROOT = path.resolve("/workspace/pw-v322/jhagho");
const FIX = path.join(ROOT, "test-fixtures/import");
const require = createRequire(import.meta.url);

function loadScripts() {
  const ctx = {
    window: {},
    console,
    TextDecoder,
    TextEncoder,
    DecompressionStream,
    Blob,
    Response,
    PW_STARTERS: [],
    PW_V1_ORIGINALS: [],
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  for (const file of [
    "js/pantry.js",
    "js/import-external.js",
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx);
  }
  return ctx.window.PW_IMPORT;
}

const PW_IMPORT = loadScripts();

async function readBytes(name) {
  return new Uint8Array(fs.readFileSync(path.join(FIX, name)));
}

const tests = [
  ["schema-recipe.json", async () => PW_IMPORT.parseFileBytes(await readBytes("schema-recipe.json"), "schema-recipe.json")],
  ["paprika-sample.paprikarecipe", async () => PW_IMPORT.parseFileBytes(await readBytes("paprika-sample.paprikarecipe"), "paprika-sample.paprikarecipe")],
  ["paprika-sample.paprikarecipes", async () => PW_IMPORT.parseFileBytes(await readBytes("paprika-sample.paprikarecipes"), "paprika-sample.paprikarecipes")],
  ["mela-sample.melarecipe", async () => PW_IMPORT.parseFileBytes(await readBytes("mela-sample.melarecipe"), "mela-sample.melarecipe")],
  ["mela-sample.melarecipes", async () => PW_IMPORT.parseFileBytes(await readBytes("mela-sample.melarecipes"), "mela-sample.melarecipes")],
  ["plan-to-eat-sample.csv", async () => {
    const text = fs.readFileSync(path.join(FIX, "plan-to-eat-sample.csv"), "utf8");
    return PW_IMPORT.parseCsv(text, {
      name: "title",
      ingredients: "ingredients",
      steps: "directions",
      servings: "servings",
      minutes: "time",
    });
  }],
];

let failed = 0;
for (const [label, fn] of tests) {
  try {
    const drafts = await fn();
    if (!drafts?.length || !drafts[0].name) throw new Error("no drafts");
    console.log("OK", label, "→", drafts[0].name, `(${drafts.length})`);
  } catch (err) {
    failed += 1;
    console.error("FAIL", label, err.message || err);
  }
}
process.exit(failed ? 1 : 0);
