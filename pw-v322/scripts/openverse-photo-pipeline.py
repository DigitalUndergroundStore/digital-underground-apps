#!/usr/bin/env python3
"""Fetch CC-licensed food photos from Openverse; score by title; export WebP + metadata."""
from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECIPES = json.loads((ROOT / "scripts" / "recipes-index.json").read_text())
WORK = ROOT / "work" / "photos"
META_PATH = ROOT / "scripts" / "photos-meta.json"
UA = "PantryWeekPhotoBot/3.2.2 (https://digitalundergroundstore.com)"

BAD = re.compile(
    r"(coop|hen\b|rooster|farm|field|logo|icon|map|diagram|book|djvu|"
    r"restaurant front|storefront|street|building|holding|selfie|portrait|"
    r"raw meat|butcher|slaughter|live |person|people|man |woman |child|"
    r"ingredients only|grocery|supermarket|packaging)",
    re.I,
)
STOP = {
    "and", "the", "with", "for", "pan", "sheet", "skillet", "bowl", "bowls",
    "easy", "quick", "simple", "classic", "homemade", "style", "baked",
}


def tokens(s: str) -> set[str]:
    return {w for w in re.sub(r"[^a-z0-9\s]", " ", s.lower()).split() if len(w) > 2 and w not in STOP}


def search(query: str, page_size: int = 20) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "q": query,
            "page_size": page_size,
            "license_type": "commercial,modification",
            "source": "wikimedia,flickr,rawpixel",
        }
    )
    url = "https://api.openverse.org/v1/images/?" + params
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    return data.get("results") or []


def as_text(val) -> str:
    if val is None:
        return ""
    if isinstance(val, list):
        return " ".join(as_text(x) for x in val)
    if isinstance(val, dict):
        return " ".join(as_text(v) for v in val.values())
    return str(val)


def score_result(recipe_name: str, hit: dict) -> float:
    title = as_text(hit.get("title")) + " " + as_text(hit.get("tags"))
    if BAD.search(title):
        return -999.0
    rt = tokens(recipe_name)
    ht = tokens(title)
    if not rt:
        return 0.0
    overlap = len(rt & ht)
    s = overlap * 4.0
    if overlap == len(rt):
        s += 3.0
    w = list(rt)[0] if rt else ""
    if w and w in title.lower():
        s += 2.0
    if "food" in title.lower() or "dish" in title.lower() or "plate" in title.lower():
        s += 1.0
    return s


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
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


def pick_for_recipe(name: str) -> dict | None:
    queries = [
        f"{name} food plate",
        f"{name} dish cooked",
        name,
    ]
    best = None
    best_score = -1.0
    seen_urls = set()
    for q in queries:
        try:
            hits = search(q)
        except Exception:
            time.sleep(0.5)
            continue
        for hit in hits:
            url = hit.get("url")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            sc = score_result(name, hit)
            if sc > best_score:
                best_score = sc
                best = hit
        time.sleep(0.2)
    if best_score < 4.0:
        return None
    return best


def main() -> None:
    meta: dict = {}
    used: set[str] = set()
    for row in RECIPES:
        rid = row["id"]
        name = row["name"]
        hit = pick_for_recipe(name)
        if not hit:
            print("MISSING", rid, name)
            continue
        url = hit["url"]
        if url in used:
            print("DUP URL skip", rid)
            continue
        used.add(url)
        raw = WORK / "raw" / f"{rid}.jpg"
        webp = WORK / "webp" / f"{rid}.webp"
        try:
            download(url, raw)
            to_webp(raw, webp)
        except Exception as e:
            print("FAIL", rid, e)
            continue
        meta[rid] = {
            "recipe": name,
            "title": hit.get("title"),
            "source": hit.get("source"),
            "source_url": hit.get("foreign_landing_url") or url,
            "image_url": url,
            "license": hit.get("license"),
            "license_version": hit.get("license_version"),
            "creator": hit.get("creator"),
            "file": f"photos/{rid}.webp",
        }
        print("OK", rid, name, "->", (hit.get("title") or "")[:50], "score", score_result(name, hit))
    META_PATH.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print("done", len(meta), "/", len(RECIPES))


if __name__ == "__main__":
    main()
