#!/usr/bin/env python3
"""Build Wikibooks title pool for plan-meal swaps (CA/US mains; no desserts/sauces)."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from build_ca_us_strict2 import API, BAD, NA, SEARCH_QUERIES, seed_existing
from ca_us_swap_pass import infer_meal
from ca_us_swap_pass import POOL_REJECT
from remap_premium_pass import api, recipe_from_wikitext

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "plan_meal_titles.json"

SKIP_TITLE = re.compile(
    r"(ingredient|equipment|template|category|wikibooks|glossary|appendix|Dog Biscuit)",
    re.I,
)
NOT_MEAL = re.compile(
    r"(sauce|chutney|ketchup|dressing|mayonnaise|aioli|gravy only|cocktail|punch|"
    r"cookie|brownie|cake|pie crust|cheesecake|fudge|mousse|pudding|dessert|"
    r"ice cream|fritter|nachos|onion rings|mars bar|popcorn|crisp\b|bars\b|tart\b|"
    r"nanaimo|butter tart|meringue pie|layer.cake)",
    re.I,
)

EXTRA_QUERIES = [
    "chicken dinner",
    "beef dinner",
    "pork chop dinner",
    "salmon dinner",
    "turkey dinner",
    "casserole dinner",
    "skillet dinner",
    "sheet pan dinner",
    "slow cooker dinner",
    "soup dinner",
    "stew dinner",
    "breakfast casserole",
    "scrambled eggs",
    "hash browns breakfast",
    "oatmeal breakfast",
    "club sandwich lunch",
    "tuna sandwich",
    "chicken soup lunch",
    "vegetable soup",
    "grilled chicken",
    "baked chicken",
    "roast beef",
    "meatballs american",
    "spaghetti dinner",
    "tacos dinner",
    "burrito bowl",
    "quesadilla dinner",
    "salad dinner",
    "canadian dinner",
    "ontario recipe",
    "quebec recipe",
    "maritime recipe",
    "midwest casserole",
    "southern fried",
]


def main() -> None:
    existing_names, existing_urls = seed_existing()
    entries: list[dict] = []
    if OUT.is_file():
        entries = json.loads(OUT.read_text(encoding="utf-8"))

    seen = {e["title"] for e in entries}
    queries = list(dict.fromkeys(SEARCH_QUERIES + EXTRA_QUERIES))
    for q in queries:
        try:
            data = api(
                API,
                {"action": "query", "list": "search", "srsearch": q, "srnamespace": 102, "srlimit": 50},
            )
        except Exception as exc:
            print("search err", q, exc, flush=True)
            time.sleep(12)
            continue
        for hit in data.get("query", {}).get("search", []):
            title = hit.get("title", "")
            if not title.startswith("Cookbook:") or SKIP_TITLE.search(title) or title in seen:
                continue
            seen.add(title)
            if POOL_REJECT.search(title) or BAD.search(title) or NOT_MEAL.search(title):
                continue
            time.sleep(0.9)
            try:
                recipe = recipe_from_wikitext(title, "r999", existing_names)
            except Exception as exc:
                print("parse err", title, exc, flush=True)
                time.sleep(5)
                continue
            if not recipe:
                continue
            blob = title + " " + recipe["name"]
            if BAD.search(blob) or POOL_REJECT.search(blob) or NOT_MEAL.search(blob):
                continue
            if not NA.search(blob):
                continue
            url = (recipe.get("sourceUrl") or "").lower()
            if url in existing_urls:
                continue
            entries.append(
                {
                    "title": title,
                    "name": recipe["name"],
                    "meal": infer_meal(recipe),
                    "tags": recipe.get("tags"),
                }
            )
            existing_names.add(recipe["name"].lower())
            existing_urls.add(url)
            OUT.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
            print(f"{len(entries)} {recipe['name']}", flush=True)
            if len(entries) >= 115:
                break
        if len(entries) >= 115:
            break
        time.sleep(0.3)

    print(f"done {len(entries)}", flush=True)
    if len(entries) < 80:
        raise SystemExit(f"only {len(entries)} pool entries")


if __name__ == "__main__":
    main()
