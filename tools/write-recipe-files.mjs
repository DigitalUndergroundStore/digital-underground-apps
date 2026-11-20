import fs from "fs";
import path from "path";
import { ROOT, ORDER } from "./load-all-recipes.mjs";

function chunk(recipes, start, end) {
  return recipes.filter((r) => {
    const n = parseInt(r.id.slice(1), 10);
    return n >= start && n <= end;
  });
}

export function writeRecipeFiles(all) {
  const r1_36 = chunk(all, 1, 36);
  const r37_126 = chunk(all, 37, 126);
  const r127_200 = chunk(all, 127, 200);
  const r201_248 = chunk(all, 201, 248);

  const body = (list) => JSON.stringify(list, null, 2);

  fs.writeFileSync(
    path.join(ROOT, "recipes.js"),
    `/* Pantry Week v3.5 — starter recipes r1–r36 */\n"use strict";\n\nvar PW_STARTERS = ${body(r1_36)};\n`
  );

  const extraHeader = (label, range, arr) =>
    `/* Pantry Week — ${label} ${range} */\n"use strict";\n(function () {\n  if (typeof PW_STARTERS === 'undefined') return;\n  var extra = ${body(arr)};\n  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);\n})();\n`;

  fs.writeFileSync(path.join(ROOT, "recipes-extra.js"), extraHeader("expanded library", "r37–r126", r37_126));
  fs.writeFileSync(path.join(ROOT, "recipes-batch1.js"), extraHeader("batch 1 library", "r127–r200", r127_200));
  fs.writeFileSync(path.join(ROOT, "recipes-batch2.js"), extraHeader("batch 2 library", "r201–r248", r201_248));
}
