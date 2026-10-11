/* Pantry Week — Smart Chef (fully offline, template-based). */
"use strict";

(function () {
  var STAPLES = { salt: 1, "black pepper": 1, pepper: 1, water: 1, "olive oil": 1, oil: 1, butter: 1 };

  var PROFILES = {
    italian: {
      label: "Italian",
      aromatics: ["garlic", "onion"],
      sauce: { item: "crushed tomatoes", qty: 1, unit: "can" },
      season: ["dried oregano", "basil"],
      finish: "Parmesan and olive oil",
      namePrefix: ["Rustic", "Weeknight", "Garlic"]
    },
    asian: {
      label: "Asian",
      aromatics: ["garlic", "ginger", "scallion"],
      sauce: { item: "soy sauce", qty: 3, unit: "tbsp" },
      season: ["sesame oil"],
      finish: "Sesame and lime",
      namePrefix: ["Ginger", "Savory", "Quick"]
    },
    mexican: {
      label: "Mexican",
      aromatics: ["onion", "garlic"],
      sauce: { item: "salsa", qty: 0.5, unit: "cup" },
      season: ["cumin", "chili powder"],
      finish: "Lime and cilantro",
      namePrefix: ["Zesty", "Smoky", "Weeknight"]
    },
    canadian: {
      label: "Canadian comfort",
      aromatics: ["onion", "garlic"],
      sauce: { item: "chicken broth", qty: 1, unit: "cup" },
      season: ["thyme", "black pepper"],
      finish: "Butter and parsley",
      namePrefix: ["Hearty", "Home-style", "Cozy"]
    },
    indian: {
      label: "Indian",
      aromatics: ["onion", "garlic", "ginger"],
      sauce: { item: "coconut milk", qty: 1, unit: "can" },
      season: ["curry powder", "garam masala"],
      finish: "Cilantro and yogurt",
      namePrefix: ["Fragrant", "Mild", "Weeknight"]
    }
  };

  function stapleKey(item) {
    if (window.PW && PW.stapleKey) return PW.stapleKey(item);
    return String(item || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  }

  function haveItem(have, name) {
    return !!have[stapleKey(name)];
  }

  function pantrySet(pantry) {
    var have = {};
    (pantry || []).forEach(function (entry) {
      var name = typeof entry === "string" ? entry : entry.item;
      var key = stapleKey(name);
      if (key) have[key] = name;
    });
    return have;
  }

  var LEX = {
    protein: [
      { keys: ["chicken breast", "chicken thigh", "chicken"], label: "chicken", cookMin: 12, form: "diced" },
      { keys: ["ground beef", "beef stew", "beef", "steak"], label: "ground beef", cookMin: 10, form: "crumbled" },
      { keys: ["ground pork", "pork chop", "pork"], label: "pork", cookMin: 10, form: "diced" },
      { keys: ["ground turkey", "turkey"], label: "ground turkey", cookMin: 10, form: "crumbled" },
      { keys: ["shrimp"], label: "shrimp", cookMin: 4, form: "whole" },
      { keys: ["salmon", "cod", "fish fillet", "fish"], label: "fish", cookMin: 8, form: "chunks" },
      { keys: ["tofu", "firm tofu"], label: "firm tofu", cookMin: 6, form: "cubed" },
      { keys: ["egg", "eggs"], label: "eggs", cookMin: 4, form: "beaten" },
      { keys: ["sausage", "italian sausage"], label: "sausage", cookMin: 10, form: "sliced" },
      { keys: ["bacon"], label: "bacon", cookMin: 6, form: "chopped" },
      { keys: ["lamb"], label: "lamb", cookMin: 12, form: "diced" },
      { keys: ["chickpea", "chickpeas", "black beans", "kidney beans"], label: "beans", cookMin: 5, form: "drained" }
    ],
    vegFast: [
      "spinach", "zucchini", "bell pepper", "mushroom", "broccoli", "snap pea", "snow pea",
      "bok choy", "kale", "cabbage", "corn", "peas", "green bean"
    ],
    vegSlow: [
      "potato", "sweet potato", "carrot", "cauliflower", "butternut squash", "beet", "turnip"
    ],
    vegAllium: ["onion", "yellow onion", "red onion", "shallot", "leek"],
    starch: [
      { keys: ["rice", "jasmine rice", "brown rice"], label: "rice", unit: "cup", qty: 1.5 },
      { keys: ["pasta", "spaghetti", "penne"], label: "pasta", unit: "oz", qty: 12 },
      { keys: ["noodle", "rice noodles"], label: "rice noodles", unit: "oz", qty: 8 },
      { keys: ["tortilla", "tortillas", "wrap"], label: "tortillas", unit: "", qty: 8 },
      { keys: ["bread", "pita"], label: "bread", unit: "slice", qty: 4 },
      { keys: ["quinoa", "couscous"], label: "quinoa", unit: "cup", qty: 1 },
      { keys: ["potato"], label: "potatoes", unit: "lb", qty: 1 }
    ],
    pantry: ["garlic", "ginger", "lemon", "lime", "soy sauce", "olive oil", "coconut milk", "broth", "chicken broth",
      "tomato", "tomatoes", "crushed tomatoes", "cheese", "cheddar", "parmesan", "cream", "milk", "yogurt",
      "cumin", "paprika", "curry powder", "oregano", "basil", "cilantro", "salsa", "beans", "lentils"]
  };

  function classifyPantry(pantry) {
    var have = pantrySet(pantry);
    var keys = Object.keys(have);
    var protein = null;
    var proteins = [];
    LEX.protein.forEach(function (p) {
      p.keys.forEach(function (k) {
        if (have[stapleKey(k)]) proteins.push({ def: p, name: have[stapleKey(k)] || p.label });
      });
    });
    if (proteins.length) protein = proteins[0];

    var vegFast = [];
    var vegSlow = [];
    keys.forEach(function (k) {
      LEX.vegFast.forEach(function (v) {
        if (k.indexOf(stapleKey(v)) !== -1 || stapleKey(v).indexOf(k) !== -1) vegFast.push(have[k] || v);
      });
      LEX.vegSlow.forEach(function (v) {
        if (k.indexOf(stapleKey(v)) !== -1) vegFast.indexOf(have[k]) === -1 && vegSlow.push(have[k] || v);
      });
      LEX.vegAllium.forEach(function (v) {
        if (k.indexOf("onion") !== -1 && vegFast.indexOf(have[k]) === -1) vegFast.push(have[k] || "onion");
      });
    });
    vegFast = dedupe(vegFast).slice(0, 3);
    vegSlow = dedupe(vegSlow).slice(0, 2);

    var starch = null;
    LEX.starch.forEach(function (s) {
      if (starch) return;
      s.keys.forEach(function (k) {
        if (have[stapleKey(k)]) starch = { def: s, name: have[stapleKey(k)] || s.label };
      });
    });

    return { have: have, protein: protein, proteins: proteins, vegFast: vegFast, vegSlow: vegSlow, starch: starch, count: keys.length };
  }

  function dedupe(arr) {
    var out = [];
    var seen = {};
    arr.forEach(function (x) {
      var k = stapleKey(x);
      if (!seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  }

  function pickTemplate(buckets, variation) {
    var templates = TEMPLATE_DEFS.filter(function (t) {
      return t.fits(buckets);
    });
    if (!templates.length) templates = TEMPLATE_DEFS.filter(function (t) { return t.id === "skillet"; });
    return templates[variation % templates.length];
  }

  function pickProfile(template, variation) {
    var list = template.profiles || ["italian", "asian", "mexican", "canadian", "indian"];
    return list[variation % list.length];
  }

  function ing(qty, unit, item, fromPantry) {
    return { qty: qty, unit: unit || "", item: item, fromPantry: !!fromPantry };
  }

  function markPantry(ingredients, have) {
    return ingredients.map(function (row) {
      var fp = haveItem(have, row.item) || STAPLES[stapleKey(row.item)];
      return { qty: row.qty, unit: row.unit, item: row.item, fromPantry: fp };
    });
  }

  function missingList(ingredients) {
    return ingredients.filter(function (i) { return !i.fromPantry && !STAPLES[stapleKey(i.item)]; }).map(function (i) { return i.item; });
  }

  function scaleQty(qty, servings, base) {
    base = base || 4;
    if (qty == null) return null;
    var n = Number(qty);
    if (!isFinite(n)) return qty;
    var scaled = n * servings / base;
    return Math.round(scaled * 100) / 100;
  }

  function buildName(template, profile, buckets, variation) {
    var prof = PROFILES[profile];
    var pre = prof.namePrefix[variation % prof.namePrefix.length];
    var protein = buckets.protein ? buckets.protein.def.label : "Veggie";
    var veg = buckets.vegFast[0] ? String(buckets.vegFast[0]).split(" ")[0] : "";
    veg = veg.charAt(0).toUpperCase() + veg.slice(1);
    if (template.id === "frittata") return pre + " " + (veg || "Garden") + " Frittata";
    if (template.id === "salad") return pre + " " + protein + " Salad Bowl";
    if (template.id === "soup") return pre + " " + protein + " & Vegetable Soup";
    if (template.id === "fried-rice") return pre + " Fried Rice";
    return pre + " " + protein + " " + template.shortName + (veg ? " with " + veg : "");
  }

  function addProfileIngredients(list, profile, have, servings) {
    var p = PROFILES[profile];
    p.aromatics.forEach(function (a) {
      list.push(ing(scaleQty(2, servings, 4), "clove", a, haveItem(have, a)));
    });
    if (p.sauce) {
      list.push(ing(scaleQty(p.sauce.qty, servings, 4), p.sauce.unit, p.sauce.item, haveItem(have, p.sauce.item)));
    }
    p.season.forEach(function (s) {
      list.push(ing(0.5, "tsp", s, haveItem(have, s)));
    });
    list.push(ing(2, "tbsp", "olive oil", haveItem(have, "olive oil")));
    list.push(ing(0.5, "tsp", "salt", true));
    list.push(ing(0.25, "tsp", "black pepper", true));
  }

  var TEMPLATE_DEFS = [
    {
      id: "stir-fry",
      shortName: "Stir-Fry",
      profiles: ["asian", "mexican"],
      minutes: 28,
      tags: ["dinner", "lunch", "dairy-free", "easy"],
      fits: function (b) { return b.protein && b.vegFast.length >= 1; },
      build: function (b, profile, servings) {
        var steps = [];
        var ings = [];
        var p = b.protein;
        ings.push(ing(scaleQty(1, servings, 4), "lb", p.name, true));
        b.vegFast.forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        if (b.starch && stapleKey(b.starch.name).indexOf("rice") !== -1) {
          ings.push(ing(scaleQty(b.starch.def.qty, servings, 4), b.starch.def.unit, b.starch.name, true));
        }
        addProfileIngredients(ings, profile, b.have, servings);
        steps.push("Prep vegetables: slice peppers and zucchini, mince garlic and ginger (5 minutes).");
        steps.push("Heat oil in a wok or large skillet over high heat (1 minute).");
        steps.push("Cook " + p.def.label + " " + p.def.form + " until nearly done, about " + p.def.cookMin + " minutes, stirring.");
        steps.push("Add vegetables; stir-fry 4–5 minutes until crisp-tender.");
        steps.push("Pour in sauce and seasonings; toss 2 minutes until glossy. Finish with " + PROFILES[profile].finish + ". Serve hot.");
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 28 };
      }
    },
    {
      id: "pasta",
      shortName: "Pasta",
      profiles: ["italian", "canadian"],
      minutes: 30,
      tags: ["dinner", "easy"],
      fits: function (b) { return b.starch && stapleKey(b.starch.name).indexOf("pasta") !== -1; },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(12, servings, 4), "oz", b.starch.name, true));
        if (b.protein) ings.push(ing(scaleQty(1, servings, 4), "lb", b.protein.name, true));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Boil a large pot of salted water; cook pasta 9–11 minutes until al dente (10 minutes). Reserve 1/2 cup pasta water.",
          b.protein ? "Meanwhile, brown " + b.protein.def.label + " in olive oil over medium-high heat, " + b.protein.def.cookMin + " minutes." : "Warm olive oil in a skillet over medium heat (1 minute).",
          "Add aromatics and vegetables; cook 4 minutes until softened.",
          "Stir in tomatoes or sauce and simmer 5 minutes. Toss with pasta and splash of pasta water (2 minutes).",
          "Finish with " + PROFILES[profile].finish + " and serve."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 30 };
      }
    },
    {
      id: "skillet",
      shortName: "Skillet",
      profiles: ["canadian", "italian", "mexican"],
      minutes: 32,
      tags: ["dinner", "one-pan", "easy"],
      fits: function (b) { return b.protein; },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(1, servings, 4), "lb", b.protein.name, true));
        b.vegSlow.concat(b.vegFast).slice(0, 3).forEach(function (v) {
          ings.push(ing(scaleQty(1, servings, 4), "", v, true));
        });
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Pat protein dry; season with salt and pepper (2 minutes).",
          "Brown in a large skillet with oil over medium-high heat, " + b.protein.def.cookMin + " minutes.",
          "Add slower vegetables first; cover and cook 8 minutes.",
          "Add quick-cooking vegetables; sauté 4 minutes.",
          "Pour in sauce and simmer 5 minutes until everything is tender. Finish with " + PROFILES[profile].finish + "."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 32 };
      }
    },
    {
      id: "sheet-pan",
      shortName: "Sheet-Pan Dinner",
      profiles: ["italian", "canadian"],
      minutes: 38,
      tags: ["dinner", "easy"],
      fits: function (b) { return b.protein && (b.vegSlow.length || b.vegFast.length); },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(1.25, servings, 4), "lb", b.protein.name, true));
        (b.vegSlow.length ? b.vegSlow : b.vegFast).slice(0, 2).forEach(function (v) {
          ings.push(ing(scaleQty(1, servings, 4), "", v, true));
        });
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Heat oven to 425°F. Line a sheet pan (2 minutes).",
          "Toss vegetables with oil, salt, and half the seasonings on the pan (3 minutes).",
          "Nestle " + b.protein.def.label + " among vegetables. Roast 22–25 minutes until cooked through.",
          "Rest 3 minutes, drizzle with " + PROFILES[profile].finish + ", and serve from the pan."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 38 };
      }
    },
    {
      id: "soup",
      shortName: "Soup",
      profiles: ["canadian", "italian"],
      minutes: 40,
      tags: ["dinner", "lunch", "easy"],
      fits: function (b) { return (b.protein || b.vegSlow.length) && b.vegFast.length + b.vegSlow.length >= 1; },
      build: function (b, profile, servings) {
        var ings = [];
        if (b.protein) ings.push(ing(scaleQty(0.75, servings, 4), "lb", b.protein.name, true));
        b.vegSlow.concat(b.vegFast).slice(0, 3).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        ings.push(ing(scaleQty(4, servings, 4), "cup", "chicken broth", haveItem(b.have, "chicken broth") || haveItem(b.have, "broth")));
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Dice vegetables (6 minutes). Warm oil in a pot over medium heat.",
          "Cook aromatics 3 minutes; add vegetables and protein. Brown or soften 6 minutes.",
          "Add broth and tomatoes; simmer 20 minutes until vegetables are tender.",
          "Taste and adjust salt. Finish with " + PROFILES[profile].finish + "."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 40 };
      }
    },
    {
      id: "curry",
      shortName: "Curry",
      profiles: ["indian", "asian"],
      minutes: 35,
      tags: ["dinner", "gluten-free", "easy"],
      fits: function (b) { return (b.protein || haveItem(b.have, "chickpeas")) && b.vegFast.length; },
      build: function (b, profile, servings) {
        var ings = [];
        if (b.protein) ings.push(ing(scaleQty(1, servings, 4), "lb", b.protein.name, true));
        else ings.push(ing(scaleQty(1, servings, 4), "can", "chickpeas", haveItem(b.have, "chickpeas")));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        if (b.starch && stapleKey(b.starch.name).indexOf("rice") !== -1) {
          ings.push(ing(scaleQty(1.5, servings, 4), "cup", b.starch.name, true));
        }
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Cook rice if serving with it (15 minutes covered).",
          "Sauté aromatics in oil 3 minutes. Add protein; cook " + (b.protein ? b.protein.def.cookMin : 5) + " minutes.",
          "Stir in curry spices 30 seconds, then coconut milk and vegetables.",
          "Simmer 12 minutes until sauce thickens and protein is cooked.",
          "Finish with " + PROFILES[profile].finish + "."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 35 };
      }
    },
    {
      id: "grain-bowl",
      shortName: "Grain Bowl",
      profiles: ["mexican", "asian", "indian"],
      minutes: 26,
      tags: ["lunch", "dinner", "easy"],
      fits: function (b) { return b.starch && (b.protein || b.vegFast.length >= 2); },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(b.starch.def.qty, servings, 4), b.starch.def.unit, b.starch.name, true));
        if (b.protein) ings.push(ing(scaleQty(0.75, servings, 4), "lb", b.protein.name, true));
        b.vegFast.slice(0, 3).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Cook grain according to package (12–15 minutes).",
          b.protein ? "Season and sear " + b.protein.def.label + " in a skillet, " + b.protein.def.cookMin + " minutes." : "Roast or sauté vegetables with oil 8 minutes.",
          "Warm sauce with spices 3 minutes.",
          "Divide grain among bowls; top with protein, vegetables, and sauce. Finish with " + PROFILES[profile].finish + "."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 26 };
      }
    },
    {
      id: "tacos",
      shortName: "Tacos",
      profiles: ["mexican"],
      minutes: 24,
      tags: ["dinner", "lunch", "easy"],
      fits: function (b) { return b.protein && (haveItem(b.have, "tortilla") || haveItem(b.have, "tortillas")); },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(1, servings, 4), "lb", b.protein.name, true));
        ings.push(ing(scaleQty(8, servings, 4), "", "tortillas", true));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Brown " + b.protein.def.label + " with spices in a skillet, " + b.protein.def.cookMin + " minutes.",
          "Warm tortillas in a dry pan 1 minute per side.",
          "Dice vegetables and toss with lime and salt (3 minutes).",
          "Fill tortillas with protein and vegetables. Top with salsa and " + PROFILES[profile].finish + "."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 24 };
      }
    },
    {
      id: "frittata",
      shortName: "Frittata",
      profiles: ["italian", "canadian"],
      minutes: 22,
      tags: ["breakfast", "lunch", "vegetarian", "easy"],
      fits: function (b) { return haveItem(b.have, "egg") || haveItem(b.have, "eggs"); },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(8, servings, 4), "", "eggs", true));
        b.vegFast.concat(b.vegSlow).slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        if (haveItem(b.have, "cheese") || haveItem(b.have, "cheddar")) {
          ings.push(ing(scaleQty(0.5, servings, 4), "cup", "cheddar cheese", true));
        }
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Whisk eggs with salt and pepper (2 minutes).",
          "Sauté vegetables in an oven-safe skillet 5 minutes.",
          "Pour in eggs; cook over medium-low 6 minutes until edges set.",
          "Bake at 375°F 8–10 minutes until center is just set. Rest 3 minutes before slicing."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 22 };
      }
    },
    {
      id: "salad",
      shortName: "Salad Bowl",
      profiles: ["italian", "mexican"],
      minutes: 18,
      tags: ["lunch", "dinner", "easy"],
      fits: function (b) { return b.vegFast.length >= 2 && (b.protein || haveItem(b.have, "beans")); },
      build: function (b, profile, servings) {
        var ings = [];
        if (b.protein) ings.push(ing(scaleQty(0.75, servings, 4), "lb", b.protein.name, true));
        b.vegFast.slice(0, 4).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        ings.push(ing(2, "tbsp", "olive oil", true));
        ings.push(ing(1, "tbsp", "lemon juice", haveItem(b.have, "lemon")));
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          b.protein ? "Season and cook " + b.protein.def.label + " in a skillet, " + b.protein.def.cookMin + " minutes; rest 3 minutes." : "Rinse and drain beans (2 minutes).",
          "Chop vegetables and combine in a large bowl (5 minutes).",
          "Whisk dressing with oil, acid, and seasonings (2 minutes).",
          "Toss salad with dressing; top with protein and " + PROFILES[profile].finish + "."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 18 };
      }
    },
    {
      id: "fried-rice",
      shortName: "Fried Rice",
      profiles: ["asian"],
      minutes: 20,
      tags: ["dinner", "lunch", "dairy-free", "easy"],
      fits: function (b) { return haveItem(b.have, "rice") && (b.protein || haveItem(b.have, "egg")); },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(3, servings, 4), "cup", "cooked rice", haveItem(b.have, "rice")));
        if (b.protein) ings.push(ing(scaleQty(0.5, servings, 4), "lb", b.protein.name, true));
        else ings.push(ing(scaleQty(2, servings, 4), "", "eggs", haveItem(b.have, "egg")));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(0.5, servings, 4), "cup", v, true)); });
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Break up cold rice with your hands (2 minutes).",
          "Scramble eggs or cook protein in a hot wok; set aside (4 minutes).",
          "Fry aromatics and vegetables 3 minutes. Add rice and soy sauce; toss 5 minutes.",
          "Return protein/egg; heat through 2 minutes. Finish with " + PROFILES[profile].finish + "."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 20 };
      }
    },
    {
      id: "casserole",
      shortName: "Casserole",
      profiles: ["canadian", "italian"],
      minutes: 45,
      tags: ["dinner", "easy"],
      fits: function (b) { return b.protein && b.vegSlow.length && (b.starch || haveItem(b.have, "pasta")); },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(1, servings, 4), "lb", b.protein.name, true));
        b.vegSlow.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        if (b.starch) ings.push(ing(scaleQty(b.starch.def.qty, servings, 4), b.starch.def.unit, b.starch.name, true));
        if (haveItem(b.have, "cheese")) ings.push(ing(scaleQty(1, servings, 4), "cup", "cheddar cheese", true));
        addProfileIngredients(ings, profile, b.have, servings);
        var steps = [
          "Heat oven to 375°F. Grease a baking dish (2 minutes).",
          "Brown protein with aromatics 8 minutes. Blanch or sauté vegetables 6 minutes.",
          "Layer starch, vegetables, and protein in the dish. Pour sauce over top.",
          "Cover and bake 25 minutes. Uncover, add cheese if using, bake 8 minutes until bubbling."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 45 };
      }
    }
  ];

  function generate(pantry, options) {
    options = options || {};
    var servings = options.servings || 4;
    var variation = options.variation || 0;
    var buckets = classifyPantry(pantry);
    if (buckets.count < 2) {
      return { error: "Add at least two pantry items (for example chicken and rice) so Smart Chef can build a recipe." };
    }
    var absurd = buckets.protein && buckets.protein.def.label === "fish" && buckets.starch && stapleKey(b.starch.name).indexOf("pasta") !== -1 && variation % 3 === 0;
    if (absurd) variation += 1;
    var template = pickTemplate(buckets, variation);
    var profile = pickProfile(template, variation);
    var built = template.build(buckets, profile, servings);
    var name = buildName(template, profile, buckets, variation);
    var ingredients = built.ingredients;
    var missing = missingList(ingredients);
    var id = "sc_" + (variation + "_" + template.id + "_" + profile).replace(/[^a-z0-9_]/gi, "");
    var recipe = {
      id: id,
      name: name,
      minutes: built.minutes,
      servings: servings,
      tags: built.tags.concat(["smart-chef"]),
      ingredients: ingredients.map(function (i) {
        return { qty: i.qty, unit: i.unit, item: i.item };
      }),
      steps: built.steps
    };
    return {
      recipe: recipe,
      templateId: template.id,
      templateLabel: template.shortName,
      profileId: profile,
      profileLabel: PROFILES[profile].label,
      variation: variation,
      missing: missing,
      ingredientMeta: built.ingredients
    };
  }

  window.PW_SMART_CHEF = {
    generate: generate,
    classifyPantry: classifyPantry,
    templates: TEMPLATE_DEFS.map(function (t) { return { id: t.id, name: t.shortName }; })
  };
})();
