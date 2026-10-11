#!/usr/bin/env python3
"""Fetch Commons photos for recipe ids, write WebP to work + hosted paths."""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import shutil
import time
import urllib.parse
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
WORK = ROOT / "work" / "photos"
META_PATH = SCRIPTS / "photos-meta.json"
ASSIGN = SCRIPTS / "photo-assignments.json"
HOSTED = [
    ROOT / "jhagho" / "photos",
    ROOT.parent / "pantry-week" / "photos",
]
FIX_OVERRIDES = {
    "r19": "File:Gnocchi with pesto (3269919059).jpg",
    "r22": "File:Vegetable Fried Rice.jpg",
}
BAD_TITLE = re.compile(
    r"(djvu|\.pdf|cookbook|menus and recipes|refrigerator menus|book cover|"
    r"electric refrigerator|behind the veil|housewife or|enquiry book)",
    re.I,
)


def title_ok(title: str) -> bool:
    return bool(title) and not BAD_TITLE.search(title)

_spec = importlib.util.spec_from_file_location("wm", SCRIPTS / "wikimedia-curate.py")
wm = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(wm)

_spec2 = importlib.util.spec_from_file_location("lar", SCRIPTS / "load-all-recipes.py")
lar = importlib.util.module_from_spec(_spec2)
assert _spec2 and _spec2.loader
_spec2.loader.exec_module(lar)

_spec3 = importlib.util.spec_from_file_location("cp", SCRIPTS / "commons-photo-pipeline.py")
cp = importlib.util.module_from_spec(_spec3)
assert _spec3 and _spec3.loader
_spec3.loader.exec_module(cp)


def load_meta() -> dict:
    if META_PATH.is_file():
        return json.loads(META_PATH.read_text(encoding="utf-8"))
    return {}


def save_meta(meta: dict) -> None:
    META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def rank_titles(name: str, used: set[str]) -> list[tuple[float, str]]:
    ranked: list[tuple[float, str]] = []
    for t in wm.search(name):
        if t in used or not title_ok(t):
            continue
        s = wm.title_score(name, t)
        if s < 0:
            continue
        ranked.append((s, t))
    ranked.sort(key=lambda x: (-x[0], x[1]))
    return ranked


def assign_title(rid: str, name: str, manual: dict, used: set[str]) -> tuple[str | None, dict | None]:
    pick = FIX_OVERRIDES.get(rid) or manual.get(rid)
    if pick:
        title = pick if pick.startswith("File:") else f"File:{pick}"
        if title_ok(title):
            info = wm.file_info(title)
            if info:
                return title, info
    ranked = rank_titles(name, used)
    for min_score in (10.0, 8.0, 5.0, 3.0, 0.1):
        for score, t in ranked:
            if score >= min_score:
                info = wm.file_info(t)
                if info:
                    return t, info
    # Last resort: any unused search hit that looks like food
    for _score, t in ranked:
        info = wm.file_info(t)
        if info:
            return t, info
    # Commons pipeline keyword search
    for query in (cp.dish_query(name), f"{name} food plate", f"{name} meal"):
        try:
            files = cp.search_files(query, limit=20)
        except Exception:
            time.sleep(2)
            continue
        for f in files:
            title = f["title"]
            if title in used or not title_ok(title):
                continue
            return title, {
                "thumb": f["thumb"],
                "license": f.get("license", ""),
                "artist": f.get("artist", ""),
                "credit": f.get("credit", ""),
            }
        time.sleep(0.2)
    return None, None


def fetch_one(rid: str, name: str, manual: dict, used: set[str], meta: dict, force: bool) -> bool:
    webp_work = WORK / "webp" / f"{rid}.webp"
    if webp_work.is_file() and webp_work.stat().st_size > 500 and not force:
        return True
    if force and rid in meta:
        old = meta[rid].get("commons_title")
        if old and old in used:
            used.discard(old)
    title, info = assign_title(rid, name, manual, used)
    if not info or not info.get("thumb"):
        print("MISSING", rid, name)
        return False
    if title in used and not force:
        print("DUP TITLE", rid, name)
        return False
    if title in used and force:
        used.discard(title)
    used.add(title)
    raw = WORK / "raw" / f"{rid}.jpg"
    for attempt in range(5):
        try:
            wm.download(info["thumb"], raw)
            wm.to_webp(raw, webp_work)
            break
        except Exception as err:
            wait = 4 * (attempt + 1)
            print("  retry", rid, attempt + 1, err)
            time.sleep(wait)
    else:
        return False
    pick_title = title or ""
    meta[rid] = {
        "recipe": name,
        "commons_title": pick_title,
        "source": "Wikimedia Commons",
        "source_url": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(pick_title.replace(' ', '_'))}",
        "image_url": info["thumb"],
        "license": info.get("license", ""),
        "artist": info.get("artist", ""),
        "credit": info.get("credit", ""),
        "file": f"photos/{rid}.webp",
    }
    print("OK", rid, name, "->", pick_title[:70])
    return True


def publish_webp(rid: str) -> None:
    src = WORK / "webp" / f"{rid}.webp"
    if not src.is_file():
        return
    for dest_root in HOSTED:
        dest_root.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest_root / f"{rid}.webp")


def sync_existing(from_id: int, to_id: int) -> None:
    for n in range(from_id, to_id + 1):
        publish_webp(f"r{n}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="from_id", type=int, default=127)
    ap.add_argument("--to", dest="to_id", type=int, default=248)
    ap.add_argument("--force", action="store_true", help="Re-download even if webp exists")
    ap.add_argument("--sync-only", action="store_true", help="Copy work webp to hosted dirs only")
    ap.add_argument("--missing-only", action="store_true", help="Only ids without work/webp")
    args = ap.parse_args()

    if args.sync_only:
        sync_existing(args.from_id, args.to_id)
        print("synced", args.from_id, args.to_id)
        return

    recipes = {r["id"]: r for r in lar.load_all_recipes()}
    manual = json.loads(ASSIGN.read_text(encoding="utf-8")) if ASSIGN.is_file() else {}
    meta = load_meta()
    used = {m.get("commons_title") for m in meta.values() if m.get("commons_title")}

    ok = fail = 0
    for n in range(args.from_id, args.to_id + 1):
        rid = f"r{n}"
        row = recipes.get(rid)
        if not row:
            print("skip unknown", rid)
            continue
        webp_work = WORK / "webp" / f"{rid}.webp"
        if args.missing_only and webp_work.is_file() and webp_work.stat().st_size > 500:
            publish_webp(rid)
            ok += 1
            continue
        force = args.force or rid in FIX_OVERRIDES
        if fetch_one(rid, row["name"], manual, used, meta, force):
            publish_webp(rid)
            ok += 1
        else:
            fail += 1
        time.sleep(0.15)

    save_meta(meta)
    print(f"done ok={ok} fail={fail} meta={len(meta)}")


if __name__ == "__main__":
    main()
