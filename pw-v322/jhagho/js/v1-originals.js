/* Pantry Week v1.1 starter recipes, kept so unmodified saved copies can be recognized and upgraded without losing edited ones. */
"use strict";
var PW_V1_ORIGINALS = [
  {
    "id": "r1",
    "name": "Lemon Herb Chicken",
    "time": "35 min",
    "tags": "dinner,protein",
    "ingredients": [
      "chicken thighs 1.5 lb",
      "lemon 2",
      "garlic 4 cloves",
      "olive oil",
      "oregano",
      "salt",
      "pepper",
      "green beans 1 lb"
    ],
    "steps": "Roast chicken at 425°F with lemon, garlic, oil, oregano 25–30 min. Steam or roast green beans."
  },
  {
    "id": "r2",
    "name": "Veggie Scramble Toast",
    "time": "15 min",
    "tags": "breakfast,fast",
    "ingredients": [
      "eggs 6",
      "spinach 4 cups",
      "cherry tomatoes 1 cup",
      "butter",
      "sourdough 4 slices",
      "salt",
      "pepper",
      "feta optional"
    ],
    "steps": "Sauté spinach + tomatoes. Scramble eggs soft. Toast bread. Assemble."
  },
  {
    "id": "r3",
    "name": "Chickpea Grain Bowls",
    "time": "25 min",
    "tags": "lunch,vegetarian",
    "ingredients": [
      "canned chickpeas 2",
      "quinoa 1 cup dry",
      "cucumber 1",
      "tomato 2",
      "parsley",
      "olive oil",
      "lemon 1",
      "garlic yogurt or tahini"
    ],
    "steps": "Cook quinoa. Roast or warm chickpeas with spices. Chop veg. Bowl + dressing."
  },
  {
    "id": "r4",
    "name": "Tomato Basil Pasta",
    "time": "20 min",
    "tags": "dinner,comfort",
    "ingredients": [
      "pasta 12 oz",
      "canned crushed tomatoes 28 oz",
      "garlic 3 cloves",
      "onion 1",
      "basil",
      "olive oil",
      "parmesan",
      "red pepper flakes"
    ],
    "steps": "Sauté onion/garlic. Simmer tomatoes 10 min. Boil pasta. Toss + basil + cheese."
  },
  {
    "id": "r5",
    "name": "Salmon & Broccoli Sheet Pan",
    "time": "30 min",
    "tags": "dinner,protein",
    "ingredients": [
      "salmon fillets 4",
      "broccoli 2 heads",
      "olive oil",
      "garlic powder",
      "lemon 1",
      "salt",
      "pepper"
    ],
    "steps": "Sheet pan 400°F: broccoli 10 min, add salmon 12–14 min. Lemon finish."
  },
  {
    "id": "r6",
    "name": "Overnight Oats Jars",
    "time": "5 min + chill",
    "tags": "breakfast,make-ahead",
    "ingredients": [
      "rolled oats 2 cups",
      "milk or alt-milk 2 cups",
      "chia seeds 2 tbsp",
      "honey",
      "berries",
      "peanut butter optional"
    ],
    "steps": "Mix oats, milk, chia, honey. Chill overnight. Top with berries."
  },
  {
    "id": "r7",
    "name": "Turkey Taco Skillet",
    "time": "25 min",
    "tags": "dinner,family",
    "ingredients": [
      "ground turkey 1 lb",
      "taco seasoning",
      "bell peppers 2",
      "onion 1",
      "corn 1 cup",
      "tortillas or rice",
      "salsa",
      "lettuce",
      "cheese"
    ],
    "steps": "Brown turkey + onion. Add peppers, corn, seasoning. Serve with tortillas/rice."
  },
  {
    "id": "r8",
    "name": "Caprese Chicken Salad",
    "time": "15 min",
    "tags": "lunch,fresh",
    "ingredients": [
      "rotisserie chicken 3 cups",
      "mozzarella pearls",
      "cherry tomatoes 2 cups",
      "basil",
      "balsamic glaze",
      "olive oil",
      "mixed greens"
    ],
    "steps": "Shred chicken. Toss with tomatoes, mozzarella, basil, oil. Serve on greens."
  },
  {
    "id": "r9",
    "name": "Black Bean Quesadillas",
    "time": "20 min",
    "tags": "lunch,vegetarian",
    "ingredients": [
      "flour tortillas 8",
      "black beans 2 cans",
      "shredded cheese 3 cups",
      "cumin",
      "salsa",
      "sour cream",
      "avocado 2"
    ],
    "steps": "Mash beans + cumin. Fill tortillas with beans + cheese. Crisp in skillet."
  },
  {
    "id": "r10",
    "name": "Sausage & Pepper Pasta",
    "time": "30 min",
    "tags": "dinner,comfort",
    "ingredients": [
      "Italian sausage 1 lb",
      "penne 12 oz",
      "bell peppers 3",
      "onion 1",
      "marinara 24 oz",
      "parmesan"
    ],
    "steps": "Brown sausage + peppers + onion. Simmer with marinara. Toss pasta."
  },
  {
    "id": "r11",
    "name": "Greek Yogurt Parfaits",
    "time": "10 min",
    "tags": "breakfast,fast",
    "ingredients": [
      "greek yogurt 32 oz",
      "granola 2 cups",
      "honey",
      "mixed berries 3 cups"
    ],
    "steps": "Layer yogurt, berries, granola, honey in jars."
  },
  {
    "id": "r12",
    "name": "Miso Ginger Soup + Tofu",
    "time": "25 min",
    "tags": "dinner,light",
    "ingredients": [
      "miso paste 3 tbsp",
      "soft tofu 14 oz",
      "green onions",
      "spinach",
      "mushrooms 8 oz",
      "ginger",
      "broth 6 cups",
      "sesame oil"
    ],
    "steps": "Simmer broth + ginger + mushrooms. Off heat whisk miso. Add tofu + greens."
  },
  {
    "id": "r13",
    "name": "BLT Egg Sandwiches",
    "time": "20 min",
    "tags": "breakfast,weekend",
    "ingredients": [
      "eggs 8",
      "bacon 8 slices",
      "tomato 2",
      "lettuce",
      "mayo",
      "English muffins 4"
    ],
    "steps": "Cook bacon. Toast muffins. Fried/scrambled eggs. Stack BLT + egg."
  },
  {
    "id": "r14",
    "name": "Sheet Pan Fajitas",
    "time": "30 min",
    "tags": "dinner,family",
    "ingredients": [
      "chicken breast 1.5 lb",
      "bell peppers 3",
      "onion 2",
      "fajita seasoning",
      "lime 2",
      "tortillas",
      "cilantro"
    ],
    "steps": "Slice everything. Toss oil + seasoning. Roast 425°F ~20 min. Tortillas + lime."
  },
  {
    "id": "r15",
    "name": "Tuna White Bean Salad",
    "time": "12 min",
    "tags": "lunch,no-cook",
    "ingredients": [
      "canned tuna 3",
      "cannellini beans 1 can",
      "red onion",
      "celery 2 stalks",
      "olive oil",
      "lemon 1",
      "dijon",
      "parsley"
    ],
    "steps": "Drain tuna + beans. Chop veg. Dress oil/lemon/dijon. Chill optional."
  },
  {
    "id": "r16",
    "name": "Baked Potato Bar",
    "time": "55 min",
    "tags": "dinner,easy",
    "ingredients": [
      "russet potatoes 6",
      "broccoli",
      "cheddar",
      "sour cream",
      "chives",
      "butter",
      "bacon bits optional",
      "salt"
    ],
    "steps": "Bake potatoes 425°F ~45–55 min. Steam broccoli. Set toppings bar."
  },
  {
    "id": "r17",
    "name": "Peanut Noodle Bowls",
    "time": "20 min",
    "tags": "lunch,dinner",
    "ingredients": [
      "noodles 12 oz",
      "peanut butter 1/2 cup",
      "soy sauce",
      "lime 2",
      "honey",
      "garlic",
      "cucumber",
      "shredded carrot",
      "rotisserie chicken optional"
    ],
    "steps": "Cook noodles. Whisk sauce. Toss + crunchy veg + protein."
  },
  {
    "id": "r18",
    "name": "Shakshuka",
    "time": "30 min",
    "tags": "breakfast,dinner",
    "ingredients": [
      "eggs 6",
      "crushed tomatoes 28 oz",
      "bell pepper 1",
      "onion 1",
      "garlic",
      "cumin",
      "paprika",
      "feta",
      "bread"
    ],
    "steps": "Sauté onion/pepper/garlic. Simmer tomatoes + spices. Nest eggs, cover until set."
  },
  {
    "id": "r19",
    "name": "Pesto Gnocchi Skillet",
    "time": "20 min",
    "tags": "dinner,fast",
    "ingredients": [
      "potato gnocchi 1.5 lb",
      "basil pesto 1 cup",
      "cherry tomatoes 2 cups",
      "spinach",
      "parmesan",
      "olive oil"
    ],
    "steps": "Crisp gnocchi in oil. Add tomatoes, spinach, pesto. Cheese."
  },
  {
    "id": "r20",
    "name": "Turkey Chili",
    "time": "40 min",
    "tags": "dinner,batch",
    "ingredients": [
      "ground turkey 1.5 lb",
      "kidney beans 2 cans",
      "crushed tomatoes 28 oz",
      "onion 1",
      "chili powder",
      "cumin",
      "broth 1 cup",
      "garlic"
    ],
    "steps": "Brown turkey + onion + garlic. Add rest, simmer 25 min. Freezes well."
  }
];
