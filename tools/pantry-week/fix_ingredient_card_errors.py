#!/usr/bin/env python3
"""Repair Wikibooks import ingredient lines mangled by QTY_RE (liter 'l' vs Large, plural units)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JS_DIR = ROOT / "src" / "jhagho" / "js"
FILES = [
    "recipes-batch3.js",
    "recipes-batch4.js",
    "recipes-batch5.js",
    "recipes-batch6.js",
]


def repair_ingredient(ing: dict) -> bool:
    before = json.dumps(ing, sort_keys=True)
    qty = ing.get("qty")
    unit = (ing.get("unit") or "").strip()
    item = (ing.get("item") or "").strip()
    if not item:
        return False

    if unit == "l" and item.startswith("arge"):
        item = "L" + item[1:]
        unit = ""

    if unit == "g" and item.startswith("rams "):
        item = item[5:].lstrip()

    if item.startswith("ood shake"):
        item = "g" + item

    if item.startswith("s "):
        item = item[2:].lstrip()

    if item.startswith("of ") and unit in ("pinch", "tsp", "tbsp", "cup"):
        item = item[3:].lstrip()

    frac_cups = re.match(r"^¼\s*cups?\s*(.*)$", item, re.I)
    if frac_cups:
        rest = frac_cups.group(1).strip()
        base = float(qty) if qty is not None else 1.0
        qty = base + 0.25
        unit = "cup"
        item = rest

    ing["qty"] = qty
    ing["unit"] = unit
    ing["item"] = item
    return json.dumps(ing, sort_keys=True) != before


def patch_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    open_i = text.index("[")
    depth = 0
    close_i = -1
    for i in range(open_i, len(text)):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                close_i = i
                break
    if close_i < 0:
        raise SystemExit(f"no array close in {path}")
    recipes = json.loads(text[open_i : close_i + 1])
    n = 0
    for r in recipes:
        for ing in r.get("ingredients") or []:
            if repair_ingredient(ing):
                n += 1
    body = json.dumps(recipes, indent=2, ensure_ascii=False)
    path.write_text(text[:open_i] + body + text[close_i + 1 :], encoding="utf-8")
    return n


def main() -> None:
    total = 0
    for name in FILES:
        p = JS_DIR / name
        n = patch_file(p)
        print(f"{name}: repaired {n} ingredient lines")
        total += n
    print(f"total repaired {total}")


if __name__ == "__main__":
    main()
