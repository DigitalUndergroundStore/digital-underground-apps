#!/usr/bin/env python3
"""Build Pantry Week recipes-batch2.js (r201–r248) from batch2-catalog.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = Path(__file__).resolve().parent / "batch2-catalog.json"
OUT = ROOT / "jhagho" / "js" / "recipes-batch2.js"


def load_catalog() -> list:
    return json.loads(CATALOG.read_text(encoding="utf-8"))


def write_recipes_batch2() -> int:
    catalog = load_catalog()
    if len(catalog) != 48:
        raise SystemExit(f"Expected 48 recipes, got {len(catalog)}")
    ids = [r["id"] for r in catalog]
    expected = [f"r{i}" for i in range(201, 249)]
    if ids != expected:
        raise SystemExit("Recipe ids must be r201 through r248 in order")
    payload = json.dumps(catalog, indent=2, ensure_ascii=False)
    lines = [
        "/* Pantry Week — batch 2 library r201–r248 */",
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
    n = write_recipes_batch2()
    print(f"Wrote {OUT} with {n} recipes")


if __name__ == "__main__":
    main()
