#!/usr/bin/env python3
"""Build Pantry Week recipes-batch1.js (r127–r200) from batch1-catalog.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = Path(__file__).resolve().parent / "batch1-catalog.json"
OUT = ROOT / "jhagho" / "js" / "recipes-batch1.js"


def load_catalog() -> list:
    return json.loads(CATALOG.read_text(encoding="utf-8"))


def write_recipes_batch1() -> int:
    catalog = load_catalog()
    if len(catalog) != 74:
        raise SystemExit(f"Expected 74 recipes, got {len(catalog)}")
    ids = [r["id"] for r in catalog]
    expected = [f"r{i}" for i in range(127, 201)]
    if ids != expected:
        raise SystemExit("Recipe ids must be r127 through r200 in order")
    payload = json.dumps(catalog, indent=2, ensure_ascii=False)
    lines = [
        "/* Pantry Week — batch 1 library r127–r200 */",
        '"use strict";',
        "(function () {",
        "  if (typeof PW_STARTERS === 'undefined') return;",
        "  var extra = " + payload + ";",
        "  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);",
        "})();",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    return len(catalog)


def main() -> None:
    n = write_recipes_batch1()
    print(f"Wrote {OUT} with {n} recipes")


if __name__ == "__main__":
    main()
