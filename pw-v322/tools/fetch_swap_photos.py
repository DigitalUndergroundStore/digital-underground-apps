#!/usr/bin/env python3
"""Download unique Wikimedia Commons food photos for classic-swap recipe IDs."""
from __future__ import annotations

import io
import json
import pathlib
import re
import sys
import urllib.parse

import requests
from PIL import Image

API = "https://commons.wikimedia.org/w/api.php"
OUT = pathlib.Path(__file__).resolve().parents[2] / "pantry-week" / "photos"

# Curated search terms per recipe (tuned for Commons food photography).
SWAPS: dict[str, str] = {
    "r3": "cheeseburger food",
    "r17": "spaghetti bolognese",
    "r28": "lasagna baked",
    "r37": "beef stir fry",
    "r46": "breakfast burrito",
    "r47": "cincinnati chili",
    "r51": "barbecue baby back ribs",
    "r66": "pork chop mashed potatoes",
    "r69": "grilled cheese tomato soup",
    "r70": "sloppy joe sandwich",
    "r75": "roast chicken dinner",
    "r76": "shepherds pie casserole",
    "r99": "chicken noodle soup",
    "r101": "chicken rice pilaf",
    "r126": "bangers and mash",
    "r188": "ground beef tacos",
    "r192": "enchiladas rojas",
    "r196": "chicken fajitas",
    "r200": "pork fried rice",
    "r227": "tuna casserole",
    "r232": "southern fried chicken plate",
    "r236": "denver omelette",
    "r240": "waffles breakfast",
    "r241": "grilled salmon",
    "r248": "club sandwich",
}

SKIP_TITLE = re.compile(
    r"(logo|icon|diagram|map|chart|ingredient|packaging|restaurant exterior|"
    r"menu|advertisement|cartoon|drawing|svg|seal|flag)",
    re.I,
)


def commons_search(query: str, limit: int = 12) -> list[str]:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": "6",
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|mime|extmetadata",
        "iiurlwidth": "900",
    }
    r = requests.get(
        API,
        params=params,
        timeout=60,
        headers={"User-Agent": "PantryWeekPhotoBot/1.0 (Digital Underground; recipe QC)"},
    )
    r.raise_for_status()
    data = r.json()
    pages = data.get("query", {}).get("pages", {})
    hits: list[tuple[int, str, str]] = []
    for page in pages.values():
        title = page.get("title", "")
        if SKIP_TITLE.search(title):
            continue
        info = (page.get("imageinfo") or [{}])[0]
        mime = info.get("mime", "")
        if not mime.startswith("image/"):
            continue
        url = info.get("thumburl") or info.get("url")
        if not url:
            continue
        meta = info.get("extmetadata") or {}
        lic = (meta.get("LicenseShortName") or {}).get("value", "")
        if lic and not any(
            x in lic.lower()
            for x in ("cc", "public domain", "gfdl", "free art")
        ):
            continue
        hits.append((page.get("index", 999), title, url))
    hits.sort(key=lambda x: x[0])
    return [h[2] for h in hits]


def to_webp(url: str, dest: pathlib.Path) -> None:
    r = requests.get(url, timeout=90, headers={"User-Agent": "PantryWeekPhotoBot/1.0"})
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert("RGB")
    w, h = img.size
    if max(w, h) > 1024:
        img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=82, method=6)


def main() -> None:
    used_urls: set[str] = set()
    report = []
    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    for rid, query in SWAPS.items():
        if only and rid not in only:
            continue
        dest = OUT / f"{rid}.webp"
        chosen = None
        for url in commons_search(query):
            if url in used_urls:
                continue
            try:
                to_webp(url, dest)
                used_urls.add(url)
                chosen = url
                break
            except Exception as exc:  # noqa: BLE001
                report.append(f"{rid}: skip {exc}")
        if not chosen:
            print(f"FAILED {rid}", file=sys.stderr)
            sys.exit(1)
        report.append(f"{rid}: ok {chosen}")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
