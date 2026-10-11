#!/usr/bin/env python3
"""Build photos.js from recipe-photo-overrides.json (126 unique, HTTP-verified)."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "jhagho" / "js" / "photos.js"
MAP_JSON = Path(__file__).resolve().parent / "recipe-photo-overrides.json"


def url_for(slug: str) -> str:
    return f"https://images.unsplash.com/photo-{slug}?w=900&q=80&auto=format&fit=crop"


def verify(url: str) -> bool:
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as resp:
            return 200 <= resp.status < 400
    except Exception:
        try:
            with urllib.request.urlopen(url, timeout=20) as resp:
                return 200 <= resp.getcode() < 400
        except Exception:
            return False


def main() -> None:
    assign: dict[str, str] = json.loads(MAP_JSON.read_text(encoding="utf-8"))
    if len(assign) != 126:
        raise SystemExit(f"Expected 126 overrides, got {len(assign)}")
    slugs = list(assign.values())
    if len(set(slugs)) != 126:
        raise SystemExit(f"Duplicate slugs: {len(slugs)} entries, {len(set(slugs))} unique")
    bad = [rid for rid, slug in assign.items() if not verify(url_for(slug))]
    if bad:
        raise SystemExit(f"HTTP verify failed for {len(bad)} recipes, e.g. {bad[:5]}")

    lines = [
        "/* Per-recipe food photography (Unsplash). Matched by recipe id; verified HTTP 200. */",
        '"use strict";',
        "(function () {",
        "  var BY_ID = {",
    ]
    for rid in sorted(assign.keys(), key=lambda x: int(x[1:])):
        lines.append(f'    "{rid}": "{url_for(assign[rid])}",')
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
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
