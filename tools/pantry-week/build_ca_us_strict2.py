#!/usr/bin/env python3
"""Build ca_us_titles_strict_2.json — Wikibooks pool for CA/US swap pass #2."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from ca_us_swap_pass import API, POOL_REJECT, SKIP_TITLE, infer_meal
from remap_premium_pass import api, load_all_recipes, recipe_from_wikitext

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "ca_us_titles_strict_2.json"

NA = re.compile(
    r"(american|canadian|\busa\b|u\.s\.|new england|southern|cajun|creole|texas|philly|buffalo|"
    r"kansas|bbq|barbecue|maple|poutine|tourti|nanaimo|clam chowder|boston|manhattan|montreal|"
    r"beaver|peameal|jambalaya|gumbo|grits|cornbread|biscuit|meatloaf|pot roast|macaroni|"
    r"thanksgiving|pumpkin pie|pecan pie|sloppy joe|chili|fried chicken|pot pie|shepherd|"
    r"hushpuppy|cheesecake|lobster roll|po.? boy|reuben|blt|club sandwich|grilled cheese|"
    r"hot dog|corn dog|apple pie|key lime|banana bread|zucchini bread|deviled|ranch|wings|brisket|"
    r"pulled pork|split pea|baked beans|vancouver|midwestern|memphis|carolina|pedernales|"
    r"eggs benedict|huevos|cincinnati|ontario|quebec|denver|country|backyard|hickory|"
    r"chicken|turkey|beef|pork|ham|bacon|steak|chop|roast|burger|hamburger|sandwich|"
    r"pancake|waffle|french toast|omelette|muffin|biscuit|cookie|brownie|pie|cake|"
    r"soup|chowder|stew|casserole|salad|coleslaw|potato|corn|bean|gravy|stuffing|"
    r"lasagna|meatball|spaghetti|alfredo|nachos|taco|burrito|enchilada|quesadilla|fajita|"
    r"salmon|shrimp|crab|fish and chips|tuna|grilled|baked|fried|smoked|"
    r"blueberry|pumpkin|pecan|chocolate chip|sugar cookie|peanut butter|"
    r"mac and cheese|au gratin|scalloped|mashed|succotash|okra|collard|greens)",
    re.I,
)

BAD = re.compile(
    r"(rwandan|turkish|brazilian|indonesian|asian style|durian|bambi|tokyo pancake|"
    r"feijão|feijao|mentega|akabenz|sambal|nigerian|filipino|peruvian|"
    r"\bgerman\b|\bchinese\b|\bjapanese\b|\bkorean\b|\bthai\b|\bindian\b|\bgreek\b|"
    r"phulourie|split pea fritter|anchovies with|italian sausage spaghetti)",
    re.I,
)

SEARCH_QUERIES = [
    "american",
    "canadian",
    "southern united states",
    "cajun",
    "creole",
    "texas",
    "new england",
    "breakfast",
    "brunch",
    "sandwich",
    "burger",
    "pork chop",
    "roast chicken",
    "turkey",
    "meatloaf",
    "pot roast",
    "macaroni and cheese",
    "chili",
    "split pea",
    "clam chowder",
    "corn chowder",
    "broccoli cheese soup",
    "chicken noodle",
    "beef stew",
    "chicken stew",
    "pancake",
    "waffle",
    "french toast",
    "omelette",
    "scrambled eggs",
    "bacon",
    "hash brown",
    "grilled cheese",
    "reuben",
    "blt",
    "club sandwich",
    "tuna melt",
    "philly cheesesteak",
    "lobster roll",
    "po boy",
    "pulled pork",
    "brisket",
    "ribs",
    "fried chicken",
    "wings",
    "buffalo wings",
    "deviled eggs",
    "potato salad",
    "coleslaw",
    "caesar salad",
    "cobb salad",
    "waldorf salad",
    "macaroni salad",
    "green bean casserole",
    "sweet potato casserole",
    "mashed potatoes",
    "scalloped potatoes",
    "au gratin",
    "baked potato",
    "cornbread",
    "biscuits",
    "biscuits and gravy",
    "grits",
    "succotash",
    "baked beans",
    "pinto beans",
    "jambalaya",
    "gumbo",
    "red beans and rice",
    "dirty rice",
    "etouffee",
    "crawfish",
    "lasagna",
    "spaghetti meatballs",
    "meatballs",
    "chicken parmesan",
    "alfredo",
    "tuna casserole",
    "chicken casserole",
    "king ranch chicken",
    "stuffed peppers",
    "shepherd pie",
    "cottage pie",
    "apple pie",
    "pumpkin pie",
    "pecan pie",
    "key lime pie",
    "cherry pie",
    "peach cobbler",
    "apple cobbler",
    "brownies",
    "chocolate chip cookies",
    "sugar cookies",
    "peanut butter cookies",
    "banana bread",
    "zucchini bread",
    "pumpkin bread",
    "carrot cake",
    "red velvet cake",
    "chess pie",
    "maple",
    "nanaimo",
    "butter tart",
    "poutine",
    "montreal",
    "tourtiere",
    "cincinnati chili",
    "sloppy joe",
    "hot dog",
    "corn dog",
    "onion rings",
    "mozzarella sticks",
    "fish and chips",
    "crab cakes",
    "salmon",
    "swiss steak",
    "country fried steak",
    "chicken fried steak",
    "chicken and dumplings",
    "turkey chili",
    "white chili",
    "vegetarian chili",
    "enchiladas",
    "burritos",
    "nachos",
    "fajitas",
    "quesadilla",
    "tacos",
    "pork tenderloin",
    "ham steak",
    "glazed ham",
    "cranberry sauce",
    "stuffing",
    "thanksgiving",
    "pumpkin muffin",
    "corn muffin",
    "blueberry muffin",
    "scone",
    "whoopie pie",
    "shoofly pie",
    "hush puppies",
    "fried okra",
    "collard greens",
    "southern greens",
    "barbecue sauce",
    "bbq sauce",
    "ranch dressing",
    "double hamburger",
    "pan seared pork",
    "grilled pork",
    "slow cooker pork",
    "wine glazed pork",
    "apple stuffed pork",
    "roast pork",
    "pork loin",
    "pork shoulder",
    "beef pot roast",
    "meatball sub",
    "chicken pot pie",
    "turkey pot pie",
    "modern reuben",
    "cincinnati style chili",
    "green chili stew",
    "potato salad southern ontario",
    "southern style greens",
    "american alfredo",
    "blueberry pancakes",
    "honey lime wings",
    "campfire chicken",
    "smoky chipotle wings",
    "pulled pork sandwich",
    "chipotle bbq",
    "hickory bbq",
    "maple glazed",
    "backyard bbq",
    "north carolina",
    "memphis",
    "kansas city",
]


def seed_existing() -> tuple[set[str], set[str]]:
    recipes = load_all_recipes()
    existing_names = {(r.get("name") or "").strip().lower() for r in recipes}
    existing_urls = {(r.get("sourceUrl") or "").lower() for r in recipes if r.get("sourceUrl")}
    pass1 = json.loads((ROOT / "ca_us_titles_strict_pass1.json").read_text(encoding="utf-8"))
    for row in pass1:
        existing_names.add((row.get("name") or "").lower())
        slug = row["title"].replace("Cookbook:", "").replace(" ", "_")
        existing_urls.add(f"https://en.wikibooks.org/wiki/cookbook:{slug}".lower())
    if OUT.is_file():
        for row in json.loads(OUT.read_text(encoding="utf-8")):
            existing_names.add((row.get("name") or "").lower())
            slug = row["title"].replace("Cookbook:", "").replace(" ", "_")
            existing_urls.add(f"https://en.wikibooks.org/wiki/cookbook:{slug}".lower())
    return existing_names, existing_urls


def main() -> None:
    existing_names, existing_urls = seed_existing()
    entries: list[dict] = []
    if OUT.is_file():
        entries = json.loads(OUT.read_text(encoding="utf-8"))

    seen = {e["title"] for e in entries}
    for q in SEARCH_QUERIES:
        try:
            data = api(
                API,
                {"action": "query", "list": "search", "srsearch": q, "srnamespace": 102, "srlimit": 50},
            )
        except Exception as exc:
            print("search err", q, exc, flush=True)
            time.sleep(10)
            continue
        for hit in data.get("query", {}).get("search", []):
            title = hit.get("title", "")
            if not title.startswith("Cookbook:") or SKIP_TITLE.search(title) or title in seen:
                continue
            seen.add(title)
            if POOL_REJECT.search(title) or BAD.search(title):
                continue
            time.sleep(0.85)
            try:
                recipe = recipe_from_wikitext(title, "r999", existing_names)
            except Exception as exc:
                print("parse err", title, exc, flush=True)
                time.sleep(4)
                continue
            if not recipe:
                continue
            blob = title + " " + recipe["name"]
            if BAD.search(blob) or POOL_REJECT.search(blob):
                continue
            if not NA.search(blob):
                continue
            url = (recipe.get("sourceUrl") or "").lower()
            if url in existing_urls:
                continue
            entries.append(
                {
                    "title": title,
                    "name": recipe["name"],
                    "meal": infer_meal(recipe),
                    "tags": recipe.get("tags"),
                }
            )
            existing_names.add(recipe["name"].lower())
            existing_urls.add(url)
            OUT.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
            print(f"{len(entries)} {recipe['name']}", flush=True)
            if len(entries) >= 120:
                break
        if len(entries) >= 120:
            break
        time.sleep(0.25)

    print(f"done {len(entries)}", flush=True)
    if len(entries) < 100:
        raise SystemExit(f"only {len(entries)} pool entries")


if __name__ == "__main__":
    main()
