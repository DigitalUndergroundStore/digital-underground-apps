#!/usr/bin/env python3
"""Assign 126 unique Wikimedia Commons food thumbnails to recipes; write photos.js."""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "jhagho" / "js"
UA = "PantryWeek/3.2.1 (https://digitalunderground.store; recipe hero images)"

QUERIES = [
    "chicken dinner", "salmon fish plate", "pasta dish", "salad bowl food", "soup bowl",
    "rice bowl", "beef steak dinner", "vegetable stir fry", "tacos plate", "pizza slice",
    "scrambled eggs breakfast", "curry rice", "sandwich lunch", "chocolate dessert",
    "noodle bowl", "shrimp seafood", "lentil vegetarian", "mushroom risotto", "burger food",
    "sushi plate", "falafel", "hummus plate", "roast chicken", "grilled fish",
]

MANUAL_SLUG = {
    "r1": ("chicken lemon herb roasted", "chicken breast"),
    "r5": ("salmon", "grilled salmon"),
}


def load_recipes() -> list[dict]:
    import subprocess

    snippet = """
    const fs = require('fs');
    const vm = require('vm');
    const dir = process.argv[1];
    const ctx = {};
    for (const f of ['recipes.js', 'recipes-extra.js']) {
      vm.runInNewContext(fs.readFileSync(dir + '/' + f, 'utf8'), ctx);
    }
    console.log(JSON.stringify(ctx.PW_STARTERS.map(r => ({ id: r.id, name: r.name }))));
    """
    raw = subprocess.check_output(["node", "-e", snippet, str(JS)], text=True)
    rows = json.loads(raw)
    return rows


def fetch_pool() -> list[tuple[str, str]]:
    seen: set[str] = set()
    pool: list[tuple[str, str]] = []
    for q in QUERIES:
        params = urllib.parse.urlencode(
            {
                "action": "query",
                "generator": "search",
                "gsrsearch": q,
                "gsrnamespace": 6,
                "gsrlimit": 25,
                "prop": "imageinfo",
                "iiprop": "url",
                "iiurlwidth": 900,
                "format": "json",
            }
        )
        url = "https://commons.wikimedia.org/w/api.php?" + params
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.load(resp)
        for page in data.get("query", {}).get("pages", {}).values():
            title = page.get("title", "")
            if not title.startswith("File:"):
                continue
            tl = title.lower()
            if any(
                x in tl
                for x in (
                    "owid/",
                    "diagram",
                    "map ",
                    "breeding male",
                    "plate xx",
                    "illustration",
                    "logo",
                    "icon",
                )
            ):
                continue
            info = (page.get("imageinfo") or [{}])[0]
            thumb = info.get("thumburl") or info.get("url")
            if not thumb or thumb in seen:
                continue
            seen.add(thumb)
            pool.append((title, thumb))
    return pool


def tokens(text: str) -> set[str]:
    return {w for w in re.sub(r"[^a-z0-9\s]", " ", text.lower()).split() if len(w) > 2}


def score_recipe(title: str, recipe_name: str) -> float:
    rt = tokens(title)
    nt = tokens(recipe_name)
    if not nt:
        return 0.0
    overlap = len(rt & nt)
    bonus = 0.0
    for word in ("chicken", "salmon", "pasta", "salad", "soup", "rice", "taco", "egg", "curry", "beef", "fish"):
        if word in nt and word in rt:
            bonus += 2.0
    return overlap * 3.0 + bonus


def assign(recipes: list[dict], pool: list[tuple[str, str]]) -> dict[str, str]:
    used_urls: set[str] = set()
    out: dict[str, str] = {}
    for rid, queries in MANUAL_SLUG.items():
        best_url = ""
        best_score = -1.0
        for title, url in pool:
            if url in used_urls:
                continue
            for q in queries:
                sc = score_recipe(title, q)
                if sc > best_score:
                    best_score = sc
                    best_url = url
        if best_url:
            out[rid] = best_url
            used_urls.add(best_url)

    for recipe in recipes:
        rid = recipe["id"]
        if rid in out:
            continue
        name = recipe["name"]
        best_url = ""
        best_score = -1.0
        for title, url in pool:
            if url in used_urls:
                continue
            sc = score_recipe(title, name) + (hash(rid + title) % 100) / 500.0
            if sc > best_score:
                best_score = sc
                best_url = url
        if not best_url:
            for title, url in pool:
                if url not in used_urls:
                    best_url = url
                    break
        if not best_url:
            raise SystemExit(f"ran out of images at {rid}")
        out[rid] = best_url
        used_urls.add(best_url)
    return out


def write_photos_js(mapping: dict[str, str]) -> None:
    lines = [
        "/* Per-recipe food photography (Wikimedia Commons). Offline: CSS gradient fallback. */",
        '"use strict";',
        "(function () {",
        "  var BY_ID = {",
    ]
    for i in range(1, 127):
        rid = f"r{i}"
        url = mapping.get(rid, "")
        lines.append(f'  "{rid}": "{url}",')
    lines += [
        "};",
        "  function urlFor(name, id) {",
        "    if (id && BY_ID[id]) return BY_ID[id];",
        '    var t = String(name || "").toLowerCase();',
        '    if (t.indexOf("salmon") >= 0) return BY_ID.r5 || "";',
        '    if (t.indexOf("chicken") >= 0) return BY_ID.r1 || "";',
        '    return BY_ID.r37 || "";',
        "  }",
        "  window.PW_PHOTOS = { urlFor: urlFor, byId: BY_ID };",
        "})();",
        "",
    ]
    (JS / "photos.js").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    recipes = load_recipes()
    if len(recipes) != 126:
        raise SystemExit(f"expected 126 recipes, got {len(recipes)}")
    pool = fetch_pool()
    if len(pool) < 126:
        raise SystemExit(f"need 126 pool images, got {len(pool)}")
    mapping = assign(recipes, pool)
    if len(set(mapping.values())) != 126:
        raise SystemExit("duplicate urls in mapping")
    overrides = ROOT / "scripts" / "recipe-photo-overrides.json"
    overrides.write_text(json.dumps(mapping, indent=2) + "\n", encoding="utf-8")
    write_photos_js(mapping)
    print(f"Wrote photos.js and overrides with {len(mapping)} unique URLs (pool {len(pool)})")


if __name__ == "__main__":
    main()
