#!/usr/bin/env python3
"""Rewrite library recipe tags so each has exactly one breakfast/lunch/dinner tag."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JS_DIR = ROOT / "src" / "jhagho" / "js"
FILES = [
    ("recipes.js", r"var\s+PW_STARTERS\s*=\s*\[", r"\];"),
    ("recipes-extra.js", r"var\s+extra\s*=\s*\[", r"\];"),
    ("recipes-batch1.js", r"var\s+extra\s*=\s*\[", r"\];"),
    ("recipes-batch2.js", r"var\s+extra\s*=\s*\[", r"\];"),
    ("recipes-batch3.js", r"var\s+extra\s*=\s*\[", r"\];"),
    ("recipes-batch4.js", r"var\s+extra\s*=\s*\[", r"\];"),
    ("recipes-batch5.js", r"var\s+extra\s*=\s*\[", r"\];"),
    ("recipes-batch6.js", r"var\s+extra\s*=\s*\[", r"\];"),
]


def scrub_script() -> str:
    meal = (JS_DIR / "meal-category.js").read_text(encoding="utf-8")
    return (
        meal.replace("window.PW_MEAL", "global.PW_MEAL")
        + """
global.window = global;
const fs = require('fs');
const files = JSON.parse(process.argv[1]);
let changed = 0;
for (const [name, startRe, endMark] of files) {
  const path = require('path').join(process.argv[2], name);
  let text = fs.readFileSync(path, 'utf8');
  const start = text.search(new RegExp(startRe));
  if (start < 0) throw new Error('no array in ' + name);
  const open = text.indexOf('[', start);
  let depth = 0;
  let close = -1;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) { close = i; break; }
    }
  }
  if (close < 0) throw new Error('no close in ' + name);
  const jsonish = text.slice(open, close + 1);
  let recipes;
  try { recipes = eval(jsonish); }
  catch (e) { throw new Error(name + ': ' + e.message); }
  recipes.forEach(function (r) {
    const before = JSON.stringify(r.tags || []);
    r.tags = PW_MEAL.scrubMealTags(r.tags || [], r);
    if (JSON.stringify(r.tags) !== before) changed++;
  });
  const body = JSON.stringify(recipes, null, 2);
  const newText = text.slice(0, open) + body + text.slice(close + 1);
  fs.writeFileSync(path, newText);
}
process.stdout.write(String(changed));
"""
    )


def main() -> None:
    script = Path(__file__).resolve().parent / "apply-meal-categories.mjs"
    out = subprocess.check_output(["node", str(script)], text=True)
    print(out.strip())


if __name__ == "__main__":
    main()
