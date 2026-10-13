#!/usr/bin/env python3
"""Swap one library slot to a new Wikibooks CA/US meal."""
from __future__ import annotations

import argparse
import time

from build_ca_us_strict2 import API
from plan_meal_swap_pass import acceptable_replacement, library_file_for_rid, replace_in_library
from ca_us_swap_pass import infer_meal
from remap_premium_pass import api, load_all_recipes, recipe_from_wikitext, refresh_photo


def find_title(existing_names: set[str], existing_urls: set[str], queries: list[str]) -> tuple[str, dict] | None:
    for q in queries:
        for offset in (0, 50, 100, 150):
            data = api(
                API,
                {
                    "action": "query",
                    "list": "search",
                    "srsearch": q,
                    "srnamespace": 102,
                    "srlimit": 50,
                    "sroffset": offset,
                },
            )
            for hit in data.get("query", {}).get("search", []):
                title = hit.get("title", "")
                if not title.startswith("Cookbook:"):
                    continue
                recipe = recipe_from_wikitext(title, "r999", existing_names)
                if not recipe or not acceptable_replacement(recipe):
                    continue
                url = (recipe.get("sourceUrl") or "").lower()
                if url in existing_urls:
                    continue
                return title, recipe
            time.sleep(0.12)
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("rid")
    ap.add_argument("--queries", nargs="+", required=True)
    args = ap.parse_args()

    recipes = load_all_recipes()
    by_id = {r["id"]: r for r in recipes}
    if args.rid not in by_id:
        raise SystemExit(f"unknown {args.rid}")
    old = by_id[args.rid]
    existing_names = {(r.get("name") or "").strip().lower() for r in recipes}
    existing_urls = {(r.get("sourceUrl") or "").lower() for r in recipes if r.get("sourceUrl")}

    found = find_title(existing_names, existing_urls, args.queries)
    if not found:
        raise SystemExit("no replacement found")
    title, new = found
    new = recipe_from_wikitext(title, args.rid, existing_names)
    if not new or not acceptable_replacement(new):
        raise SystemExit("replacement failed validation")
    meal = infer_meal(new)
    tags = [t for t in (new.get("tags") or []) if str(t).lower() not in ("breakfast", "lunch", "dinner")]
    new["tags"] = [meal] + tags
    replace_in_library(library_file_for_rid(args.rid), args.rid, {k: v for k, v in new.items() if not k.startswith("_")})
    refresh_photo(args.rid, title, new["name"], new.get("_wikitext") or "", [])
    print(f"{args.rid}: {old.get('name')} -> {new['name']}")


if __name__ == "__main__":
    main()
