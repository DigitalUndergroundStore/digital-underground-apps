#!/usr/bin/env python3
"""Grow plan_meal_titles.json with US/CA Wikibooks mains."""
from __future__ import annotations

import json
import time
from pathlib import Path

from build_ca_us_strict2 import API
from bootstrap_plan_meal_titles import OUT
from plan_meal_swap_pass import INLINE_SEARCH, acceptable_replacement
from remap_premium_pass import api, load_all_recipes, recipe_from_wikitext
from ca_us_swap_pass import infer_meal

QUERIES: list[str] = []
for items in INLINE_SEARCH.values():
    QUERIES.extend(items)
QUERIES = list(dict.fromkeys(QUERIES + ["american dinner", "canadian dinner", "southern cooking"]))


def main() -> None:
    recipes = load_all_recipes()
    existing_names = {(r.get("name") or "").strip().lower() for r in recipes}
    existing_urls = {(r.get("sourceUrl") or "").lower() for r in recipes if r.get("sourceUrl")}
    entries: list[dict] = []
    if OUT.is_file():
        entries = json.loads(OUT.read_text(encoding="utf-8"))
    seen = {e["title"] for e in entries}
    for q in QUERIES:
        if len(entries) >= 110:
            break
        data = api(
            API,
            {"action": "query", "list": "search", "srsearch": q, "srnamespace": 102, "srlimit": 30},
        )
        for hit in data.get("query", {}).get("search", []):
            if len(entries) >= 110:
                break
            title = hit.get("title", "")
            if not title.startswith("Cookbook:") or title in seen:
                continue
            seen.add(title)
            time.sleep(0.35)
            recipe = recipe_from_wikitext(title, "r999", existing_names)
            if not recipe or not acceptable_replacement(recipe):
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
        time.sleep(0.12)
    print(f"done {len(entries)}", flush=True)


if __name__ == "__main__":
    main()
