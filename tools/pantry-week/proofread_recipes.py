#!/usr/bin/env python3
"""Proofread Pantry Week library: titles, filler steps, typos, protein temps, ingredient sanity."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from remap_premium_pass import (
    BATCH_FILES,
    FILLER_RE,
    JS_DIR,
    ROMAN_TRAIL,
    WEAK_TITLE_RE,
    batch_file_for_rid,
    load_all_recipes,
    premium_display_name,
    recipe_from_wikitext,
    replace_in_batch,
    title_from_source_url,
)

STEP_SUBS = [
    (re.compile(r"\btablespooon\b", re.I), "tablespoon"),
    (re.compile(r"\bteaspoons\b", re.I), "teaspoon"),
    (re.compile(r"\bminuts\b", re.I), "minutes"),
    (re.compile(r"\boccured\b", re.I), "occurred"),
    (re.compile(r"\bseperate\b", re.I), "separate"),
    (re.compile(r"\brecieve\b", re.I), "receive"),
    (re.compile(r"\bpre-heat\b", re.I), "preheat"),
    (re.compile(r"\bPre-heat\b"), "Preheat"),
]

PROTEIN_RE = re.compile(
    r"\b(chicken|turkey|duck|pork chop|pork tenderloin|ground pork|ground beef|beef roast|"
    r"steak|lamb|veal|sausage links?|meatloaf|brisket|ribs)\b",
    re.I,
)
TEMP_RE = re.compile(r"\b\d{2,3}\s*°?\s*F\b|\b\d{2,3}\s*degrees?\s*F\b|internal temperature", re.I)
SAFE_TEMP = (
    "Cook poultry to 165°F (74°C), ground meats to 160°F (71°C), "
    "and whole cuts of pork, beef, or lamb to 145°F (63°C) with a rest before serving."
)

ING_STOP = re.compile(
    r"^(salt|pepper|water|oil|butter|sugar|flour|garlic|onion|optional|to taste|"
    r"freshly ground|black pepper|olive oil|vegetable oil|cooking spray)$",
    re.I,
)


def tokenize_item(item: str) -> list[str]:
    words = re.findall(r"[a-z]{4,}", (item or "").lower())
    return [w for w in words if w not in ("with", "fresh", "large", "small", "medium", "chopped")]


def ingredient_in_steps(item: str, steps_blob: str) -> bool:
    for w in tokenize_item(item):
        if w in steps_blob:
            return True
    return False


def scrub_filler_steps(steps: list[str]) -> tuple[list[str], int]:
    if not steps:
        return steps, 0
    non_filler = [s for s in steps if not FILLER_RE.search(s)]
    if len(non_filler) >= 5 and len(non_filler) < len(steps):
        return non_filler, len(steps) - len(non_filler)
    return steps, 0


def fix_steps_text(steps: list[str]) -> tuple[list[str], int]:
    n = 0
    out: list[str] = []
    blob = " ".join(steps).lower()
    for s in steps:
        t = s
        for pat, rep in STEP_SUBS:
            if pat.search(t):
                t = pat.sub(rep, t)
                n += 1
        out.append(t)
    if PROTEIN_RE.search(blob) and not TEMP_RE.search(blob):
        last = out[-1].rstrip(".")
        if SAFE_TEMP not in last:
            out[-1] = last + ". " + SAFE_TEMP
            n += 1
    return out, n


def fix_title(
    name: str,
    source_url: str | None,
    rid: str,
    name_index: dict[str, str],
) -> tuple[str, int]:
    if not name:
        return name, 0
    new = name

    def would_dup(candidate: str) -> bool:
        other = name_index.get(candidate.lower())
        return bool(other and other != rid)

    if WEAK_TITLE_RE.search(new) and source_url:
        title = title_from_source_url(source_url)
        if title:
            cleaned = premium_display_name(title)
            if cleaned and cleaned.lower() != new.lower() and not would_dup(cleaned):
                return cleaned, 1
    if ROMAN_TRAIL.search(new):
        stripped = ROMAN_TRAIL.sub("", new).strip()
        if stripped and stripped != new and not would_dup(stripped):
            return stripped, 1
    return new, 0


def try_reparse(r: dict, existing_names: set[str]) -> dict | None:
    title = title_from_source_url(r.get("sourceUrl") or "")
    if not title:
        return None
    return recipe_from_wikitext(title, r["id"], existing_names, allow_name=r.get("name"))


def patch_recipes(recipes_by_file: dict[str, list[dict]]) -> dict:
    stats = {
        "recipes": 0,
        "filler_removed": 0,
        "title_fixes": 0,
        "step_text_fixes": 0,
        "reparse": 0,
        "ingredient_flags": 0,
        "meal_tag_touch": 0,
    }
    details: list[dict] = []
    all_recipes = []
    for arr in recipes_by_file.values():
        all_recipes.extend(arr)
    name_index: dict[str, str] = {}
    for r in all_recipes:
        name_index[(r.get("name") or "").strip().lower()] = r["id"]

    for batch, arr in recipes_by_file.items():
        for r in arr:
            stats["recipes"] += 1
            rid = r["id"]
            num = int(rid[1:])
            changed = False
            entry: dict = {"id": rid}

            name, tn = fix_title(r.get("name") or "", r.get("sourceUrl"), rid, name_index)
            if tn:
                old_key = (r.get("name") or "").strip().lower()
                name_index.pop(old_key, None)
                r["name"] = name
                name_index[name.lower()] = rid
                stats["title_fixes"] += tn
                changed = True
                entry["title"] = name

            steps = list(r.get("steps") or [])
            steps, fr = scrub_filler_steps(steps)
            if fr:
                stats["filler_removed"] += fr
                changed = True
                entry["filler_removed"] = fr

            steps, st = fix_steps_text(steps)
            if st:
                stats["step_text_fixes"] += st
                changed = True

            if steps != r.get("steps"):
                r["steps"] = steps
                changed = True

            filler_n = sum(1 for s in (r.get("steps") or []) if FILLER_RE.search(s))
            short_steps = len(r.get("steps") or []) < 6
            if num >= 249 and (filler_n >= 1 or short_steps):
                fresh = try_reparse(r, set(name_index.keys()))
                old_bad = filler_n + (1 if short_steps else 0)
                new_bad = 0
                if fresh:
                    new_bad = sum(1 for s in fresh.get("steps") or [] if FILLER_RE.search(s))
                    if len(fresh.get("steps") or []) < 6:
                        new_bad += 1
                if fresh and new_bad < old_bad:
                    meal = next(
                        (t for t in (r.get("tags") or []) if t in ("breakfast", "lunch", "dinner")),
                        None,
                    )
                    tags = [t for t in (fresh.get("tags") or []) if t not in ("breakfast", "lunch", "dinner")]
                    if meal:
                        tags = [meal] + tags
                    fresh["tags"] = tags
                    r.clear()
                    r.update({k: v for k, v in fresh.items() if not k.startswith("_")})
                    stats["reparse"] += 1
                    changed = True
                    entry["reparse"] = True

            steps_blob = " ".join(r.get("steps") or []).lower()
            missing = []
            for ing in r.get("ingredients") or []:
                item = (ing.get("item") or "").strip()
                if not item or ING_STOP.match(item):
                    continue
                if not ingredient_in_steps(item, steps_blob):
                    missing.append(item)
            if missing:
                stats["ingredient_flags"] += 1
                entry["unused_ingredients"] = missing[:6]

            if changed:
                details.append(entry)

    return {"stats": stats, "details": details}


def load_batches() -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for batch_file, _lo, _hi in BATCH_FILES:
        path = JS_DIR / batch_file
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
        out[batch_file] = json.loads(text[open_i : close_i + 1])
    starters = JS_DIR / "recipes.js"
    extra = JS_DIR / "recipes-extra.js"
    for name in ("recipes.js", "recipes-extra.js", "recipes-batch1.js", "recipes-batch2.js"):
        path = JS_DIR / name
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
        out[name] = json.loads(text[open_i : close_i + 1])
    return out


def write_batch(batch_file: str, recipes: list[dict]) -> None:
    path = JS_DIR / batch_file
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
    body = json.dumps(recipes, indent=2, ensure_ascii=False)
    path.write_text(text[:open_i] + body + text[close_i + 1 :], encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path, default=Path("/tmp/proofread-report.json"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    batches = load_batches()
    report = patch_recipes(batches)
    fix_count = (
        report["stats"]["filler_removed"]
        + report["stats"]["title_fixes"]
        + report["stats"]["step_text_fixes"]
        + report["stats"]["reparse"]
    )
    report["stats"]["proofread_fix_count"] = fix_count

    if not args.dry_run:
        for batch_file, recipes in batches.items():
            write_batch(batch_file, recipes)

    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["stats"], indent=2))
    if report["stats"]["ingredient_flags"]:
        print(f"ingredient sanity flags (unchanged): {report['stats']['ingredient_flags']}", file=sys.stderr)


if __name__ == "__main__":
    main()
