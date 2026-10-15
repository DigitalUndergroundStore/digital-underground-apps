/* Pantry Week — batch 1 library r127–r200 */
"use strict";
(function () {
  if (typeof PW_STARTERS === 'undefined') return;
  var extra = [
    {
      "id": "r127",
      "name": "Classic Tourtière",
      "minutes": 75,
      "servings": 8,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "medium",
        "moderate",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "ground pork"
        },
        {
          "qty": 0.5,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "dried sage"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "cinnamon"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "pie crust"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Dice onion and mince garlic.",
        "Sauté in a skillet over medium heat 6 minutes until soft.",
        "Add pork, beef, sage, cinnamon, salt, and pepper.",
        "Cook 12 minutes, breaking up meat, until browned. Ground meat is done at 160°F (71°C) inside.",
        "Cool filling 10 minutes. Heat oven to 375°F (190°C).",
        "Line a pie plate with one crust; fill, cover with top crust, and crimp edges.",
        "Cut vents and bake 35 minutes until golden.",
        "Rest 7 minutes before slicing."
      ]
    },
    {
      "id": "r128",
      "name": "Shepherd's Pie",
      "minutes": 55,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "high-protein",
        "easy",
        "splurge",
        "british"
      ],
      "ingredients": [
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "ground lamb"
        },
        {
          "qty": 2,
          "unit": "lb",
          "item": "russet potatoes"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "tomato paste"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "beef broth"
        },
        {
          "qty": 4,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "milk"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Peel potatoes and boil in salted water 18 minutes until tender; drain.",
        "Dice onion and carrot. Brown lamb in a skillet 8 minutes; add vegetables and cook 5 minutes. Ground meat is done at 160°F (71°C) inside.",
        "Stir in tomato paste and broth; simmer 10 minutes until thick.",
        "Mash potatoes with butter, milk, and salt.",
        "Spread lamb in a baking dish, top with potatoes, and bake at 400°F (205°C) 15 minutes until edges bubble."
      ]
    },
    {
      "id": "r129",
      "name": "Weeknight Butter Chicken",
      "minutes": 35,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "high-protein",
        "medium",
        "budget",
        "indian"
      ],
      "ingredients": [
        {
          "qty": 1.25,
          "unit": "lb",
          "item": "chicken thighs"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "coconut milk"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "tomato paste"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "garam masala"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "cooked rice"
        }
      ],
      "steps": [
        "Cut chicken into bite-size pieces.",
        "Dice onion and mince garlic.",
        "Melt 1 tablespoon butter in a skillet; sear chicken 6 minutes until lightly browned. The chicken is done at 165°F (74°C) inside.",
        "Add onion and garlic; cook 4 minutes.",
        "Stir in tomato paste and garam masala 1 minute.",
        "Pour in coconut milk and remaining butter; simmer 15 minutes until sauce thickens.",
        "Season with salt and serve over warm rice within 5 minutes."
      ]
    },
    {
      "id": "r130",
      "name": "Montreal Smoked Meat Sandwich",
      "minutes": 20,
      "servings": 4,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "easy",
        "moderate",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "smoked brisket"
        },
        {
          "qty": 4,
          "unit": "",
          "item": "rye bread"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "yellow mustard"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "sauerkraut"
        },
        {
          "qty": 8,
          "unit": "slice",
          "item": "swiss cheese"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Steam sliced brisket in a covered skillet with 2 tablespoons water for 8 minutes until hot.",
        "Butter one side of each bread slice.",
        "Layer mustard, brisket, sauerkraut, and cheese on unbuttered sides.",
        "Grill sandwiches in a skillet over medium heat 4 minutes per side until crisp.",
        "Rest 1 minute, slice, and serve with pepper if desired."
      ]
    },
    {
      "id": "r131",
      "name": "Toronto Peameal Bacon Sandwich",
      "minutes": 18,
      "servings": 4,
      "meal": "breakfast",
      "tags": [
        "breakfast",
        "main-meal",
        "easy",
        "moderate",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "peameal bacon"
        },
        {
          "qty": 4,
          "unit": "",
          "item": "kaiser roll"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 4,
          "unit": "slice",
          "item": "cheddar cheese"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "tomato"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "lettuce"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "yellow mustard"
        }
      ],
      "steps": [
        "Slice peameal bacon 1/4 inch thick.",
        "Fry bacon in a dry skillet over medium heat 3 minutes per side until edges curl.",
        "Split and lightly butter rolls; toast cut sides in the pan 2 minutes.",
        "Layer bacon, cheese, tomato, and lettuce on rolls with mustard.",
        "Serve warm within 5 minutes."
      ]
    },
    {
      "id": "r132",
      "name": "Weeknight Shortcut Poutine",
      "minutes": 25,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "easy",
        "moderate",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 24,
          "unit": "oz",
          "item": "frozen fries"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "cheese curds"
        },
        {
          "qty": 1.5,
          "unit": "cup",
          "item": "beef broth"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "cornstarch"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Bake fries on a sheet pan at 425°F (220°C) for 18 minutes, flipping once, until crisp.",
        "Whisk cornstarch into 1/4 cup cold broth until smooth.",
        "Simmer remaining broth with butter 4 minutes; whisk in slurry and cook 3 minutes until thick.",
        "Season gravy with pepper.",
        "Pile hot fries on plates, scatter curds, and ladle gravy over immediately."
      ]
    },
    {
      "id": "r133",
      "name": "Canadian Split Pea Soup",
      "minutes": 90,
      "servings": 8,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "cup",
          "item": "split peas"
        },
        {
          "qty": 8,
          "unit": "cup",
          "item": "chicken broth"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "smoked ham hock"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "celery stalk"
        },
        {
          "qty": 2,
          "unit": "bay",
          "item": "leaf"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Rinse peas. Dice onion, carrot, and celery.",
        "Combine peas, broth, ham hock, vegetables, and bay leaves in a pot; bring to a boil.",
        "Reduce heat and simmer 60 minutes, stirring every 15 minutes, until peas break down.",
        "Remove hock, shred meat, and return meat to pot. Discard bay.",
        "Season with salt and pepper; simmer 10 more minutes and serve hot."
      ]
    },
    {
      "id": "r134",
      "name": "Maple-Glazed Salmon",
      "minutes": 22,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "splurge",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 4,
          "unit": "fillet",
          "item": "salmon"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "maple syrup"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "soy sauce"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "dijon mustard"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        },
        {
          "qty": null,
          "unit": "",
          "item": "lemon wedges, to serve"
        }
      ],
      "steps": [
        "Heat oven to 400°F (205°C).",
        "Pat salmon dry and place on a lined sheet pan.",
        "Whisk maple syrup, soy sauce, mustard, oil, minced garlic, and pepper.",
        "Brush half the glaze over salmon.",
        "Bake 12 minutes until fish flakes; brush with remaining glaze in the last 2 minutes.",
        "Rest 3 minutes and serve with lemon wedges if desired."
      ]
    },
    {
      "id": "r135",
      "name": "Maple-Dijon Pork Chops",
      "minutes": 28,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 4,
          "unit": "",
          "item": "bone-in pork chop"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "maple syrup"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "dijon mustard"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "apple cider vinegar"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Season chops with salt and pepper.",
        "Heat oil in a skillet over medium-high.",
        "Sear chops 4 minutes per side.",
        "Whisk maple syrup, mustard, vinegar, and garlic.",
        "Reduce heat to medium; pour glaze over chops and cook 8 minutes, turning once, until 145°F (63°C) inside.",
        "Rest 5 minutes and spoon pan sauce over the top."
      ]
    },
    {
      "id": "r136",
      "name": "Dutch-Oven Pot Roast",
      "minutes": 180,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "medium",
        "moderate",
        "british"
      ],
      "ingredients": [
        {
          "qty": 3,
          "unit": "lb",
          "item": "chuck roast"
        },
        {
          "qty": 4,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 3,
          "unit": "",
          "item": "potato"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "beef broth"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "tomato paste"
        },
        {
          "qty": 2,
          "unit": "sprig",
          "item": "thyme"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "vegetable oil"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Heat oven to 325°F (165°C).",
        "Pat roast dry and season with salt.",
        "Brown roast in oiled Dutch oven 4 minutes per side over high heat.",
        "Add onion wedges; cook 3 minutes.",
        "Stir in tomato paste 1 minute.",
        "Add broth, thyme, carrots, and potatoes.",
        "Cover and braise 2 hours 30 minutes until fork-tender.",
        "Rest meat 10 minutes, slice, and serve with vegetables and pan juices."
      ]
    },
    {
      "id": "r137",
      "name": "Hearty Beef Stew",
      "minutes": 95,
      "servings": 6,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "american"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "stew beef"
        },
        {
          "qty": 4,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 3,
          "unit": "",
          "item": "potato"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "celery stalk"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 3,
          "unit": "cup",
          "item": "beef broth"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "tomato paste"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "flour"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "vegetable oil"
        },
        {
          "qty": null,
          "unit": "",
          "item": "crusty bread, to serve"
        }
      ],
      "steps": [
        "Cut beef into 1-inch cubes and toss with flour.",
        "Brown beef in oil in a pot 10 minutes in batches.",
        "Add diced onion and celery; cook 5 minutes.",
        "Stir in tomato paste 1 minute.",
        "Add broth, carrots, and potatoes; simmer covered 65 minutes until beef is tender.",
        "Skim fat if needed and serve hot with crusty bread."
      ]
    },
    {
      "id": "r138",
      "name": "Sunday Roast Chicken with Root Vegetables",
      "minutes": 75,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "",
          "item": "whole chicken"
        },
        {
          "qty": 4,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 3,
          "unit": "",
          "item": "potato"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "parsnip"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 2,
          "unit": "tsp",
          "item": "dried thyme"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Heat oven to 425°F (220°C).",
        "Pat chicken dry; rub with 1 tablespoon oil, thyme, salt, and pepper.",
        "Toss chopped root vegetables and onion with remaining oil on a roasting pan.",
        "Nestle chicken on the vegetables.",
        "Roast 55 minutes until thigh hits 165°F (74°C), basting once after 30 minutes.",
        "Rest chicken 10 minutes, carve, and serve with pan vegetables."
      ]
    },
    {
      "id": "r139",
      "name": "Perogies with Sausage & Caramelized Onions",
      "minutes": 35,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "easy",
        "moderate",
        "european"
      ],
      "ingredients": [
        {
          "qty": 16,
          "unit": "oz",
          "item": "frozen perogies"
        },
        {
          "qty": 12,
          "unit": "oz",
          "item": "kielbasa"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "sour cream"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "chives"
        }
      ],
      "steps": [
        "Slice onion and kielbasa.",
        "Melt butter in a skillet; cook onion over medium-low heat 12 minutes until golden.",
        "Add kielbasa slices; cook 6 minutes until browned.",
        "Boil perogies in salted water 5 minutes until they float; drain.",
        "Toss perogies with onion and sausage; top with sour cream and chives."
      ]
    },
    {
      "id": "r140",
      "name": "Cabbage Rolls",
      "minutes": 90,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "european"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "head",
          "item": "green cabbage"
        },
        {
          "qty": 1,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 0.5,
          "unit": "lb",
          "item": "ground pork"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "cooked rice"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "crushed tomatoes"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "paprika"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Core cabbage and blanch in boiling water 8 minutes; peel off 12 large leaves and cool.",
        "Mix beef, pork, rice, half the onion, garlic, paprika, and salt.",
        "Fill each leaf with 1/3 cup filling; roll and tuck ends.",
        "Simmer remaining onion in tomatoes 5 minutes; nestle rolls in sauce.",
        "Cover and cook on low 55 minutes until filling reaches 160°F (71°C)."
      ]
    },
    {
      "id": "r141",
      "name": "Classic Chicken Pot Pie",
      "minutes": 55,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "medium",
        "moderate",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "chicken breast"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "pie crust"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "celery stalk"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 1.5,
          "unit": "cup",
          "item": "chicken broth"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "heavy cream"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "flour"
        }
      ],
      "steps": [
        "Poach chicken in broth 15 minutes; shred meat and reserve 1 cup broth.",
        "Dice vegetables; sauté in butter 6 minutes.",
        "Stir in flour 1 minute.",
        "Whisk in reserved broth and cream; simmer 8 minutes until thick. Fold in chicken. The chicken is done at 165°F (74°C) inside.",
        "Heat oven to 400°F (205°C).",
        "Fill bottom crust; cover with top crust and crimp.",
        "Bake 25 minutes until golden.",
        "Cool 10 minutes before serving."
      ]
    },
    {
      "id": "r142",
      "name": "Stovetop Mac and Cheese",
      "minutes": 25,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "vegetarian",
        "easy",
        "budget",
        "american"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "elbow macaroni"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "cheddar cheese"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "flour"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "whole milk"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "mustard powder"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Boil macaroni in salted water 8 minutes until al dente; drain.",
        "Melt butter in a pot; whisk in flour 1 minute.",
        "Pour in milk slowly, whisking 5 minutes until thickened.",
        "Stir in cheese, salt, mustard powder, and pepper until smooth 3 minutes.",
        "Fold in pasta and serve immediately."
      ]
    },
    {
      "id": "r143",
      "name": "Canadian Hawaiian Pizza",
      "minutes": 28,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "medium",
        "moderate",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "pizza dough"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "pizza sauce"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "mozzarella cheese"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "diced ham"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "pineapple chunks"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "dried oregano"
        }
      ],
      "steps": [
        "Heat oven to 475°F (245°C).",
        "Stretch dough on an oiled sheet pan.",
        "Spread sauce and sprinkle half the cheese.",
        "Scatter ham and pineapple; top with remaining cheese and oregano.",
        "Bake 14 minutes until crust is golden and cheese bubbles.",
        "Rest 3 minutes, slice, and serve."
      ]
    },
    {
      "id": "r144",
      "name": "All-Beef Weeknight Chili",
      "minutes": 40,
      "servings": 6,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 2,
          "unit": "can",
          "item": "kidney beans"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "diced tomatoes"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "chili powder"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "cumin"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "beef broth"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Dice onion and mince garlic.",
        "Brown beef in a pot 8 minutes; drain excess fat. Ground meat is done at 160°F (71°C) inside.",
        "Add onion and garlic; cook 4 minutes.",
        "Stir in chili powder and cumin 1 minute.",
        "Add tomatoes, beans, broth, and salt; simmer 20 minutes, stirring occasionally.",
        "Rest 3 minutes off heat and serve with toppings of the choice."
      ]
    },
    {
      "id": "r145",
      "name": "Slow-Cooker Pulled Pork",
      "minutes": 480,
      "servings": 8,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "american"
      ],
      "ingredients": [
        {
          "qty": 3,
          "unit": "lb",
          "item": "pork shoulder"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "barbecue sauce"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "apple cider vinegar"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "brown sugar"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "smoked paprika"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 8,
          "unit": "",
          "item": "brioche bun"
        }
      ],
      "steps": [
        "Rub pork with paprika and salt.",
        "Place in slow cooker.",
        "Whisk barbecue sauce, vinegar, and brown sugar; pour over pork.",
        "Cook on low 8 hours until meat shreds easily.",
        "Shred pork in the cooker with two forks; toss in sauce.",
        "Pile on buns and serve within 15 minutes."
      ]
    },
    {
      "id": "r146",
      "name": "Oven BBQ Back Ribs",
      "minutes": 150,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "american"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "rack",
          "item": "pork back rib"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "barbecue sauce"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "brown sugar"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "smoked paprika"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "garlic powder"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Heat oven to 300°F (150°C).",
        "Remove membrane from ribs.",
        "Rub ribs with brown sugar, paprika, garlic powder, salt, and pepper.",
        "Wrap tightly in foil and bake 2 hours.",
        "Unwrap, brush with half the sauce, and bake 15 minutes at 400°F (205°C).",
        "Brush with remaining sauce; rest 5 minutes and slice between bones."
      ]
    },
    {
      "id": "r147",
      "name": "Pan-Seared Steak with Mushrooms",
      "minutes": 25,
      "servings": 2,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "high-protein",
        "easy",
        "splurge",
        "american"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "",
          "item": "strip steak"
        },
        {
          "qty": 8,
          "unit": "oz",
          "item": "cremini mushroom"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "fresh thyme"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Pat steaks dry; season with salt and pepper.",
        "Sear steaks in a hot skillet with 1 tablespoon butter 4 minutes per side for medium-rare.",
        "Rest steaks 5 minutes under foil.",
        "Slice mushrooms; sauté in same pan with remaining butter and garlic 6 minutes.",
        "Slice steaks and serve topped with mushrooms and thyme."
      ]
    },
    {
      "id": "r148",
      "name": "Weeknight Fish & Chips",
      "minutes": 35,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "british"
      ],
      "ingredients": [
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "cod fillet"
        },
        {
          "qty": 24,
          "unit": "oz",
          "item": "frozen fries"
        },
        {
          "qty": 0.75,
          "unit": "cup",
          "item": "flour"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "baking powder"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "cold beer"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "vegetable oil"
        }
      ],
      "steps": [
        "Bake fries at 425°F (220°C) for 20 minutes, flipping once.",
        "Whisk flour, baking powder, salt, and beer into a batter.",
        "Heat oil in a deep skillet to 350°F (175°C).",
        "Dip cod in batter; fry 4 minutes per side until golden and 145°F (63°C) inside.",
        "Drain on a rack 2 minutes and serve with fries and tartar sauce."
      ]
    },
    {
      "id": "r153",
      "name": "Montreal-Style Bagels with Cream Cheese",
      "minutes": 20,
      "servings": 4,
      "meal": "breakfast",
      "tags": [
        "breakfast",
        "main-meal",
        "vegetarian",
        "medium",
        "budget",
        "canadian"
      ],
      "ingredients": [
        {
          "qty": 4,
          "unit": "",
          "item": "montreal-style bagel"
        },
        {
          "qty": 8,
          "unit": "oz",
          "item": "cream cheese"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "cucumber"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "tomato"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "red onion"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "fresh dill"
        }
      ],
      "steps": [
        "Slice bagels and toast cut sides 3 minutes until lightly crisp.",
        "Soften cream cheese at room temperature 5 minutes.",
        "Slice cucumber, tomato, and red onion.",
        "Spread cream cheese on bagel halves; layer vegetables.",
        "Season with salt and dill; serve immediately."
      ]
    },
    {
      "id": "r155",
      "name": "Creamy Chicken and Dumplings",
      "minutes": 55,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "medium",
        "budget",
        "collection-comfort",
        "chinese"
      ],
      "ingredients": [
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "chicken thighs"
        },
        {
          "qty": 4,
          "unit": "cup",
          "item": "chicken broth"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "flour"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "milk"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "celery stalk"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Poach chicken in broth 18 minutes; shred and strain broth.",
        "Sauté diced vegetables in butter 6 minutes.",
        "Return broth and chicken; simmer 10 minutes. The chicken is done at 165°F (74°C) inside.",
        "Drop spoonfuls of flour-milk dough into simmering pot; cover 12 minutes.",
        "Season with salt and rest 5 minutes before ladling."
      ]
    },
    {
      "id": "r156",
      "name": "Meatloaf with Pan Gravy",
      "minutes": 65,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "collection-comfort",
        "american"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "breadcrumbs"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "ketchup"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "beef broth"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "flour"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Mix beef, crumbs, eggs, half the ketchup, onion, and salt.",
        "Shape loaf on a sheet pan; bake at 375°F (190°C) 45 minutes. Ground meat is done at 160°F (71°C) inside.",
        "Rest loaf 8 minutes while making gravy.",
        "Whisk flour into pan drippings; add broth and simmer 5 minutes.",
        "Slice meatloaf and serve with gravy and remaining ketchup glaze."
      ]
    },
    {
      "id": "r157",
      "name": "Baked Ziti with Ricotta",
      "minutes": 50,
      "servings": 8,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "vegetarian",
        "gluten-free",
        "easy",
        "budget",
        "collection-comfort",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "ziti"
        },
        {
          "qty": 15,
          "unit": "oz",
          "item": "ricotta cheese"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "mozzarella cheese"
        },
        {
          "qty": 1,
          "unit": "jar",
          "item": "marinara sauce"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "parsley"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Boil ziti 9 minutes until al dente; drain.",
        "Mix ricotta, eggs, half the mozzarella, parsley, and salt.",
        "Layer sauce, pasta, and ricotta in a baking dish.",
        "Top with remaining mozzarella.",
        "Bake at 375°F (190°C) 25 minutes until bubbly; rest 7 minutes."
      ]
    },
    {
      "id": "r158",
      "name": "Country Sausage Gravy & Biscuits",
      "minutes": 35,
      "servings": 6,
      "meal": "breakfast",
      "tags": [
        "breakfast",
        "main-meal",
        "easy",
        "budget",
        "collection-comfort",
        "american"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "breakfast sausage"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "biscuit mix"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "whole milk"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "flour"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "black pepper"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Bake biscuits per package, about 12 minutes.",
        "Brown sausage in a skillet 8 minutes, breaking it up.",
        "Sprinkle flour over sausage; cook 2 minutes.",
        "Whisk in milk, pepper, and salt; simmer 8 minutes until thick.",
        "Split biscuits and spoon gravy over the top."
      ]
    },
    {
      "id": "r159",
      "name": "Loaded Baked Potato Soup",
      "minutes": 40,
      "servings": 6,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "gluten-free",
        "easy",
        "budget",
        "collection-comfort",
        "american"
      ],
      "ingredients": [
        {
          "qty": 4,
          "unit": "",
          "item": "russet potato"
        },
        {
          "qty": 4,
          "unit": "cup",
          "item": "vegetable broth"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "heavy cream"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "shredded cheddar"
        },
        {
          "qty": 4,
          "unit": "slice",
          "item": "bacon"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "scallion"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Dice potatoes and simmer in broth 18 minutes until tender.",
        "Crisp bacon in a skillet 6 minutes; crumble.",
        "Blend half the soup until creamy; return to pot.",
        "Stir in cream and cheese; heat 5 minutes without boiling.",
        "Top bowls with bacon and scallions."
      ]
    },
    {
      "id": "r160",
      "name": "Tater Tot Hotdish",
      "minutes": 45,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "easy",
        "budget",
        "collection-comfort",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 1,
          "unit": "bag",
          "item": "frozen tater tots"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "cream of mushroom soup"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "frozen peas"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "shredded cheddar"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Brown beef with diced onion and salt 8 minutes; drain. Ground meat is done at 160°F (71°C) inside.",
        "Stir in soup and peas; spread in a baking dish.",
        "Top with tots and cheese.",
        "Bake at 400°F (205°C) 30 minutes until tots are crisp.",
        "Rest 5 minutes before scooping."
      ]
    },
    {
      "id": "r161",
      "name": "Chicken and Wild Rice Casserole",
      "minutes": 55,
      "servings": 8,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "easy",
        "moderate",
        "collection-comfort",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "chicken breast"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "wild rice blend"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "chicken broth"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "cream of celery soup"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "mushroom"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "slivered almond"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Cook rice in broth 25 minutes until tender. The chicken is done at 165°F (74°C) inside.",
        "Poach chicken 12 minutes; dice.",
        "Slice mushrooms; sauté 5 minutes.",
        "Mix rice, chicken, mushrooms, soup, almonds, and salt in a dish.",
        "Bake at 375°F (190°C) 18 minutes until edges bubble."
      ]
    },
    {
      "id": "r162",
      "name": "Beef and Noodle Skillet",
      "minutes": 35,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "easy",
        "budget",
        "collection-comfort",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 12,
          "unit": "oz",
          "item": "egg noodles"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "tomato sauce"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "sour cream"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "cheddar cheese"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Boil noodles 8 minutes; drain.",
        "Brown beef with onion and salt 8 minutes. Ground meat is done at 160°F (71°C) inside.",
        "Stir in tomato sauce; simmer 5 minutes.",
        "Fold in noodles and sour cream over low heat 3 minutes.",
        "Top with cheese, cover 3 minutes, and serve."
      ]
    },
    {
      "id": "r163",
      "name": "Garlic Shrimp Spaghetti",
      "minutes": 22,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "splurge",
        "collection-weeknight",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "spaghetti"
        },
        {
          "qty": 1,
          "unit": "lb",
          "item": "large shrimp"
        },
        {
          "qty": 4,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "olive oil"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "red pepper flakes"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "parsley"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Boil pasta 9 minutes; reserve 1/4 cup water.",
        "Sauté garlic and pepper flakes in oil 1 minute.",
        "Add shrimp; cook 3 minutes per side until pink.",
        "Toss pasta with shrimp, parsley, salt, and pasta water 2 minutes.",
        "Serve immediately."
      ]
    },
    {
      "id": "r164",
      "name": "Swedish Meatballs",
      "minutes": 30,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "medium",
        "moderate",
        "european"
      ],
      "ingredients": [
        {
          "qty": 200.0,
          "unit": "ml",
          "item": "liquid, such as water, milk or cream (200–300 ml; ¾–1¼ cups)"
        },
        {
          "qty": 50.0,
          "unit": "ml",
          "item": "dried bread crumbs"
        },
        {
          "qty": 250.0,
          "unit": "g",
          "item": "ground beef"
        },
        {
          "qty": 250.0,
          "unit": "g",
          "item": "ground pork"
        },
        {
          "qty": 1.0,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 1.0,
          "unit": "",
          "item": "small onion, finely chopped or grated"
        },
        {
          "qty": null,
          "unit": "",
          "item": "salt"
        },
        {
          "qty": null,
          "unit": "",
          "item": "pepper"
        },
        {
          "qty": null,
          "unit": "",
          "item": "butter for frying"
        },
        {
          "qty": null,
          "unit": "",
          "item": "boiled potatoes, to serve"
        }
      ],
      "steps": [
        "Combine the liquid and bread crumbs in a bowl, and let it sit for 7–8 minutes.",
        "Mix in the ground beef, ground pork, egg, onion, salt, and pepper.",
        "Shape the mixture into round meatballs, approximately 2–3 centimeters (1 inch) in diameter.",
        "Pan fry the meatballs on medium heat in a frying pan with butter for approximately 3–5 minutes. Ground meat is done at 160°F (71°C) inside.",
        "Fry them on all sides until they are brown and not pink in the middle.",
        "Shaking the pan occasionally will help the meatballs cook evenly.",
        "Serve them with mashed potatoes with a veal based brown sauce made with cream and lingonberry preserve or cranberry preserve."
      ],
      "sourceUrl": "https://en.wikibooks.org/wiki/Cookbook:Swedish_Meatballs_I",
      "sourceName": "Wikibooks Cookbook",
      "sourceLicense": "CC BY-SA 4.0"
    },
    {
      "id": "r165",
      "name": "Lemon Herb Sheet-Pan Chicken",
      "minutes": 32,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "collection-weeknight",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "chicken thighs"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "lemon"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 2,
          "unit": "tsp",
          "item": "dried oregano"
        },
        {
          "qty": 1,
          "unit": "lb",
          "item": "green beans"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Heat oven to 425°F (220°C).",
        "Toss chicken, beans, oil, garlic, oregano, salt, and lemon juice.",
        "Spread on a sheet pan.",
        "Roast 22 minutes until chicken hits 165°F (74°C).",
        "Rest 3 minutes.",
        "Squeeze remaining lemon over the pan and serve."
      ]
    },
    {
      "id": "r166",
      "name": "Pork Stir-Fry with Peppers",
      "minutes": 25,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "splurge",
        "collection-weeknight",
        "chinese"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "pork tenderloin"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "bell pepper"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "soy sauce"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "hoisin sauce"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "vegetable oil"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "cooked rice"
        }
      ],
      "steps": [
        "Slice pork and peppers thin.",
        "Stir-fry pork in oil 6 minutes until browned. The pork is done at 145°F (63°C) inside; rest 3 minutes.",
        "Add peppers and garlic; cook 4 minutes.",
        "Splash soy and hoisin; toss 2 minutes.",
        "Serve over rice within 3 minutes."
      ]
    },
    {
      "id": "r167",
      "name": "Caprese Chicken Cutlets",
      "minutes": 28,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "high-protein",
        "easy",
        "moderate",
        "collection-weeknight",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 1.25,
          "unit": "lb",
          "item": "chicken breast"
        },
        {
          "qty": 8,
          "unit": "oz",
          "item": "fresh mozzarella"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "tomato"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "basil"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "balsamic glaze"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Pound chicken thin; season with salt.",
        "Sear in oil 4 minutes per side until cooked through. The chicken is done at 165°F (74°C) inside.",
        "Top with tomato and mozzarella; cover 3 minutes to melt.",
        "Scatter basil and drizzle balsamic.",
        "Rest 2 minutes and serve."
      ]
    },
    {
      "id": "r168",
      "name": "Sausage and Broccoli Pasta",
      "minutes": 26,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "easy",
        "budget",
        "collection-weeknight",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "penne"
        },
        {
          "qty": 12,
          "unit": "oz",
          "item": "italian sausage"
        },
        {
          "qty": 3,
          "unit": "cup",
          "item": "broccoli florets"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "parmesan cheese"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Boil penne 9 minutes; add broccoli last 3 minutes; drain.",
        "Brown sausage 8 minutes; add garlic 1 minute.",
        "Toss pasta, broccoli, sausage, oil, and salt 3 minutes.",
        "Off heat, fold in Parmesan.",
        "Serve within 5 minutes."
      ]
    },
    {
      "id": "r169",
      "name": "Party Sliders with Caramelized Onions",
      "minutes": 40,
      "servings": 12,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "easy",
        "budget",
        "collection-crowd",
        "american"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 24,
          "unit": "",
          "item": "dinner roll"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 12,
          "unit": "slice",
          "item": "cheddar cheese"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "worcestershire sauce"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Cook sliced onions in butter over low heat 15 minutes until golden.",
        "Mix beef, Worcestershire, and salt; shape 12 patties.",
        "Grill patties 3 minutes per side. Ground meat is done at 160°F (71°C) inside.",
        "Toast rolls 2 minutes.",
        "Assemble sliders with cheese and onions; serve warm."
      ]
    },
    {
      "id": "r170",
      "name": "Big-Batch Baked Macaroni",
      "minutes": 50,
      "servings": 12,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "vegetarian",
        "medium",
        "budget",
        "collection-crowd",
        "american"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "elbow macaroni"
        },
        {
          "qty": 4,
          "unit": "cup",
          "item": "cheddar cheese"
        },
        {
          "qty": 4,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 4,
          "unit": "cup",
          "item": "whole milk"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "flour"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "mustard powder"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Heat the oven to 375°F (190°C).",
        "Boil the macaroni in salted water for 8 minutes, then drain.",
        "Melt the butter in a large pot over medium heat.",
        "Whisk in the flour and mustard powder and cook 2 minutes.",
        "Slowly whisk in the milk and cook 6 minutes, stirring, until thickened.",
        "Take the pot off the heat and stir in the cheddar and salt until melted.",
        "Fold the macaroni into the sauce and divide it between two baking dishes.",
        "Bake 20 minutes until bubbling.",
        "Rest 5 minutes before serving."
      ]
    },
    {
      "id": "r171",
      "name": "Sheet-Pan Fajita Feast",
      "minutes": 35,
      "servings": 8,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "collection-crowd",
        "mexican"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "chicken breast"
        },
        {
          "qty": 4,
          "unit": "",
          "item": "bell pepper"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "fajita seasoning"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 16,
          "unit": "",
          "item": "flour tortilla"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Slice chicken, peppers, and onion.",
        "Toss with oil, seasoning, and salt.",
        "Roast at 425°F (220°C) 22 minutes, stirring once. The chicken is done at 165°F (74°C) inside.",
        "Warm tortillas in foil 5 minutes.",
        "Serve family-style with toppings."
      ]
    },
    {
      "id": "r172",
      "name": "Crowd-Pleasing Meatball Subs",
      "minutes": 45,
      "servings": 8,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "easy",
        "budget",
        "collection-crowd",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "breadcrumbs"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 4,
          "unit": "cup",
          "item": "marinara sauce"
        },
        {
          "qty": 8,
          "unit": "",
          "item": "sub roll"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "mozzarella cheese"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Mix beef, crumbs, eggs, and salt; roll 24 meatballs.",
        "Bake meatballs at 400°F (205°C) 15 minutes. Ground meat is done at 160°F (71°C) inside.",
        "Simmer in marinara 12 minutes.",
        "Split rolls; fill with meatballs and cheese.",
        "Broil 3 minutes until cheese melts."
      ]
    },
    {
      "id": "r173",
      "name": "Slow-Cooker Beef Barbacoa",
      "minutes": 480,
      "servings": 8,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "collection-slow-cooker",
        "mexican"
      ],
      "ingredients": [
        {
          "qty": 3,
          "unit": "lb",
          "item": "beef chuck"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "chipotle in adobo"
        },
        {
          "qty": 4,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "lime juice"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "cumin"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "beef broth"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Blend chipotle, garlic, lime, cumin, and salt.",
        "Place beef in slow cooker; pour mixture and broth over top.",
        "Cook on low 8 hours until shreddable.",
        "Shred beef in juices 6 minutes.",
        "Serve in tacos or bowls."
      ]
    },
    {
      "id": "r174",
      "name": "Crockpot Chicken Tikka Masala",
      "minutes": 360,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "high-protein",
        "easy",
        "budget",
        "collection-slow-cooker",
        "indian"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "chicken thighs"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "crushed tomatoes"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "heavy cream"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "garam masala"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": null,
          "unit": "",
          "item": "cooked rice, to serve"
        }
      ],
      "steps": [
        "Dice onion; mince garlic.",
        "Add chicken, tomatoes, onion, garlic, garam masala, and salt to slow cooker.",
        "Cook on low 6 hours. The chicken is done at 165°F (74°C) inside.",
        "Stir in cream; cook on high 15 minutes.",
        "Serve over rice within 10 minutes."
      ]
    },
    {
      "id": "r175",
      "name": "Slow-Cooker Lentil Curry",
      "minutes": 300,
      "servings": 8,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "vegetarian",
        "vegan",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "collection-slow-cooker",
        "indian"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "cup",
          "item": "brown lentils"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "coconut milk"
        },
        {
          "qty": 4,
          "unit": "cup",
          "item": "vegetable broth"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "curry powder"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": null,
          "unit": "",
          "item": "cooked rice, to serve"
        }
      ],
      "steps": [
        "Rinse lentils; dice onion and carrot.",
        "Combine all ingredients in slow cooker.",
        "Cook on low 5 hours until lentils are tender.",
        "Stir and adjust salt; hold on warm 10 minutes.",
        "Serve with naan or rice."
      ]
    },
    {
      "id": "r176",
      "name": "Set-and-Forget Chili",
      "minutes": 420,
      "servings": 10,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "collection-slow-cooker",
        "american"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 3,
          "unit": "can",
          "item": "kidney beans"
        },
        {
          "qty": 2,
          "unit": "can",
          "item": "diced tomatoes"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "chili powder"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "cumin"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Brown beef with onion 10 minutes; drain. Ground meat is done at 160°F (71°C) inside.",
        "Add to slow cooker with beans, tomatoes, spices, and salt.",
        "Cook on low 7 hours.",
        "Stir and simmer uncovered 15 minutes to thicken.",
        "Serve with toppings."
      ]
    },
    {
      "id": "r177",
      "name": "Beer-can Chicken",
      "minutes": 120,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "medium",
        "moderate",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1.0,
          "unit": "",
          "item": "recipe spice rub (or use your own recipe)"
        },
        {
          "qty": 2.0,
          "unit": "",
          "item": "bay leaves, crumbled"
        },
        {
          "qty": 1.0,
          "unit": "can",
          "item": "beer"
        },
        {
          "qty": 3.0,
          "unit": "lb",
          "item": "chicken (dressed) (3–4 lb; 1.5–2 kg)"
        }
      ],
      "steps": [
        "Preheat oven to 350°F (180°C).",
        "Poke holes all over chicken to let fat run out during cooking.",
        "Rub chicken thoroughly with spice rub: inside and out, and then under skin as far as you can reach.",
        "Set aside chicken.",
        "Remove upper racks from oven.",
        "When oven preheated, take a healthy drink of the beer, leaving about 9–10 ounces.",
        "Crumble bay leaves into beer, in beer can.",
        "Insert beer can firmly into chicken cavity.",
        "Place chicken upright in shallow heatproof pan.",
        "Bake chicken upright for 1–1.5 hours until thickest part is 165°F (73°C).",
        "When removing chicken from oven, keep upright.",
        "Rest chicken upright 15 minutes before removing beer can."
      ],
      "sourceUrl": "https://en.wikibooks.org/wiki/Cookbook:Beer-can_Chicken",
      "sourceName": "Wikibooks Cookbook",
      "sourceLicense": "CC BY-SA 4.0"
    },
    {
      "id": "r178",
      "name": "One-Pan Lemon Garlic Salmon",
      "minutes": 28,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "splurge",
        "collection-one-pan",
        "american"
      ],
      "ingredients": [
        {
          "qty": 4,
          "unit": "fillet",
          "item": "salmon"
        },
        {
          "qty": 1,
          "unit": "lb",
          "item": "asparagus"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "lemon"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Heat oven to 400°F (205°C). Trim asparagus.",
        "Arrange salmon and asparagus on a sheet pan.",
        "Drizzle oil, garlic, lemon juice, and salt.",
        "Roast 18 minutes until salmon flakes.",
        "Garnish with lemon zest and serve."
      ]
    },
    {
      "id": "r179",
      "name": "Skillet Sausage and Peppers",
      "minutes": 30,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "easy",
        "budget",
        "collection-one-pan",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "smoked sausage"
        },
        {
          "qty": 3,
          "unit": "",
          "item": "bell pepper"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "italian seasoning"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "cooked polenta"
        }
      ],
      "steps": [
        "Slice sausage, peppers, and onion.",
        "Sear sausage in oil 6 minutes.",
        "Add vegetables and seasoning; cook 12 minutes.",
        "Season with salt.",
        "Serve over warm polenta within 5 minutes."
      ]
    },
    {
      "id": "r180",
      "name": "One-Pan Greek Chicken and Potatoes",
      "minutes": 45,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "collection-one-pan",
        "greek"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "lb",
          "item": "chicken thighs"
        },
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "baby potato"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "lemon"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 2,
          "unit": "tsp",
          "item": "dried oregano"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Heat oven to 425°F (220°C). Halve potatoes.",
        "Toss chicken, potatoes, oil, oregano, garlic, salt, and lemon on one pan.",
        "Roast 35 minutes, stirring potatoes once. The chicken is done at 165°F (74°C) inside.",
        "Rest chicken 4 minutes.",
        "Serve with pan juices."
      ]
    },
    {
      "id": "r181",
      "name": "Shrimp and Orzo One-Pot",
      "minutes": 32,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "splurge",
        "collection-one-pan",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "large shrimp"
        },
        {
          "qty": 8,
          "unit": "oz",
          "item": "orzo"
        },
        {
          "qty": 3,
          "unit": "cup",
          "item": "chicken broth"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "tomato"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Sauté garlic in oil 1 minute in a wide pot.",
        "Stir in orzo and toast 2 minutes.",
        "Add broth and diced tomatoes; simmer 12 minutes.",
        "Nestle shrimp on top; cover 6 minutes until pink.",
        "Season with salt and rest 2 minutes."
      ]
    },
    {
      "id": "r182",
      "name": "Sheet-Pan Pork Chops and Apples",
      "minutes": 35,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "collection-one-pan",
        "american"
      ],
      "ingredients": [
        {
          "qty": 4,
          "unit": "",
          "item": "boneless pork chop"
        },
        {
          "qty": 3,
          "unit": "",
          "item": "apple"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "thyme"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Heat oven to 400°F (205°C).",
        "Slice apples and onion.",
        "Toss apples, onion, oil, thyme, salt, and pepper on a sheet pan.",
        "Nestle seasoned chops among apples.",
        "Roast 25 minutes until pork hits 145°F (63°C).",
        "Rest chops 4 minutes and serve."
      ]
    },
    {
      "id": "r183",
      "name": "Grilled Marinated Flank Steak",
      "minutes": 35,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "medium",
        "splurge",
        "collection-grill",
        "american"
      ],
      "ingredients": [
        {
          "qty": 1.5,
          "unit": "lb",
          "item": "flank steak"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "soy sauce"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "brown sugar"
        },
        {
          "qty": 3,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "black pepper"
        }
      ],
      "steps": [
        "Mince the garlic. Whisk the soy sauce, olive oil, brown sugar, garlic, and pepper in a shallow dish.",
        "Turn the steak in the marinade to coat and let it sit 15 minutes at room temperature.",
        "Heat a grill or grill pan to high.",
        "Grill the steak 4 minutes per side for medium-rare.",
        "Rest the steak 8 minutes.",
        "Slice thinly against the grain and serve."
      ]
    },
    {
      "id": "r184",
      "name": "BBQ Chicken Drumsticks",
      "minutes": 40,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "collection-grill",
        "american"
      ],
      "ingredients": [
        {
          "qty": 3,
          "unit": "lb",
          "item": "chicken drumstick"
        },
        {
          "qty": 0.75,
          "unit": "cup",
          "item": "barbecue sauce"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "smoked paprika"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "garlic powder"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Season drumsticks with paprika, garlic powder, and salt.",
        "Grill over medium heat 25 minutes, turning every 5 minutes. The chicken is done at 165°F (74°C) inside.",
        "Brush with sauce last 5 minutes until sticky.",
        "Rest 5 minutes.",
        "Serve with extra sauce on the side."
      ]
    },
    {
      "id": "r185",
      "name": "Weeknight Minestrone",
      "minutes": 35,
      "servings": 6,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "vegetarian",
        "high-protein",
        "easy",
        "budget",
        "collection-soup",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "can",
          "item": "kidney beans"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "diced tomatoes"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "carrot"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "celery stalk"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 4,
          "unit": "cup",
          "item": "vegetable broth"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "small pasta"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": null,
          "unit": "",
          "item": "grated Parmesan, to serve"
        }
      ],
      "steps": [
        "Dice vegetables.",
        "Sauté onion, carrot, and celery 6 minutes.",
        "Add broth, tomatoes, beans, and salt; simmer 15 minutes.",
        "Stir in pasta; cook 8 minutes until tender.",
        "Serve hot with Parmesan if desired."
      ]
    },
    {
      "id": "r186",
      "name": "Creamy Tomato Tortellini Soup",
      "minutes": 30,
      "servings": 4,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "vegetarian",
        "easy",
        "budget",
        "collection-soup",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "cheese tortellini"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "crushed tomatoes"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "vegetable broth"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "heavy cream"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Sauté garlic in oil 1 minute.",
        "Add tomatoes and broth; simmer 10 minutes.",
        "Blend half the soup smooth.",
        "Return to pot; add tortellini and simmer 8 minutes.",
        "Stir in cream and salt; heat 2 minutes without boiling."
      ]
    },
    {
      "id": "r187",
      "name": "Pub-Style Fish and Chips",
      "minutes": 38,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "medium",
        "moderate",
        "collection-pub",
        "british"
      ],
      "ingredients": [
        {
          "qty": 1.25,
          "unit": "lb",
          "item": "cod fillet"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "flour"
        },
        {
          "qty": 12,
          "unit": "oz",
          "item": "beer"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "baking powder"
        },
        {
          "qty": 24,
          "unit": "oz",
          "item": "frozen fries"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "vegetable oil"
        },
        {
          "qty": null,
          "unit": "",
          "item": "malt vinegar, to serve"
        }
      ],
      "steps": [
        "Heat the oven to 425°F (220°C) and bake the fries for 22 minutes, turning once.",
        "Whisk the flour, baking powder, beer, and salt into a smooth batter.",
        "Heat the oil in a deep heavy pot to 350°F (175°C).",
        "Pat the cod dry and cut it into 4 pieces.",
        "Dip each piece in the batter and fry 4 minutes per side, until crisp and golden.",
        "Drain on paper towels for 2 minutes.",
        "Serve with the fries and malt vinegar."
      ]
    },
    {
      "id": "r188",
      "name": "Shepherd's Pie Potato Bowls",
      "minutes": 42,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "splurge",
        "collection-pub",
        "british"
      ],
      "ingredients": [
        {
          "qty": 4,
          "unit": "",
          "item": "baked potato"
        },
        {
          "qty": 1,
          "unit": "lb",
          "item": "ground lamb"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "frozen peas"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "beef broth"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "tomato paste"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Bake potatoes at 400°F (205°C) 35 minutes until tender.",
        "Brown lamb with onion and salt 8 minutes. Ground meat is done at 160°F (71°C) inside.",
        "Stir in tomato paste and broth; simmer 6 minutes with peas.",
        "Halve potatoes and fluff insides.",
        "Top with lamb filling and serve."
      ]
    },
    {
      "id": "r189",
      "name": "Six Layer Casserole",
      "minutes": 140,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "american"
      ],
      "ingredients": [
        {
          "qty": 2.0,
          "unit": "cup",
          "item": "diced potatoes"
        },
        {
          "qty": 1.0,
          "unit": "cup",
          "item": "carrots diced"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "diced onion"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "raw rice"
        },
        {
          "qty": 1.0,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 10.0,
          "unit": "oz",
          "item": "canned tomato soup (you may also use homemade tomato sauce)"
        },
        {
          "qty": 2.0,
          "unit": "cup",
          "item": "water"
        },
        {
          "qty": null,
          "unit": "",
          "item": "salt and pepper"
        }
      ],
      "steps": [
        "Spread layers of raw vegetables and rice in a 9x9-inch baking dish in the order mentioned above and crumble raw hamburger on the top.",
        "Mix the soup and water and pour over all.",
        "Add salt and pepper on top.",
        "Bake about 1.5–2 hours at 350°F (175°C). Ground meat is done at 160°F (71°C) inside."
      ],
      "sourceUrl": "https://en.wikibooks.org/wiki/Cookbook:Six_Layer_Casserole",
      "sourceName": "Wikibooks Cookbook",
      "sourceLicense": "CC BY-SA 4.0"
    },
    {
      "id": "r190",
      "name": "Spaghetti and Meatballs",
      "minutes": 50,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "collection-italian",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "spaghetti"
        },
        {
          "qty": 1,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "breadcrumbs"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 3,
          "unit": "cup",
          "item": "marinara sauce"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Mix beef, crumbs, egg, garlic, and salt; roll 18 meatballs.",
        "Bake meatballs at 400°F (205°C) 15 minutes. Ground meat is done at 160°F (71°C) inside.",
        "Simmer in marinara 12 minutes.",
        "Boil spaghetti 9 minutes; drain.",
        "Toss pasta with sauce and serve with meatballs."
      ]
    },
    {
      "id": "r191",
      "name": "Chicken Parmesan Skillet",
      "minutes": 38,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "high-protein",
        "easy",
        "moderate",
        "collection-italian",
        "italian"
      ],
      "ingredients": [
        {
          "qty": 1.25,
          "unit": "lb",
          "item": "chicken breast"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "breadcrumbs"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 1.5,
          "unit": "cup",
          "item": "marinara sauce"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "mozzarella cheese"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Pound chicken; bread with eggs and crumbs.",
        "Pan-fry in oil 4 minutes per side.",
        "Pour sauce over chicken; simmer covered 8 minutes. The chicken is done at 165°F (74°C) inside.",
        "Top with mozzarella; melt 3 minutes.",
        "Rest 2 minutes and serve."
      ]
    },
    {
      "id": "r192",
      "name": "Cheesy Beef Enchiladas",
      "minutes": 45,
      "servings": 6,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "gluten-free",
        "high-protein",
        "easy",
        "budget",
        "collection-texmex",
        "mexican"
      ],
      "ingredients": [
        {
          "qty": 1,
          "unit": "lb",
          "item": "ground beef"
        },
        {
          "qty": 12,
          "unit": "",
          "item": "corn tortilla"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "enchilada sauce"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "cheddar cheese"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "yellow onion"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "cumin"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Brown beef with onion, cumin, and salt 8 minutes. Ground meat is done at 160°F (71°C) inside.",
        "Warm tortillas 2 minutes in a dry skillet.",
        "Fill and roll tortillas; place in a baking dish.",
        "Pour sauce and cheese on top.",
        "Bake at 375°F (190°C) 20 minutes until bubbly."
      ]
    },
    {
      "id": "r194",
      "name": "Sesame Ginger Stir-Fry",
      "minutes": 22,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "vegetarian",
        "vegan",
        "dairy-free",
        "high-protein",
        "easy",
        "budget",
        "collection-asian",
        "chinese"
      ],
      "ingredients": [
        {
          "qty": 14,
          "unit": "oz",
          "item": "firm tofu"
        },
        {
          "qty": 3,
          "unit": "cup",
          "item": "broccoli florets"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "soy sauce"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "sesame oil"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "rice vinegar"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "maple syrup"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "ginger"
        },
        {
          "qty": 2,
          "unit": "cup",
          "item": "cooked rice"
        }
      ],
      "steps": [
        "Cube tofu and pat dry.",
        "Stir-fry tofu in sesame oil 6 minutes until crisp.",
        "Add broccoli; cook 5 minutes.",
        "Whisk soy, vinegar, maple, and ginger; toss 2 minutes.",
        "Serve over rice within 3 minutes."
      ]
    },
    {
      "id": "r195",
      "name": "Takeout-Style Fried Rice",
      "minutes": 20,
      "servings": 4,
      "meal": "dinner",
      "tags": [
        "dinner",
        "main-meal",
        "vegetarian",
        "dairy-free",
        "easy",
        "budget",
        "collection-asian",
        "chinese"
      ],
      "ingredients": [
        {
          "qty": 3,
          "unit": "cup",
          "item": "cooked rice"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "frozen peas"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "soy sauce"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "vegetable oil"
        },
        {
          "qty": 2,
          "unit": "clove",
          "item": "garlic"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "scallion"
        }
      ],
      "steps": [
        "Scramble eggs in oil 2 minutes; set aside.",
        "Fry garlic 30 seconds; add rice and peas.",
        "Toss over high heat 8 minutes.",
        "Return eggs; splash soy sauce and scallions 2 minutes.",
        "Serve hot immediately."
      ]
    },
    {
      "id": "r196",
      "name": "Miso Ramen Bowls",
      "minutes": 25,
      "servings": 4,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "dairy-free",
        "easy",
        "budget",
        "collection-asian",
        "japanese"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "ramen noodles"
        },
        {
          "qty": 4,
          "unit": "cup",
          "item": "chicken broth"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "white miso"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "spinach"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "soft-boiled egg"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "corn kernels"
        },
        {
          "qty": 2,
          "unit": "",
          "item": "scallion"
        }
      ],
      "steps": [
        "Soft-boil eggs 7 minutes; cool and halve.",
        "Simmer broth 5 minutes; whisk in miso off heat.",
        "Cook noodles 3 minutes; drain.",
        "Divide noodles, broth, spinach, and corn among bowls.",
        "Top with eggs and scallions; serve within 5 minutes."
      ]
    },
    {
      "id": "r197",
      "name": "Weekend French Toast Bake",
      "minutes": 45,
      "servings": 8,
      "meal": "breakfast",
      "tags": [
        "breakfast",
        "main-meal",
        "vegetarian",
        "easy",
        "budget",
        "collection-breakfast",
        "american"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "slice",
          "item": "bread"
        },
        {
          "qty": 6,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 1.5,
          "unit": "cup",
          "item": "whole milk"
        },
        {
          "qty": 3,
          "unit": "tbsp",
          "item": "maple syrup"
        },
        {
          "qty": 1,
          "unit": "tsp",
          "item": "cinnamon"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Cube bread and arrange in a buttered dish.",
        "Whisk eggs, milk, syrup, cinnamon, and salt.",
        "Pour over bread; soak 10 minutes.",
        "Bake at 375°F (190°C) 25 minutes until set.",
        "Rest 5 minutes and serve with extra syrup."
      ]
    },
    {
      "id": "r198",
      "name": "Savory Breakfast Burritos",
      "minutes": 25,
      "servings": 4,
      "meal": "breakfast",
      "tags": [
        "breakfast",
        "main-meal",
        "high-protein",
        "easy",
        "budget",
        "collection-breakfast",
        "mexican"
      ],
      "ingredients": [
        {
          "qty": 6,
          "unit": "",
          "item": "egg"
        },
        {
          "qty": 4,
          "unit": "",
          "item": "flour tortilla"
        },
        {
          "qty": 0.5,
          "unit": "lb",
          "item": "breakfast sausage"
        },
        {
          "qty": 0.5,
          "unit": "cup",
          "item": "shredded cheddar"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "salsa"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "butter"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Cook sausage 8 minutes; crumble.",
        "Scramble eggs in butter with salt 4 minutes.",
        "Warm tortillas 2 minutes.",
        "Fill with eggs, sausage, cheese, and salsa.",
        "Roll burritos and serve immediately."
      ]
    },
    {
      "id": "r199",
      "name": "Turkey Avocado Club Wraps",
      "minutes": 15,
      "servings": 4,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "dairy-free",
        "high-protein",
        "easy",
        "moderate",
        "collection-lunch",
        "american"
      ],
      "ingredients": [
        {
          "qty": 12,
          "unit": "oz",
          "item": "sliced turkey"
        },
        {
          "qty": 4,
          "unit": "",
          "item": "large tortilla"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "avocado"
        },
        {
          "qty": 4,
          "unit": "slice",
          "item": "bacon"
        },
        {
          "qty": 4,
          "unit": "slice",
          "item": "tomato"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "mayonnaise"
        },
        {
          "qty": 0.25,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Crisp bacon 6 minutes; drain.",
        "Mash avocado with salt.",
        "Spread mayo on tortillas; layer turkey, bacon, tomato, and avocado.",
        "Roll tightly.",
        "Slice in half and serve."
      ]
    },
    {
      "id": "r200",
      "name": "Mediterranean Grain Bowls",
      "minutes": 20,
      "servings": 4,
      "meal": "lunch",
      "tags": [
        "lunch",
        "main-meal",
        "vegetarian",
        "gluten-free",
        "high-protein",
        "easy",
        "budget",
        "collection-lunch",
        "greek"
      ],
      "ingredients": [
        {
          "qty": 2,
          "unit": "cup",
          "item": "cooked quinoa"
        },
        {
          "qty": 1,
          "unit": "can",
          "item": "chickpeas"
        },
        {
          "qty": 1,
          "unit": "cup",
          "item": "cherry tomatoes"
        },
        {
          "qty": 1,
          "unit": "",
          "item": "cucumber"
        },
        {
          "qty": 0.25,
          "unit": "cup",
          "item": "feta cheese"
        },
        {
          "qty": 2,
          "unit": "tbsp",
          "item": "olive oil"
        },
        {
          "qty": 1,
          "unit": "tbsp",
          "item": "lemon juice"
        },
        {
          "qty": 0.5,
          "unit": "tsp",
          "item": "salt"
        }
      ],
      "steps": [
        "Drain chickpeas; halve tomatoes and dice cucumber.",
        "Whisk oil, lemon juice, and salt.",
        "Divide quinoa among bowls.",
        "Top with vegetables, chickpeas, and feta.",
        "Drizzle dressing and serve within 10 minutes."
      ]
    }
  ];
  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);
})();
