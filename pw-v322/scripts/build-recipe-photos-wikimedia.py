#!/usr/bin/env python3
"""Assign one unique Wikimedia Commons food image per recipe (126), write photos.js."""
from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "jhagho" / "js" / "photos.js"
API = "https://commons.wikimedia.org/w/api.php"


def load_recipes() -> list[dict]:
    raw = subprocess.check_output(
        [
            "node",
            "-e",
            """
const fs=require('fs');const vm=require('vm');const ctx={};
vm.runInNewContext(fs.readFileSync('/workspace/jhagho-work/jhagho/js/recipes.js','utf8'),ctx);
vm.runInNewContext(fs.readFileSync('/workspace/jhagho-work/jhagho/js/recipes-extra.js','utf8'),ctx);
process.stdout.write(JSON.stringify(ctx.PW_STARTERS.map(r=>({id:r.id,name:r.name}))));
""",
        ],
        text=True,
    )
    return json.loads(raw)


def search_image(query: str) -> str | None:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"{query} food dish",
        "gsrlimit": "8",
        "gsrnamespace": "6",
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": "900",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=25) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        thumb = info.get("thumburl") or info.get("url")
        if thumb and thumb.startswith("https://"):
            return thumb
    return None


def main() -> None:
    recipes = load_recipes()
    used: set[str] = set()
    assign: dict[str, str] = {}
    for recipe in recipes:
        q = re.sub(r"[^\w\s]", " ", recipe["name"]).strip()
        url = search_image(q)
        if not url or url in used:
            url = search_image(q.split()[0] if q else "meal")
        if not url or url in used:
            for fallback in ("home cooking plate", "restaurant meal", "cooked dinner"):
                url = search_image(fallback)
                if url and url not in used:
                    break
        if not url or url in used:
            raise SystemExit(f"Could not find unique image for {recipe['id']} {recipe['name']}")
        assign[recipe["id"]] = url
        used.add(url)
        time.sleep(0.15)

    lines = [
        "/* Per-recipe food photography (Wikimedia Commons). One unique image per recipe id. */",
        '"use strict";',
        "(function () {",
        "  var BY_ID = {",
    ]
    for rid in sorted(assign.keys(), key=lambda x: int(x[1:])):
        lines.append(f'    "{rid}": "{assign[rid]}",')
    lines += [
        "  };",
        "  function urlFor(name, id) {",
        "    if (id && BY_ID[id]) return BY_ID[id];",
        '    return BY_ID.r1 || "";',
        "  }",
        "  window.PW_PHOTOS = { urlFor: urlFor, byId: BY_ID };",
        "})();",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} with {len(assign)} unique URLs")


if __name__ == "__main__":
    main()
