#!/usr/bin/env python3
"""Pick Wikimedia food files by title token match; download WebP; write photos-meta.json."""
from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECIPES = json.loads((ROOT / "scripts" / "recipes-index.json").read_text())
ASSIGN = ROOT / "scripts" / "photo-assignments.json"
WORK = ROOT / "work" / "photos"
META = ROOT / "scripts" / "photos-meta.json"
UA = "PantryWeekPhotoBot/3.2.2 (https://digitalundergroundstore.com)"

SKIP = re.compile(
    r"(djvu|\.pdf|cookbook|book cover|logo|icon|map |diagram|illustration|"
    r"restaurant exterior|storefront|street view|building facade|"
    r"portrait|selfie|wedding|holding|person|people|man |woman |child|"
    r"raw chicken|raw meat|butcher|slaughter|live animal|coop|farm field)",
    re.I,
)
STOP = {"and", "the", "with", "for", "pan", "sheet", "skillet", "easy", "quick", "simple", "bowl", "bowls"}


def tokens(s: str) -> set[str]:
    return {w for w in re.sub(r"[^a-z0-9\s]", " ", s.lower()).split() if len(w) > 2 and w not in STOP}


def api(params: dict) -> dict:
    q = urllib.parse.urlencode({**params, "format": "json"})
    url = "https://commons.wikimedia.org/w/api.php?" + q
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def file_info(title: str) -> dict | None:
    data = api(
        {
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata|mime",
            "iiurlwidth": 960,
        }
    )
    pages = data.get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    if page.get("missing"):
        return None
    info = (page.get("imageinfo") or [{}])[0]
    if not str(info.get("mime", "")).startswith("image/"):
        return None
    meta = info.get("extmetadata") or {}
    return {
        "title": title,
        "thumb": info.get("thumburl") or info.get("url"),
        "license": (meta.get("LicenseShortName") or {}).get("value", ""),
        "artist": (meta.get("Artist") or {}).get("value", ""),
        "credit": (meta.get("Credit") or {}).get("value", ""),
    }


def search(name: str, limit: int = 40) -> list[str]:
    q = name.replace("&", " and ")
    queries = [
        f"{q} food dish",
        f"{q} plate",
        f"{q} meal",
        q,
    ]
    titles: list[str] = []
    seen: set[str] = set()
    for query in queries:
        data = api(
            {
                "action": "query",
                "generator": "search",
                "gsrsearch": query,
                "gsrnamespace": 6,
                "gsrlimit": limit,
            }
        )
        for page in data.get("query", {}).get("pages", {}).values():
            t = page.get("title", "")
            if t.startswith("File:") and t not in seen:
                seen.add(t)
                titles.append(t)
        time.sleep(0.12)
    return titles


def title_score(recipe: str, file_title: str) -> float:
    if SKIP.search(file_title):
        return -1.0
    rt = tokens(recipe)
    ft = tokens(file_title.replace("File:", ""))
    if not rt or not ft:
        return 0.0
    overlap = rt & ft
    if len(overlap) < 2 and not (len(rt) == 1 and overlap):
        return 0.0
    return len(overlap) * 5.0 + (3.0 if len(overlap) >= min(3, len(rt)) else 0)


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def to_webp(src: Path, dest: Path, width: int = 800) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        [
            "python3",
            "-c",
            f"""
from PIL import Image
im = Image.open({repr(str(src))}).convert("RGB")
w,h=im.size
W={width}
if w>W: im=im.resize((W,int(h*W/w)), Image.Resampling.LANCZOS)
im.save({repr(str(dest))}, "WEBP", quality=82, method=6)
""",
        ]
    )


def main() -> None:
    manual = {}
    if ASSIGN.is_file():
        manual = json.loads(ASSIGN.read_text())
    used: set[str] = set()
    meta: dict = {}
    missing: list[str] = []

    for row in RECIPES:
        rid = row["id"]
        name = row["name"]
        pick_title = manual.get(rid)
        info = None
        if pick_title:
            info = file_info(pick_title if pick_title.startswith("File:") else f"File:{pick_title}")
        if not info:
            best_t = ""
            best_s = 0.0
            for t in search(name):
                if t in used:
                    continue
                s = title_score(name, t)
                if s > best_s:
                    best_s = s
                    best_t = t
            if best_s >= 8.0:
                pick_title = best_t
                info = file_info(pick_title)
        if not info or not info.get("thumb"):
            missing.append(rid)
            print("MISSING", rid, name)
            continue
        if pick_title in used:
            missing.append(rid)
            print("DUP TITLE", rid, name)
            continue
        used.add(pick_title)
        raw = WORK / "raw" / f"{rid}.jpg"
        webp = WORK / "webp" / f"{rid}.webp"
        try:
            download(info["thumb"], raw)
            to_webp(raw, webp)
        except Exception as e:
            missing.append(rid)
            print("FAIL DL", rid, e)
            continue
        meta[rid] = {
            "recipe": name,
            "commons_title": pick_title,
            "source": "Wikimedia Commons",
            "source_url": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(pick_title.replace(' ', '_'))}",
            "image_url": info["thumb"],
            "license": info["license"],
            "artist": info["artist"],
            "credit": info["credit"],
            "file": f"photos/{rid}.webp",
        }
        print("OK", rid, name, "->", pick_title[:70])

    META.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print("meta", len(meta), "missing", len(missing), missing[:20])


if __name__ == "__main__":
    main()
