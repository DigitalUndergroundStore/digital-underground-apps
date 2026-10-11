#!/usr/bin/env python3
"""Load recipe id/name list from index + batch catalogs."""
from __future__ import annotations

import json
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def load_all_recipes() -> list[dict]:
    rows = json.loads((SCRIPTS / "recipes-index.json").read_text(encoding="utf-8"))
    for name in ("batch1-catalog.json", "batch2-catalog.json"):
        path = SCRIPTS / name
        if path.is_file():
            for r in json.loads(path.read_text(encoding="utf-8")):
                rows.append({"id": r["id"], "name": r["name"]})
    return rows


if __name__ == "__main__":
    recipes = load_all_recipes()
    print(len(recipes), recipes[0]["id"], recipes[-1]["id"])
