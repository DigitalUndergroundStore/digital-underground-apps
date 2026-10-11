#!/usr/bin/env python3
"""Download curated Commons thumbs and write offline WebP for Smart Chef templates."""
from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "jhagho" / "photos" / "smart-chef"
META = ROOT / "scripts" / "smart-chef-photos-meta.json"

# template-profile -> direct image URL (Wikimedia Commons, plated food)
CURATED: dict[str, str] = {
    "stir-fry-asian": "https://upload.wikimedia.org/wikipedia/commons/c/c8/Noodle_stir_fry_with_chicken%2C_shrimp%2C_and_broccoli_%2818471621051%29.jpg",
    "stir-fry-mexican": "https://upload.wikimedia.org/wikipedia/commons/1/1d/Stir-fried_spinach_and_ground_pork%281%29.jpg",
    "pasta-italian": "https://upload.wikimedia.org/wikipedia/commons/a/af/Liat_Portal_for_Foodie_Disorder_-_Creamy_Tomato_Seafood_Pasta.jpg",
    "pasta-canadian": "https://upload.wikimedia.org/wikipedia/commons/d/da/White_Sauce_Pasta_served_in_an_Aluminium_foil_container.jpg",
    "skillet-canadian": "https://upload.wikimedia.org/wikipedia/commons/2/22/A_New_Zealand_beef_steak_with_corn_and_sausage_with_potatoes_with_dinner_set_in_caf%C3%A9_de_coral.jpg",
    "skillet-italian": "https://upload.wikimedia.org/wikipedia/commons/6/6d/Steak_Dinner_%2837335080850%29.jpg",
    "skillet-mexican": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Tacos_at_restaurant_Chalupa.jpg",
    "sheet-pan-italian": "https://upload.wikimedia.org/wikipedia/commons/1/10/Roast_Chicken_with_Potato_Wedges.jpg",
    "sheet-pan-canadian": "https://upload.wikimedia.org/wikipedia/commons/3/31/Liat_Portal_for_Foodie_Disorder_-_Roast_chicken_with_peas_and_green_salad.jpg",
    "soup-canadian": "https://upload.wikimedia.org/wikipedia/commons/a/ab/Red_lentil_soup_bowl.jpg",
    "soup-italian": "https://upload.wikimedia.org/wikipedia/commons/e/e3/French_lentil_soup_%2842460826544%29.jpg",
    "curry-indian": "https://upload.wikimedia.org/wikipedia/commons/4/40/Food_Indian_butter_chicken_%2852843424475%29.jpg",
    "curry-asian": "https://upload.wikimedia.org/wikipedia/commons/2/2d/Chicken_katsu_curry_rice_-_Korpan.jpg",
    "grain-bowl-asian": "https://upload.wikimedia.org/wikipedia/commons/a/ac/Donburi_Rice_bowl_of_Chicken_Teriyaki_with_Tomato.jpg",
    "grain-bowl-mexican": "https://upload.wikimedia.org/wikipedia/commons/3/38/Hot_bowl_%28Teriyaki_Mushroom%2C_Pacific_Coconut_Curry%2C_Rice%29_-_Island_Pok%C3%A9_2023-10-08.jpg",
    "grain-bowl-indian": "https://upload.wikimedia.org/wikipedia/commons/5/54/Curry_rice_in_Korea.jpg",
    "tacos-mexican": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Tacos_at_restaurant_Chalupa.jpg",
    "frittata-italian": "https://upload.wikimedia.org/wikipedia/commons/8/85/Liat_Portal_for_Foodie_Disorder_-_Scrambled_eggs_with_spinach.jpg",
    "frittata-canadian": "https://upload.wikimedia.org/wikipedia/commons/6/6f/%22Breakfast_in_Bun%22_and_%22Mushrooms_Scrambled_Eggs%22_by_The_Old_Tram_Station%2C_Hull.jpg",
    "salad-italian": "https://upload.wikimedia.org/wikipedia/commons/9/97/Salad_bowl_in_Tampere.jpg",
    "salad-mexican": "https://upload.wikimedia.org/wikipedia/commons/e/e5/Liat_Portal_for_Foodie_Disorder_-_Chicken_salad_sandwich_with_Israeli_salad.jpg",
    "fried-rice-asian": "https://upload.wikimedia.org/wikipedia/commons/2/25/Chinese_vegetable_stir_fry_noodles.jpg",
    "fried-rice-indian": "https://upload.wikimedia.org/wikipedia/commons/7/7d/Japanese_Style_Beef_Big_Rice_Bowl_in_Hong_Kong.jpg",
    "casserole-canadian": "https://upload.wikimedia.org/wikipedia/commons/3/33/Swiss_Chalet_Festive_Meal_-_Quarter_Chicken%2C_French_Fries%2C_Dinner_Roll%2C_Butter%2C_Cranberry_Sauce%2C_Stuffing%2C_Dipping_Sauce_-_December_2022.jpg",
    "casserole-italian": "https://upload.wikimedia.org/wikipedia/commons/6/68/-2019-12-22_Mushroom_Risotto_with_onion_and_herbs_finished_with_Parmesan_and_Mushroom%2C_Trimingham.JPG",
    "default": "https://upload.wikimedia.org/wikipedia/commons/f/f1/Grilled_plated_salmon_fillet.jpg",
}

