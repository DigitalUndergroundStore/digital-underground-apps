#!/usr/bin/env python3
"""Donald swap #2 correction: restore classics, cull weak adds, dedupe near-dup titles."""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

from remap_premium_pass import (
    FILLER_RE,
    load_all_recipes,
    recipe_from_wikitext,
    refresh_photo,
    replace_in_batch,
    search_swap_recipe,
)

TRIED_FILLERS: set[str] = set()

ALL_BATCH_FILES = [
    ("recipes.js", 1, 36),
    ("recipes-extra.js", 37, 126),
    ("recipes-batch1.js", 127, 200),
    ("recipes-batch2.js", 201, 248),
    ("recipes-batch3.js", 249, 448),
    ("recipes-batch4.js", 449, 648),
    ("recipes-batch5.js", 649, 848),
    ("recipes-batch6.js", 849, 1048),
]


def batch_file_for_rid(rid: str) -> str:
    num = int(rid[1:])
    for fname, lo, hi in ALL_BATCH_FILES:
        if lo <= num <= hi:
            return fname
    raise SystemExit(f"no batch for {rid}")

ROOT = Path(__file__).resolve().parents[2]
CFG = Path(__file__).resolve().parent / "swap2_correction.json"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", type=Path, default=CFG)
    ap.add_argument("--report", type=Path, default=Path(__file__).resolve().parent / "swap2_correction_log.json")
    args = ap.parse_args()
    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    log: list[dict] = []
    if args.report.is_file():
        try:
            log = json.loads(args.report.read_text(encoding="utf-8"))
        except Exception:
            log = []
    skip_ids = {e["id"] for e in log}
    recipes = load_all_recipes()
    by_id = {r["id"]: r for r in recipes}
    existing_names = {(r.get("name") or "").lower() for r in recipes}
    name_index = {(r.get("name") or "").lower(): r["id"] for r in recipes}

    filler_queue = list(cfg.get("filler_titles") or [])
    offset_path = args.report.with_name("swap2_correction_filler.offset")
    filler_i = int(offset_path.read_text()) if offset_path.is_file() else 0
    for entry in log:
        if entry.get("reason") in ("wing_cull", "dedupe_near_title"):
            existing_names.add((entry.get("newName") or "").lower())

    def next_filler(rid: str) -> dict | None:
        nonlocal filler_i
        while filler_i < len(filler_queue):
            title = filler_queue[filler_i]
            filler_i += 1
            new = recipe_from_wikitext(title, rid, existing_names)
            if not new:
                continue
            nl = new["name"].lower()
            if nl in existing_names:
                continue
            offset_path.write_text(str(filler_i), encoding="utf-8")
            return new
        old = by_id.get(rid) or {"id": rid, "name": "placeholder", "tags": ["dinner"]}
        swap, _qi = search_swap_recipe(rid, old, existing_names, TRIED_FILLERS, 0)
        if swap and swap["name"].lower() not in existing_names:
            return swap
        return None

    def apply_swap(rid: str, new: dict, reason: str, old_name: str) -> None:
        batch = batch_file_for_rid(rid)
        replace_in_batch(batch, rid, new)
        existing_names.discard(old_name.lower())
        existing_names.add(new["name"].lower())
        name_index[new["name"].lower()] = rid
        plog: list[dict] = []
        wtitle = new.get("_wikitext_title") or ""
        wtext = new.get("_wikitext") or ""
        refresh_photo(rid, wtitle, new["name"], wtext, plog)
        entry = {
            "id": rid,
            "reason": reason,
            "oldName": old_name,
            "newName": new["name"],
            "sourceUrl": new.get("sourceUrl"),
            "photo": (plog[0] if plog else {}).get("photo", "kept"),
        }
        log.append(entry)
        skip_ids.add(rid)
        args.report.write_text(json.dumps(log, indent=2), encoding="utf-8")
        print(json.dumps(entry), flush=True)

    for item in cfg.get("restores") or []:
        rid = item["id"]
        if rid in skip_ids:
            continue
        old = by_id.get(rid)
        if not old:
            print(f"skip missing {rid}", file=sys.stderr)
            continue
        title = item["title"]
        want_name = item.get("name")
        if want_name and (old.get("name") or "").strip() == want_name:
            continue
        existing_names.discard((old.get("name") or "").lower())
        new = recipe_from_wikitext(title, rid, existing_names, allow_name=want_name)
        if not new:
            print(f"FAIL restore {rid} {title}", file=sys.stderr)
            sys.exit(1)
        if want_name:
            new["name"] = want_name
        if sum(1 for s in (new.get("steps") or []) if FILLER_RE.search(s)) >= 2:
            print(f"WARN filler steps {rid} {new['name']}", file=sys.stderr)
        apply_swap(rid, new, "restore_classic", old.get("name") or "")
        time.sleep(0.4)

    keep_wings = set(cfg.get("keep_wing_ids") or [])
    for r in recipes:
        if r["id"] in keep_wings:
            continue
        if not re.search(r"\bwing", r.get("name") or "", re.I):
            continue
        if r["id"] in skip_ids:
            continue
        rid = r["id"]
        old_name = r.get("name") or ""
        if rid not in by_id:
            continue
        new = next_filler(rid)
        if not new:
            print(f"FAIL wing filler {rid}", file=sys.stderr)
            sys.exit(1)
        apply_swap(rid, new, "wing_cull", old_name)
        time.sleep(0.4)

    for rid in cfg.get("dedupe_replace_ids") or []:
        old = by_id.get(rid)
        if not old:
            continue
        if rid in skip_ids:
            continue
        old_name = old.get("name") or ""
        new = next_filler(rid)
        if not new:
            print(f"FAIL dedupe filler {rid}", file=sys.stderr)
            sys.exit(1)
        apply_swap(rid, new, "dedupe_near_title", old_name)
        time.sleep(0.4)

    args.report.write_text(json.dumps(log, indent=2), encoding="utf-8")
    print(f"done {len(log)} swaps", file=sys.stderr)


if __name__ == "__main__":
    main()
