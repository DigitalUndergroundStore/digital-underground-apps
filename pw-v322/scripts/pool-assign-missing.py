#!/usr/bin/env python3
"""Assign Commons food images from a large pool to recipes missing WebP."""
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
    r"housewife|refrigerator|storefront|street view|building|portrait|wedding|"
    r"museum|marchande|magazine|school magazine|lexington|boston cooking|"
    r"grass-fed|bone-in rib|commodity cooking|team nutrition)",
    re.I,
)
FOOD_WORDS = {
    "food", "dish", "plate", "meal", "dinner", "lunch", "breakfast", "bowl", "soup",
    "pasta", "pizza", "salad", "rice", "chicken", "beef", "pork", "fish", "shrimp",
    "taco", "burger", "sandwich", "curry", "stew", "casserole", "roast", "grilled",
    "baked", "noodles", "ramen", "enchilada", "burrito", "nachos", "meatball",
    "sausage", "pancake", "toast", "egg", "wings", "ribs", "macaroni", "gnocchi",
}
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")

POOL_QUERIES = [
    "roast chicken dinner plate", "beef stew bowl food", "pasta dish italian",
    "tacos plate food", "fried rice chinese plate", "soup bowl food",
    "grilled salmon plate", "burger plate food", "pizza slice food",
    "breakfast eggs plate", "curry rice bowl", "stir fry wok food",
    "meatloaf dinner plate", "mac and cheese food", "enchilada plate",
    "pulled pork sandwich", "fish and chips plate", "shepherd pie food",
    "nachos plate food", "ramen bowl food", "pad thai plate",
    "orange chicken chinese food", "bbq ribs plate", "meatballs tomato sauce",
    "french toast breakfast", "burrito breakfast plate", "club sandwich lunch",
    "tuna salad sandwich", "panini sandwich food", "peanut noodles bowl",
    "minestrone soup bowl", "chicken pot pie food", "poutine food plate",
    "tourtiere meat pie", "butter chicken curry", "pork chop dinner",
    "sliders plate food", "fajitas plate", "wings plate food",
    "quinoa bowl salad", "ziti pasta baked", "cauliflower steak food",
]

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
    for attempt in range(5):
        try:
            req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(10 * (attempt + 1))
                continue
            raise
    raise RuntimeError("rate limited")


def fetch_pool() -> list[str]:
    seen: set[str] = set()
    pool: list[str] = []
    for query in POOL_QUERIES:
        data = api(
            {
                "action": "query",
                "generator": "search",
                "gsrsearch": query,
                "gsrnamespace": 6,
                "gsrlimit": 30,
            }
        )
        for page in data.get("query", {}).get("pages", {}).values():
            t = page.get("title", "")
            if not t.startswith("File:") or t in seen:
                continue
            low = t.lower()
            if SKIP.search(t) or not any(low.endswith(e) for e in IMG_EXT):
                continue
            if not (FOOD_WORDS & set(re.sub(r"[^a-z0-9\s]", " ", low).split())):
                continue
            seen.add(t)
            pool.append(t)
        time.sleep(0.2)
    return pool


def recipe_tokens(name: str) -> set[str]:
    stop = {"and", "the", "with", "for", "pan", "sheet", "skillet", "style", "classic", "weeknight"}
    return {w for w in re.sub(r"[^a-z0-9\s]", " ", name.lower()).split() if len(w) > 2 and w not in stop}


def score_title(title: str, rt: set[str]) -> float:
    low = title.lower()
    ft = set(re.sub(r"[^a-z0-9\s]", " ", low).split())
    overlap = len(rt & ft)
    food = len(FOOD_WORDS & ft)
    bonus = 2.0 if overlap >= 2 else 0.0
    for w in ("chicken", "beef", "pork", "fish", "pasta", "soup", "rice", "taco", "egg"):
        if w in rt and w in low:
            bonus += 3.0
    return overlap * 4.0 + food * 0.5 + bonus


def missing_recipes() -> list[tuple[str, str]]:
    out = []
    for r in lar.load_all_recipes():
        p = WORK / "webp" / f"{r['id']}.webp"
        if not p.is_file() or p.stat().st_size < 500:
            out.append((r["id"], r["name"]))
    return out


def main() -> None:
    meta = json.loads(META_PATH.read_text()) if META_PATH.is_file() else {}
    assign = json.loads(ASSIGN.read_text()) if ASSIGN.is_file() else {}
    used = {m.get("commons_title") for m in meta.values() if m.get("commons_title")}
    used |= set(assign.values())

    print("building pool...")
    pool = fetch_pool()
    print("pool", len(pool))
    if len(pool) < 80:
        raise SystemExit("pool too small")

    missing = missing_recipes()
    print("missing recipes", len(missing))

    ok = 0
    for rid, name in missing:
        rt = recipe_tokens(name)
        best_t = ""
        best_s = -1.0
        for t in pool:
            if t in used:
                continue
            s = score_title(t, rt)
            if s > best_s:
                best_s = s
                best_t = t
        if not best_t or best_s < 4.0:
            # take any unused pool image
            for t in pool:
                if t not in used:
                    best_t = t
                    break
        if not best_t:
            print("MISS", rid, name)
            continue
        info = wm.file_info(best_t)
        if not info or not info.get("thumb"):
            print("FAIL info", rid, best_t)
            continue
        used.add(best_t)
        assign[rid] = best_t
        raw = WORK / "raw" / f"{rid}.jpg"
        webp = WORK / "webp" / f"{rid}.webp"
        wm.download(info["thumb"], raw)
        wm.to_webp(raw, webp)
        meta[rid] = {
            "recipe": name,
            "commons_title": best_t,
            "source": "Wikimedia Commons",
            "source_url": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(best_t.replace(' ', '_'))}",
            "image_url": info["thumb"],
            "license": info.get("license", ""),
            "artist": info.get("artist", ""),
            "credit": info.get("credit", ""),
            "file": f"photos/{rid}.webp",
        }
        for dest_root in (ROOT / "jhagho" / "photos", ROOT.parent / "pantry-week" / "photos"):
            dest_root.mkdir(parents=True, exist_ok=True)
            dest_root.joinpath(f"{rid}.webp").write_bytes(webp.read_bytes())
        print("OK", rid, name[:40], "->", best_t[:55], f"score={best_s:.1f}")
        ok += 1

    META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    ASSIGN.write_text(json.dumps(assign, indent=2) + "\n", encoding="utf-8")
    print(f"assigned ok={ok} meta={len(meta)}")


if __name__ == "__main__":
    main()
