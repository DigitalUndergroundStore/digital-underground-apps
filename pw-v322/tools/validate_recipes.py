#!/usr/bin/env python3
"""Check rebuilt recipes for attribution, units, filler, and step coverage."""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
ALLOWED = {
    "CC BY-SA 4.0",
    "CC BY 4.0",
    "CC BY 3.0",
    "CC0",
    "public domain",
    "Open Government Licence - Canada",
    "original",
}
FILLER = (
    "as listed",
    "main ingredient",
    "any sides",
    "if the recipe calls",
    "protein as needed",
    "vegetables or seafood",
    "kimchi, or peas",
    "pat protein",
)
UNITS = {
    "cup", "tbsp", "tsp", "oz", "lb", "g", "kg", "ml", "l", "clove", "can",
    "slice", "piece", "fillet", "pinch", "dash", "medium", "large", "small",
    "whole", "link", "leaf", "strip", "breast", "thigh", "chop", "wing",
    "stalk", "sprig", "bunch", "head", "ear", "stick", "package", "bag", "jar",
    "sheet", "cube", "knob", "rasher",
}
PROTEIN = re.compile(
    r"\b(chicken|turkey|beef|pork|lamb|fish|salmon|cod|shrimp|prawn|sausage|meatball|meatloaf|steak|bacon|ham|tuna|clam|mussel)\b",
    re.I,
)
GROUND = re.compile(r"ground|meatball|meatloaf|sausage|taco meat|chili", re.I)
POULTRY = re.compile(r"chicken|turkey", re.I)
PORKFISH = re.compile(r"pork chop|tenderloin|salmon|cod|fish|shrimp|prawn|tuna", re.I)

STOP = {
    "and", "with", "the", "a", "an", "of", "or", "style", "classic", "homestyle",
    "weeknight", "sheet", "pan", "skillet", "one", "slow", "cooker", "baked",
}


def tokens(text: str) -> set:
    return {w for w in re.findall(r"[a-z]{4,}", text.lower()) if w not in STOP}


def load_recipes():
    paths = [
        ROOT / "tools" / "adapted" / "r001-r062.json",
        ROOT / "tools" / "adapted" / "r063-r124.json",
        ROOT / "tools" / "adapted" / "r125-r186.json",
        ROOT / "tools" / "adapted" / "r187-r248.json",
    ]
    if all(p.exists() for p in paths):
        recipes = []
        for p in paths:
            recipes.extend(json.loads(p.read_text()))
        return recipes
    # Fall back to the JS library if the batches were already emitted.
    return None


def check(recipe: dict) -> list:
    problems = []
    rid = recipe.get("id")
    name = recipe.get("name") or ""
    ingredients = recipe.get("ingredients") or []
    steps = recipe.get("steps") or []
    blob = " ".join(steps).lower()
    if len(steps) < 6:
        problems.append(f"only {len(steps)} steps")
    if len(steps) > 12:
        problems.append(f"{len(steps)} steps")
    for i, step in enumerate(steps, 1):
        low = step.lower().strip()
        if low in {"serve hot.", "serve hot", "serve."}:
            problems.append(f"step {i} is only serve hot")
        for phrase in FILLER:
            if phrase in low:
                problems.append(f"step {i} filler '{phrase}'")
        if len(step) < 25:
            problems.append(f"step {i} too short")
    for ing in ingredients:
        unit = (ing.get("unit") or "").lower()
        if unit not in UNITS:
            problems.append(f"bad unit {unit!r} on {ing.get('item')}")
        if not isinstance(ing.get("qty"), (int, float)) or ing.get("qty") <= 0:
            problems.append(f"bad qty on {ing.get('item')}")
        item = ing.get("item") or ""
        words = [w for w in tokens(item) if len(w) >= 4]
        if words and not any(w in blob or w[:-1] in blob for w in words):
            # allow garlic/clove style and simple stems
            if not any(w[:5] in blob for w in words if len(w) >= 5):
                problems.append(f"unused {item}")
    title_words = [w for w in tokens(name) if w not in {
        "soup", "salad", "skillet", "sheet", "dinner", "lunch", "breakfast",
        "sandwich", "sandwiches", "casserole", "bake", "baked", "style",
        "classic", "homestyle", "weeknight", "creamy", "spicy", "easy",
    }]
    ing_blob = " ".join((i.get("item") or "") for i in ingredients).lower()
    for word in title_words:
        if word not in ing_blob and word.rstrip("s") not in ing_blob and word not in ("maple", "honey", "garlic", "lemon", "herb", "herbs"):
            # flavour words may live in a sauce name; flag only distinctive foods
            if word in {
                "chicken", "beef", "pork", "lamb", "salmon", "shrimp", "tuna",
                "bean", "beans", "tomato", "pasta", "rice", "egg", "eggs",
                "cheese", "mushroom", "mushrooms", "potato", "potatoes",
                "broccoli", "black", "clam", "clams", "falafel", "pesto",
            }:
                if word.rstrip("s") not in ing_blob and word not in ing_blob:
                    problems.append(f"title word {word} missing from ingredients")
    attr = recipe.get("attribution") or {}
    licence = attr.get("licence")
    if licence not in ALLOWED:
        problems.append(f"licence {licence!r}")
    if attr.get("original"):
        if attr.get("sources"):
            problems.append("original has sources")
        if attr.get("adapted"):
            problems.append("original marked adapted")
    else:
        if not attr.get("sources"):
            problems.append("sourced recipe has no sources")
        if not attr.get("sourceUrl", "").startswith("https://"):
            problems.append("missing sourceUrl")
        if "wikibooks.org" not in attr.get("sourceUrl", "") and licence == "CC BY-SA 4.0":
            problems.append("CC BY-SA url is not wikibooks")
    names = ing_blob
    if PROTEIN.search(names) or PROTEIN.search(name):
        if not re.search(r"\d+\s*°f", blob, re.I) and "165" not in blob and "160" not in blob and "145" not in blob:
            problems.append("protein recipe has no temperature")
    if recipe.get("libraryRev") != 2:
        problems.append("libraryRev")
    return [f"{rid}: {p}" for p in problems]


def main() -> None:
    recipes = load_recipes()
    if not recipes:
        print("no adapted batches yet")
        sys.exit(2)
    ids = [r["id"] for r in recipes]
    problems = []
    if ids != [f"r{n}" for n in range(1, 249)]:
        problems.append(f"id sequence {ids[:3]}...{ids[-3:]} count={len(ids)}")
    for recipe in recipes:
        problems.extend(check(recipe))
    sourced = sum(1 for r in recipes if not (r.get("attribution") or {}).get("original"))
    original = len(recipes) - sourced
    print(f"recipes={len(recipes)} sourced={sourced} original={original} problems={len(problems)}")
    for line in problems[:200]:
        print(line)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
