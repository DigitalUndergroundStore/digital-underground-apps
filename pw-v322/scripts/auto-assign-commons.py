#!/usr/bin/env python3
"""Auto-pick Commons JPG titles per recipe; write photo-assignments.json."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECIPES = json.loads((ROOT / "scripts" / "recipes-index.json").read_text())
OUT = ROOT / "scripts" / "photo-assignments.json"
UA = "PantryWeekPhotoBot/3.2.2"

SKIP = re.compile(
    r"(pdf|djvu|webm|svg|logo|icon|map |diagram|book |cookbook|bulletin|report |"
    r"congressional|commodity cooking|myplate|team nutrition|eat healthy|"
    r"storefront|street|building|portrait|wedding|museum|clay -|remains,)",
    re.I,
)
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")


def tokens(name: str) -> list[str]:
    stop = {"and", "the", "with", "for", "pan", "sheet", "skillet", "bowl", "bowls", "easy", "quick"}
    return [w for w in re.sub(r"[^a-z0-9\s]", " ", name.lower()).split() if len(w) > 2 and w not in stop]


def api(params: dict) -> dict:
    q = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def search_titles(query: str, limit: int = 25) -> list[str]:
    data = api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": limit,
        }
    )
    out = []
    for page in data.get("query", {}).get("pages", {}).values():
        t = page.get("title", "")
        if t.startswith("File:"):
            out.append(t)
    return out


def good_title(title: str, recipe_tokens: list[str]) -> bool:
    if SKIP.search(title):
        return False
    low = title.lower()
    if not any(low.endswith(ext) for ext in IMG_EXT):
        return False
    ft = set(re.sub(r"[^a-z0-9\s]", " ", low).split())
    hits = sum(1 for w in recipe_tokens if w in ft or w in low)
    return hits >= 1


def queries_for(name: str) -> list[str]:
    t = tokens(name)
    main = " ".join(t[:3]) if t else name
    qs = [f"{name} food", f"{main} food dish", f"{main} plate", name]
    if "oat" in name.lower():
        qs.insert(0, "overnight oats food")
    if "pancake" in name.lower():
        qs.insert(0, "banana pancakes")
    if "fried rice" in name.lower():
        qs.insert(0, "vegetable fried rice")
    if "shrimp" in name.lower() or "garlic" in name.lower():
        qs.insert(0, "garlic butter shrimp food")
    if "chicken" in name.lower():
        qs.insert(0, "roasted lemon herb chicken")
    if "salmon" in name.lower():
        qs.insert(0, "baked salmon broccoli")
    if "chickpea" in name.lower():
        qs.insert(0, "chickpea bowl food")
    if "taco" in name.lower():
        qs.insert(0, "turkey tacos food")
    return qs


def main() -> None:
    assign: dict[str, str] = {}
    if OUT.is_file():
        assign = json.loads(OUT.read_text())
    used: set[str] = set(assign.values())
    missing = []
    for row in RECIPES:
        rid = row["id"]
        if rid in assign:
            continue
        name = row["name"]
        rt = tokens(name)
        picked = ""
        for q in queries_for(name):
            for title in search_titles(q):
                if title in used:
                    continue
                if good_title(title, rt):
                    picked = title
                    break
            if picked:
                break
            time.sleep(1.0)
        if picked:
            assign[rid] = picked
            used.add(picked)
            OUT.write_text(json.dumps(assign, indent=2) + "\n", encoding="utf-8")
            print("OK", rid, picked[:75])
        else:
            missing.append((rid, name))
            print("MISS", rid, name)
        time.sleep(1.2)
    OUT.write_text(json.dumps(assign, indent=2) + "\n", encoding="utf-8")
    print("assigned", len(assign), "missing", len(missing))


if __name__ == "__main__":
    main()
