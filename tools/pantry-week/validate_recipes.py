#!/usr/bin/env python3
"""Validate Pantry Week library JS batches."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "src" / "jhagho" / "js"
ORDER = [
    "recipes.js",
    "recipes-extra.js",
    "recipes-batch1.js",
    "recipes-batch2.js",
    "recipes-batch3.js",
    "recipes-batch4.js",
    "recipes-batch5.js",
    "recipes-batch6.js",
]


def load_recipes() -> list[dict]:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        for name in ORDER:
            src = ROOT / name
            if src.is_file():
                (root / name).write_text(src.read_text(encoding="utf-8"))
        script = """
const fs=require('fs'); const vm=require('vm'); const path=require('path');
const order=%s;
const ctx={window:{},PW_STARTERS:[]}; ctx.window=ctx; vm.createContext(ctx);
for (const f of order){ vm.runInContext(fs.readFileSync(path.join(%s,f),'utf8'), ctx); }
process.stdout.write(JSON.stringify(ctx.PW_STARTERS));
""" % (
            json.dumps(ORDER),
            json.dumps(str(root)),
        )
        out = subprocess.check_output(["node", "-e", script], text=True)
    return json.loads(out)


def meal_tags(tags: list) -> list[str]:
    meals = ("breakfast", "lunch", "dinner")
    return [t for t in (tags or []) if t in meals]


def main() -> None:
    recipes = load_recipes()
    ids = set()
    names = set()
    errors = []
    import tempfile

    check_meals = Path(__file__).resolve().parent / "check-meals.mjs"
    check_consistency = Path(__file__).resolve().parent / "check-recipe-consistency.mjs"
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        json.dump(recipes, tf)
        meal_json = tf.name
    meal_errors = json.loads(
        subprocess.check_output(
            ["node", str(check_meals), meal_json],
            text=True,
        )
    )
    consistency = json.loads(
        subprocess.check_output(
            ["node", str(check_consistency), meal_json],
            text=True,
        )
    )
    Path(meal_json).unlink(missing_ok=True)
    errors.extend(meal_errors[:20])
    if len(meal_errors) > 20:
        errors.append(f"... {len(meal_errors)} meal category errors total")
    non_meal = int(consistency.get("nonMealCount") or 0)
    print(f"plan_non_meals={non_meal}", file=sys.stderr)

    for r in recipes:
        rid = r.get("id")
        num = int(str(rid).replace("r", "")) if rid and str(rid).startswith("r") else 0
        if rid in ids:
            errors.append(f"duplicate id {rid}")
        ids.add(rid)
        name = (r.get("name") or "").strip().lower()
        if num >= 249 and name in names:
            errors.append(f"duplicate name {r.get('name')}")
        names.add(name)
        steps = r.get("steps") or []
        if num >= 249:
            if len(steps) < 5:
                errors.append(f"{rid}: only {len(steps)} steps")
            if len(steps) > 12:
                errors.append(f"{rid}: {len(steps)} steps")
        ings = r.get("ingredients") or []
        if len(ings) < 4:
            errors.append(f"{rid}: only {len(ings)} ingredients")
        if rid and int(str(rid).replace("r", "")) >= 249:
            if not r.get("sourceUrl"):
                errors.append(f"{rid}: missing sourceUrl")
    root = Path(__file__).resolve().parents[2]
    photos = root / "pantry-week" / "photos"
    photos_js = root / "src" / "jhagho" / "js" / "photos.js"
    by_id = set(re.findall(r'"(r\d+)":\s*"photos/', photos_js.read_text(encoding="utf-8")))
    for r in recipes:
        rid = r.get("id")
        if not rid:
            continue
        if rid not in by_id:
            errors.append(f"{rid}: missing photos.js map")
        p = photos / f"{rid}.webp"
        if not p.is_file():
            errors.append(f"{rid}: missing photo {p.name}")
    if errors:
        print("\n".join(errors[:50]))
        print(f"... {len(errors)} errors total")
        sys.exit(1)
    print(f"ok {len(recipes)} recipes")


if __name__ == "__main__":
    main()
