#!/usr/bin/env python3
"""Fill missing Commons assignments; dedupe; apply manual overrides."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECIPES = json.loads((ROOT / "scripts" / "recipes-index.json").read_text())
PATH = ROOT / "scripts" / "photo-assignments.json"
UA = "PantryWeekPhotoBot/3.2.2"

SKIP = re.compile(r"(pdf|djvu|webm|svg|logo|icon|map |diagram|cookbook|bulletin|report )", re.I)
IMG = (".jpg", ".jpeg", ".png", ".webp")

# Vision-reviewed / dish-accurate overrides (Commons File: titles)
OVERRIDES: dict[str, str] = {
    "r1": "File:Roasted Lemon Herb Chicken.jpg",
    "r2": "File:Liat Portal for Foodie Disorder - Scrambled Eggs on Whole Grain Toast with Yellow Tomatoes.jpg",
    "r3": "File:Curry in a Hurry Chickpea Bowl (51383382685).jpg",
    "r6": "File:-2019-02-07 Overnight Oats, Cromer.JPG",
    "r7": "File:Tacos with ground turkey - May 2023 - Sarah Stierch.jpg",
    "r8": "File:Caprese salad with chicken.jpg",
    "r12": "File:Miso soup with tofu and seaweed.jpg",
    "r13": "File:BLT (sandwich).jpg",
    "r14": "File:Fantasy Fajitas (5676014157).jpg",
    "r16": "File:Baked potato with toppings.jpg",
    "r19": "File:Gnocchi with pesto (3269919059).jpg",
    "r21": "File:Garlic buttered shrimp.jpg",
    "r22": "File:Vegetable Fried Rice.jpg",
    "r23": "File:95870 jaffa dish of hummus PikiWiki Israel.jpg",
    "r24": "File:Banana Pancakes Pk021.jpg",
    "r25": "File:Baked cod with lemon and garlic.jpg",
    "r28": "File:Liat Portal for Foodie Disorder - Oven-baked teriyaki salmon with vegetables.jpg",
    "r32": "File:Black bean tacos on plate.jpg",
    "r37": "File:Noodles with Onion, Nuts and Tofu Braised in Sesame oil with Honey Ginger Sauce.jpg",
    "r40": "File:Red lentil curry with rice.jpg",
    "r41": "File:Korean beef bulgogi lettuce wraps.jpg",
    "r43": "File:Caprese panini sandwich.jpg",
    "r45": "File:Lemon orzo salad.jpg",
    "r46": "File:Roasted cauliflower with harissa.jpg",
    "r48": "File:Miso glazed cod.jpg",
    "r51": "File:Ethiopian lentil stew injera.jpg",
    "r57": "File:Jamaican rice and peas.jpg",
    "r58": "File:Fattoush salad.jpg",
    "r66": "File:Persian rice with herbs and fried egg (sabzi polo).jpg",
    "r70": "File:Ahi poke bowl Hawaii.jpg",
    "r71": "File:Pea and mint soup.jpg",
    "r72": "File:Chimichurri steak sliced.jpg",
    "r73": "File:Malaysian peanut sauce noodles.jpg",
    "r75": "File:Liat Portal for Foodie Disorder - Classic Red Shakshuka with Egg.jpg",
    "r76": "File:Cuban mojo pork with rice.jpg",
    "r78": "File:Caldo verde Portuguese kale soup.jpg",
    "r80": "File:German schnitzel with mustard.jpg",
    "r86": "File:Senegalese peanut stew.jpg",
    "r89": "File:Khachapuri Georgian cheese bread.jpg",
    "r90": "File:Roasted Brussels sprouts with honey.jpg",
    "r91": "File:Seafood paella Spanish.jpg",
    "r92": "File:Coconut rice pudding.jpg",
    "r93": "File:Chocolate avocado mousse.jpg",
    "r94": "File:Berry chia parfait breakfast.jpg",
    "r95": "File:Pancake with Banana, berries and Maple syrup (5204781168).jpg",
    "r97": "File:Apple crisp dessert baked.jpg",
    "r99": "File:Mango lassi smoothie bowl.jpg",
    "r100": "File:Banana nice cream bowl.jpg",
    "r101": "File:Banh mi tofu bowl.jpg",
    "r102": "File:Lamb kofta with yogurt sauce.jpg",
    "r104": "File:Sweet potato tacos chipotle.jpg",
    "r105": "File:Tomato cream tortellini pasta.jpg",
    "r107": "File:Sausage and fennel sheet pan.jpg",
    "r108": "File:Falafel pita sandwich.jpg",
    "r109": "File:Cider glazed pork chops.jpg",
    "r116": "File:Chicken tikka lettuce wraps.jpg",
    "r118": "File:Broccoli cheddar frittata.jpg",
    "r123": "File:Flatbread with Roasted Grapes, Walnuts and Goat Cheese.jpg",
    "r125": "File:Cinnamon pear compote dessert.jpg",
    "r126": "File:Chili cheese nachos.jpg",
}


def api(params: dict) -> dict:
    q = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def search_first_jpg(query: str) -> str:
    data = api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": 20,
        }
    )
    for page in data.get("query", {}).get("pages", {}).values():
        t = page.get("title", "")
        if not t.startswith("File:"):
            continue
        if SKIP.search(t):
            continue
        if any(t.lower().endswith(ext) for ext in IMG):
            return t
    return ""


def main() -> None:
    assign = json.loads(PATH.read_text()) if PATH.is_file() else {}
    assign.update(OVERRIDES)
    used: dict[str, str] = {}
    for rid, title in list(assign.items()):
        if title in used:
            assign.pop(rid, None)
        else:
            used[title] = rid

    for row in RECIPES:
        rid = row["id"]
        if rid in assign and assign[rid]:
            continue
        name = row["name"]
        title = ""
        for q in [f"{name} food", name, f"{name} dish plate"]:
            title = search_first_jpg(q)
            if title and title not in used:
                break
            time.sleep(1.5)
        if title:
            assign[rid] = title
            used[title] = rid
            print("FILLED", rid, title[:70])
        else:
            print("STILL MISSING", rid, name)
        time.sleep(1.5)

    # dedupe again
    seen: set[str] = set()
    for rid in sorted(assign.keys(), key=lambda x: int(x[1:])):
        t = assign[rid]
        if t in seen:
            print("DUP REMOVE", rid, t)
            del assign[rid]
        else:
            seen.add(t)

    PATH.write_text(json.dumps(assign, indent=2) + "\n", encoding="utf-8")
    print("total", len(assign), "/ 126")


if __name__ == "__main__":
    main()
