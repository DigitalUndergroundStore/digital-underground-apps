/** New classic recipe bodies keyed by replacement name (applied to flagged IDs). */

export const REPLACEMENT_QUEUE = [
  {
    name: "Classic Cheeseburgers",
    minutes: 25,
    servings: 4,
    tags: ["dinner", "lunch", "classic", "canadian", "easy", "moderate"],
    ingredients: [
      { qty: 1.5, unit: "lb", item: "ground beef" },
      { qty: 4, unit: "", item: "hamburger buns" },
      { qty: 4, unit: "slice", item: "cheddar cheese" },
      { qty: 1, unit: "", item: "medium onion, sliced" },
      { qty: 2, unit: "clove", item: "garlic, minced" },
      { qty: 2, unit: "tbsp", item: "ketchup" },
      { qty: 1, unit: "tbsp", item: "mustard" },
      { qty: 1, unit: "tsp", item: "salt" },
      { qty: 0.5, unit: "tsp", item: "black pepper" }
    ],
    steps: [
      "Divide beef into 4 patties; season with salt and pepper (3 minutes).",
      "Grill or skillet-cook patties 4–5 minutes per side to desired doneness.",
      "Toast buns 1 minute. Layer patty, cheese, onion, ketchup, and mustard.",
      "Serve immediately with pickles or a simple salad if you like."
    ]
  },
  {
    name: "Spaghetti and Meat Sauce",
    minutes: 35,
    servings: 6,
    tags: ["dinner", "classic", "italian", "easy", "moderate"],
    ingredients: [
      { qty: 1, unit: "lb", item: "ground beef" },
      { qty: 12, unit: "oz", item: "spaghetti" },
      { qty: 1, unit: "can", item: "crushed tomatoes" },
      { qty: 1, unit: "", item: "medium onion, diced" },
      { qty: 2, unit: "clove", item: "garlic, minced" },
      { qty: 2, unit: "tbsp", item: "tomato paste" },
      { qty: 1, unit: "tsp", item: "dried oregano" },
      { qty: 2, unit: "tbsp", item: "olive oil" },
      { qty: 0.5, unit: "tsp", item: "salt" }
    ],
    steps: [
      "Boil salted water; cook spaghetti 9–11 minutes until al dente (10 minutes).",
      "Brown beef in oil; add onion and garlic 4 minutes.",
      "Stir in tomato paste, tomatoes, and oregano; simmer 15 minutes.",
      "Toss pasta with sauce. Serve with Parmesan if you have it."
    ]
  },
  {
    name: "Homestyle Lasagna",
    minutes: 65,
    servings: 8,
    tags: ["dinner", "classic", "italian", "medium", "moderate"],
    ingredients: [
      { qty: 1, unit: "lb", item: "ground beef" },
      { qty: 12, unit: "", item: "lasagna noodles" },
      { qty: 3, unit: "cup", item: "ricotta cheese" },
      { qty: 2, unit: "cup", item: "mozzarella cheese" },
      { qty: 1, unit: "cup", item: "marinara sauce" },
      { qty: 1, unit: "", item: "medium onion, diced" },
      { qty: 2, unit: "clove", item: "garlic, minced" },
      { qty: 1, unit: "tsp", item: "dried basil" },
      { qty: 2, unit: "tbsp", item: "olive oil" }
    ],
    steps: [
      "Cook noodles until just flexible; drain (8 minutes).",
      "Brown beef with onion and garlic; stir in basil and half the marinara (10 minutes).",
      "Layer noodles, ricotta, meat sauce, and mozzarella in a baking dish.",
      "Top with remaining sauce and cheese. Bake at 375°F 35 minutes until bubbling.",
      "Rest 10 minutes before cutting."
    ]
  },
  {
    name: "Beef and Broccoli Stir-Fry",
    minutes: 28,
    servings: 4,
    tags: ["dinner", "classic", "dairy-free", "easy", "moderate"],
    ingredients: [
      { qty: 1, unit: "lb", item: "flank steak, sliced thin" },
      { qty: 4, unit: "cup", item: "broccoli florets" },
      { qty: 3, unit: "tbsp", item: "soy sauce" },
      { qty: 1, unit: "tbsp", item: "cornstarch" },
      { qty: 2, unit: "clove", item: "garlic, minced" },
      { qty: 1, unit: "tbsp", item: "fresh ginger, grated" },
      { qty: 2, unit: "tbsp", item: "vegetable oil" },
      { qty: 1.5, unit: "cup", item: "cooked rice" }
    ],
    steps: [
      "Toss beef with 1 tbsp soy sauce and cornstarch (3 minutes).",
      "Stir-fry broccoli in hot oil 3 minutes; add garlic and ginger 30 seconds.",
      "Add beef; cook 3–4 minutes until just done.",
      "Pour in remaining soy sauce; toss 1 minute. Serve over rice."
    ]
  },
  {
    name: "Breakfast Burritos",
    minutes: 20,
    servings: 4,
    tags: ["breakfast", "classic", "easy", "moderate"],
    ingredients: [
      { qty: 8, unit: "", item: "eggs" },
      { qty: 4, unit: "", item: "large flour tortillas" },
      { qty: 4, unit: "slice", item: "cheddar cheese" },
      { qty: 4, unit: "slice", item: "cooked bacon" },
      { qty: 0.5, unit: "cup", item: "salsa" },
      { qty: 2, unit: "tbsp", item: "butter" },
      { qty: 0.25, unit: "tsp", item: "salt" }
    ],
    steps: [
      "Scramble eggs in butter with salt (5 minutes).",
      "Warm tortillas 30 seconds per side.",
      "Fill each tortilla with eggs, bacon, cheese, and salsa; roll tight.",
      "Optional: toast seam-side down in a dry pan 1 minute."
    ]
  },
  {
    name: "Classic Beef Chili",
    minutes: 45,
    servings: 6,
    tags: ["dinner", "classic", "canadian", "easy", "moderate"],
    ingredients: [
      { qty: 1.5, unit: "lb", item: "ground beef" },
      { qty: 2, unit: "can", item: "kidney beans" },
      { qty: 1, unit: "can", item: "crushed tomatoes" },
      { qty: 1, unit: "", item: "medium onion, diced" },
      { qty: 2, unit: "clove", item: "garlic, minced" },
      { qty: 2, unit: "tbsp", item: "chili powder" },
      { qty: 1, unit: "tsp", item: "cumin" },
      { qty: 1, unit: "cup", item: "beef broth" }
    ],
    steps: [
      "Brown beef; drain excess fat (8 minutes).",
      "Add onion and garlic; cook 3 minutes.",
      "Stir in spices, tomatoes, beans, and broth. Simmer 30 minutes.",
      "Taste and adjust salt. Serve with shredded cheese if desired."
    ]
  },
  {
    name: "BBQ Baby Back Ribs",
    minutes: 150,
    servings: 4,
    tags: ["dinner", "classic", "canadian", "medium", "moderate"],
    ingredients: [
      { qty: 2, unit: "lb", item: "pork back ribs" },
      { qty: 0.5, unit: "cup", item: "barbecue sauce" },
      { qty: 2, unit: "tbsp", item: "brown sugar" },
      { qty: 1, unit: "tsp", item: "smoked paprika" },
      { qty: 1, unit: "tsp", item: "garlic powder" },
      { qty: 0.5, unit: "tsp", item: "salt" },
      { qty: 0.5, unit: "tsp", item: "black pepper" }
    ],
    steps: [
      "Rub ribs with sugar, paprika, garlic powder, salt, and pepper (5 minutes).",
      "Wrap in foil; bake at 300°F 2 hours until tender.",
      "Unwrap; brush with barbecue sauce. Broil or grill 5 minutes to caramelize.",
      "Rest 5 minutes before serving."
    ]
  },
  {
    name: "Pan-Fried Pork Chops with Mashed Potatoes",
    minutes: 40,
    servings: 4,
    tags: ["dinner", "classic", "canadian", "easy", "moderate"],
    ingredients: [
      { qty: 4, unit: "", item: "bone-in pork chops" },
      { qty: 1.5, unit: "lb", item: "Yukon Gold potatoes" },
      { qty: 3, unit: "tbsp", item: "butter" },
      { qty: 0.5, unit: "cup", item: "milk" },
      { qty: 2, unit: "tbsp", item: "olive oil" },
      { qty: 1, unit: "tsp", item: "salt" },
      { qty: 0.5, unit: "tsp", item: "black pepper" }
    ],
    steps: [
      "Boil potatoes until tender; mash with butter, milk, and salt (20 minutes).",
      "Pat chops dry; season with salt and pepper.",
      "Sear chops in oil 4 minutes per side until 145°F in the centre.",
      "Rest chops 3 minutes. Serve with mashed potatoes."
    ]
  },
  {
    name: "Grilled Cheese & Tomato Soup",
    minutes: 22,
    servings: 4,
    tags: ["lunch", "classic", "canadian", "easy", "budget"],
    ingredients: [
      { qty: 8, unit: "slice", item: "bread" },
      { qty: 8, unit: "slice", item: "cheddar cheese" },
      { qty: 3, unit: "tbsp", item: "butter" },
      { qty: 2, unit: "can", item: "tomato soup" },
      { qty: 1, unit: "cup", item: "milk" },
      { qty: 0.25, unit: "tsp", item: "black pepper" }
    ],
    steps: [
      "Heat tomato soup with milk over medium heat (5 minutes).",
      "Butter bread; sandwich cheese between slices.",
      "Cook sandwiches in a skillet 3 minutes per side until golden and melted.",
      "Serve hot sandwiches with soup for dipping."
    ]
  },
  {
    name: "Sloppy Joe Sandwiches",
    minutes: 25,
    servings: 4,
    tags: ["dinner", "classic", "easy", "budget"],
    ingredients: [
      { qty: 1, unit: "lb", item: "ground beef" },
      { qty: 1, unit: "cup", item: "ketchup" },
      { qty: 1, unit: "tbsp", item: "brown sugar" },
      { qty: 1, unit: "tbsp", item: "mustard" },
      { qty: 1, unit: "", item: "medium onion, diced" },
      { qty: 4, unit: "", item: "hamburger buns" },
      { qty: 0.5, unit: "tsp", item: "salt" }
    ],
    steps: [
      "Brown beef with onion; drain fat (8 minutes).",
      "Stir in ketchup, sugar, mustard, and salt. Simmer 5 minutes.",
      "Spoon onto toasted buns and serve."
    ]
  },
  {
    name: "Roast Chicken Dinner",
    minutes: 75,
    servings: 6,
    tags: ["dinner", "classic", "canadian", "medium", "moderate"],
    ingredients: [
      { qty: 1, unit: "", item: "whole chicken" },
      { qty: 1.5, unit: "lb", item: "potatoes, quartered" },
      { qty: 3, unit: "", item: "carrots, chunked" },
      { qty: 1, unit: "", item: "medium onion, quartered" },
      { qty: 3, unit: "tbsp", item: "olive oil" },
      { qty: 1, unit: "tsp", item: "dried thyme" },
      { qty: 1, unit: "tsp", item: "salt" },
      { qty: 0.5, unit: "tsp", item: "black pepper" }
    ],
    steps: [
      "Heat oven to 425°F. Pat chicken dry; season inside and out (5 minutes).",
      "Toss potatoes, carrots, and onion with oil, thyme, salt, and pepper.",
      "Roast chicken on a pan with vegetables 60–70 minutes until juices run clear.",
      "Rest chicken 10 minutes before carving. Serve with pan juices."
    ]
  },
  {
    name: "Shepherd's Pie",
    minutes: 55,
    servings: 6,
    tags: ["dinner", "classic", "canadian", "medium", "moderate"],
    ingredients: [
      { qty: 1.5, unit: "lb", item: "ground beef" },
      { qty: 2, unit: "lb", item: "potatoes" },
      { qty: 1, unit: "cup", item: "frozen peas" },
      { qty: 1, unit: "", item: "medium onion, diced" },
      { qty: 2, unit: "clove", item: "garlic, minced" },
      { qty: 1, unit: "can", item: "tomato paste" },
      { qty: 1, unit: "cup", item: "beef broth" },
      { qty: 3, unit: "tbsp", item: "butter" }
    ],
    steps: [
      "Boil potatoes; mash with butter and salt (20 minutes).",
      "Brown beef with onion and garlic; add tomato paste and broth. Simmer 10 minutes.",
      "Stir in peas. Spread meat in a baking dish; top with mashed potatoes.",
      "Bake at 400°F 20 minutes until golden."
    ]
  },
  {
    name: "Homestyle Chicken Noodle Soup",
    minutes: 45,
    servings: 8,
    tags: ["dinner", "lunch", "classic", "easy", "moderate"],
    ingredients: [
      { qty: 1, unit: "lb", item: "chicken breast" },
      { qty: 8, unit: "cup", item: "chicken broth" },
      { qty: 3, unit: "cup", item: "egg noodles" },
      { qty: 2, unit: "", item: "carrots, sliced" },
      { qty: 2, unit: "stalk", item: "celery, sliced" },
      { qty: 1, unit: "", item: "medium onion, diced" },
      { qty: 1, unit: "tsp", item: "dried thyme" },
      { qty: 0.5, unit: "tsp", item: "salt" }
    ],
    steps: [
      "Simmer chicken in broth 20 minutes until cooked; shred (5 minutes).",
      "Add carrots, celery, onion, and thyme; simmer 10 minutes.",
      "Stir in noodles; cook 8 minutes until tender.",
      "Return chicken; taste and adjust salt."
    ]
  },
  {
    name: "Mediterranean Chicken and Rice",
    minutes: 38,
    servings: 4,
    tags: ["dinner", "classic", "easy", "moderate"],
    ingredients: [
      { qty: 1.5, unit: "lb", item: "chicken thighs" },
      { qty: 1.5, unit: "cup", item: "long-grain rice" },
      { qty: 1, unit: "can", item: "diced tomatoes" },
      { qty: 1, unit: "", item: "medium onion, diced" },
      { qty: 2, unit: "clove", item: "garlic, minced" },
      { qty: 2, unit: "cup", item: "chicken broth" },
      { qty: 2, unit: "tbsp", item: "olive oil" },
      { qty: 1, unit: "tsp", item: "dried oregano" }
    ],
    steps: [
      "Season chicken; brown in oil 6 minutes per side. Set aside.",
      "Sauté onion and garlic 3 minutes. Stir in rice, tomatoes, broth, and oregano.",
      "Nestle chicken on top. Cover and simmer 22 minutes until rice is tender.",
      "Rest 5 minutes before serving."
    ]
  },
  {
    name: "Bangers and Mash",
    minutes: 35,
    servings: 4,
    tags: ["dinner", "classic", "canadian", "easy", "moderate"],
    ingredients: [
      { qty: 8, unit: "", item: "pork sausages" },
      { qty: 2, unit: "lb", item: "potatoes" },
      { qty: 0.5, unit: "cup", item: "milk" },
      { qty: 4, unit: "tbsp", item: "butter" },
      { qty: 1, unit: "cup", item: "onion gravy" },
      { qty: 1, unit: "tsp", item: "salt" }
    ],
    steps: [
      "Boil potatoes; mash with butter, milk, and salt (20 minutes).",
      "Grill or pan-fry sausages until browned and cooked through (12 minutes).",
      "Warm gravy. Serve sausages over mash with gravy."
    ]
  },
  {
    name: "Ground Beef Tacos",
    minutes: 22,
    servings: 4,
    tags: ["dinner", "classic", "easy", "moderate"],
    ingredients: [
      { qty: 1, unit: "lb", item: "ground beef" },
      { qty: 8, unit: "", item: "corn tortillas" },
      { qty: 1, unit: "packet", item: "taco seasoning" },
      { qty: 1, unit: "cup", item: "shredded lettuce" },
      { qty: 1, unit: "cup", item: "diced tomato" },
      { qty: 1, unit: "cup", item: "shredded cheddar cheese" },
      { qty: 0.5, unit: "cup", item: "salsa" }
    ],
    steps: [
      "Brown beef; drain fat. Add seasoning and splash of water; simmer 3 minutes.",
      "Warm tortillas in a dry pan.",
      "Fill with beef, lettuce, tomato, cheese, and salsa."
    ]
  },
  {
    name: "Chicken Fajitas",
    minutes: 28,
    servings: 4,
    tags: ["dinner", "classic", "easy", "moderate"],
    ingredients: [
      { qty: 1.5, unit: "lb", item: "chicken breast, sliced" },
      { qty: 2, unit: "", item: "bell peppers, sliced" },
      { qty: 1, unit: "", item: "medium onion, sliced" },
      { qty: 2, unit: "tbsp", item: "fajita seasoning" },
      { qty: 8, unit: "", item: "flour tortillas" },
      { qty: 2, unit: "tbsp", item: "vegetable oil" },
      { qty: 0.5, unit: "cup", item: "sour cream" }
    ],
    steps: [
      "Toss chicken with half the seasoning (2 minutes).",
      "Sear chicken in hot oil 4 minutes; add peppers and onion; cook 6 minutes.",
      "Sprinkle remaining seasoning; toss 1 minute.",
      "Serve in warm tortillas with sour cream."
    ]
  },
  {
    name: "Pork Fried Rice",
    minutes: 25,
    servings: 4,
    tags: ["dinner", "classic", "dairy-free", "easy", "budget"],
    ingredients: [
      { qty: 3, unit: "cup", item: "cooked rice" },
      { qty: 0.75, unit: "lb", item: "pork loin, diced" },
      { qty: 2, unit: "", item: "eggs" },
      { qty: 1, unit: "cup", item: "frozen peas and carrots" },
      { qty: 3, unit: "tbsp", item: "soy sauce" },
      { qty: 2, unit: "tbsp", item: "vegetable oil" },
      { qty: 2, unit: "clove", item: "garlic, minced" }
    ],
    steps: [
      "Scramble eggs in a wok; set aside (2 minutes).",
      "Stir-fry pork until cooked; add garlic and vegetables 3 minutes.",
      "Add rice and soy sauce; toss 4 minutes. Fold in eggs and serve."
    ]
  },
  {
    name: "Tuna Noodle Casserole",
    minutes: 40,
    servings: 6,
    tags: ["dinner", "classic", "easy", "budget"],
    ingredients: [
      { qty: 12, unit: "oz", item: "egg noodles" },
      { qty: 2, unit: "can", item: "tuna, drained" },
      { qty: 1, unit: "can", item: "cream of mushroom soup" },
      { qty: 1, unit: "cup", item: "frozen peas" },
      { qty: 1, unit: "cup", item: "cheddar cheese, shredded" },
      { qty: 0.5, unit: "cup", item: "milk" },
      { qty: 0.5, unit: "tsp", item: "black pepper" }
    ],
    steps: [
      "Cook noodles until al dente; drain (8 minutes).",
      "Mix noodles, tuna, soup, milk, peas, and half the cheese.",
      "Transfer to a baking dish; top with remaining cheese.",
      "Bake at 375°F 20 minutes until bubbly."
    ]
  },
  {
    name: "Crispy Fried Chicken Dinner",
    minutes: 45,
    servings: 4,
    tags: ["dinner", "classic", "medium", "moderate"],
    ingredients: [
      { qty: 2, unit: "lb", item: "chicken pieces" },
      { qty: 1, unit: "cup", item: "all-purpose flour" },
      { qty: 1, unit: "tsp", item: "paprika" },
      { qty: 1, unit: "tsp", item: "garlic powder" },
      { qty: 1, unit: "tsp", item: "salt" },
      { qty: 0.5, unit: "tsp", item: "black pepper" },
      { qty: 2, unit: "cup", item: "vegetable oil" }
    ],
    steps: [
      "Pat chicken dry; season with salt and pepper (3 minutes).",
      "Mix flour, paprika, garlic powder, salt, and pepper. Dredge chicken.",
      "Fry in 350°F oil 12–15 minutes per side until golden and 165°F inside.",
      "Drain on a rack. Serve with mashed potatoes or coleslaw."
    ]
  },
  {
    name: "Ham and Cheese Omelette",
    minutes: 15,
    servings: 2,
    tags: ["breakfast", "classic", "easy", "budget"],
    ingredients: [
      { qty: 4, unit: "", item: "eggs" },
      { qty: 0.5, unit: "cup", item: "diced ham" },
      { qty: 0.5, unit: "cup", item: "cheddar cheese, shredded" },
      { qty: 1, unit: "tbsp", item: "butter" },
      { qty: 2, unit: "tbsp", item: "milk" },
      { qty: 0.25, unit: "tsp", item: "salt" },
      { qty: 0.25, unit: "tsp", item: "black pepper" }
    ],
    steps: [
      "Whisk eggs, milk, salt, and pepper (2 minutes).",
      "Melt butter in a non-stick pan over medium heat.",
      "Pour eggs; when nearly set, add ham and cheese. Fold and cook 1 minute.",
      "Serve with toast."
    ]
  },
  {
    name: "Waffles with Maple Syrup",
    minutes: 25,
    servings: 4,
    tags: ["breakfast", "classic", "canadian", "easy", "moderate"],
    ingredients: [
      { qty: 2, unit: "cup", item: "all-purpose flour" },
      { qty: 2, unit: "tbsp", item: "sugar" },
      { qty: 1, unit: "tbsp", item: "baking powder" },
      { qty: 2, unit: "", item: "eggs" },
      { qty: 1.75, unit: "cup", item: "milk" },
      { qty: 0.5, unit: "cup", item: "butter, melted" },
      { qty: 0.5, unit: "cup", item: "maple syrup" }
    ],
    steps: [
      "Whisk flour, sugar, and baking powder (2 minutes).",
      "Stir in eggs, milk, and melted butter until smooth.",
      "Cook in a waffle iron until golden (10–12 minutes total).",
      "Serve hot with maple syrup."
    ]
  },
  {
    name: "Maple-Glazed Salmon",
    minutes: 22,
    servings: 4,
    tags: ["dinner", "classic", "canadian", "easy", "moderate"],
    ingredients: [
      { qty: 1.5, unit: "lb", item: "salmon fillets" },
      { qty: 0.25, unit: "cup", item: "maple syrup" },
      { qty: 2, unit: "tbsp", item: "soy sauce" },
      { qty: 1, unit: "tbsp", item: "Dijon mustard" },
      { qty: 1, unit: "clove", item: "garlic, minced" },
      { qty: 1, unit: "tbsp", item: "olive oil" },
      { qty: 0.25, unit: "tsp", item: "black pepper" }
    ],
    steps: [
      "Whisk maple syrup, soy sauce, mustard, and garlic (2 minutes).",
      "Season salmon; sear in oil 3 minutes skin-side down.",
      "Flip; brush with glaze; cook 3–4 minutes until flaky.",
      "Serve with rice and steamed vegetables."
    ]
  },
  {
    name: "Club Sandwich Lunch",
    minutes: 15,
    servings: 2,
    tags: ["lunch", "classic", "easy", "moderate"],
    ingredients: [
      { qty: 6, unit: "slice", item: "bread, toasted" },
      { qty: 6, unit: "slice", item: "turkey breast" },
      { qty: 4, unit: "slice", item: "bacon, cooked" },
      { qty: 2, unit: "slice", item: "cheddar cheese" },
      { qty: 4, unit: "slice", item: "tomato" },
      { qty: 2, unit: "leaf", item: "lettuce" },
      { qty: 3, unit: "tbsp", item: "mayonnaise" }
    ],
    steps: [
      "Spread mayonnaise on toast (2 minutes).",
      "Layer turkey, bacon, cheese, tomato, and lettuce between slices.",
      "Skewer and cut into quarters. Serve with pickles."
    ]
  },
  {
    name: "Reuben Sandwiches",
    minutes: 18,
    servings: 2,
    tags: ["lunch", "classic", "easy", "moderate"],
    ingredients: [
      { qty: 4, unit: "slice", item: "rye bread" },
      { qty: 0.5, unit: "lb", item: "corned beef, sliced" },
      { qty: 0.5, unit: "cup", item: "sauerkraut, drained" },
      { qty: 4, unit: "slice", item: "Swiss cheese" },
      { qty: 3, unit: "tbsp", item: "Russian dressing" },
      { qty: 2, unit: "tbsp", item: "butter" }
    ],
    steps: [
      "Butter bread; layer corned beef, sauerkraut, cheese, and dressing.",
      "Grill sandwiches 3 minutes per side until cheese melts.",
      "Serve hot."
    ]
  },
  {
    name: "Hot Dogs with Baked Beans",
    minutes: 20,
    servings: 4,
    tags: ["dinner", "classic", "easy", "budget"],
    ingredients: [
      { qty: 8, unit: "", item: "hot dogs" },
      { qty: 8, unit: "", item: "hot dog buns" },
      { qty: 2, unit: "can", item: "baked beans" },
      { qty: 0.25, unit: "cup", item: "ketchup" },
      { qty: 2, unit: "tbsp", item: "yellow mustard" },
      { qty: 0.5, unit: "cup", item: "diced onion" }
    ],
    steps: [
      "Warm beans with ketchup over medium heat (5 minutes).",
      "Grill or boil hot dogs until heated through (8 minutes).",
      "Serve in buns with mustard, onion, and beans on the side."
    ]
  },
  {
    name: "Beef Pot Roast Dinner",
    minutes: 180,
    servings: 6,
    tags: ["dinner", "classic", "canadian", "medium", "moderate"],
    ingredients: [
      { qty: 3, unit: "lb", item: "beef chuck roast" },
      { qty: 4, unit: "", item: "carrots, chunked" },
      { qty: 4, unit: "", item: "potatoes, quartered" },
      { qty: 1, unit: "", item: "medium onion, quartered" },
      { qty: 2, unit: "cup", item: "beef broth" },
      { qty: 2, unit: "tbsp", item: "tomato paste" },
      { qty: 1, unit: "tsp", item: "dried thyme" },
      { qty: 2, unit: "tbsp", item: "vegetable oil" }
    ],
    steps: [
      "Season roast; brown on all sides in oil (10 minutes).",
      "Add onion, broth, tomato paste, and thyme. Cover tightly.",
      "Braise at 325°F 2½–3 hours until fork-tender.",
      "Add carrots and potatoes during the last 45 minutes. Slice roast and serve with vegetables."
    ]
  },
  {
    name: "Chicken Parmesan",
    minutes: 40,
    servings: 4,
    tags: ["dinner", "classic", "italian", "medium", "moderate"],
    ingredients: [
      { qty: 4, unit: "", item: "chicken breasts" },
      { qty: 1, unit: "cup", item: "breadcrumbs" },
      { qty: 0.5, unit: "cup", item: "Parmesan cheese" },
      { qty: 1, unit: "cup", item: "marinara sauce" },
      { qty: 1, unit: "cup", item: "mozzarella cheese" },
      { qty: 2, unit: "", item: "eggs" },
      { qty: 0.5, unit: "cup", item: "all-purpose flour" },
      { qty: 3, unit: "tbsp", item: "olive oil" }
    ],
    steps: [
      "Pound chicken to even thickness; season (5 minutes).",
      "Dredge in flour, egg, then breadcrumb-Parmesan mix.",
      "Pan-fry in oil 4 minutes per side until golden.",
      "Top with marinara and mozzarella; bake at 400°F 10 minutes until melted."
    ]
  },
  {
    name: "Egg and Cheese Breakfast Sandwiches",
    minutes: 15,
    servings: 4,
    tags: ["breakfast", "classic", "easy", "budget"],
    ingredients: [
      { qty: 4, unit: "", item: "English muffins" },
      { qty: 4, unit: "", item: "eggs" },
      { qty: 4, unit: "slice", item: "cheddar cheese" },
      { qty: 4, unit: "slice", item: "Canadian bacon" },
      { qty: 1, unit: "tbsp", item: "butter" },
      { qty: 0.25, unit: "tsp", item: "salt" }
    ],
    steps: [
      "Toast muffins (3 minutes).",
      "Fry Canadian bacon 2 minutes per side.",
      "Fry eggs in butter to your liking; season with salt.",
      "Stack egg, bacon, and cheese on muffins."
    ]
  },
  {
    name: "Beef and Barley Soup",
    minutes: 90,
    servings: 8,
    tags: ["dinner", "lunch", "classic", "canadian", "easy", "moderate"],
    ingredients: [
      { qty: 1, unit: "lb", item: "stewing beef, cubed" },
      { qty: 0.5, unit: "cup", item: "pearl barley" },
      { qty: 6, unit: "cup", item: "beef broth" },
      { qty: 2, unit: "", item: "carrots, diced" },
      { qty: 2, unit: "stalk", item: "celery, diced" },
      { qty: 1, unit: "", item: "medium onion, diced" },
      { qty: 1, unit: "tsp", item: "dried thyme" },
      { qty: 2, unit: "tbsp", item: "vegetable oil" }
    ],
    steps: [
      "Brown beef in oil (8 minutes). Add onion, carrots, and celery; cook 5 minutes.",
      "Stir in barley, broth, and thyme. Simmer 70 minutes until beef is tender.",
      "Skim fat if needed. Season with salt and pepper."
    ]
  },
  {
    name: "Peanut Butter and Jam Sandwiches",
    minutes: 5,
    servings: 2,
    tags: ["lunch", "snack", "classic", "easy", "budget"],
    ingredients: [
      { qty: 4, unit: "slice", item: "bread" },
      { qty: 3, unit: "tbsp", item: "peanut butter" },
      { qty: 2, unit: "tbsp", item: "strawberry jam" }
    ],
    steps: [
      "Spread peanut butter on two slices and jam on the other two.",
      "Press together, cut in half, and serve."
    ]
  }
];
