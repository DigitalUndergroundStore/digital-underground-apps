#!/usr/bin/env python3
"""Assign exactly one plan cuisine tag per recipe (Canadian, American, Italian, …)."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from proofread_recipes import load_batches, write_batch

JS_DIR = Path(__file__).resolve().parents[2] / "src" / "jhagho" / "js"

PLAN_CUISINES = (
    "canadian",
    "american",
    "italian",
    "mexican",
    "chinese",
    "indian",
    "british",
    "french",
    "mediterranean",
    "other",
)

COLLECTION_MAP = {
    "collection-indian": "indian",
    "collection-italian": "italian",
    "collection-mexican": "mexican",
    "collection-texmex": "mexican",
    "collection-asian": "chinese",
    "collection-pub": "british",
}

CANADIAN = re.compile(
    r"(canadian|canada|poutine|tourti[eè]re|nanaimo|montreal|beaver tail|peameal|butter tart|"
    r"maple (?:bacon|glazed|syrup)|back bacon|donair|bannock|timbits|caesar cocktail|"
    r"nova scotia|halifax|vancouver|toronto|quebec|ontario|alberta|manitoba|"
    r"split pea soup canadian|kraft dinner|ketchup chips)",
    re.I,
)
MEXICAN = re.compile(
    r"(mexican|mexico|tex-?mex|enchilada|tamale|tostada|quesadilla|fajita|burrito|"
    r"carnitas|mole\b|chilaquiles|pozole|elote|huevos rancheros|salsa verde|"
    r"guacamole|taco|nachos|chipotle|jalape[nñ]o popper)",
    re.I,
)
ITALIAN = re.compile(
    r"(italian|italy|pasta\b|lasagna|lasagne|spaghetti|fettuccine|penne|ravioli|"
    r"risotto|osso buco|parmigiana|parmesan|marinara|bolognese|carbonara|"
    r"pesto\b|gnocchi|polenta|bruschetta|caprese|minestrone|tiramisu|"
    r"ciabatta|prosciutto|mozzarella|neapolitan|sicilian|calzone|stromboli)",
    re.I,
)
CHINESE = re.compile(
    r"(chinese|china|sichuan|szechuan|cantonese|dim sum|wonton|dumpling|"
    r"chow mein|lo mein|kung pao|mapo|char siu|peking|hot pot|congee|"
    r"fried rice|stir.?fry|bao\b|spring roll|egg roll|general tso|orange chicken)",
    re.I,
)
INDIAN = re.compile(
    r"(indian|india|curry\b|masala|tikka|tandoori|biryani|dal\b|dosa\b|"
    r"samosa|naan\b|chana|paneer|korma|vindaloo|butter chicken|"
    r"chana masala|palak|saag|rogan josh|pakora)",
    re.I,
)
BRITISH = re.compile(
    r"(british|english|scottish|welsh|irish|uk\b|yorkshire|bangers|toad in the hole|"
    r"shepherd'?s pie|cottage pie|fish and chips|bubble and squeak|"
    r"ploughman|cornish|scones?\b(?!.*soup)|crumpet|full english|"
    r"bread and butter pudding|sticky toffee|spotted dick|bangers and mash)",
    re.I,
)
FRENCH = re.compile(
    r"(french|france|coq au|ratatouille|bouillabaisse|quiche|croissant|"
    r"cr[eê]pe|souffl[eé]|cassoulet|confit|beurre blanc|hollandaise|"
    r"b[eé]arnaise|gratin dauphinois|tarte tatin|beef bourguignon|"
    r"onion soup|french toast|french onion)",
    re.I,
)
MEDITERRANEAN = re.compile(
    r"(mediterranean|greek|turkish|lebanese|middle eastern|moroccan|spanish|"
    r"portuguese|israeli|tunisian|hummus|falafel|shawarma|gyro|tzatziki|"
    r"moussaka|paella|tapas|tagine|couscous|harissa|feta|dolma|"
    r"shakshuka|baba ganoush|tabbouleh|baklava)",
    re.I,
)
AMERICAN = re.compile(
    r"(american|\busa\b|u\.s\.|southern|cajun|creole|new england|texas|philly|"
    r"buffalo wings|bbq|barbecue|meatloaf|pot roast|sloppy joe|jambalaya|gumbo|"
    r"mac and cheese|grits|cornbread|biscuits and gravy|clam chowder|"
    r"cheesesteak|lobster roll|po.? ?boy|pulled pork|brisket|"
    r"thanksgiving|pumpkin pie|pecan pie|key lime|apple pie|"
    r"chicken and waffles|corn dog|hot dog|hamburger|cheeseburger|"
    r"ranch\b|deviled eggs|potato salad|green bean casserole|"
    r"cincinnati|memphis|carolina|midwestern|pedernales|usda)",
    re.I,
)


def haystack(recipe: dict) -> str:
    parts = [recipe.get("name") or "", recipe.get("sourceUrl") or ""]
    for tag in recipe.get("tags") or []:
        parts.append(str(tag))
    for ing in recipe.get("ingredients") or []:
        parts.append(str(ing.get("item") or ""))
    return " ".join(parts).lower()


def strip_cuisine_tags(tags: list) -> list[str]:
    out = []
    for tag in tags or []:
        t = str(tag).lower()
        if t in PLAN_CUISINES:
            continue
        out.append(tag)
    return out


def infer_cuisine(recipe: dict) -> str:
    tags = [str(t).lower() for t in (recipe.get("tags") or [])]
    if "canadian" in tags:
        return "canadian"
    for col, cuisine in COLLECTION_MAP.items():
        if col in tags:
            return cuisine
    blob = haystack(recipe)
    checks = (
        (CANADIAN, "canadian"),
        (MEXICAN, "mexican"),
        (ITALIAN, "italian"),
        (CHINESE, "chinese"),
        (INDIAN, "indian"),
        (BRITISH, "british"),
        (FRENCH, "french"),
        (MEDITERRANEAN, "mediterranean"),
        (AMERICAN, "american"),
    )
    for pattern, cuisine in checks:
        if pattern.search(blob):
            return cuisine
    url = (recipe.get("sourceUrl") or "").lower()
    if "wikibooks.org" in url and "cookbook:" in url:
        slug = url.split("cookbook:", 1)[-1]
        if any(x in slug for x in ("_mexican", "mexico", "taco", "enchilada")):
            return "mexican"
        if any(x in slug for x in ("_italian", "pasta", "spaghetti", "lasagna")):
            return "italian"
        if any(x in slug for x in ("_indian", "curry", "masala", "biryani")):
            return "indian"
        if any(x in slug for x in ("_chinese", "wonton", "dim_sum", "sichuan")):
            return "chinese"
        if any(x in slug for x in ("_french", "coq_au", "ratatouille")):
            return "french"
        if any(x in slug for x in ("_greek", "hummus", "falafel", "paella")):
            return "mediterranean"
    if "usda" in url or "nutrition.gov" in url:
        return "american"
    return "other"


def tag_recipe(recipe: dict) -> tuple[dict, str]:
    cuisine = infer_cuisine(recipe)
    tags = strip_cuisine_tags(list(recipe.get("tags") or []))
    tags.append(cuisine)
    recipe["tags"] = tags
    return recipe, cuisine


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--report", type=Path, default=Path("/tmp/plan-cuisine-tags.json"))
    args = ap.parse_args()

    batches = load_batches()
    counts = {c: 0 for c in PLAN_CUISINES}
    samples: dict[str, list[str]] = {c: [] for c in PLAN_CUISINES}

    for batch_file, recipes in batches.items():
        for recipe in recipes:
            _, cuisine = tag_recipe(recipe)
            counts[cuisine] += 1
            if len(samples[cuisine]) < 3:
                samples[cuisine].append(f"{recipe.get('id')}: {recipe.get('name')}")

    report = {"counts": counts, "samples": samples, "total": sum(counts.values())}
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(counts, indent=2))

    if not args.dry_run:
        for batch_file, recipes in batches.items():
            write_batch(batch_file, recipes)


if __name__ == "__main__":
    main()
