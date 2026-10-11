#!/usr/bin/env python3
"""Generate hosted photos.js with local WebP paths and Smart Chef keys."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
OUT = ROOT / "jhagho" / "js" / "photos.js"
SC_META = SCRIPTS / "smart-chef-photos-meta.json"
HOSTED_PHOTOS = ROOT / "jhagho" / "photos"

_spec = importlib.util.spec_from_file_location("lar", SCRIPTS / "load-all-recipes.py")
lar = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(lar)


def main() -> None:
    recipes = lar.load_all_recipes()
    by_id: dict[str, str] = {}
    for row in recipes:
        rid = row["id"]
        rel = f"photos/{rid}.webp"
        webp = HOSTED_PHOTOS / f"{rid}.webp"
        if webp.is_file():
            by_id[rid] = rel

    sc_by_key: dict[str, str] = {}
    if SC_META.is_file():
        for entry in json.loads(SC_META.read_text(encoding="utf-8")):
            key = entry.get("key")
            file = entry.get("file")
            if key and file:
                sc_by_key[key] = file

    lines = [
        "/* Per-recipe food photography (hosted WebP). Offline: CSS gradient fallback. */",
        '"use strict";',
        "(function () {",
        "  var BY_ID = " + json.dumps(by_id, indent=2) + ";",
        "  var SC_BY_KEY = " + json.dumps(sc_by_key, indent=2) + ";",
        "  function baseUrl() {",
        "    var b = typeof window !== 'undefined' && window.PW_PHOTO_BASE;",
        "    if (typeof b === 'string' && b) return b.replace(/\\/?$/, '/');",
        "    return '';",
        "  }",
        "  function resolvePath(rel) {",
        "    if (!rel) return '';",
        "    if (/^https?:\\/\\//i.test(rel)) return rel;",
        "    return baseUrl() + rel;",
        "  }",
        "  function urlFor(recipeOrName, legacyId) {",
        "    var recipe = recipeOrName && typeof recipeOrName === 'object' ? recipeOrName : null;",
        "    var id = recipe ? recipe.id : legacyId;",
        "    var name = recipe ? recipe.name : recipeOrName;",
        "    if (recipe && recipe.photoKey && SC_BY_KEY[recipe.photoKey]) {",
        "      return resolvePath(SC_BY_KEY[recipe.photoKey]);",
        "    }",
        "    if (id && BY_ID[id]) return resolvePath(BY_ID[id]);",
        "    var t = String(name || '').toLowerCase();",
        "    if (t.indexOf('salmon') >= 0 && BY_ID.r5) return resolvePath(BY_ID.r5);",
        "    if (t.indexOf('chicken') >= 0 && BY_ID.r1) return resolvePath(BY_ID.r1);",
        "    if (BY_ID.r37) return resolvePath(BY_ID.r37);",
        "    return '';",
        "  }",
        "  window.PW_PHOTOS = { urlFor: urlFor, byId: BY_ID, smartChefByKey: SC_BY_KEY };",
        "})();",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} with {len(by_id)} recipe photos, {len(sc_by_key)} smart-chef keys")


if __name__ == "__main__":
    main()
