/* Pantry Week — batch 2 library r201–r248 */
"use strict";
(function () {
  if (typeof PW_STARTERS === 'undefined') return;
  var extra = [
  {
    "id": "r201",
    "name": "Baked Ziti with Sausage",
    "minutes": 50,
    "servings": 8,
    "tags": [
      "dinner",
      "collection-comfort",
      "high-protein",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "Italian sausage"
      },
      {
        "qty": 16,
        "unit": "oz",
        "item": "ziti pasta"
      },
      {
        "qty": 24,
        "unit": "oz",
        "item": "marinara sauce"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "mozzarella cheese"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "ricotta cheese"
      },
      {
        "qty": 2,
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
        "item": "dried oregano"
      },
      {
        "qty": 0.25,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Cook ziti in salted water 10 minutes until al dente; drain (3 minutes).",
      "Brown sausage in oil 8 minutes; add minced garlic 1 minute.",
      "Stir in marinara and oregano; simmer 5 minutes.",
      "Fold pasta, ricotta, and half the mozzarella into the sauce (4 minutes).",
      "Transfer to a baking dish, top with remaining cheese, and bake at 375°F 20 minutes until bubbly."
    ]
  },
  {
    "id": "r202",
    "name": "Chicken Pot Pie Skillet",
    "minutes": 40,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-comfort",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 1.5,
        "unit": "lb",
        "item": "chicken thighs"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "frozen peas"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "diced carrot"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "butter"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "all-purpose flour"
      },
      {
        "qty": 1.5,
        "unit": "cup",
        "item": "chicken broth"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "whole milk"
      },
      {
        "qty": 1,
        "unit": "sheet",
        "item": "puff pastry"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "thyme"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Dice chicken and vegetables (6 minutes).",
      "Sear chicken in butter 10 minutes until browned.",
      "Stir in flour 1 minute; whisk in broth and milk until thick, 6 minutes.",
      "Add peas, carrots, thyme, and salt; simmer 5 minutes.",
      "Top with pastry, slit vents, and bake at 400°F 15 minutes until golden."
    ]
  },
  {
    "id": "r203",
    "name": "Classic Meatloaf & Mash",
    "minutes": 65,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-comfort",
      "high-protein",
      "budget",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 1.5,
        "unit": "lb",
        "item": "ground beef"
      },
      {
        "qty": 2,
        "unit": "lb",
        "item": "russet potatoes"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "breadcrumbs"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "egg"
      },
      {
        "qty": 0.25,
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
        "unit": "tbsp",
        "item": "butter"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "whole milk"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "Worcestershire sauce"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Peel and cube potatoes; boil 18 minutes until tender.",
      "Mix beef, breadcrumbs, egg, grated onion, Worcestershire, and half the ketchup (5 minutes).",
      "Shape loaf on a sheet pan; bake at 375°F 35 minutes.",
      "Brush top with remaining ketchup; bake 10 minutes more.",
      "Mash potatoes with butter, milk, and salt; slice meatloaf and serve."
    ]
  },
  {
    "id": "r204",
    "name": "Creamy Chicken Alfredo",
    "minutes": 30,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-comfort",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 12,
        "unit": "oz",
        "item": "fettuccine"
      },
      {
        "qty": 1,
        "unit": "lb",
        "item": "chicken breast"
      },
      {
        "qty": 4,
        "unit": "tbsp",
        "item": "butter"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "heavy cream"
      },
      {
        "qty": 0.75,
        "unit": "cup",
        "item": "Parmesan cheese"
      },
      {
        "qty": 2,
        "unit": "clove",
        "item": "garlic"
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
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "parsley"
      }
    ],
    "steps": [
      "Cook pasta in salted water 9 minutes; reserve 0.5 cup pasta water.",
      "Slice chicken; sear in 1 tbsp butter 8 minutes until cooked through.",
      "Melt remaining butter; sauté garlic 30 seconds.",
      "Add cream and simmer 3 minutes; stir in Parmesan until silky.",
      "Toss pasta, chicken, pepper, salt, and splash of pasta water; garnish with parsley."
    ]
  },
  {
    "id": "r205",
    "name": "Baked Mac and Cheese",
    "minutes": 45,
    "servings": 8,
    "tags": [
      "dinner",
      "collection-comfort",
      "vegetarian",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "elbow macaroni"
      },
      {
        "qty": 4,
        "unit": "tbsp",
        "item": "butter"
      },
      {
        "qty": 4,
        "unit": "tbsp",
        "item": "all-purpose flour"
      },
      {
        "qty": 3,
        "unit": "cup",
        "item": "whole milk"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "cheddar cheese"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "Gruyère cheese"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "Dijon mustard"
      },
      {
        "qty": 0.5,
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
      "Cook macaroni 7 minutes; drain.",
      "Make roux with butter and flour 2 minutes.",
      "Whisk in milk; simmer 6 minutes until thick.",
      "Stir in cheeses, mustard, paprika, and salt off heat.",
      "Combine with pasta; bake at 375°F 20 minutes until browned."
    ]
  },
  {
    "id": "r206",
    "name": "Tuna Noodle Casserole",
    "minutes": 35,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-comfort",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 12,
        "unit": "oz",
        "item": "egg noodles"
      },
      {
        "qty": 2,
        "unit": "can",
        "item": "tuna"
      },
      {
        "qty": 1.5,
        "unit": "cup",
        "item": "frozen peas"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "cheddar cheese"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "whole milk"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "butter"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "all-purpose flour"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "breadcrumbs"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Cook noodles 8 minutes; drain.",
      "Melt butter; whisk in flour 1 minute, then milk until thick, 5 minutes.",
      "Fold in tuna, peas, cheese, and salt.",
      "Spread in a dish; top with breadcrumbs.",
      "Bake at 375°F 18 minutes until crisp on top."
    ]
  },
  {
    "id": "r207",
    "name": "One-Pan Lemon Herb Chicken",
    "minutes": 35,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-one-pan",
      "high-protein",
      "gluten-free",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 4,
        "unit": "",
        "item": "chicken thighs"
      },
      {
        "qty": 1,
        "unit": "lb",
        "item": "baby potatoes"
      },
      {
        "qty": 2,
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
        "qty": 4,
        "unit": "clove",
        "item": "garlic"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "green beans"
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
      "Halve potatoes and trim beans (5 minutes).",
      "Toss potatoes with oil, oregano, garlic, salt, and pepper on a sheet pan.",
      "Roast at 425°F 15 minutes; nestle chicken and lemon slices among potatoes.",
      "Roast 18 minutes until chicken reaches 165°F.",
      "Scatter green beans on the pan; roast 5 minutes more and serve."
    ]
  },
  {
    "id": "r208",
    "name": "Sheet Pan Sausage & Peppers",
    "minutes": 30,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-one-pan",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
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
        "item": "red onion"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "olive oil"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "Italian seasoning"
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
        "item": "red pepper flakes"
      }
    ],
    "steps": [
      "Slice sausage, peppers, and onion (6 minutes).",
      "Toss with oil, seasoning, garlic, salt, and flakes on a sheet pan.",
      "Roast at 425°F 22 minutes, stirring once halfway.",
      "Broil 2 minutes for char if desired.",
      "Serve straight from the pan within 5 minutes."
    ]
  },
  {
    "id": "r209",
    "name": "Slow Cooker Pulled Pork",
    "minutes": 480,
    "servings": 10,
    "tags": [
      "dinner",
      "collection-slow-cooker",
      "collection-bbq",
      "high-protein",
      "budget",
      "easy"
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
        "qty": 0.5,
        "unit": "tsp",
        "item": "black pepper"
      }
    ],
    "steps": [
      "Slice onion and mince garlic (4 minutes).",
      "Rub pork with paprika, salt, and pepper; place in slow cooker with onion and garlic.",
      "Whisk sauce, vinegar, and brown sugar; pour over pork.",
      "Cook on low 8 hours until shreddable.",
      "Shred meat, toss with cooking juices, and serve on buns or plates."
    ]
  },
  {
    "id": "r210",
    "name": "Slow Cooker Chicken Tikka",
    "minutes": 300,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-slow-cooker",
      "dairy-free",
      "moderate",
      "easy"
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
        "item": "plain yogurt"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "tikka masala paste"
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
        "qty": 1,
        "unit": "tbsp",
        "item": "ginger"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "cilantro"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Dice onion; mince garlic and ginger (5 minutes).",
      "Stir yogurt with tikka paste and salt.",
      "Layer onion, chicken, tomatoes, and aromatics in the slow cooker.",
      "Spoon yogurt mixture over chicken.",
      "Cook on low 5 hours; garnish with cilantro and serve with rice."
    ]
  },
  {
    "id": "r211",
    "name": "One-Pan Shrimp Fajitas",
    "minutes": 25,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-one-pan",
      "collection-texmex",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "large shrimp"
      },
      {
        "qty": 3,
        "unit": "",
        "item": "bell pepper"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "red onion"
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
        "qty": 6,
        "unit": "",
        "item": "flour tortilla"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "lime"
      },
      {
        "qty": 0.25,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Peel shrimp and slice peppers and onion (6 minutes).",
      "Toss shrimp and vegetables with oil, seasoning, and salt.",
      "Sear on a hot sheet pan or skillet 8 minutes, stirring once.",
      "Warm tortillas 2 minutes.",
      "Squeeze lime over filling and serve in tortillas."
    ]
  },
  {
    "id": "r212",
    "name": "Slow Cooker Beef Chili",
    "minutes": 360,
    "servings": 8,
    "tags": [
      "dinner",
      "collection-slow-cooker",
      "high-protein",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 2,
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
      "Brown beef with onion 10 minutes; drain excess fat.",
      "Add garlic, chili powder, and cumin; cook 1 minute.",
      "Transfer to slow cooker with beans, tomatoes, broth, and salt.",
      "Cook on low 6 hours.",
      "Stir and serve with toppings within 10 minutes."
    ]
  },
  {
    "id": "r213",
    "name": "Sticky BBQ Chicken Thighs",
    "minutes": 40,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-bbq",
      "collection-grill",
      "high-protein",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 8,
        "unit": "",
        "item": "chicken thighs"
      },
      {
        "qty": 0.75,
        "unit": "cup",
        "item": "barbecue sauce"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "honey"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "apple cider vinegar"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "smoked paprika"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "garlic powder"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "scallion"
      }
    ],
    "steps": [
      "Pat chicken dry; season with paprika, garlic powder, and salt.",
      "Whisk sauce, honey, and vinegar.",
      "Grill or bake chicken at 400°F 25 minutes, basting with sauce every 8 minutes.",
      "Glaze once more; cook 5 minutes until sticky.",
      "Rest 3 minutes, garnish with scallions, and serve."
    ]
  },
  {
    "id": "r214",
    "name": "Grilled Corn Ribs with Lime Butter",
    "minutes": 25,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-bbq",
      "collection-grill",
      "vegetarian",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 4,
        "unit": "",
        "item": "corn on the cob"
      },
      {
        "qty": 4,
        "unit": "tbsp",
        "item": "butter"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "lime"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "chili powder"
      },
      {
        "qty": 0.25,
        "unit": "tsp",
        "item": "salt"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "cilantro"
      }
    ],
    "steps": [
      "Quarter each cob lengthwise into ribs (5 minutes).",
      "Brush with half the melted butter; grill over medium-high heat 10 minutes, turning.",
      "Mix remaining butter with lime zest, chili, and salt.",
      "Drizzle lime butter over hot corn.",
      "Finish with cilantro and serve immediately."
    ]
  },
  {
    "id": "r215",
    "name": "BBQ Brisket Sandwiches",
    "minutes": 420,
    "servings": 8,
    "tags": [
      "dinner",
      "collection-bbq",
      "high-protein",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 3,
        "unit": "lb",
        "item": "beef brisket"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "barbecue sauce"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "brown sugar"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "smoked paprika"
      },
      {
        "qty": 2,
        "unit": "tsp",
        "item": "garlic powder"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "beef broth"
      },
      {
        "qty": 8,
        "unit": "",
        "item": "burger bun"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Rub brisket with paprika, garlic powder, salt, and brown sugar.",
      "Slow cook with broth at 300°F 6 hours covered until tender.",
      "Shred meat; toss with barbecue sauce.",
      "Toast buns 3 minutes.",
      "Pile brisket on buns and serve within 10 minutes."
    ]
  },
  {
    "id": "r216",
    "name": "Grilled BBQ Pork Chops",
    "minutes": 30,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-bbq",
      "collection-grill",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 4,
        "unit": "",
        "item": "bone-in pork chops"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "barbecue sauce"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "olive oil"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "smoked paprika"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "brown sugar"
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
      "Rub chops with oil, paprika, sugar, salt, and pepper.",
      "Grill over medium heat 6 minutes per side.",
      "Brush with barbecue sauce; grill 2 minutes more.",
      "Rest 3 minutes before serving.",
      "Serve with extra sauce on the side."
    ]
  },
  {
    "id": "r217",
    "name": "Smoky BBQ Meatballs",
    "minutes": 35,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-bbq",
      "high-protein",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1.5,
        "unit": "lb",
        "item": "ground beef"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "breadcrumbs"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "egg"
      },
      {
        "qty": 0.75,
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
        "unit": "tsp",
        "item": "smoked paprika"
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
      "Mix beef, breadcrumbs, egg, garlic, paprika, and salt (5 minutes).",
      "Roll 18 meatballs; bake at 400°F 15 minutes.",
      "Simmer sauce and brown sugar 3 minutes.",
      "Toss meatballs in sauce 5 minutes until glazed.",
      "Serve hot as sliders or over rice."
    ]
  },
  {
    "id": "r218",
    "name": "Charred BBQ Cauliflower Steaks",
    "minutes": 28,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-bbq",
      "collection-grill",
      "vegetarian",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 2,
        "unit": "",
        "item": "head cauliflower"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "barbecue sauce"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "olive oil"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "smoked paprika"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "cumin"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "parsley"
      }
    ],
    "steps": [
      "Slice cauliflower into 1-inch steaks (5 minutes).",
      "Brush with oil; season with paprika, cumin, and salt.",
      "Grill 5 minutes per side until charred.",
      "Brush with barbecue sauce; grill 2 minutes more.",
      "Garnish with parsley and serve."
    ]
  },
  {
    "id": "r219",
    "name": "Hearty Vegetable Minestrone",
    "minutes": 45,
    "servings": 8,
    "tags": [
      "dinner",
      "collection-soup",
      "vegetarian",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "olive oil"
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
        "qty": 3,
        "unit": "clove",
        "item": "garlic"
      },
      {
        "qty": 1,
        "unit": "can",
        "item": "cannellini beans"
      },
      {
        "qty": 1,
        "unit": "can",
        "item": "diced tomatoes"
      },
      {
        "qty": 6,
        "unit": "cup",
        "item": "vegetable broth"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "small pasta"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "Italian seasoning"
      }
    ],
    "steps": [
      "Dice onion, carrot, and celery (8 minutes).",
      "Sauté vegetables in oil 8 minutes; add garlic 1 minute.",
      "Pour in broth, tomatoes, beans, and seasoning; simmer 15 minutes.",
      "Add pasta; cook 9 minutes until tender.",
      "Adjust salt and serve with olive oil drizzle."
    ]
  },
  {
    "id": "r220",
    "name": "Classic Chicken Noodle Soup",
    "minutes": 40,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-soup",
      "high-protein",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "chicken breast"
      },
      {
        "qty": 8,
        "unit": "cup",
        "item": "chicken broth"
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
        "qty": 8,
        "unit": "oz",
        "item": "egg noodles"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "bay leaf"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "thyme"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Dice vegetables (6 minutes).",
      "Simmer chicken in broth with vegetables, bay, thyme, and salt 18 minutes.",
      "Remove chicken; shred and return to pot.",
      "Add noodles; cook 8 minutes until tender.",
      "Discard bay leaves and serve hot."
    ]
  },
  {
    "id": "r221",
    "name": "Spicy Black Bean Soup",
    "minutes": 35,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-soup",
      "vegetarian",
      "vegan",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 2,
        "unit": "can",
        "item": "black beans"
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
        "qty": 1,
        "unit": "",
        "item": "bell pepper"
      },
      {
        "qty": 4,
        "unit": "cup",
        "item": "vegetable broth"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "cumin"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "chili powder"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "lime juice"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Dice onion and pepper; mince garlic (5 minutes).",
      "Sauté aromatics in oil 6 minutes.",
      "Add beans, broth, cumin, chili, and salt; simmer 12 minutes.",
      "Blend half the soup smooth; return to pot.",
      "Finish with lime juice and serve."
    ]
  },
  {
    "id": "r222",
    "name": "Beef and Barley Stew",
    "minutes": 90,
    "servings": 8,
    "tags": [
      "dinner",
      "collection-soup",
      "high-protein",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 1.5,
        "unit": "lb",
        "item": "stew beef"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "pearl barley"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "carrot"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "potato"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "yellow onion"
      },
      {
        "qty": 6,
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
        "unit": "",
        "item": "bay leaf"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Cube beef and vegetables (10 minutes).",
      "Brown beef in batches 12 minutes total.",
      "Add onion and tomato paste; cook 3 minutes.",
      "Stir in barley, vegetables, broth, bay, and salt; simmer 55 minutes covered.",
      "Rest 5 minutes and serve."
    ]
  },
  {
    "id": "r223",
    "name": "Creamy Tomato Tortellini Soup",
    "minutes": 30,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-soup",
      "vegetarian",
      "moderate",
      "easy"
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
        "qty": 3,
        "unit": "cup",
        "item": "vegetable broth"
      },
      {
        "qty": 0.5,
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
        "unit": "tsp",
        "item": "Italian seasoning"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "basil"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Mince garlic (1 minute).",
      "Simmer tomatoes, broth, garlic, and seasoning 8 minutes.",
      "Add tortellini; cook 5 minutes until floating.",
      "Stir in cream and salt off heat.",
      "Top with basil and serve."
    ]
  },
  {
    "id": "r224",
    "name": "Lentil Sausage Stew",
    "minutes": 50,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-soup",
      "high-protein",
      "budget",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "cup",
        "item": "brown lentils"
      },
      {
        "qty": 12,
        "unit": "oz",
        "item": "Italian sausage"
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
        "qty": 4,
        "unit": "cup",
        "item": "chicken broth"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "tomato paste"
      },
      {
        "qty": 2,
        "unit": "clove",
        "item": "garlic"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "smoked paprika"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Slice sausage; dice onion and carrot (6 minutes).",
      "Brown sausage 6 minutes; add vegetables and garlic 5 minutes.",
      "Stir in lentils, broth, tomato paste, paprika, and salt.",
      "Simmer 30 minutes until lentils are tender.",
      "Rest 4 minutes and ladle into bowls."
    ]
  },
  {
    "id": "r225",
    "name": "Fish and Chips Tray Bake",
    "minutes": 40,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-pub",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 1.5,
        "unit": "lb",
        "item": "cod fillets"
      },
      {
        "qty": 2,
        "unit": "lb",
        "item": "russet potatoes"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "all-purpose flour"
      },
      {
        "qty": 12,
        "unit": "oz",
        "item": "beer"
      },
      {
        "qty": 2,
        "unit": "tsp",
        "item": "baking powder"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "malt vinegar"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "vegetable oil"
      }
    ],
    "steps": [
      "Cut potatoes into thick fries; toss with oil and salt; roast at 425°F 25 minutes.",
      "Whisk flour, baking powder, and beer into batter.",
      "Pat fish dry; dip in batter and place on a greased rack.",
      "Bake fish alongside fries 12 minutes until crisp.",
      "Serve with malt vinegar immediately."
    ]
  },
  {
    "id": "r226",
    "name": "Shepherd's Pie Pub Style",
    "minutes": 55,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-pub",
      "high-protein",
      "moderate",
      "medium"
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
        "qty": 1,
        "unit": "cup",
        "item": "frozen peas"
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
        "item": "whole milk"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Boil potatoes 18 minutes; mash with butter, milk, and half the salt.",
      "Brown lamb with onion 10 minutes; stir in tomato paste and broth.",
      "Simmer 8 minutes; fold in peas.",
      "Spread lamb in a baking dish; top with mashed potatoes.",
      "Bake at 400°F 15 minutes until golden."
    ]
  },
  {
    "id": "r227",
    "name": "Bangers and Mash Bowls",
    "minutes": 35,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-pub",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 8,
        "unit": "",
        "item": "pork sausage links"
      },
      {
        "qty": 2,
        "unit": "lb",
        "item": "Yukon gold potatoes"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "whole milk"
      },
      {
        "qty": 4,
        "unit": "tbsp",
        "item": "butter"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "onion gravy"
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
      "Boil potatoes 16 minutes; drain and mash with butter, milk, and salt.",
      "Grill or pan-sear sausages 12 minutes until browned.",
      "Warm gravy 3 minutes.",
      "Divide mash among bowls; top with sausages and gravy.",
      "Garnish with scallions and serve."
    ]
  },
  {
    "id": "r228",
    "name": "Pub Cheese Steak Skillet",
    "minutes": 25,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-pub",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "sirloin steak"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "yellow onion"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "green bell pepper"
      },
      {
        "qty": 8,
        "unit": "slice",
        "item": "provolone cheese"
      },
      {
        "qty": 4,
        "unit": "",
        "item": "sub roll"
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
      },
      {
        "qty": 0.25,
        "unit": "tsp",
        "item": "black pepper"
      }
    ],
    "steps": [
      "Slice steak, onion, and pepper thin (6 minutes).",
      "Sear steak in oil over high heat 4 minutes.",
      "Add onion and pepper; cook 5 minutes until soft.",
      "Top with cheese; cover 2 minutes to melt.",
      "Stuff rolls or serve skillet-style immediately."
    ]
  },
  {
    "id": "r229",
    "name": "Crispy Chicken Tenders & Fries",
    "minutes": 35,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-pub",
      "high-protein",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1.5,
        "unit": "lb",
        "item": "chicken tenders"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "all-purpose flour"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "panko breadcrumbs"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "egg"
      },
      {
        "qty": 1,
        "unit": "lb",
        "item": "frozen fries"
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
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "ranch dressing"
      }
    ],
    "steps": [
      "Bake fries per package 18 minutes at 425°F.",
      "Season flour with paprika and salt; beat eggs.",
      "Coat tenders in flour, egg, then panko.",
      "Bake on a rack 15 minutes until crisp and 165°F inside.",
      "Serve with fries and ranch."
    ]
  },
  {
    "id": "r230",
    "name": "Mushroom Stout Pie",
    "minutes": 50,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-pub",
      "vegetarian",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "cremini mushrooms"
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
        "qty": 1,
        "unit": "cup",
        "item": "stout beer"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "vegetable broth"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "all-purpose flour"
      },
      {
        "qty": 1,
        "unit": "sheet",
        "item": "puff pastry"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "butter"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "thyme"
      }
    ],
    "steps": [
      "Slice mushrooms and dice vegetables (8 minutes).",
      "Sauté vegetables in butter 10 minutes.",
      "Stir in flour 1 minute; add stout and broth; simmer 12 minutes.",
      "Spoon filling into a dish; cover with pastry and brush with butter.",
      "Bake at 400°F 20 minutes until puffed and golden."
    ]
  },
  {
    "id": "r231",
    "name": "Chicken Enchilada Bake",
    "minutes": 45,
    "servings": 8,
    "tags": [
      "dinner",
      "collection-texmex",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 2,
        "unit": "lb",
        "item": "cooked chicken"
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
        "item": "Mexican cheese blend"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "yellow onion"
      },
      {
        "qty": 1,
        "unit": "can",
        "item": "black beans"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "sour cream"
      },
      {
        "qty": 0.5,
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
      "Dice onion; drain beans (4 minutes).",
      "Shred chicken and toss with half the sauce, cumin, and salt.",
      "Layer tortillas, chicken, beans, onion, and cheese in a baking dish.",
      "Pour remaining sauce on top; sprinkle extra cheese.",
      "Bake at 375°F 22 minutes until bubbly."
    ]
  },
  {
    "id": "r232",
    "name": "Beef Burrito Bowls",
    "minutes": 30,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-texmex",
      "high-protein",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "ground beef"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "cooked rice"
      },
      {
        "qty": 1,
        "unit": "can",
        "item": "black beans"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "corn kernels"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "salsa"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "chili powder"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "shredded cheddar"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "lime"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Brown beef with chili powder and salt 8 minutes.",
      "Warm beans and corn 4 minutes.",
      "Divide rice among bowls.",
      "Top with beef, beans, corn, salsa, and cheese.",
      "Squeeze lime and serve."
    ]
  },
  {
    "id": "r233",
    "name": "Queso Fundido Nachos",
    "minutes": 25,
    "servings": 6,
    "tags": [
      "dinner",
      "collection-texmex",
      "vegetarian",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 12,
        "unit": "oz",
        "item": "tortilla chips"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "Monterey Jack cheese"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "cheddar cheese"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "salsa"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "pickled jalapeños"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "sour cream"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "cilantro"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "cumin"
      }
    ],
    "steps": [
      "Spread chips on a sheet pan (2 minutes).",
      "Sprinkle cheeses and cumin over chips.",
      "Bake at 400°F 8 minutes until melted.",
      "Top with salsa, jalapeños, sour cream, and cilantro.",
      "Serve immediately while crisp."
    ]
  },
  {
    "id": "r234",
    "name": "Shrimp Tacos with Slaw",
    "minutes": 22,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-texmex",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "large shrimp"
      },
      {
        "qty": 8,
        "unit": "",
        "item": "corn tortilla"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "shredded cabbage"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "mayonnaise"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "lime"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "chili powder"
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
      "Toss cabbage with mayo, lime juice, and pinch of salt for slaw (3 minutes).",
      "Season shrimp with chili powder and salt.",
      "Sear shrimp in oil 4 minutes until pink.",
      "Warm tortillas 2 minutes.",
      "Fill tortillas with shrimp and slaw; serve with lime wedges."
    ]
  },
  {
    "id": "r235",
    "name": "Tex-Mex Stuffed Peppers",
    "minutes": 50,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-texmex",
      "high-protein",
      "gluten-free",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 4,
        "unit": "",
        "item": "bell pepper"
      },
      {
        "qty": 1,
        "unit": "lb",
        "item": "ground turkey"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "cooked rice"
      },
      {
        "qty": 1,
        "unit": "can",
        "item": "diced tomatoes"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "corn kernels"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "cumin"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "chili powder"
      },
      {
        "qty": 0.5,
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
      "Halve peppers and remove seeds (4 minutes).",
      "Brown turkey with cumin, chili, and salt 8 minutes.",
      "Stir in rice, tomatoes, and corn; cook 5 minutes.",
      "Stuff peppers; top with cheese.",
      "Bake at 375°F 28 minutes until peppers are tender."
    ]
  },
  {
    "id": "r236",
    "name": "Chipotle Lime Rice Bowls",
    "minutes": 28,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-texmex",
      "vegetarian",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 2,
        "unit": "cup",
        "item": "cooked rice"
      },
      {
        "qty": 1,
        "unit": "can",
        "item": "black beans"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "corn kernels"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "chipotle adobo sauce"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "lime"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "sour cream"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "cilantro"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "avocado"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Warm rice with adobo and salt 4 minutes.",
      "Heat beans and corn 4 minutes.",
      "Slice avocado (2 minutes).",
      "Divide rice among bowls; top with beans, corn, avocado, and sour cream.",
      "Finish with cilantro and lime juice."
    ]
  },
  {
    "id": "r237",
    "name": "Sesame Ginger Stir-Fry Noodles",
    "minutes": 20,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-asian",
      "takeout-style",
      "vegetarian",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 12,
        "unit": "oz",
        "item": "lo mein noodles"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "broccoli florets"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "red bell pepper"
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
        "item": "honey"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "ginger"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "scallion"
      }
    ],
    "steps": [
      "Cook noodles 4 minutes; drain.",
      "Slice pepper; whisk sauce ingredients (4 minutes).",
      "Stir-fry broccoli and pepper in oil 5 minutes.",
      "Add noodles and sauce; toss 4 minutes over high heat.",
      "Top with scallions and serve."
    ]
  },
  {
    "id": "r238",
    "name": "Orange Chicken Skillet",
    "minutes": 28,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-asian",
      "takeout-style",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1.5,
        "unit": "lb",
        "item": "chicken breast"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "orange juice"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "soy sauce"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "honey"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "cornstarch"
      },
      {
        "qty": 2,
        "unit": "clove",
        "item": "garlic"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "vegetable oil"
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
      "Cube chicken; season with salt (4 minutes).",
      "Sear chicken in oil 8 minutes until browned.",
      "Whisk juice, soy, honey, cornstarch, and garlic.",
      "Pour sauce over chicken; simmer 6 minutes until glossy.",
      "Garnish with scallions and serve over rice."
    ]
  },
  {
    "id": "r239",
    "name": "Pad Thai with Shrimp",
    "minutes": 25,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-asian",
      "takeout-style",
      "high-protein",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 8,
        "unit": "oz",
        "item": "rice noodles"
      },
      {
        "qty": 1,
        "unit": "lb",
        "item": "large shrimp"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "egg"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "fish sauce"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "tamarind paste"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "brown sugar"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "bean sprouts"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "peanuts"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "lime"
      }
    ],
    "steps": [
      "Soak noodles in hot water 8 minutes; drain.",
      "Whisk fish sauce, tamarind, and sugar.",
      "Scramble eggs in a wok 1 minute; push aside.",
      "Stir-fry shrimp 3 minutes; add noodles and sauce 4 minutes.",
      "Toss sprouts and peanuts; serve with lime."
    ]
  },
  {
    "id": "r240",
    "name": "General Tso's Cauliflower",
    "minutes": 30,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-asian",
      "takeout-style",
      "vegetarian",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 2,
        "unit": "",
        "item": "head cauliflower"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "cornstarch"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "soy sauce"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "rice vinegar"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "hoisin sauce"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "sugar"
      },
      {
        "qty": 3,
        "unit": "clove",
        "item": "garlic"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "vegetable oil"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "scallion"
      }
    ],
    "steps": [
      "Cut cauliflower into florets (5 minutes).",
      "Toss with cornstarch; roast at 425°F 15 minutes.",
      "Simmer soy, vinegar, hoisin, sugar, and garlic 4 minutes.",
      "Coat cauliflower in sauce 3 minutes.",
      "Garnish with scallions and serve."
    ]
  },
  {
    "id": "r241",
    "name": "Korean Beef Rice Bowls",
    "minutes": 22,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-asian",
      "takeout-style",
      "high-protein",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "ground beef"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "soy sauce"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "brown sugar"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "sesame oil"
      },
      {
        "qty": 3,
        "unit": "clove",
        "item": "garlic"
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
      },
      {
        "qty": 2,
        "unit": "",
        "item": "scallion"
      },
      {
        "qty": 1,
        "unit": "tsp",
        "item": "gochujang"
      }
    ],
    "steps": [
      "Brown beef 6 minutes; drain excess fat.",
      "Stir in soy, sugar, garlic, ginger, and gochujang 4 minutes.",
      "Drizzle sesame oil.",
      "Divide rice among bowls; top with beef.",
      "Garnish with scallions and serve."
    ]
  },
  {
    "id": "r242",
    "name": "Sweet & Sour Pork",
    "minutes": 32,
    "servings": 4,
    "tags": [
      "dinner",
      "collection-asian",
      "takeout-style",
      "high-protein",
      "moderate",
      "medium"
    ],
    "ingredients": [
      {
        "qty": 1,
        "unit": "lb",
        "item": "pork tenderloin"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "pineapple chunks"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "rice vinegar"
      },
      {
        "qty": 3,
        "unit": "tbsp",
        "item": "ketchup"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "brown sugar"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "cornstarch"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "bell pepper"
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
      "Cube pork; season with salt (4 minutes).",
      "Stir-fry pork in oil 6 minutes until browned.",
      "Whisk vinegar, ketchup, sugar, and cornstarch with 0.25 cup water.",
      "Add sauce, pineapple, and sliced pepper; simmer 6 minutes.",
      "Serve over rice within 5 minutes."
    ]
  },
  {
    "id": "r243",
    "name": "Everything Bagel Breakfast Casserole",
    "minutes": 50,
    "servings": 8,
    "tags": [
      "breakfast",
      "collection-breakfast",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 8,
        "unit": "",
        "item": "everything bagel"
      },
      {
        "qty": 8,
        "unit": "",
        "item": "egg"
      },
      {
        "qty": 1.5,
        "unit": "cup",
        "item": "whole milk"
      },
      {
        "qty": 8,
        "unit": "oz",
        "item": "cream cheese"
      },
      {
        "qty": 6,
        "unit": "slice",
        "item": "bacon"
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
      },
      {
        "qty": 0.25,
        "unit": "tsp",
        "item": "black pepper"
      }
    ],
    "steps": [
      "Cook bacon 8 minutes; crumble. Cube bagels (5 minutes).",
      "Whisk eggs, milk, cream cheese, salt, and pepper.",
      "Layer bagels, bacon, and cheese in a dish.",
      "Pour egg mixture over; soak 10 minutes.",
      "Bake at 375°F 25 minutes until set."
    ]
  },
  {
    "id": "r244",
    "name": "Spinach Feta Breakfast Wraps",
    "minutes": 15,
    "servings": 4,
    "tags": [
      "breakfast",
      "collection-breakfast",
      "vegetarian",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 6,
        "unit": "",
        "item": "egg"
      },
      {
        "qty": 2,
        "unit": "cup",
        "item": "baby spinach"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "crumbled feta"
      },
      {
        "qty": 4,
        "unit": "",
        "item": "large tortilla"
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
      },
      {
        "qty": 0.25,
        "unit": "tsp",
        "item": "black pepper"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "tomato"
      }
    ],
    "steps": [
      "Slice tomatoes (2 minutes).",
      "Wilt spinach in butter 2 minutes.",
      "Scramble eggs with salt and pepper 4 minutes.",
      "Fold in feta.",
      "Fill tortillas with eggs, spinach, and tomato; roll and serve."
    ]
  },
  {
    "id": "r245",
    "name": "Turkey Club Lunch Boxes",
    "minutes": 12,
    "servings": 4,
    "tags": [
      "lunch",
      "collection-lunch",
      "high-protein",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 12,
        "unit": "oz",
        "item": "sliced turkey"
      },
      {
        "qty": 8,
        "unit": "slice",
        "item": "Swiss cheese"
      },
      {
        "qty": 4,
        "unit": "slice",
        "item": "bacon"
      },
      {
        "qty": 4,
        "unit": "",
        "item": "ciabatta roll"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "tomato"
      },
      {
        "qty": 0.5,
        "unit": "",
        "item": "head lettuce"
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
      "Cook bacon 6 minutes until crisp.",
      "Slice rolls and tomatoes (3 minutes).",
      "Spread mayo on rolls; layer turkey, cheese, bacon, lettuce, and tomato.",
      "Season with salt.",
      "Cut in half and pack for lunch."
    ]
  },
  {
    "id": "r246",
    "name": "Mediterranean Tuna Salad Pitas",
    "minutes": 15,
    "servings": 4,
    "tags": [
      "lunch",
      "collection-lunch",
      "high-protein",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 2,
        "unit": "can",
        "item": "tuna"
      },
      {
        "qty": 0.5,
        "unit": "cup",
        "item": "Greek yogurt"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "cucumber"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "kalamata olives"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "qty": 4,
        "unit": "",
        "item": "pita bread"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "red onion"
      },
      {
        "qty": 0.5,
        "unit": "tsp",
        "item": "dried oregano"
      },
      {
        "qty": 0.25,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "steps": [
      "Drain tuna; dice cucumber and onion (4 minutes).",
      "Mix tuna, yogurt, lemon, oregano, salt, olives, and vegetables.",
      "Warm pitas 2 minutes.",
      "Stuff pitas with salad.",
      "Serve chilled or room temperature."
    ]
  },
  {
    "id": "r247",
    "name": "Caprese Panini Lunch",
    "minutes": 18,
    "servings": 4,
    "tags": [
      "lunch",
      "collection-lunch",
      "vegetarian",
      "moderate",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 8,
        "unit": "slice",
        "item": "sourdough bread"
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
        "item": "basil pesto"
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
        "qty": 0.25,
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
      "Slice tomatoes and mozzarella (4 minutes).",
      "Spread pesto on bread; layer tomato and cheese.",
      "Brush outsides with oil; season with salt and pepper.",
      "Grill in a panini press or skillet 6 minutes until melted.",
      "Drizzle balsamic and serve."
    ]
  },
  {
    "id": "r248",
    "name": "Peanut Noodle Lunch Jars",
    "minutes": 20,
    "servings": 4,
    "tags": [
      "lunch",
      "collection-lunch",
      "vegetarian",
      "vegan",
      "budget",
      "easy"
    ],
    "ingredients": [
      {
        "qty": 12,
        "unit": "oz",
        "item": "rice noodles"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "peanut butter"
      },
      {
        "qty": 2,
        "unit": "tbsp",
        "item": "soy sauce"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "lime juice"
      },
      {
        "qty": 1,
        "unit": "tbsp",
        "item": "maple syrup"
      },
      {
        "qty": 1,
        "unit": "cup",
        "item": "shredded carrot"
      },
      {
        "qty": 1,
        "unit": "",
        "item": "red bell pepper"
      },
      {
        "qty": 0.25,
        "unit": "cup",
        "item": "cilantro"
      },
      {
        "qty": 2,
        "unit": "",
        "item": "scallion"
      }
    ],
    "steps": [
      "Cook noodles 3 minutes; rinse cold.",
      "Whisk peanut butter, soy, lime, and maple with 2 tbsp warm water.",
      "Julienne pepper (3 minutes).",
      "Toss noodles with sauce, carrot, pepper, cilantro, and scallions.",
      "Pack into jars and chill up to 2 days."
    ]
  }
];
  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);
})();
