#!/usr/bin/env python3
"""Swap weakest premium library slots (r249+) with sourced North American Wikibooks recipes."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import import_library_batch as ilb
from remap_premium_pass import (  # type: ignore
    BATCH_FILES,
    FILLER_RE,
    GENERIC_TITLE_RE,
    PHOTOS,
    WEAK_TITLE_RE,
    api,
    batch_file_for_rid,
    load_all_recipes,
    premium_display_name,
    recipe_from_wikitext,
    refresh_photo,
    replace_in_batch,
    weakness_score,
)

ROOT = Path(__file__).resolve().parents[2]
JS_DIR = ROOT / "src" / "jhagho" / "js"
POOL_CACHE = Path(__file__).resolve().parent / "ca_us_pool.json"
STRICT_TITLES = Path(__file__).resolve().parent / "ca_us_titles_strict.json"
API = "https://en.wikibooks.org/w/api.php"

SKIP_TITLE = re.compile(
    r"(ingredient|equipment|template|category|wikibooks|glossary|appendix|substitution|"
    r"conversion|measurement|nutrition|knife skills|Cuisine$|Menu$|Dog Biscuit)",
    re.I,
)

US_CA_HINT = re.compile(
    r"(american|canadian|usa|u\.s\.|new england|southern|cajun|creole|texas|philly|buffalo|"
    r"kansas|bbq|barbecue|maple|poutine|tourti|nanaimo|clam chowder|boston|manhattan|montreal|"
    r"beaver|peameal|jambalaya|gumbo|grits|cornbread|biscuit|meatloaf|pot roast|macaroni|"
    r"thanksgiving|pumpkin pie|pecan pie|sloppy joe|chili|fried chicken|pot pie|shepherd|"
    r"hushpuppy|cheesecake|lobster roll|po.? boy|muffuletta|reuben|blt|club sandwich|"
    r"grilled cheese|hot dog|corn dog|apple pie|key lime|banana bread|zucchini bread|"
    r"deviled|ranch|wings|brisket|pulled pork|split pea|baked beans|vancouver|midwestern|"
    r"memphis|carolina|pedernales|north carolina|low country|eastern north|denver omelette|"
    r"eggs benedict|huevos rancheros)",
    re.I,
)

POOL_REJECT = re.compile(
    r"(nigerian|malawian|ugandan|tanzanian|australian|ancient roman|somali|austrian|maghrebi|"
    r"peruvian|latin american|italian-american|polish|zambian|asian barbecue|algerian|filipino|"
    r"canjeero|kaiserschmarrn|mofletta|æbleskiver|danish|wiejska|salza criolla|gurudi|braai|"
    r"venezuelan|musakhan|bouballe|cachapa|tetrazzini|puttanesca|alfajores|dog biscuit|"
    r"matzo meal omelette|whole wheat pancakes|light fluffy pancakes|potato pancakes|"
    r"orange cardamom|lemon poppy|ginger pancakes|chocolate chip pancakes|blueberry pancakes|"
    r"banana nutmeg pancakes|almond pancakes|breakfast waffles|thin waffles|oatmeal banana)",
    re.I,
)

PROTECT_CLASSICS = re.compile(
    r"(Apple Crisp|Beef Stew|Christmas Pudding|Crêpes|Crepes|Guacamole|Indian Butter Chicken|"
    r"Pumpkin Bread|Ratatouille|Roasted Brined Turkey|Shakshuka|Pierogi|Eggplant Parmesan|"
    r"Chocolate Chip Cookies|Oatmeal Cookies|Snickerdoodles|Stracciatella|Tofu Scramble|"
    r"Chicken Soup I|Coq au Vin|Rhubarb Crumble|Welsh Fruit Bread)",
    re.I,
)

OBSCURE_OUT = re.compile(
    r"\b(Ofe|Okpa|Okpo|Otong|Owo|Ukpo|Nigerian|Filipino Halo|Chhundo|Mazagran|"
    r"Rasam|Yeung Chow|Bulgogi|Okonomiyaki|Sirniki|Adobo Sauce|OpenCola|Burple)\b",
    re.I,
)

SEARCH_QUERIES = [
    "american",
    "canadian",
    "new england",
    "southern united states",
    "cajun",
    "creole",
    "texas",
    "philly",
    "buffalo wings",
    "kansas city barbecue",
    "maple syrup",
    "poutine",
    "tourtiere",
    "nanaimo",
    "clam chowder",
    "lobster roll",
    "biscuit gravy",
    "cornbread",
    "grits",
    "jambalaya",
    "gumbo",
    "po boy",
    "meatloaf",
    "pot roast",
    "macaroni cheese",
    "thanksgiving",
    "pumpkin pie",
    "apple pie",
    "pecan pie",
    "brownie",
    "pancake",
    "waffle",
    "french toast",
    "omelette",
    "sloppy joe",
    "chili con carne",
    "fried chicken",
    "pot pie",
    "shepherd pie",
    "succotash",
    "cheesecake",
    "banana bread",
    "maple glazed",
    "barbecue ribs",
    "brisket sandwich",
]


def infer_meal(recipe: dict) -> str:
    script = (
        (JS_DIR / "meal-category.js")
        .read_text(encoding="utf-8")
        .replace("window.PW_MEAL", "global.PW_MEAL")
        + "\nglobal.window=global;\n"
        + "const r=JSON.parse(process.argv[1]);\n"
        + "process.stdout.write(PW_MEAL.inferMealCategory(r));\n"
    )
    out = subprocess.check_output(
        ["node", "-e", script, json.dumps(recipe)],
        text=True,
    ).strip()
    return out or "dinner"


def meal_tags(tags: list) -> str | None:
    for t in tags or []:
        x = str(t).lower()
        if x in ("breakfast", "lunch", "dinner"):
            return x
    return None


def photo_md5_index() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for p in PHOTOS.glob("r*.webp"):
        h = hashlib.md5(p.read_bytes()).hexdigest()
        out.setdefault(h, []).append(p.stem)
    return out


def swap_out_score(r: dict, dup_photos: dict[str, list[str]]) -> tuple[int, list[str]]:
    rid = r["id"]
    num = int(rid[1:])
    if num < 249:
        return -1, []
    issues: list[str] = []
    score = 0
    name = r.get("name") or ""
    steps = r.get("steps") or []
    ings = r.get("ingredients") or []
    filler = sum(1 for s in steps if FILLER_RE.search(s))
    if filler:
        score += filler * 6
        issues.append(f"filler={filler}")
    if len(steps) < 6:
        score += (6 - len(steps)) * 2
        issues.append(f"steps={len(steps)}")
    if len(ings) < 5:
        score += (5 - len(ings)) * 2
        issues.append(f"ings={len(ings)}")
    if GENERIC_TITLE_RE.search(name):
        score += 5
        issues.append("generic_title")
    if WEAK_TITLE_RE.search(name):
        score += 3
        issues.append("roman_title")
    if OBSCURE_OUT.search(name):
        score += 18
        issues.append("obscure_non_na")
    blob = name.lower()
    if not US_CA_HINT.search(blob) and not US_CA_HINT.search((r.get("sourceUrl") or "")):
        score += 4
        issues.append("non_na")
    if US_CA_HINT.search(blob):
        score -= 6
        issues.append("keep_na_classic")
    p = PHOTOS / f"{rid}.webp"
    if not p.is_file() or p.stat().st_size == 0:
        score += 25
        issues.append("missing_photo")
    elif p.stat().st_size < 8000:
        score += 8
        issues.append("small_photo")
    else:
        h = hashlib.md5(p.read_bytes()).hexdigest()
        if len(dup_photos.get(h, [])) > 1:
            score += 12
            issues.append("dup_photo")
    ws, w_issues = weakness_score(r, {})
    if ws:
        score += ws
        issues.extend(w_issues)
    return score, issues


def swap_eligible(score: int, issues: list[str], relaxed: bool = False) -> bool:
    if relaxed:
        if score < 6:
            return False
        if "keep_na_classic" in issues:
            return False
        return True
    if score < 8:
        return False
    hard = False
    for issue in issues:
        if issue.startswith("filler=") or issue in (
            "obscure_non_na",
            "dup_photo",
            "missing_photo",
            "small_photo",
            "generic_title",
        ):
            hard = True
        if issue.startswith("ings=") and score >= 10:
            hard = True
    if "keep_na_classic" in issues and not hard:
        return False
    if not hard and score < 14:
        return False
    return hard or score >= 14


def discover_pool(existing_names: set[str], existing_urls: set[str]) -> list[dict]:
    if STRICT_TITLES.is_file():
        raw = json.loads(STRICT_TITLES.read_text(encoding="utf-8"))
        entries: list[dict] = []
        for row in raw:
            title = row["title"]
            name = row.get("name") or premium_display_name(title)
            if POOL_REJECT.search(title) or POOL_REJECT.search(name):
                continue
            if name.lower() in existing_names:
                continue
            slug = title.replace("Cookbook:", "").replace(" ", "_")
            url = f"https://en.wikibooks.org/wiki/Cookbook:{slug}".lower()
            if url in existing_urls:
                continue
            stub = {"name": name, "tags": row.get("tags") or [], "minutes": row.get("minutes")}
            entries.append(
                {
                    "title": title,
                    "name": name,
                    "meal": row.get("meal") or infer_meal(stub),
                    "sourceUrl": url,
                    "tags": row.get("tags"),
                }
            )
        if entries:
            return entries

    if POOL_CACHE.is_file():
        cached = json.loads(POOL_CACHE.read_text(encoding="utf-8"))
        if cached.get("entries"):
            return cached["entries"]

    seen: set[str] = set()
    titles: list[str] = []
    for q in SEARCH_QUERIES:
        data = api(
            API,
            {
                "action": "query",
                "list": "search",
                "srsearch": q,
                "srnamespace": 102,
                "srlimit": 50,
            },
        )
        for hit in data.get("query", {}).get("search", []):
            t = hit.get("title", "")
            if not t.startswith("Cookbook:") or SKIP_TITLE.search(t):
                continue
            if t in seen:
                continue
            seen.add(t)
            titles.append(t)
        time.sleep(0.12)

    entries: list[dict] = []
    for title in titles:
        recipe = recipe_from_wikitext(title, "r999", existing_names)
        if not recipe:
            continue
        url = (recipe.get("sourceUrl") or "").lower()
        if url in existing_urls:
            continue
        blob = title + " " + recipe["name"]
        if POOL_REJECT.search(blob):
            continue
        if not US_CA_HINT.search(blob):
            continue
        meal = infer_meal(recipe)
        entries.append(
            {
                "title": title,
                "name": recipe["name"],
                "meal": meal,
                "sourceUrl": recipe.get("sourceUrl"),
                "tags": recipe.get("tags"),
            }
        )
        time.sleep(0.05)

    POOL_CACHE.write_text(
        json.dumps({"entries": entries, "built": time.strftime("%Y-%m-%dT%H:%M:%SZ")}, indent=2),
        encoding="utf-8",
    )
    return entries


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-count", type=int, default=100, help="minimum successful swaps")
    ap.add_argument("--report", type=Path, default=Path("/tmp/ca-us-swap-log.json"))
    ap.add_argument(
        "--relaxed",
        action="store_true",
        help="second-pass eligibility (more slots, still skips protected classics)",
    )
    args = ap.parse_args()

    recipes = load_all_recipes()
    name_index: dict[str, str] = {}
    for r in recipes:
        name_index[(r.get("name") or "").strip().lower()] = r["id"]
    existing_names = set(name_index.keys())
    existing_urls = {(r.get("sourceUrl") or "").lower() for r in recipes if r.get("sourceUrl")}

    dup_photos = photo_md5_index()
    targets: list[tuple[int, dict, list[str]]] = []
    for r in recipes:
        score, issues = swap_out_score(r, dup_photos)
        if score >= 2:
            targets.append((score, r, issues))
    targets.sort(key=lambda x: -x[0])

    pool = discover_pool(existing_names, existing_urls)
    used_titles: set[str] = set()
    used_names: set[str] = set()
    pool_by_meal: dict[str, list[dict]] = {"breakfast": [], "lunch": [], "dinner": []}
    for entry in pool:
        pool_by_meal.setdefault(entry["meal"], []).append(entry)

    log: list[dict] = []
    done_ids: set[str] = set()
    if args.report.is_file():
        try:
            log = json.loads(args.report.read_text(encoding="utf-8"))
            done_ids = {e["id"] for e in log if e.get("status") == "swapped"}
            swapped = len(done_ids)
        except json.JSONDecodeError:
            swapped = 0
    else:
        swapped = 0
    pool_cursor = {"breakfast": 0, "lunch": 0, "dinner": 0}

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

    for score, old, issues in targets:
        if not swap_eligible(score, issues, relaxed=args.relaxed):
            continue
        if swapped >= args.min_count:
            break
        rid = old["id"]
        if rid in done_ids:
            continue
        if PROTECT_CLASSICS.search(old.get("name") or ""):
            continue
        old_meal = meal_tags(old.get("tags") or []) or infer_meal(old)
        entry = next_pool_item(old_meal)
        if not entry:
            log.append({"id": rid, "status": "skipped", "reason": "pool_exhausted", "score": score})
            continue
        used_titles.add(entry["title"])
        new = recipe_from_wikitext(entry["title"], rid, existing_names)
        if not new:
            log.append(
                {
                    "id": rid,
                    "status": "skipped",
                    "reason": "parse_failed",
                    "title": entry["title"],
                    "score": score,
                }
            )
            continue
        new_meal = infer_meal(new)
        tags = [t for t in (new.get("tags") or []) if str(t).lower() not in ("breakfast", "lunch", "dinner")]
        tags = [old_meal] + tags
        new["tags"] = tags

        batch = batch_file_for_rid(rid)
        old_name = old.get("name")
        replace_in_batch(batch, rid, new)
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
                "score": score,
                "issues": issues,
                "oldName": old_name,
                "newName": new["name"],
                "meal": old_meal,
                "inferredMeal": new_meal,
                "sourceUrl": new.get("sourceUrl"),
                "sourceName": new.get("sourceName"),
                "wikibooksTitle": entry["title"],
                "photo": photo_state,
            }
        )
        swapped += 1
        print(json.dumps(log[-1]), flush=True)
        time.sleep(0.75)

    args.report.write_text(json.dumps(log, indent=2), encoding="utf-8")
    print(f"swapped {swapped} (target {args.min_count})", file=sys.stderr)
    if swapped < args.min_count:
        raise SystemExit(f"only swapped {swapped} < {args.min_count}")


if __name__ == "__main__":
    main()
