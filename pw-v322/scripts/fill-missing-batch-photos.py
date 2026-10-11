#!/usr/bin/env python3
"""Fill missing recipe WebP via targeted Commons search (batch + index gaps)."""
from __future__ import annotations

import importlib.util
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
WORK = ROOT / "work" / "photos"
META_PATH = SCRIPTS / "photos-meta.json"
ASSIGN = SCRIPTS / "photo-assignments.json"
UA = "PantryWeekPhotoBot/3.3.0"
SKIP = re.compile(
    r"(pdf|djvu|webm|svg|logo|icon|map |diagram|cookbook|bulletin|menu book|"
    r"housewife|refrigerator|portrait|wedding|holding|person|people|man |woman )",
    re.I,
)
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")

_spec = importlib.util.spec_from_file_location("lar", SCRIPTS / "load-all-recipes.py")
lar = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(lar)

_spec2 = importlib.util.spec_from_file_location("wm", SCRIPTS / "wikimedia-curate.py")
wm = importlib.util.module_from_spec(_spec2)
assert _spec2 and _spec2.loader
_spec2.loader.exec_module(wm)


def api(params: dict) -> dict:
    q = urllib.parse.urlencode({**params, "format": "json"})
    for attempt in range(6):
        try:
            req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(8 * (attempt + 1))
                continue
            raise
    raise RuntimeError("rate limited")


def search_titles(query: str, limit: int = 50) -> list[str]:
    data = api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": limit,
        }
    )
    out: list[str] = []
    for page in data.get("query", {}).get("pages", {}).values():
        t = page.get("title", "")
        if not t.startswith("File:"):
            continue
        tl = t.lower()
        if SKIP.search(t) or not any(tl.endswith(ext) for ext in IMG_EXT):
            continue
        out.append(t)
    return out


def queries_for(name: str) -> list[str]:
    base = re.sub(r"[^a-zA-Z0-9\s&]", " ", name)
    base = re.sub(r"\s+", " ", base).strip()
    short = base.split("&")[0].strip()
    words = [w for w in short.split() if len(w) > 2][:4]
    core = " ".join(words) if words else short
    return list(
        dict.fromkeys(
            [
                f"{core} food plate",
                f"{core} dish meal",
                f"{short} cooked food",
                core,
            ]
        )
    )


def missing_ids() -> list[tuple[str, str]]:
    rows = []
    for r in lar.load_all_recipes():
        p = WORK / "webp" / f"{r['id']}.webp"
        if not p.is_file() or p.stat().st_size < 500:
            rows.append((r["id"], r["name"]))
    return rows


def main() -> None:
    meta = json.loads(META_PATH.read_text()) if META_PATH.is_file() else {}
    assign = json.loads(ASSIGN.read_text()) if ASSIGN.is_file() else {}
    used = {m.get("commons_title") for m in meta.values() if m.get("commons_title")}
    used |= set(assign.values())

    ok = fail = 0
    for rid, name in missing_ids():
        picked = ""
        info = None
        for query in queries_for(name):
            for title in search_titles(query):
                if title in used:
                    continue
                info = wm.file_info(title)
                if info and info.get("thumb"):
                    picked = title
                    break
            if picked:
                break
            time.sleep(0.25)
        if not picked or not info:
            print("MISS", rid, name)
            fail += 1
            continue
        used.add(picked)
        assign[rid] = picked
        raw = WORK / "raw" / f"{rid}.jpg"
        webp = WORK / "webp" / f"{rid}.webp"
        for attempt in range(5):
            try:
                wm.download(info["thumb"], raw)
                wm.to_webp(raw, webp)
                break
            except Exception as err:
                time.sleep(4 * (attempt + 1))
                print("  retry", rid, err)
        else:
            fail += 1
            continue
        meta[rid] = {
            "recipe": name,
            "commons_title": picked,
            "source": "Wikimedia Commons",
            "source_url": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(picked.replace(' ', '_'))}",
            "image_url": info["thumb"],
            "license": info.get("license", ""),
            "artist": info.get("artist", ""),
            "credit": info.get("credit", ""),
            "file": f"photos/{rid}.webp",
        }
        for dest_root in (ROOT / "jhagho" / "photos", ROOT.parent / "pantry-week" / "photos"):
            dest_root.mkdir(parents=True, exist_ok=True)
            dest_root.joinpath(f"{rid}.webp").write_bytes(webp.read_bytes())
        print("OK", rid, name, "->", picked[:65])
        ok += 1
        time.sleep(0.35)

    META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    ASSIGN.write_text(json.dumps(assign, indent=2) + "\n", encoding="utf-8")
    print(f"fill done ok={ok} fail={fail} total_meta={len(meta)}")


if __name__ == "__main__":
    main()
