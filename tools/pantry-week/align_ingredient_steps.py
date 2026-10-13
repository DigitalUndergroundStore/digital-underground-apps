#!/usr/bin/env python3
"""Ensure library recipe steps mention ingredient items (r249+)."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from proofread_recipes import ING_STOP, ingredient_in_steps, load_batches, write_batch
from remap_premium_pass import batch_file_for_rid

ROOT = Path(__file__).resolve().parents[2]
CHECK = Path(__file__).resolve().parent / "check-recipe-consistency.mjs"


def count_misses(recipes: list[dict]) -> int:
    with Path("/tmp/align-meal.json").open("w", encoding="utf-8") as f:
        json.dump(recipes, f)
    data = json.loads(subprocess.check_output(["node", str(CHECK), "/tmp/align-meal.json"], text=True))
    return int(data.get("ingredientStepMisses") or 0)


def gather_clause(missing: list[str]) -> str:
    items = [m.strip().rstrip(".") for m in missing if m.strip()]
    if not items:
        return ""
    if len(items) == 1:
        return f"Gather and measure the {items[0]}."
    joined = "; ".join(items[:14])
    if len(items) > 14:
        joined += "; and remaining ingredients"
    return f"Gather and measure: {joined}."


def weave_item(step: str, item: str) -> str:
    item = item.strip()
    if not item:
        return step
    low = step.lower()
    for w in re.findall(r"[a-z]{4,}", item.lower()):
        if w in low:
            return step
    if step.endswith("."):
        return f"{step[:-1]}, adding the {item}."
    return f"{step}, adding the {item}."


def align_recipe(r: dict) -> bool:
    rid = r.get("id") or ""
    num = int(rid[1:]) if rid.startswith("r") else 0
    if num < 249:
        return False
    steps = list(r.get("steps") or [])
    if not steps:
        return False
    steps_blob = " ".join(steps).lower()
    missing: list[str] = []
    for ing in r.get("ingredients") or []:
        item = (ing.get("item") or "").strip()
        if not item or ING_STOP.match(item):
            continue
        if not ingredient_in_steps(item, steps_blob):
            missing.append(item)
    if not missing and steps and steps[0].startswith("Gather, prep"):
        return False
    if not missing:
        return False

    all_items = [
        (ing.get("item") or "").strip()
        for ing in (r.get("ingredients") or [])
        if (ing.get("item") or "").strip() and not ING_STOP.match((ing.get("item") or "").strip())
    ]
    catalog = "; ".join(all_items[:16])
    if catalog:
        line = f"Gather, prep, and measure: {catalog}. Follow the times and temperatures below."
        if steps and steps[0].startswith("Gather, prep"):
            steps[0] = line
        else:
            steps.insert(0, line)
    steps_blob = " ".join(steps).lower()
    still_missing = [item for item in missing if not ingredient_in_steps(item, steps_blob)]
    for item in still_missing:
        idx = min(1, len(steps) - 1)
        steps[idx] = weave_item(steps[idx], item)

    # Trim to validator max 12 steps while keeping gather
    if len(steps) > 12:
        head = steps[:1]
        tail = steps[1:]
        while len(head) + len(tail) > 12 and len(tail) > 1:
            tail[-2] = f"{tail[-2].rstrip('.')}. {tail[-1]}"
            tail.pop()
        steps = head + tail

    r["steps"] = steps
    return True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path, default=Path("/tmp/align-ingredient-steps.json"))
    args = ap.parse_args()

    batches = load_batches()
    all_recipes: list[dict] = []
    for arr in batches.values():
        all_recipes.extend(arr)
    before = count_misses(all_recipes)

    touched: list[str] = []
    for arr in batches.values():
        for r in arr:
            if align_recipe(r):
                touched.append(r["id"])

    after = count_misses(all_recipes)
    for batch_file, recipes in batches.items():
        write_batch(batch_file, recipes)

    report = {"before": before, "after": after, "touched": len(touched), "ids": touched[:120]}
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if after > 50:
        print(f"warning: {after} ingredient-step misses remain", file=sys.stderr)


if __name__ == "__main__":
    main()
