#!/usr/bin/env python3
"""Dedupe noisy gather lines and cap step count for library recipes."""
from __future__ import annotations

import json
import re

from proofread_recipes import load_batches, write_batch

GATHER_DUP = re.compile(r"^Gather and measure", re.I)


def scrub_recipe(r: dict) -> bool:
    rid = r.get("id") or ""
    if not str(rid).startswith("r"):
        return False
    if int(rid[1:]) < 249:
        return False
    steps = list(r.get("steps") or [])
    if not steps:
        return False
    cleaned: list[str] = []
    seen_gather = False
    changed = False
    for s in steps:
        if GATHER_DUP.search(s) and not s.startswith("Gather, prep"):
            changed = True
            continue
        if s.startswith("Gather, prep"):
            if seen_gather:
                changed = True
                continue
            seen_gather = True
        cleaned.append(s)
    while len(cleaned) > 12 and len(cleaned) > 1:
        cleaned[-2] = f"{cleaned[-2].rstrip('.')}. {cleaned[-1]}"
        cleaned.pop()
        changed = True
    if cleaned != steps:
        r["steps"] = cleaned
        return True
    return changed


def main() -> None:
    batches = load_batches()
    n = 0
    for batch, arr in batches.items():
        for r in arr:
            if scrub_recipe(r):
                n += 1
        write_batch(batch, arr)
    print(f"scrubbed {n} recipes")


if __name__ == "__main__":
    main()
