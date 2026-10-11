#!/usr/bin/env python3
"""Download a Wikimedia Commons file and write pantry-week/photos/r{id}.webp."""
from __future__ import annotations

import argparse
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "photos"
UA = "PantryWeekPhotoFix/3.3.1 (https://digitalundergroundstore.com)"


def commons_thumb(title: str) -> str:
    if not title.startswith("File:"):
        title = "File:" + title
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": 960,
        }
    )
    url = "https://commons.wikimedia.org/w/api.php?" + q
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = __import__("json").load(resp)
    page = next(iter(data.get("query", {}).get("pages", {}).values()), {})
    info = (page.get("imageinfo") or [{}])[0]
    return info.get("thumburl") or info.get("url") or ""


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("rid", help="e.g. r6")
    p.add_argument("commons_title", help="Commons file title")
    args = p.parse_args()
    url = commons_thumb(args.commons_title)
    if not url:
        raise SystemExit("no url for " + args.commons_title)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://commons.wikimedia.org/"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read()
    tmp = OUT / f"{args.rid}.src"
    tmp.write_bytes(raw)
    im = Image.open(tmp).convert("RGB")
    w, h = im.size
    if w > 800:
        im = im.resize((800, int(h * 800 / w)), Image.Resampling.LANCZOS)
    dest = OUT / f"{args.rid}.webp"
    im.save(dest, "WEBP", quality=82, method=6)
    tmp.unlink(missing_ok=True)
    print("wrote", dest, "from", args.commons_title)


if __name__ == "__main__":
    main()