TEMPLATES = [
    "stir-fry", "pasta", "skillet", "sheet-pan", "soup", "curry",
    "grain-bowl", "tacos", "frittata", "salad", "fried-rice", "casserole",
]
PROFILES = ["italian", "asian", "mexican", "canadian", "indian"]
PRIMARY_PROFILE = {
    "stir-fry": "asian",
    "pasta": "italian",
    "skillet": "canadian",
    "sheet-pan": "canadian",
    "soup": "canadian",
    "curry": "indian",
    "grain-bowl": "asian",
    "tacos": "mexican",
    "frittata": "italian",
    "salad": "italian",
    "fried-rice": "asian",
    "casserole": "canadian",
}


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "PantryWeekSmartChef/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())


def to_webp(src: Path, dest: Path) -> None:
    from PIL import Image

    im = Image.open(src)
    im = im.convert("RGB")
    w, h = im.size
    if w > 800:
        im = im.resize((800, int(h * 800 / w)), Image.Resampling.LANCZOS)
    im.save(dest, "WEBP", quality=82, method=6)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = []
    keys_needed: set[str] = set()
    for t in TEMPLATES:
        for p in PROFILES:
            keys_needed.add(f"{t}-{p}")
    keys_needed.add("default")

    url_by_key: dict[str, str] = {}
    for key in keys_needed:
        if key in CURATED:
            url_by_key[key] = CURATED[key]
            continue
        t, p = key.split("-", 1) if "-" in key else (key, "")
        if t in PRIMARY_PROFILE:
            prim = f"{t}-{PRIMARY_PROFILE[t]}"
            if prim in CURATED:
                url_by_key[key] = CURATED[prim]
                continue
        url_by_key[key] = CURATED["default"]

    for key, url in sorted(url_by_key.items()):
        webp = OUT / f"{key}.webp"
        if webp.exists() and webp.stat().st_size > 500:
            meta.append({"key": key, "file": f"photos/smart-chef/{key}.webp", "source_url": url})
            continue
        tmp = OUT / f"{key}.src"
        print("fetch", key)
        for attempt in range(5):
            try:
                download(url, tmp)
                break
            except Exception as err:
                wait = 8 * (attempt + 1)
                print("  retry", attempt + 1, err)
                time.sleep(wait)
        else:
            raise RuntimeError(f"failed to download {key}")
        to_webp(tmp, webp)
        tmp.unlink(missing_ok=True)
        meta.append({"key": key, "file": f"photos/smart-chef/{key}.webp", "source_url": url})
        time.sleep(2.5)

    META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Wrote {len(meta)} images to {OUT}")


if __name__ == "__main__":
    main()
