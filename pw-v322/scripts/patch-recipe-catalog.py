#!/usr/bin/env python3
"""Rewrite generic template steps and fix ingredient mismatches in r37–r126."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRA = ROOT / "jhagho" / "js" / "recipes-extra.js"
BUILD = Path(__file__).resolve().parent / "build-recipes-catalog.py"


def load_catalog() -> list[dict]:
    text = EXTRA.read_text(encoding="utf-8")
    m = re.search(r"var extra = (\[.*\]);", text, re.S)
    if not m:
        raise SystemExit("Could not parse recipes-extra.js")
    return json.loads(m.group(1))


def is_template(recipe: dict) -> bool:
    steps = " ".join(recipe.get("steps") or [])
    return "main ingredient" in steps or "Serve over rice or with warm bread" in steps and "smoked paprika" in steps


def main_protein(recipe: dict) -> str:
    name = recipe["name"].lower()
    for ing in recipe.get("ingredients") or []:
        item = str(ing.get("item", "")).lower()
        for key in (
            "chicken", "shrimp", "salmon", "cod", "tofu", "beef", "pork", "lamb",
            "sausage", "steak", "tuna", "mussels", "paneer", "falafel", "pierogi",
        ):
            if key in item or key in name:
                return item if key in item else key
    return "the main ingredient"


def rewrite(recipe: dict) -> dict:
    name = recipe["name"]
    lower = name.lower()
    mins = recipe.get("minutes") or 25
    steps: list[str] = []

    if "banh mi" in lower:
        recipe["ingredients"] = [
            {"qty": 14, "unit": "oz", "item": "firm tofu"},
            {"qty": 2, "unit": "cup", "item": "cooked rice"},
            {"qty": 1, "unit": "cup", "item": "carrot"},
            {"qty": 1, "unit": "", "item": "cucumber"},
            {"qty": 3, "unit": "tbsp", "item": "soy sauce"},
            {"qty": 2, "unit": "tbsp", "item": "rice vinegar"},
            {"qty": 1, "unit": "tbsp", "item": "maple syrup"},
            {"qty": 2, "unit": "clove", "item": "garlic"},
            {"qty": 2, "unit": "tbsp", "item": "vegetable oil"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
        ]
        steps = [
            "Press tofu 10 minutes, then cut into cubes. Julienne carrot and slice cucumber (5 minutes).",
            "Whisk soy sauce, rice vinegar, maple syrup, and minced garlic for the dressing.",
            "Heat oil in a skillet over medium-high. Pan-fry tofu 4 minutes per side until crisp.",
            "Toss warm rice with half the dressing. Divide among bowls.",
            "Top with tofu, vegetables, remaining dressing, and salt. Serve within 5 minutes.",
        ]
    elif "shakshuka" in lower and "toast" in lower:
        recipe["ingredients"] = [
            {"qty": 1, "unit": "can", "item": "crushed tomatoes"},
            {"qty": 4, "unit": "", "item": "egg"},
            {"qty": 4, "unit": "slice", "item": "bread"},
            {"qty": 1, "unit": "tbsp", "item": "olive oil"},
            {"qty": 1, "unit": "", "item": "yellow onion"},
            {"qty": 1, "unit": "tsp", "item": "cumin"},
            {"qty": 0.5, "unit": "tsp", "item": "paprika"},
            {"qty": 0.25, "unit": "tsp", "item": "salt"},
        ]
        steps = [
            "Dice onion. Warm oil in a skillet and cook onion 4 minutes until soft.",
            "Add cumin, paprika, and salt; stir 30 seconds. Pour in tomatoes and simmer 6 minutes.",
            "Make four wells and crack in eggs. Cover and cook 5–6 minutes until whites set.",
            "Toast bread while the eggs finish.",
            "Spoon shakshuka over toast and serve immediately.",
        ]
    elif "colcannon" in lower:
        recipe["tags"] = [t for t in recipe.get("tags", []) if t != "chicken"] + ["vegetarian", "gluten-free", "budget", "easy"]
        recipe["ingredients"] = [
            {"qty": 1.5, "unit": "lb", "item": "potato"},
            {"qty": 4, "unit": "cup", "item": "kale"},
            {"qty": 0.5, "unit": "cup", "item": "milk"},
            {"qty": 4, "unit": "tbsp", "item": "butter"},
            {"qty": 4, "unit": "", "item": "scallion"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
            {"qty": 0.25, "unit": "tsp", "item": "black pepper"},
        ]
        steps = [
            "Peel potatoes and cut into chunks. Boil in salted water 14 minutes until tender; drain.",
            "Mash with milk, butter, salt, and pepper until creamy (3 minutes).",
            "Wilt chopped kale in a dry pan 2 minutes.",
            "Fold kale and sliced scallions into the mash.",
            "Serve hot with an extra knob of butter if you like.",
        ]
    elif "quesadilla" in lower:
        recipe["ingredients"] = [
            {"qty": 8, "unit": "", "item": "flour tortilla"},
            {"qty": 1, "unit": "can", "item": "artichoke hearts"},
            {"qty": 2, "unit": "cup", "item": "spinach"},
            {"qty": 1.5, "unit": "cup", "item": "shredded cheese"},
            {"qty": 2, "unit": "tbsp", "item": "olive oil"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
        ]
        steps = [
            "Drain and chop artichokes. Wilt spinach in a dry pan 2 minutes; squeeze out moisture.",
            "Lay tortillas on a board. Spread spinach, artichokes, and cheese on half of each.",
            "Fold tortillas closed and brush outsides with oil.",
            "Cook in a skillet over medium heat 3 minutes per side until golden and melted.",
            "Rest 1 minute, slice, and serve.",
        ]
    elif "couscous" in lower and "shakshuka" in lower:
        recipe["ingredients"] = [
            {"qty": 1, "unit": "cup", "item": "couscous"},
            {"qty": 1, "unit": "can", "item": "crushed tomatoes"},
            {"qty": 4, "unit": "", "item": "egg"},
            {"qty": 1, "unit": "tbsp", "item": "olive oil"},
            {"qty": 1, "unit": "", "item": "onion"},
            {"qty": 1, "unit": "tsp", "item": "cumin"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
        ]
        steps = [
            "Stir couscous with 1 cup boiling water and a pinch of salt; cover 5 minutes.",
            "Dice onion. Cook in oil 4 minutes, add cumin, then tomatoes; simmer 8 minutes.",
            "Make wells in the sauce and crack in eggs; cover 6 minutes until set.",
            "Fluff couscous with a fork.",
            "Serve shakshuka over couscous.",
        ]
    elif "poke" in lower:
        protein = "sushi-grade tuna"
        recipe["ingredients"] = [
            {"qty": 12, "unit": "oz", "item": protein},
            {"qty": 2, "unit": "cup", "item": "cooked rice"},
            {"qty": 1, "unit": "", "item": "avocado"},
            {"qty": 2, "unit": "tbsp", "item": "soy sauce"},
            {"qty": 1, "unit": "tbsp", "item": "sesame oil"},
            {"qty": 1, "unit": "", "item": "scallion"},
            {"qty": 1, "unit": "tsp", "item": "sesame seeds"},
        ]
        steps = [
            "Cut tuna into bite-size cubes. Toss with soy sauce and sesame oil; chill 10 minutes.",
            "Cook or reheat rice. Slice avocado and scallions.",
            "Divide rice among bowls.",
            "Top with tuna, avocado, scallions, and sesame seeds.",
            "Serve within 15 minutes while the fish is cold and fresh.",
        ]
    elif "soup" in lower or "borscht" in lower or "bisque" in lower:
        veg = "beet" if "borscht" in lower else "vegetables"
        recipe["ingredients"] = [
            ing for ing in recipe.get("ingredients", [])
            if "cooked rice" not in str(ing.get("item", "")).lower()
        ]
        if "borscht" in lower and not any("beet" in str(i.get("item", "")).lower() for i in recipe["ingredients"]):
            recipe["ingredients"].insert(4, {"qty": 3, "unit": "", "item": "beet"})
        steps = [
            f"Dice onion, carrot, potato, and {veg} (6 minutes).",
            "Warm oil in a pot. Cook onion and garlic 4 minutes until soft.",
            f"Add vegetables, broth, and salt. Simmer {max(12, mins - 10)} minutes until tender.",
            "Blend partially for a silky body, or mash a ladle in the pot (2 minutes).",
            "Finish with parsley and serve hot.",
        ]
    elif "salad" in lower or "gado" in lower or "nicoise" in lower:
        recipe["ingredients"] = [
            ing for ing in recipe.get("ingredients", [])
            if "cooked rice" not in str(ing.get("item", "")).lower() and "feta" not in str(ing.get("item", "")).lower() or "nicoise" in lower
        ]
        if "soba" in lower:
            recipe["ingredients"] = [
                {"qty": 8, "unit": "oz", "item": "soba noodles"},
                {"qty": 2, "unit": "cup", "item": "cabbage"},
                {"qty": 1, "unit": "", "item": "cucumber"},
                {"qty": 2, "unit": "tbsp", "item": "soy sauce"},
                {"qty": 1, "unit": "tbsp", "item": "sesame oil"},
                {"qty": 1, "unit": "tbsp", "item": "rice vinegar"},
                {"qty": 1, "unit": "tbsp", "item": "sesame seeds"},
            ]
        if "gado" in lower:
            recipe["ingredients"] = [
                {"qty": 2, "unit": "cup", "item": "cabbage"},
                {"qty": 1, "unit": "cup", "item": "green beans"},
                {"qty": 2, "unit": "", "item": "boiled egg"},
                {"qty": 0.25, "unit": "cup", "item": "peanut butter"},
                {"qty": 1, "unit": "tbsp", "item": "soy sauce"},
                {"qty": 1, "unit": "tbsp", "item": "lime juice"},
                {"qty": 1, "unit": "tbsp", "item": "maple syrup"},
            ]
        steps = [
            "Prep vegetables and protein as needed (5–6 minutes).",
            "Whisk dressing ingredients until smooth.",
            "Cook noodles or blanch beans if the recipe calls for it (4–8 minutes).",
            "Toss everything with dressing just before serving.",
            "Serve chilled or at room temperature within 15 minutes.",
        ]
    elif "fried rice" in lower or ("rice" in lower and "coconut" in lower and "peas" in lower):
        toss_mins = 3 if mins < 22 else 5
        recipe["ingredients"] = [
            ing for ing in recipe.get("ingredients", [])
            if "cooked rice" in str(ing.get("item", "")).lower() or ing.get("item") not in ("onion",)
        ]
        if "kimchi" in lower:
            recipe["ingredients"].insert(3, {"qty": 1, "unit": "cup", "item": "kimchi"})
        steps = [
            "Break up cold rice with your hands (2 minutes).",
            "Heat oil in a wok over high heat. Stir-fry garlic 30 seconds.",
            f"Add rice and soy sauce; toss {toss_mins} minutes until steaming and lightly crisp.",
            "Fold in scallions, kimchi, or peas off heat as listed.",
            "Squeeze lime over the top and serve hot.",
        ]
    elif "omelette" in lower or "frittata" in lower or ("egg" in lower and "persian" in lower):
        steps = [
            "Whisk eggs, milk, salt, and pepper (2 minutes).",
            "Melt butter in an oven-safe nonstick pan over medium-low heat.",
            "Cook vegetables in the butter 3 minutes until tender.",
            f"Pour in eggs; cook {max(8, mins - 8)} minutes, stirring gently, until just set.",
            "Top with herbs and serve warm.",
        ]
    elif any(x in lower for x in ("pasta", "linguine", "tortellini", "gnocchi", "orzo")) and "salad" not in lower:
        simmer = max(8, mins - 12)
        steps = [
            "Boil pasta in salted water until al dente; drain, reserving 1/4 cup pasta water.",
            "Warm oil; cook garlic 30 seconds until fragrant.",
            f"Simmer sauce with salt {simmer} minutes.",
            "Toss pasta with sauce and pasta water 2 minutes until glossy.",
            "Finish with herbs or cheese and serve immediately.",
        ]
    elif "skewer" in lower or "jerk" in lower:
        protein = main_protein(recipe)
        steps = [
            f"Cut {protein} into chunks. Marinate with oil, garlic, paprika, and salt 10 minutes.",
            "Thread onto skewers if using; heat grill or broiler to high.",
            f"Cook {max(10, mins - 12)} minutes, turning once, until charred and cooked through.",
            "Rest 3 minutes off heat.",
            "Serve with rice and lime wedges.",
        ]
    elif "flatbread" in lower or "pizza" in lower or "khachapuri" in lower or "cheese flatbread" in lower:
        steps = [
            "Heat oven to 450°F. Stretch dough on a oiled sheet pan.",
            "Top with cheese, vegetables, and spices as listed.",
            f"Bake {max(10, mins - 12)} minutes until the crust is golden and cheese bubbles.",
            "Rest 2 minutes, then slice.",
            "Serve hot.",
        ]
    elif "schnitzel" in lower or "pierogi" in lower:
        steps = [
            "Pat protein or pierogi dry. Season with salt.",
            "Heat oil in a wide skillet over medium-high.",
            f"Pan-fry {max(8, mins - 10)} minutes per side until golden and cooked through.",
            "Drain on a rack 2 minutes.",
            "Serve with mustard, lemon, or sour cream.",
        ]
    elif "risotto" in lower or "paella" in lower:
        steps = [
            "Warm broth in a small pot. Toast rice in oil with onion 3 minutes.",
            "Add garlic and paprika; stir 30 seconds.",
            f"Add broth ladle by ladle, stirring {max(16, mins - 12)} minutes until rice is creamy.",
            "Fold in vegetables or seafood during the last 5 minutes.",
            "Rest 2 minutes off heat and serve from the pan.",
        ]
    elif "mussel" in lower:
        steps = [
            "Rinse mussels and discard any that stay open. Dice onion and garlic.",
            "Cook onion in oil 4 minutes; add garlic, paprika, and coconut milk.",
            "Bring to a simmer, add mussels, cover 5–6 minutes until shells open.",
            "Discard any mussels that do not open.",
            "Serve with broth and crusty bread.",
        ]
    elif "steak" in lower or "chimichurri" in lower:
        steps = [
            "Pat steak dry; season with salt and pepper.",
            "Heat oil in a cast-iron skillet over high heat.",
            f"Sear steak {max(6, mins // 4)} minutes per side for medium, less for rare.",
            "Rest 5 minutes before slicing against the grain.",
            "Spoon chimichurri or pan juices over the top and serve.",
        ]
    elif "falafel" in lower or "pita" in lower:
        steps = [
            "Mix falafel batter or thaw mix per package (3 minutes).",
            "Shape balls and brush with oil.",
            f"Bake at 425°F {max(14, mins - 10)} minutes, flipping once, until crisp.",
            "Warm pitas in a dry skillet 1 minute per side.",
            "Stuff with falafel, salad, and sauce; serve immediately.",
        ]
    elif "nacho" in lower:
        steps = recipe.get("steps") or []
    elif "brussels" in lower:
        recipe["ingredients"] = [
            {"qty": 1, "unit": "lb", "item": "Brussels sprouts"},
            {"qty": 2, "unit": "tbsp", "item": "honey"},
            {"qty": 1, "unit": "tbsp", "item": "soy sauce"},
            {"qty": 1, "unit": "tbsp", "item": "sesame oil"},
            {"qty": 1, "unit": "tbsp", "item": "sesame seeds"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
        ]
        steps = [
            "Heat oven to 425°F. Halve Brussels sprouts.",
            "Toss with oil and salt on a sheet pan.",
            "Roast 18 minutes until browned on the edges.",
            "Whisk honey, soy sauce, and sesame oil; toss with sprouts 2 minutes.",
            "Finish with sesame seeds and serve.",
        ]
    elif "fennel" in lower and "sheet" in lower:
        recipe["ingredients"] = [
            {"qty": 12, "unit": "oz", "item": "Italian sausage"},
            {"qty": 2, "unit": "", "item": "fennel bulb"},
            {"qty": 1, "unit": "", "item": "onion"},
            {"qty": 2, "unit": "tbsp", "item": "olive oil"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
            {"qty": 0.25, "unit": "tsp", "item": "black pepper"},
        ]
        steps = [
            "Heat oven to 425°F. Slice fennel, onion, and sausage.",
            "Toss on a sheet pan with oil, salt, and pepper.",
            "Roast 22 minutes, stirring once, until sausage is browned and fennel is tender.",
            "Rest 3 minutes.",
            "Serve with crusty bread or over polenta.",
        ]
    elif "zucchini fritter" in lower:
        recipe["ingredients"] = [
            {"qty": 2, "unit": "", "item": "zucchini"},
            {"qty": 2, "unit": "", "item": "egg"},
            {"qty": 0.5, "unit": "cup", "item": "flour"},
            {"qty": 0.25, "unit": "cup", "item": "parmesan"},
            {"qty": 2, "unit": "clove", "item": "garlic"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
            {"qty": 2, "unit": "tbsp", "item": "olive oil"},
        ]
        steps = [
            "Grate zucchini; squeeze out moisture (4 minutes).",
            "Stir zucchini with eggs, flour, parmesan, garlic, and salt.",
            "Heat oil in a skillet over medium. Scoop batter into patties.",
            "Cook 3 minutes per side until golden.",
            "Serve with yogurt or sour cream.",
        ]
    elif "teriyaki" in lower and "salmon" in lower:
        recipe["ingredients"] = [
            {"qty": 4, "unit": "fillet", "item": "salmon"},
            {"qty": 3, "unit": "tbsp", "item": "soy sauce"},
            {"qty": 2, "unit": "tbsp", "item": "maple syrup"},
            {"qty": 1, "unit": "tbsp", "item": "rice vinegar"},
            {"qty": 1, "unit": "tbsp", "item": "vegetable oil"},
            {"qty": 2, "unit": "clove", "item": "garlic"},
            {"qty": 1, "unit": "tbsp", "item": "ginger"},
        ]
        steps = [
            "Whisk soy sauce, maple syrup, vinegar, garlic, and ginger for teriyaki glaze.",
            "Pat salmon dry. Heat oil in a skillet over medium-high.",
            "Sear salmon 3 minutes skin-side up, then flip and brush with glaze.",
            "Cook 4 more minutes until just opaque in the center.",
            "Spoon extra glaze over the fish and serve with rice.",
        ]
    elif "tikka" in lower:
        recipe["ingredients"] = [
            {"qty": 1.25, "unit": "lb", "item": "chicken thighs"},
            {"qty": 0.5, "unit": "cup", "item": "yogurt"},
            {"qty": 2, "unit": "tbsp", "item": "tikka paste"},
            {"qty": 1, "unit": "tbsp", "item": "lemon juice"},
            {"qty": 1, "unit": "head", "item": "butter lettuce"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
        ]
        steps = [
            "Cut chicken into strips. Toss with yogurt, tikka paste, lemon, and salt; rest 10 minutes.",
            "Heat a grill pan over high heat. Cook chicken 3 minutes per side until charred.",
            "Rest 3 minutes, then slice.",
            "Separate lettuce leaves and rinse.",
            "Spoon chicken into lettuce cups and serve.",
        ]
    elif "mango lassi" in lower:
        recipe["ingredients"] = [
            {"qty": 2, "unit": "cup", "item": "frozen mango"},
            {"qty": 1, "unit": "cup", "item": "yogurt"},
            {"qty": 0.5, "unit": "cup", "item": "milk"},
            {"qty": 2, "unit": "tbsp", "item": "honey"},
            {"qty": 0.25, "unit": "tsp", "item": "cardamom"},
        ]
        steps = [
            "Blend mango, yogurt, milk, honey, and cardamom 60 seconds until smooth.",
            "Taste and add honey if needed.",
            "Pour into bowls.",
            "Top with extra yogurt and a pinch of cardamom.",
            "Serve chilled immediately.",
        ]
    elif "wrap" in lower and "hummus" in lower:
        recipe["ingredients"] = [
            {"qty": 4, "unit": "", "item": "tortilla"},
            {"qty": 0.75, "unit": "cup", "item": "hummus"},
            {"qty": 1, "unit": "cup", "item": "roasted red pepper"},
            {"qty": 2, "unit": "cup", "item": "spinach"},
            {"qty": 1, "unit": "", "item": "cucumber"},
            {"qty": 2, "unit": "tbsp", "item": "olive oil"},
            {"qty": 0.5, "unit": "tsp", "item": "salt"},
        ]
        steps = [
            "Slice cucumber and drain roasted peppers.",
            "Spread hummus over each tortilla.",
            "Layer spinach, peppers, and cucumber; drizzle with oil and salt.",
            "Roll tightly, tucking ends.",
            "Slice in half and serve.",
        ]
    elif "fritter" not in lower and "stuffed" in lower:
        steps = [
            "Heat oven to 375°F. Halve peppers and remove seeds.",
            "Brown filling ingredients in a skillet 8 minutes with onion and garlic.",
            "Stuff peppers with the filling and add a splash of water to the dish.",
            f"Bake {max(18, mins - 12)} minutes until peppers are tender.",
            "Rest 5 minutes and serve.",
        ]
    else:
        protein = main_protein(recipe)
        simmer = max(5, mins - 18)
        recipe["ingredients"] = [
            ing for ing in recipe.get("ingredients", [])
            if "cooked rice" not in str(ing.get("item", "")).lower()
        ]
        steps = [
            "Dice onion and mince garlic (4 minutes).",
            f"Heat oil in a skillet over medium-high. Cook {protein} 8–10 minutes until done.",
            "Add onion, garlic, spices, and salt; cook 3 minutes.",
            f"Add a splash of water, cover, and simmer {simmer} minutes.",
            "Serve hot with any sides listed in the ingredients.",
        ]

    recipe["steps"] = steps
    return recipe


def write_extra(catalog: list[dict]) -> None:
    payload = json.dumps(catalog, indent=2, ensure_ascii=False)
    lines = [
        "/* Pantry Week — expanded library r37–r126 */",
        '"use strict";',
        "(function () {",
        "  if (typeof PW_STARTERS === 'undefined') return;",
        "  var extra = " + payload + ";",
        "  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);",
        "})();",
        "",
    ]
    EXTRA.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    catalog = load_catalog()
    patched = 0
    for i, recipe in enumerate(catalog):
        if is_template(recipe) or recipe["id"] in ("r101", "r69", "r85", "r122", "r57", "r58", "r62", "r79", "r115", "r119", "r99"):
            catalog[i] = rewrite(recipe)
            patched += 1
    write_extra(catalog)
    print(f"Patched {patched} recipes in {EXTRA}")


if __name__ == "__main__":
    main()
