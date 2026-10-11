#!/usr/bin/env python3
"""Search Wikimedia Commons, download candidates, emit WebP + metadata for Pantry Week."""
from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "jhagho" / "js"
RECIPES = json.loads((ROOT / "scripts" / "recipes-index.json").read_text())
WORK = ROOT / "work" / "photos"
META_PATH = ROOT / "scripts" / "photos-meta.json"
UA = "PantryWeekPhotoBot/3.2.2 (https://digitalundergroundstore.com; mailto:digitalunderground.store@proton.me)"

SKIP_TITLE = re.compile(
    r"(owid/|diagram|map |logo|icon|breeding|illustration|portrait|selfie|"
    r"restaurant exterior|storefront|street view|holding|person|man |woman |"
    r"raw meat|uncooked|butcher|slaughter|live animal)",
    re.I,
)


def api(params: dict) -> dict:
    q = urllib.parse.urlencode({**params, "format": "json"})
    url = "https://commons.wikimedia.org/w/api.php?" + q
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def search_files(query: str, limit: int = 12) -> list[dict]:
    data = api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": limit,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata|mime",
            "iiurlwidth": 960,
        }
    )
    out = []
    for page in data.get("query", {}).get("pages", {}).values():
        title = page.get("title", "")
        if not title.startswith("File:"):
            continue
        if SKIP_TITLE.search(title):
            continue
        info = (page.get("imageinfo") or [{}])[0]
        mime = info.get("mime", "")
        if mime and not mime.startswith("image/"):
            continue
        thumb = info.get("thumburl") or info.get("url")
        if not thumb:
            continue
        meta = info.get("extmetadata") or {}
        license = (meta.get("LicenseShortName") or {}).get("value", "")
        artist = (meta.get("Artist") or {}).get("value", "")
        credit = (meta.get("Credit") or {}).get("value", "")
        out.append(
            {
                "title": title,
                "thumb": thumb,
                "license": license,
                "artist": artist,
                "credit": credit,
            }
        )
    return out


def dish_query(name: str) -> str:
    n = name.lower()
    n = re.sub(r"\s*&\s*", " and ", n)
    extra = " food dish plate cooked meal"
    replacements = [
        (r"sheet pan", " sheet pan dinner baked"),
        (r"skillet", " skillet dinner food"),
        (r"bowl", " bowl food"),
        (r"overnight oats", "overnight oats breakfast jar"),
        (r"pancakes", " pancakes stack breakfast"),
        (r"fried rice", " fried rice chinese plate"),
        (r"taco", " tacos plate"),
        (r"shrimp", " shrimp seafood cooked"),
        (r"salmon", " salmon fillet cooked"),
        (r"chicken", " chicken cooked plated"),
        (r"pasta", " pasta plated"),
        (r"soup", " soup bowl"),
        (r"salad", " salad bowl"),
        (r"stir fry", " stir fry wok"),
        (r"curry", " curry rice bowl"),
        (r"burger", " burger plate"),
        (r"pizza", " pizza slice"),
        (r"eggs", " eggs breakfast plate"),
        (r"toast", " toast breakfast plate"),
        (r"grain bowl", " grain bowl food"),
        (r"chickpea", " chickpea bowl"),
    ]
    q = n
    for pat, rep in replacements:
        if re.search(pat, q):
            q = re.sub(pat, rep, q, count=1)
            break
    return q + extra


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as resp:
        dest.write_bytes(resp.read())


def to_webp(src: Path, dest: Path, width: int = 800) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    script = f"""
from PIL import Image
im = Image.open({repr(str(src))})
im = im.convert("RGB")
w, h = im.size
if w > {width}:
    im = im.resize(({width}, int(h * {width} / w)), Image.Resampling.LANCZOS)
im.save({repr(str(dest))}, "WEBP", quality=82, method=6)
"""
    subprocess.check_call(["python3", "-c", script])


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    meta: dict = {}
    used_titles: set[str] = set()

    for row in RECIPES:
        rid = row["id"]
        name = row["name"]
        queries = [dish_query(name), f"{name} food", f"{name} recipe"]
        picked = None
        for qi, query in enumerate(queries):
            if picked:
                break
            try:
                files = search_files(query)
            except Exception as e:
                print("search fail", rid, query, e)
                time.sleep(1)
                continue
            for f in files:
                if f["title"] in used_titles:
                    continue
                picked = f
                break
            time.sleep(0.15)
        if not picked:
            print("NO IMAGE", rid, name)
            continue
        used_titles.add(picked["title"])
        raw = WORK / "raw" / f"{rid}.jpg"
        webp = WORK / "webp" / f"{rid}.webp"
        try:
            download(picked["thumb"], raw)
            to_webp(raw, webp)
        except Exception as e:
            print("download fail", rid, e)
            continue
        meta[rid] = {
            "recipe": name,
            "commons_title": picked["title"],
            "source_url": picked["thumb"],
            "license": picked["license"],
            "artist": picked["artist"],
            "credit": picked["credit"],
            "file": f"photos/{rid}.webp",
        }
        print("ok", rid, name, "->", picked["title"][:60])

    META_PATH.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print("meta", len(meta), "of", len(RECIPES))


if __name__ == "__main__":
    main()
