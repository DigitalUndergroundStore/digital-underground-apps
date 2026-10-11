#!/usr/bin/env python3
"""Generate jhagho/js/recipes-extra.js (r37+) and js/photos-map.js data."""
from __future__ import annotations

import json
import textwrap
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "jhagho" / "js" / "recipes-extra.js"

# 90 new recipes (r37–r126). Original r1–r36 stay in recipes.js.
RECIPES = []

def R(
    rid: str,
    name: str,
    minutes: int,
    servings: int,
    tags: list[str],
    ingredients: list[tuple],
    steps: list[str],
):
    RECIPES.append(
        {
            "id": rid,
            "name": name,
            "minutes": minutes,
            "servings": servings,
            "tags": tags,
            "ingredients": [
                {"qty": q, "unit": u, "item": it} for q, u, it in ingredients
            ],
            "steps": steps,
        }
    )


def dinner_veg(
    n, name, min, serv, diet, cost, diff, ings, steps, meal="dinner"
):
    tags = [meal, diet, cost, diff]
    if "vegetarian" not in diet and "vegan" not in diet:
        tags.append("high-protein")
    R(f"r{n}", name, min, serv, tags, ings, steps)


CUISINES = [
    ("Thai", ["basil", "lime", "coconut milk", "fish sauce"]),
    ("Mexican", ["cumin", "lime", "black beans", "corn"]),
    ("Indian", ["garam masala", "turmeric", "yogurt", "cilantro"]),
    ("Italian", ["basil", "parmesan", "tomato", "garlic"]),
    ("Japanese", ["soy sauce", "ginger", "sesame", "rice"]),
    ("Mediterranean", ["lemon", "olive oil", "feta", "oregano"]),
    ("Korean", ["gochujang", "sesame oil", "soy sauce", "garlic"]),
    ("Middle Eastern", ["tahini", "cumin", "parsley", "lemon"]),
]

PROTEINS = [
    "chicken breast", "chicken thighs", "ground turkey", "shrimp", "salmon fillet",
    "firm tofu", "black beans", "chickpeas", "lentils", "eggs",
]

BASES = [
    "jasmine rice", "brown rice", "quinoa", "pasta", "couscous",
    "tortillas", "pita bread", "potatoes", "sweet potato",
]

idx = 37
while idx <= 126:
    ci = (idx - 37) % len(CUISINES)
    cuisine, flavors = CUISINES[ci]
    prot = PROTEINS[(idx - 37) % len(PROTEINS)]
    base = BASES[(idx - 37) % len(BASES)]
    min = 15 + (idx % 26)
    serv = 4 if idx % 5 else 2
    is_veg = prot in ("firm tofu", "black beans", "chickpeas", "lentils", "eggs")
    diet = "vegan" if prot in ("firm tofu", "black beans", "chickpeas", "lentils") and idx % 3 == 0 else (
        "vegetarian" if is_veg else "gluten-free" if idx % 4 == 0 else "dairy-free"
    )
    if diet == "vegan":
        diet_tags = ["dinner" if idx % 3 else "lunch", "vegan", "gluten-free" if idx % 2 else "dairy-free"]
    elif diet == "vegetarian":
        diet_tags = ["breakfast" if idx % 7 == 0 else "lunch" if idx % 3 == 1 else "dinner", "vegetarian"]
    else:
        diet_tags = ["dinner", diet, "high-protein"]
    if idx % 11 == 0:
        diet_tags[0] = "breakfast"
    if idx % 13 == 0:
        diet_tags[0] = "lunch"
    if idx % 17 == 0:
        diet_tags.append("dessert" if "dessert" not in diet_tags else "snack")
    cost = "budget" if idx % 3 == 0 else "moderate" if idx % 3 == 1 else "splurge"
    diff = "easy" if idx % 3 == 0 else "medium" if idx % 3 == 1 else "hard"
    name = f"{cuisine} {prot.split()[0].title()} {base.split()[0].title()} Skillet"
    if idx % 5 == 0:
        name = f"Sheet-Pan {prot.title()} with {flavors[2].title()}"
    if idx % 7 == 0:
        name = f"One-Pot {cuisine} {base.title()} & {prot.title()}"
    if idx % 9 == 0:
        name = f"{cuisine} {prot.title()} Bowls"
    ings = [
        (1, "lb" if "ground" not in prot else "", prot.replace("ground ", "ground ")),
        (1.5, "cup", base if "rice" in base or "quinoa" in base else base),
        (2, "tbsp", "olive oil"),
        (2, "clove", "garlic"),
        (1, "", flavors[0] if flavors[0] not in ("basil", "parsley", "cilantro") else "onion"),
        (0.5, "tsp", "salt"),
        (0.25, "tsp", "black pepper"),
    ]
    if "coconut" in flavors[2]:
        ings.append((0.5, "cup", "coconut milk"))
    if "lime" in flavors:
        ings.append((1, "", "lime"))
    if "yogurt" in flavors and diet != "vegan":
        ings.append((0.5, "cup", "plain yogurt"))
    if "feta" in flavors and diet != "vegan":
        ings.append((0.5, "cup", "feta cheese"))
    steps = [
        f"Prep ingredients: chop aromatics (about 3 minutes).",
        f"Heat oil in a large skillet over medium-high. Cook {prot} 6–8 minutes until browned.",
        f"Add garlic and spices; stir 30 seconds until fragrant.",
        f"Add {base} and splash of water or broth. Simmer {max(8, min - 12)} minutes until tender.",
        f"Finish with fresh herbs and lime if using. Rest 2 minutes and serve (total about {min} minutes).",
    ]
    if "Sheet-Pan" in name:
        steps = [
            "Heat oven to 425°F (220°C). Line a sheet pan.",
            f"Toss {prot} and chopped vegetables with oil, salt, and spices.",
            f"Roast {min - 5} minutes, turning once, until cooked through.",
            "Rest 3 minutes. Serve with grains or bread on the side.",
        ]
    if "One-Pot" in name:
        steps = [
            "Warm oil in a deep pot. Brown protein 5 minutes.",
            "Stir in aromatics and grains. Add 2 cups water or broth.",
            f"Simmer covered {min - 8} minutes until grains are tender.",
            "Adjust salt. Garnish and serve hot.",
        ]
    if "Bowls" in name:
        steps = [
            f"Cook {base} according to package (about 12 minutes).",
            f"Sauté {prot} with spices 6 minutes.",
            "Layer bowls with grain, protein, and raw vegetables.",
            "Drizzle with sauce. Serve within 5 minutes.",
        ]
    # fix ingredient qty for lb
    fixed = []
    for q, u, it in ings:
        if it == prot and u == "lb" and "ground" in prot:
            fixed.append((1, "", prot))
        elif q == 1 and u == "lb" and it == prot:
            fixed.append((1.25, "lb", prot))
        else:
            fixed.append((q, u, it))
    R(f"r{idx}", name, min, serv, diet_tags + [cost, diff], fixed, steps)
    idx += 1

assert len(RECIPES) == 90

lines = [
    "/* Pantry Week — expanded library r37–r126. Appends to PW_STARTERS. */",
    '"use strict";',
    "(function () {",
    "  if (typeof PW_STARTERS === 'undefined') return;",
    "  var extra = " + json.dumps(RECIPES, indent=2) + ";",
    "  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);",
    "})();",
]
OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("Wrote", OUT, "recipes:", len(RECIPES))
