#!/usr/bin/env python3
"""Rebuild photo-assignments.json with full Commons titles (rate-limited)."""
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
UA = "PantryWeekPhotoBot/3.2.2 (https://digitalundergroundstore.com)"
SKIP = re.compile(r"(pdf|djvu|webm|svg|logo|icon|map |diagram|cookbook|bulletin)", re.I)
IMG = (".jpg", ".jpeg", ".png", ".webp")

# Hand-verified dish matches (full File: titles)
VERIFIED: dict[str, str] = {
    "r1": "File:Roasted Lemon Herb Chicken.jpg",
    "r2": "File:Liat Portal for Foodie Disorder - Scrambled Eggs on Whole Grain Toast with Yellow Tomatoes.jpg",
    "r3": "File:Curry in a Hurry Chickpea Bowl (51383382685).jpg",
    "r4": "File:Just 10 munits Chicken Ricotta Meatballs with Risoni in Tomato Basil Sauce.jpg",
    "r5": "File:Liat Portal for Foodie Disorder - Oven-baked teriyaki salmon with vegetables.jpg",
    "r6": "File:-2019-02-07 Overnight Oats, Cromer.JPG",
    "r7": "File:Tacos with ground turkey - May 2023 - Sarah Stierch.jpg",
    "r14": "File:Fantasy Fajitas (5676014157).jpg",
    "r18": "File:Liat Portal for Foodie Disorder - Classic Red Shakshuka with Egg.jpg",
    "r21": "File:Garlic buttered shrimp.jpg",
    "r22": "File:Vegetable Fried Rice.jpg",
    "r24": "File:Banana Pancakes Pk021.jpg",
    "r27": "File:Caprese - toastable 2024-11-27.jpg",
    "r95": "File:Pancake with Banana, berries and Maple syrup (5204781168).jpg",
    "r106": "File:Gnocchi with pesto (3269919059).jpg",
    "r110": "File:-2019-12-22 Mushroom Risotto with onion and herbs finished with Parmesan and Mushroom, Trimingham.JPG",
    "r113": "File:Zucchini Fritters - Lunch at Yanyali Fehmi Lokantasi (6421047753).jpg",
    "r114": "File:Stuffed Bell Peppers at Boutins, Baton Rouge.jpg",
    "r115": "File:Chilled Tuna Nicoise Salad.JPG",
    "r117": "File:20240929 Komemade Thai Soup Pumpkin anagoria.jpg",
    "r124": "File:A bowl of Kimchi Fried Rice.jpg",
}


def api(params: dict) -> dict:
    q = urllib.parse.urlencode({**params, "format": "json"})
    for attempt in range(4):
        try:
            req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(8 * (attempt + 1))
                continue
            raise
    raise RuntimeError("429 persisted")


def search(query: str) -> list[str]:
    data = api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": 25,
        }
    )
    out = []
    for page in data.get("query", {}).get("pages", {}).values():
        t = page.get("title", "")
        if t.startswith("File:") and not SKIP.search(t) and any(t.lower().endswith(e) for e in IMG):
            out.append(t)
    return out


def pick_for(name: str, used: set[str]) -> str:
    for q in [f"{name} food dish", f"{name} plate", name]:
        for t in search(q):
            if t not in used:
                return t
        time.sleep(2.0)
    return ""


def main() -> None:
    assign: dict[str, str] = {}
    used: set[str] = set()
    for row in RECIPES:
        rid = row["id"]
        name = row["name"]
        title = VERIFIED.get(rid, "")
        if title and title not in used:
            assign[rid] = title
            used.add(title)
            print("VERIFIED", rid, title[:70])
            continue
        title = pick_for(name, used)
        if title:
            assign[rid] = title
            used.add(title)
            OUT.write_text(json.dumps(assign, indent=2) + "\n", encoding="utf-8")
            print("OK", rid, title)
        else:
            print("MISS", rid, name)
        time.sleep(2.5)
    OUT.write_text(json.dumps(assign, indent=2) + "\n", encoding="utf-8")
    print("done", len(assign))


if __name__ == "__main__":
    main()
