#!/usr/bin/env python3
"""Replace plan-ineligible library recipes (desserts, snacks, sauces, sides) with CA/US Wikibooks meals."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from build_ca_us_strict2 import BAD  # type: ignore
from build_plan_meal_titles import NOT_MEAL  # type: ignore

PLAN_SWAP_REJECT = re.compile(
    r"(bulgarian|kebapcheta|jangjorim|kik alicha|erwtensoep|ginger biscuit|"
    r"split pea stew|mango and yellow split pea|quail egg and chili|stoofvlees|"
    r"hachee|flemish|eurasian|dutch beef|veggie salad|kanda \(peanut|ajiaco|"
    r"green eggs and ham)",
    re.I,
)

PLAN_FOREIGN = re.compile(
    r"\b(dutch|flemish|bulgarian|korean|ethiopian|belgian|eurasian|german|french|"
    r"italian|mexican|indian|chinese|japanese|thai|vietnamese|filipino|peruvian|"
    r"brazilian|turkish|greek|spanish|portuguese|hungarian|polish|austrian|swiss|"
    r"norwegian|danish|finnish|russian|ukrainian|moroccan|lebanese|persian|afghan|"
    r"pakistani|malaysian|indonesian|singaporean|taiwanese|algerian|nigerian|"
    r"filipino|peruvian|latin american|maghrebi|stroganoff|russian|liberian|gambian|"
    r"domoda|saka.saka|kanda|peanut stew)\b",
    re.I,
)
from ca_us_swap_pass import (  # type: ignore
    API,
    OBSCURE_OUT,
    POOL_REJECT,
    PROTECT_CLASSICS,
    US_CA_HINT,
    discover_pool,
    infer_meal,
    meal_tags,
)
from import_library_batch import SKIP_TITLE as IMPORT_SKIP  # type: ignore
from remap_premium_pass import api  # type: ignore
from remap_premium_pass import (  # type: ignore
    JS_DIR,
    batch_file_for_rid,
    load_all_recipes,
    refresh_photo,
    recipe_from_wikitext,
)

LIBRARY_FILES = [
    ("recipes.js", 1, 36),
    ("recipes-extra.js", 37, 126),
    ("recipes-batch1.js", 127, 200),
    ("recipes-batch2.js", 201, 248),
    ("recipes-batch3.js", 249, 448),
    ("recipes-batch4.js", 449, 648),
    ("recipes-batch5.js", 649, 848),
    ("recipes-batch6.js", 849, 1048),
]


def library_file_for_rid(rid: str) -> str:
    num = int(rid[1:])
    for fname, lo, hi in LIBRARY_FILES:
        if lo <= num <= hi:
            return fname
    raise SystemExit(f"no library file for {rid}")


def replace_in_library(batch_file: str, rid: str, recipe: dict) -> None:
    path = JS_DIR / batch_file
    text = path.read_text(encoding="utf-8")
    if batch_file == "recipes.js":
        marker = "var PW_STARTERS = "
    else:
        marker = "var extra = "
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f"no array in {batch_file}")
    open_i = text.index("[", start)
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
        raise SystemExit(f"no close in {batch_file}")
    recipes = json.loads(text[open_i : close_i + 1])
    for i, r in enumerate(recipes):
        if r.get("id") == rid:
            clean = {k: v for k, v in recipe.items() if not k.startswith("_")}
            recipes[i] = clean
            break
    else:
        raise SystemExit(f"{rid} not in {batch_file}")
    body = json.dumps(recipes, indent=2, ensure_ascii=False)
    path.write_text(text[:open_i] + body + text[close_i + 1 :], encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]

INLINE_SEARCH = {
    "breakfast": [
        "american pancakes",
        "waffle breakfast",
        "omelette american",
        "french toast",
        "breakfast casserole",
        "scrambled eggs",
        "hash browns",
        "eggs benedict",
        "bacon and eggs",
        "oatmeal breakfast",
    ],
    "lunch": [
        "american sandwich",
        "chicken soup",
        "clam chowder",
        "tuna melt",
        "grilled cheese",
        "club sandwich",
        "blt sandwich",
        "reuben sandwich",
        "chicken salad sandwich",
        "corn chowder",
    ],
    "dinner": [
        "american meatloaf",
        "pot roast",
        "southern fried chicken",
        "macaroni and cheese",
        "chicken pot pie",
        "beef stew",
        "pork chops",
        "lasagna",
        "chili american",
        "beef tacos",
        "maple salmon",
        "thanksgiving turkey",
        "pulled pork",
        "bbq ribs",
        "shepherd pie",
        "turkey dinner",
        "meatballs american",
        "spaghetti meatballs",
        "canadian tourtiere",
        "poutine dinner",
    ],
}


def inline_pool_entry(meal: str, existing_names: set[str], existing_urls: set[str], used_titles: set[str]) -> dict | None:
    for q in INLINE_SEARCH.get(meal, []) + INLINE_SEARCH["dinner"]:
        data = api(
            API,
            {"action": "query", "list": "search", "srsearch": q, "srnamespace": 102, "srlimit": 25},
        )
        for hit in data.get("query", {}).get("search", []):
            title = hit.get("title", "")
            if not title.startswith("Cookbook:") or IMPORT_SKIP.search(title) or title in used_titles:
                continue
            if not US_CA_HINT.search(title):
                continue
            recipe = recipe_from_wikitext(title, "r999", existing_names)
            if not recipe:
                continue
            url = (recipe.get("sourceUrl") or "").lower()
            if url in existing_urls or recipe["name"].lower() in existing_names:
                continue
            if not acceptable_replacement(recipe):
                continue
            return {
                "title": title,
                "name": recipe["name"],
                "meal": infer_meal(recipe),
                "sourceUrl": recipe.get("sourceUrl"),
                "tags": recipe.get("tags"),
            }
        time.sleep(0.35)
    return None


def infer_non_meal_kind(recipe: dict) -> str:
    script = (
        (JS_DIR / "meal-category.js")
        .read_text(encoding="utf-8")
        .replace("window.PW_MEAL", "global.PW_MEAL")
        + "\nglobal.window=global;\n"
        + "const r=JSON.parse(process.argv[1]);\n"
        + "process.stdout.write(PW_MEAL.inferNonMealKind(r)||'');\n"
    )
    return subprocess.check_output(["node", "-e", script, json.dumps(recipe)], text=True).strip()


def acceptable_replacement(recipe: dict) -> bool:
    if infer_non_meal_kind(recipe):
        return False
    if not plan_eligible(recipe):
        return False
    blob = (recipe.get("name") or "") + " " + (recipe.get("sourceUrl") or "")
    if (
        POOL_REJECT.search(blob)
        or BAD.search(blob)
        or OBSCURE_OUT.search(blob)
        or NOT_MEAL.search(blob)
        or PLAN_SWAP_REJECT.search(blob)
        or (PLAN_FOREIGN.search(blob) and not re.search(r"\b(american|canadian|usa|u\.s\.)\b", blob, re.I))
    ):
        return False
    from build_ca_us_strict2 import NA as NA_HINT  # noqa: PLC0415

    if not (US_CA_HINT.search(blob) or NA_HINT.search(blob)):
        return False
    steps = recipe.get("steps") or []
    if len(steps) < 4:
        return False
    return True


def plan_eligible(recipe: dict) -> bool:
    script = (
        (JS_DIR / "meal-category.js")
        .read_text(encoding="utf-8")
        .replace("window.PW_MEAL", "global.PW_MEAL")
        + "\nglobal.window=global;\n"
        + "const r=JSON.parse(process.argv[1]);\n"
        + "process.stdout.write(PW_MEAL.recipePlanEligible(r)?'1':'0');\n"
    )
    return (
        subprocess.check_output(["node", "-e", script, json.dumps(recipe)], text=True).strip()
        == "1"
    )


def non_meal_ids(recipes: list[dict]) -> dict[str, str]:
    script = (
        (JS_DIR / "meal-category.js")
        .read_text(encoding="utf-8")
        .replace("window.PW_MEAL", "global.PW_MEAL")
        + "\nglobal.window=global;\n"
        + "const r=JSON.parse(process.argv[1]);\n"
        + "const k=PW_MEAL.inferNonMealKind(r);\n"
        + "process.stdout.write(k||'');\n"
    )
    out: dict[str, str] = {}
    for r in recipes:
        kind = subprocess.check_output(
            ["node", "-e", script, json.dumps(r)],
            text=True,
        ).strip()
        if kind:
            out[r["id"]] = kind
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path, default=Path("/tmp/plan-meal-swap-log.json"))
    ap.add_argument(
        "--titles-file",
        type=Path,
        default=Path(__file__).resolve().parent / "plan_meal_titles.json",
    )
    ap.add_argument("--min-count", type=int, default=1)
    args = ap.parse_args()

    recipes = load_all_recipes()
    name_index: dict[str, str] = {}
    for r in recipes:
        name_index[(r.get("name") or "").strip().lower()] = r["id"]
    existing_names = set(name_index.keys())
    existing_urls = {(r.get("sourceUrl") or "").lower() for r in recipes if r.get("sourceUrl")}

    bad = non_meal_ids(recipes)
    targets = [r for r in recipes if r["id"] in bad]
    targets.sort(key=lambda r: int(r["id"][1:]))

    pool = discover_pool(existing_names, existing_urls, titles_path=args.titles_file)
    pool_by_meal: dict[str, list[dict]] = {"breakfast": [], "lunch": [], "dinner": []}
    for entry in pool:
        pool_by_meal.setdefault(entry["meal"], []).append(entry)
    pool_cursor = {"breakfast": 0, "lunch": 0, "dinner": 0}
    used_titles: set[str] = set()

    def next_pool_item(meal: str) -> dict | None:
        for m in (meal, "dinner", "lunch", "breakfast"):
            items = pool_by_meal.get(m) or []
            idx = pool_cursor[m]
            while idx < len(items):
                entry = items[idx]
                pool_cursor[m] = idx + 1
                idx += 1
                if entry["title"] in used_titles:
                    continue
                if entry["name"].lower() in existing_names:
                    continue
                return entry
        return None

    log: list[dict] = []
    swapped = 0
    for old in targets:
        rid = old["id"]
        # Non-meals leave the library even when the title matches PROTECT_CLASSICS (e.g. desserts).
        old_meal = meal_tags(old.get("tags") or []) or infer_meal(old)
        entry = next_pool_item(old_meal)
        if not entry:
            entry = inline_pool_entry(old_meal, existing_names, existing_urls, used_titles)
        if not entry:
            log.append({"id": rid, "status": "skipped", "reason": "pool_exhausted", "kind": bad[rid]})
            continue
        used_titles.add(entry["title"])
        new = recipe_from_wikitext(entry["title"], rid, existing_names)
        if not new or not acceptable_replacement(new):
            log.append(
                {
                    "id": rid,
                    "status": "skipped",
                    "reason": "parse_failed",
                    "title": entry["title"],
                    "kind": bad[rid],
                }
            )
            continue
        new_meal = infer_meal(new)
        tags = [t for t in (new.get("tags") or []) if str(t).lower() not in ("breakfast", "lunch", "dinner")]
        tags = [new_meal] + tags
        new["tags"] = tags

        batch = library_file_for_rid(rid)
        old_name = old.get("name")
        replace_in_library(batch, rid, new)
        existing_names.discard((old_name or "").lower())
        existing_names.add(new["name"].lower())
        name_index[new["name"].lower()] = rid

        plog: list[dict] = []
        wtitle = new.get("_wikitext_title") or entry["title"]
        wtext = new.get("_wikitext") or ""
        refresh_photo(rid, wtitle, new["name"], wtext, plog)
        photo_state = plog[0].get("photo", "kept") if plog else "kept"

        log.append(
            {
                "id": rid,
                "status": "swapped",
                "kind": bad[rid],
                "oldName": old_name,
                "newName": new["name"],
                "meal": old_meal,
                "inferredMeal": new_meal,
                "sourceUrl": new.get("sourceUrl"),
                "wikibooksTitle": entry["title"],
                "photo": photo_state,
            }
        )
        swapped += 1
        print(json.dumps(log[-1]), flush=True)
        time.sleep(0.65)

    args.report.write_text(json.dumps(log, indent=2), encoding="utf-8")
    skipped = sum(1 for row in log if row.get("status") == "skipped")
    print(
        f"swapped {swapped} of {len(targets)} non-meals ({skipped} skipped)",
        file=sys.stderr,
    )
    if swapped < args.min_count:
        print(
            f"warning: only swapped {swapped} < target {args.min_count}",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
