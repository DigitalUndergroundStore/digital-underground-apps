#!/usr/bin/env python3
"""Assign Openverse food photos with Referer header; WebP + photos-meta.json."""
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
WORK = ROOT / "work" / "photos"
META = ROOT / "scripts" / "photos-meta.json"
UA = "PantryWeekPhotoBot/3.2.2"

KEEP_GOOD = {
    "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r10", "r11", "r12", "r13", "r14", "r15",
    "r17", "r18", "r21", "r22", "r23", "r24", "r25", "r27", "r28", "r29", "r31", "r34",
    "r35", "r37", "r38", "r42", "r44", "r49", "r53", "r54", "r55", "r56", "r57", "r58",
    "r60", "r62", "r63", "r64", "r65", "r67", "r68", "r69", "r71", "r74", "r75", "r78",
    "r79", "r81", "r82", "r83", "r84", "r85", "r86", "r87", "r88", "r89", "r91", "r92",
    "r93", "r97", "r100", "r101", "r104", "r105", "r106", "r108", "r110", "r113", "r115",
    "r117", "r124",
}

BAD = re.compile(
    r"(coop|logo|map |diagram|portrait|selfie|storefront|building|street|wedding|"
    r"book cover|illustration|engraving|advertisement|lard|appendix|television|sitcom)",
    re.I,
)


def as_text(v) -> str:
    if isinstance(v, list):
        return " ".join(as_text(x) for x in v)
    return str(v or "")


def score(name: str, hit: dict) -> float:
    title = as_text(hit.get("title")) + " " + as_text(hit.get("tags"))
    if BAD.search(title):
        return -99
    rt = {w for w in re.sub(r"[^a-z0-9\s]", " ", name.lower()).split() if len(w) > 2}
    ht = set(re.sub(r"[^a-z0-9\s]", " ", title.lower()).split())
    return len(rt & ht) * 4.0


def search(q: str) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "q": q,
            "page_size": 20,
            "license_type": "commercial,modification",
            "source": "wikimedia,flickr,rawpixel",
        }
    )
    url = "https://api.openverse.org/v1/images/?" + params
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    return data.get("results") or []


def download(hit: dict, dest: Path) -> bool:
    url = hit.get("url")
    if not url:
        return False
    ref = hit.get("foreign_landing_url") or "https://openverse.org/"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": ref})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = resp.read()
    except Exception:
        return False
    if len(data) < 8000:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return True


def to_webp(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
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
    meta = json.loads(META.read_text()) if META.is_file() else {}
    used_urls = {m.get("image_url") for m in meta.values() if m.get("image_url")}
    for row in RECIPES:
        rid = row["id"]
        name = row["name"]
        webp = WORK / "webp" / f"{rid}.webp"
        if rid in KEEP_GOOD and webp.is_file():
            continue
        best = None
        best_sc = -1.0
        for q in [f"{name} food plate", f"{name} dish", name]:
            for hit in search(q):
                sc = score(name, hit)
                u = hit.get("url")
                if sc > best_sc and u and u not in used_urls:
                    best_sc = sc
                    best = hit
            time.sleep(0.4)
        if not best or best_sc < 4:
            print("MISS", rid, name)
            continue
        raw = WORK / "raw" / f"{rid}.jpg"
        if not download(best, raw):
            print("DLFAIL", rid)
            continue
        to_webp(raw, webp)
        used_urls.add(best.get("url"))
        meta[rid] = {
            "recipe": name,
            "title": best.get("title"),
            "source": best.get("source") or "Openverse",
            "source_url": best.get("foreign_landing_url"),
            "image_url": best.get("url"),
            "license": best.get("license"),
            "license_version": best.get("license_version"),
            "creator": best.get("creator"),
            "file": f"photos/{rid}.webp",
        }
        print("OK", rid, name, best_sc, (best.get("title") or "")[:50])
        time.sleep(0.5)
    META.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print("meta entries", len(meta))


if __name__ == "__main__":
    main()
