#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECIPES = {r["id"]: r["name"] for r in json.loads((ROOT / "scripts" / "recipes-index.json").read_text())}
PATH = ROOT / "scripts" / "photo-assignments.json"
UA = "PantryWeekPhotoBot/3.2.2"
SKIP = re.compile(r"(pdf|djvu|webm|svg|logo|icon|map |diagram|cookbook|bulletin)", re.I)
IMG = (".jpg", ".jpeg", ".png", ".webp")

QUERIES: dict[str, str] = {
    "r8": "caprese chicken salad",
    "r16": "baked potato toppings bar",
    "r17": "peanut noodles bowl",
    "r19": "pesto gnocchi",
    "r23": "hummus wrap sandwich",
    "r28": "teriyaki tofu bowl",
    "r30": "chicken pita sandwich",
    "r36": "white beans skillet",
    "r37": "ginger scallion noodles",
    "r41": "korean beef lettuce wraps bulgogi",
    "r43": "caprese panini",
    "r46": "harissa roasted cauliflower",
    "r47": "breakfast burrito bowl",
    "r51": "ethiopian lentil stew injera",
    "r52": "jerk chicken skewers",
    "r53": "turkish eggplant imam bayildi",
    "r57": "rice and peas jamaican",
    "r68": "swedish meatballs",
    "r70": "ahi poke bowl",
    "r71": "pea mint soup",
    "r73": "malaysian satay noodles",
    "r75": "shakshuka toast",
    "r76": "cuban mojo pork rice",
    "r78": "caldo verde kale soup",
    "r80": "schnitzel mustard",
    "r86": "peanut stew west african",
    "r89": "khachapuri cheese bread",
    "r90": "honey roasted brussels sprouts",
    "r91": "paella seafood",
    "r93": "chocolate avocado mousse",
    "r94": "chia parfait berries",
    "r95": "oat pancakes banana",
    "r98": "almond date energy balls",
    "r99": "mango lassi smoothie bowl",
    "r100": "banana nice cream",
    "r101": "banh mi tofu",
    "r102": "lamb kofta yogurt",
    "r103": "hummus wrap roasted pepper",
    "r104": "sweet potato tacos",
    "r105": "tortellini tomato cream",
    "r107": "sausage fennel roasted",
    "r108": "falafel pita",
    "r109": "cider pork chops",
    "r112": "bbq chicken flatbread pizza",
    "r116": "chicken tikka lettuce",
    "r118": "broccoli cheddar frittata",
    "r120": "garlic butter steak bites",
    "r123": "flatbread goat cheese grapes",
    "r125": "pear compote cinnamon",
    "r126": "chili nachos",
}


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


def main() -> None:
    assign = json.loads(PATH.read_text())
    used = set(assign.values())
    for rid, query in QUERIES.items():
        if rid in assign:
            continue
        title = ""
        for t in search(query):
            if t not in used:
                title = t
                break
        time.sleep(3.0)
        if title:
            assign[rid] = title
            used.add(title)
            print("OK", rid, RECIPES[rid], "->", title)
        else:
            print("MISS", rid, RECIPES[rid])
    PATH.write_text(json.dumps(assign, indent=2) + "\n", encoding="utf-8")
    print("total", len(assign))


if __name__ == "__main__":
    main()
