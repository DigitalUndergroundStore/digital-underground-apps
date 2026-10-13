#!/usr/bin/env python3
"""Fast bootstrap plan_meal_titles.json with plan-eligible Wikibooks meals."""
from __future__ import annotations

import json
import time
from pathlib import Path

from build_ca_us_strict2 import API, BAD, SEARCH_QUERIES, seed_existing
from build_plan_meal_titles import EXTRA_QUERIES, NOT_MEAL, OUT, SKIP_TITLE
from ca_us_swap_pass import POOL_REJECT, infer_meal
from plan_meal_swap_pass import acceptable_replacement
from remap_premium_pass import api, recipe_from_wikitext

QUERIES = list(dict.fromkeys(SEARCH_QUERIES + EXTRA_QUERIES))


def main() -> None:
    existing_names, existing_urls = seed_existing()
    entries: list[dict] = []
    if OUT.is_file():
        entries = json.loads(OUT.read_text(encoding="utf-8"))
    seen = {e["title"] for e in entries}
    for q in QUERIES:
        if len(entries) >= 115:
            break
        try:
            data = api(
                API,
                {
                    "action": "query",
                    "list": "search",
                    "srsearch": q,
                    "srnamespace": 102,
                    "srlimit": 40,
                },
            )
        except Exception as exc:
            print("search err", q, exc, flush=True)
            time.sleep(8)
            continue
        for hit in data.get("query", {}).get("search", []):
            if len(entries) >= 115:
                break
            title = hit.get("title", "")
            if not title.startswith("Cookbook:") or SKIP_TITLE.search(title) or title in seen:
                continue
            seen.add(title)
            if POOL_REJECT.search(title) or BAD.search(title) or NOT_MEAL.search(title):
                continue
            time.sleep(0.45)
            recipe = recipe_from_wikitext(title, "r999", existing_names)
            if not recipe or not acceptable_replacement(recipe):
                continue
            blob = title + " " + recipe["name"]
            if NOT_MEAL.search(blob):
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
        time.sleep(0.15)
    print(f"done {len(entries)}", flush=True)
    if len(entries) < 80:
        raise SystemExit(f"only {len(entries)} entries (need 80+)")


if __name__ == "__main__":
    main()
