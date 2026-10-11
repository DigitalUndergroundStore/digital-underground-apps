import fs from "fs";

const p = new URL("../jhagho/js/recipes.js", import.meta.url);
const code = fs.readFileSync(p, "utf8");
const arr = eval(code.replace(/^[\s\S]*?=\s*/, "").replace(/;\s*$/, ""));
for (const r of arr) {
  const tags = [...new Set(r.tags || [])];
  const m = r.minutes || 30;
  if (!tags.some((t) => ["easy", "medium", "hard"].includes(t))) {
    tags.push(m <= 22 ? "easy" : m <= 32 ? "medium" : "hard");
  }
  if (!tags.some((t) => ["budget", "moderate", "splurge"].includes(t))) {
    tags.push("moderate");
  }
  r.tags = tags;
}
const body = JSON.stringify(arr, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, "$1:");
const out = code.split("var PW_STARTERS")[0] + "var PW_STARTERS = " + body + ";\n";
fs.writeFileSync(p, out);
console.log("Tagged", arr.length, "starters");
