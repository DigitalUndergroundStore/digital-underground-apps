#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parents[1]
WORK = ROOT / "work" / "photos"
META = ROOT / "scripts" / "photos-meta.json"
UA = "PantryWeekPhotoBot/3.2.2"

# Curated Wikimedia File: titles (food photos)
FINAL: dict[str, str] = {
    "r8": "File:Caprese Salad with Chicken.jpg",
    "r16": "File:Loaded baked potato with cheese and bacon.jpg",
    "r36": "File:White beans in tomato sauce.jpg",
    "r41": "File:Korean beef bulgogi.jpg",
    "r43": "File:Caprese Panini (cropped).jpg",
    "r46": "File:Roasted cauliflower 1.jpg",
    "r47": "File:Breakfast burrito bowl.jpg",
    "r51": "File:Ethiopian food - Misir Wot (red lentils) (13831400804).jpg",
    "r52": "File:Jerk Chicken (8673496021).jpg",
    "r70": "File:Ahi Poke Bowl (8671967892).jpg",
    "r76": "File:Cuban Mojo Chicken with Rice and Beans.jpg",
    "r94": "File:Berry chia seed pudding.jpg",
    "r98": "File:Energy balls with dates and almonds.jpg",
    "r99": "File:Mango smoothie bowl.jpg",
    "r102": "File:Lamb kofta with tzatziki.jpg",
    "r103": "File:Hummus wrap with roasted peppers.jpg",
    "r112": "File:BBQ chicken flatbread pizza.jpg",
    "r116": "File:Chicken tikka wraps.jpg",
    "r118": "File:Broccoli cheddar frittata.jpg",
    "r120": "File:Garlic butter steak bites.jpg",
    "r123": "File:Flatbread with goat cheese and grapes.jpg",
    "r125": "File:Pear compote with cinnamon.jpg",
}


def file_info(title: str) -> dict | None:
    params = urllib.parse.urlencode(
        {"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 960, "format": "json"}
    )
    for attempt in range(5):
        try:
            req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + params, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.load(resp)
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(12)
                continue
            raise
    page = next(iter(data["query"]["pages"].values()))
    if page.get("missing"):
        return None
    info = (page.get("imageinfo") or [{}])[0]
    meta = info.get("extmetadata") or {}
    return {
        "thumb": info.get("thumburl") or info.get("url"),
        "license": (meta.get("LicenseShortName") or {}).get("value", ""),
        "artist": (meta.get("Artist") or {}).get("value", ""),
        "credit": (meta.get("Credit") or {}).get("value", ""),
    }


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def to_webp(src: Path, dest: Path) -> None:
    subprocess.check_call(
        [
            "python3",
            "-c",
            f"""
from PIL import Image
im=Image.open({repr(str(src))}).convert('RGB')
w,h=im.size
W=800
if w>W: im=im.resize((W,int(h*W/w)), Image.Resampling.LANCZOS)
im.save({repr(str(dest))}, 'WEBP', quality=82, method=6)
""",
        ]
    )


def main() -> None:
    recipes = {r["id"]: r["name"] for r in json.loads((ROOT / "scripts" / "recipes-index.json").read_text())}
    meta = json.loads(META.read_text()) if META.is_file() else {}
    for rid, title in FINAL.items():
        webp = WORK / "webp" / f"{rid}.webp"
        if webp.is_file():
            continue
        info = file_info(title)
        if not info or not info.get("thumb"):
            print("NO FILE", rid, title)
            # fallback search
            continue
        raw = WORK / "raw" / f"{rid}.jpg"
        download(info["thumb"], raw)
        to_webp(raw, webp)
        meta[rid] = {
            "recipe": recipes.get(rid, ""),
            "commons_title": title,
            "source": "Wikimedia Commons",
            "source_url": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
            "image_url": info["thumb"],
            "license": info["license"],
            "artist": info["artist"],
            "credit": info["credit"],
            "file": f"photos/{rid}.webp",
        }
        print("OK", rid, title)
        time.sleep(2)
    META.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
