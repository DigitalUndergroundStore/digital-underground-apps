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
    var sk = stapleKey(name);
    if (have[sk]) return true;
    if (window.PW_PANTRY_NORM) {
      var canon = PW_PANTRY_NORM.canonPantryKey(name);
      if (canon && have[canon]) return true;
      var set = {};
      Object.keys(have).forEach(function (k) { set[k] = 1; });
      return PW_PANTRY_NORM.pantryMatchesIngredient(name, set);
    }
    return false;
  }

  function pantrySet(pantry) {
    var have = {};
    (pantry || []).forEach(function (entry) {
      var name = typeof entry === "string" ? entry : entry.item;
      if (window.PW_PANTRY_NORM) {
        Object.keys(PW_PANTRY_NORM.keysForPantryItem(name)).forEach(function (k) {
          have[k] = name;
        });
        var canon = PW_PANTRY_NORM.canonPantryKey(name);
        if (canon) have[canon] = name;
      } else {
        var key = stapleKey(name);
        if (key) have[key] = name;
      }
    });
    return have;
  }

  var CONDIMENT_KEYS = {
    mustard: 1, "peanut butter": 1, ketchup: 1, mayonnaise: 1, mayo: 1, relish: 1, "hot sauce": 1,
    "barbecue sauce": 1, "bbq sauce": 1, "maple syrup": 1, honey: 1, vinegar: 1, "soy sauce": 1
  };

  function isCondiment(name) {
    var k = stapleKey(name);
    if (CONDIMENT_KEYS[k]) return true;
    if (window.PW_PANTRY_NORM) k = PW_PANTRY_NORM.canonPantryKey(name);
    return !!CONDIMENT_KEYS[k];
  }

  function isGrainBowlStarch(starch) {
    if (!starch) return false;
    var k = stapleKey(starch.name);
    if (window.PW_PANTRY_NORM) k = PW_PANTRY_NORM.canonPantryKey(starch.name);
    return /rice|quinoa|couscous/.test(k);
  }

  function formatPantryIngredient(item, qty, unit) {
    var sk = stapleKey(item);
    var canon = window.PW_PANTRY_NORM ? PW_PANTRY_NORM.canonPantryKey(item) : sk;
    if (canon === "onion" || /onion/.test(sk) && sk.indexOf("green onion") === -1 && sk.indexOf("scallion") === -1) {
      return { qty: qty == null ? 1 : qty, unit: "", item: "medium onion, diced" };
    }
    if (canon === "garlic" || sk === "garlic") {
      return { qty: qty == null ? 2 : qty, unit: "clove", item: "garlic, minced" };
    }
    if (canon === "ginger" || sk.indexOf("ginger") !== -1) {
      return { qty: qty == null ? 1 : qty, unit: "tbsp", item: "fresh ginger, grated" };
    }
    if (canon === "green onion" || sk.indexOf("scallion") !== -1) {
      return { qty: qty == null ? 2 : qty, unit: "", item: "scallions, sliced" };
    }
    if (canon === "peanut butter" || sk.indexOf("peanut butter") !== -1) {
      return { qty: qty == null ? 2 : qty, unit: "tbsp", item: "peanut butter" };
    }
    if (canon === "mustard") {
      return { qty: qty == null ? 1 : qty, unit: "tbsp", item: "mustard" };
    }
    return { qty: qty, unit: unit || "", item: item };
  }

  function ingFormatted(qty, unit, item, have, fromPantryOverride) {
    var row = formatPantryIngredient(item, qty, unit);
    var fp = fromPantryOverride != null ? fromPantryOverride : (haveItem(have, item) || STAPLES[stapleKey(row.item)]);
    return { qty: row.qty, unit: row.unit, item: row.item, fromPantry: fp };
  }

  var LEX = {
    protein: [
      { keys: ["chicken breast", "chicken thigh", "chicken"], label: "chicken", cookMin: 12, form: "diced" },
      { keys: ["ground beef", "hamburger", "hamburger meat"], label: "ground beef", cookMin: 10, form: "crumbled" },
      { keys: ["beef stew", "stewing beef", "pot roast", "beef roast", "chuck roast", "blade roast", "beef", "steak"], label: "pot roast", cookMin: 180, form: "cubed" },
      { keys: ["pork ribs", "ribs", "back ribs", "spare ribs"], label: "pork ribs", cookMin: 45, form: "whole rack" },
      { keys: ["pork chop", "pork chops"], label: "pork chops", cookMin: 14, form: "bone-in" },
      { keys: ["ground pork", "pork"], label: "pork", cookMin: 10, form: "diced" },
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
    var seenProtein = {};
    LEX.protein.forEach(function (p) {
      if (seenProtein[p.label]) return;
      var matched = false;
      var display = p.label;
      p.keys.forEach(function (k) {
        if (!haveItem(have, k)) return;
        matched = true;
        if (have[stapleKey(k)]) display = have[stapleKey(k)];
        else if (window.PW_PANTRY_NORM && have[PW_PANTRY_NORM.canonPantryKey(k)]) display = have[PW_PANTRY_NORM.canonPantryKey(k)];
      });
      if (matched) {
        seenProtein[p.label] = 1;
        proteins.push({ def: p, name: display });
      }
    });
    if (proteins.length) {
      proteins.sort(function (a, b) {
        return proteinPriority(a.def.label) - proteinPriority(b.def.label);
      });
      protein = proteins[0];
    }

    var vegFast = [];
    var vegSlow = [];
    keys.forEach(function (k) {
      if (CONDIMENT_KEYS[k] || isCondiment(have[k] || k)) return;
      if (k.indexOf("peanut butter") !== -1) return;
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

  function proteinPriority(label) {
    var order = {
      "pork ribs": 1, "pork chops": 2, "ground beef": 3, "pot roast": 4, pork: 5, chicken: 6, "ground turkey": 7,
      sausage: 8, bacon: 9, shrimp: 10, fish: 11, lamb: 12, beans: 20, "firm tofu": 25, eggs: 40
    };
    return order[label] != null ? order[label] : 15;
  }

  function addMainProtein(ings, protein, servings) {
    if (!protein) return;
    if (protein.def.label === "eggs") {
      ings.push(ing(scaleQty(6, servings, 4), "", "eggs", true));
      return;
    }
    if (protein.def.label === "pork chops") {
      ings.push(ing(scaleQty(4, servings, 4), "", protein.name, true));
      return;
    }
    if (protein.def.label === "pork ribs") {
      ings.push(ing(scaleQty(2, servings, 4), "lb", protein.name, true));
      return;
    }
    ings.push(ing(scaleQty(1, servings, 4), "lb", protein.name, true));
  }

  function dedupeIngredients(list) {
    var out = [];
    var seen = {};
    list.forEach(function (row) {
      var canon = window.PW_PANTRY_NORM ? PW_PANTRY_NORM.canonPantryKey(row.item) : stapleKey(row.item);
      var k = canon + "|" + String(row.unit || "");
      if (seen[k]) return;
      seen[k] = 1;
      out.push(row);
    });
    return out;
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

  var CLASSIC_RANK = {
    burger: 1,
    "grilled-cheese": 2,
    tacos: 3,
    "bbq-ribs": 4,
    "pan-chops": 5,
    chili: 6,
    meatloaf: 7,
    pasta: 8,
    "shepherds-pie": 9,
    "pot-roast": 10,
    "roast-chicken": 11,
    "chicken-dinner": 12,
    "stir-fry": 13,
    soup: 14,
    sandwich: 15,
    hash: 16,
    wrap: 17,
    frittata: 18,
    skillet: 19,
    "sheet-pan": 20,
    "fried-rice": 21,
    casserole: 22,
    salad: 26,
    curry: 28,
    "grain-bowl": 32
  };

  function templateRank(t) {
    return CLASSIC_RANK[t.id] != null ? CLASSIC_RANK[t.id] : 40;
  }

  function pickTemplate(buckets, variation) {
    var templates = TEMPLATE_DEFS.filter(function (t) {
      return t.fits(buckets);
    });
    if (!templates.length) {
      templates = TEMPLATE_DEFS.filter(function (t) {
        return t.id === "skillet" || t.id === "burger" || t.id === "wrap";
      });
    }
    templates.sort(function (a, b) {
      return templateRank(a) - templateRank(b) || a.id.localeCompare(b.id);
    });
    var classicCutoff = 22;
    var classicPool = templates.filter(function (t) { return templateRank(t) <= classicCutoff; });
    var pool = variation < 56 && classicPool.length ? classicPool : templates;
    return pool[variation % pool.length];
  }

  function bucketsForVariation(buckets, variation) {
    var b = {
      have: buckets.have,
      protein: buckets.protein,
      proteins: buckets.proteins,
      vegFast: buckets.vegFast,
      vegSlow: buckets.vegSlow,
      starch: buckets.starch,
      count: buckets.count
    };
    if (b.proteins && b.proteins.length > 1) {
      b.protein = b.proteins[variation % b.proteins.length];
    }
    return b;
  }

  function pickProfile(template, variation) {
    var list = template.profiles || ["canadian", "italian"];
    var rank = templateRank(template);
    if (rank <= 22) {
      if (template.id === "pasta" || template.id === "tacos" || template.id === "chili") {
        if (list.indexOf("canadian") !== -1) return "canadian";
        if (list.indexOf("italian") !== -1) return "italian";
        if (list.indexOf("mexican") !== -1) return "mexican";
      }
      if (template.id === "stir-fry" || template.id === "fried-rice") {
        if (variation >= 44 && list.indexOf("asian") !== -1) return "asian";
        return list.indexOf("canadian") !== -1 ? "canadian" : list[0];
      }
      if (list.indexOf("canadian") !== -1) return "canadian";
      return list[0];
    }
    if (variation < 56 && list.indexOf("canadian") !== -1) return "canadian";
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

  function hasPotatoes(buckets) {
    if (buckets.starch && stapleKey(buckets.starch.name).indexOf("potato") !== -1) return true;
    return buckets.vegSlow.some(function (v) { return stapleKey(v).indexOf("potato") !== -1; });
  }

  function hasCheese(buckets) {
    return haveItem(buckets.have, "cheddar") || haveItem(buckets.have, "cheese");
  }

  function titleCaseProtein(label) {
    if (!label) return "";
    if (label === "ground beef") return "Ground Beef";
    if (label === "pork chops") return "Pork Chops";
    if (label === "pork ribs") return "Pork Ribs";
    if (label === "pot roast") return "Pot Roast";
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function buildName(template, profile, buckets, variation) {
    var p = buckets.protein ? buckets.protein.def.label : "";
    var potato = hasPotatoes(buckets);
    var cheese = hasCheese(buckets);
    var id = template.id;
    var classic = {
      burger: {
        "ground beef": cheese ? "Classic Cheeseburgers" : "Classic Beef Burgers",
        "ground turkey": "Turkey Burgers",
        pork: "Pork Burgers"
      },
      "grilled-cheese": { default: "Grilled Cheese Sandwiches" },
      tacos: {
        "ground beef": "Ground Beef Tacos",
        chicken: "Chicken Tacos",
        "pork chops": "Pork Chop Tacos",
        pork: "Pork Tacos",
        "ground turkey": "Turkey Tacos",
        "pork ribs": "BBQ Pork Tacos",
        default: "Home-Style Tacos"
      },
      "bbq-ribs": { "pork ribs": "BBQ Baby Back Ribs" },
      "pan-chops": {
        "pork chops": potato ? "Pan-Fried Pork Chops with Mashed Potatoes" : "Pan-Fried Pork Chops with Vegetables"
      },
      chili: {
        "ground beef": "Classic Beef Chili",
        "ground turkey": "Turkey Chili",
        pork: "Pork Chili"
      },
      meatloaf: {
        "ground beef": potato ? "Classic Meatloaf with Roasted Potatoes" : "Classic Meatloaf",
        "ground turkey": "Turkey Meatloaf"
      },
      pasta: {
        "ground beef": "Spaghetti and Meat Sauce",
        chicken: "Chicken Pasta with Tomato Sauce",
        default: "Pasta with Tomato Sauce"
      },
      "shepherds-pie": { "ground beef": "Shepherd's Pie", "ground turkey": "Turkey Shepherd's Pie" },
      "pot-roast": { "pot roast": "Pot Roast with Potatoes and Carrots" },
      "roast-chicken": { chicken: "Roast Chicken with Potatoes and Vegetables" },
      "chicken-dinner": {
        chicken: potato ? "Chicken Dinner with Potatoes and Vegetables" : "Roast Chicken Thighs with Vegetables"
      },
      "stir-fry": {
        chicken: "Chicken and Vegetable Stir-Fry",
        "ground beef": "Beef and Vegetable Stir-Fry",
        shrimp: "Shrimp Stir-Fry",
        default: "Vegetable Stir-Fry"
      },
      soup: { default: p ? titleCaseProtein(p) + " and Vegetable Soup" : "Homestyle Vegetable Soup" },
      sandwich: {
        "ground beef": "Hot Beef Sandwich",
        chicken: "Hot Chicken Sandwich",
        eggs: "Fried Egg Sandwiches",
        default: "Hot Sandwich"
      },
      hash: { default: p ? titleCaseProtein(p) + " and Potato Hash" : "Breakfast Hash" },
      wrap: { default: p ? titleCaseProtein(p) + " Wraps" : "Veggie Wraps" },
      frittata: { default: cheese ? "Cheddar and Vegetable Frittata" : "Vegetable Frittata" },
      "fried-rice": { chicken: "Chicken Fried Rice", "ground beef": "Beef Fried Rice", default: "Egg Fried Rice" },
      skillet: { default: p ? "Skillet " + titleCaseProtein(p) + " Dinner" : "Skillet Vegetable Dinner" },
      "sheet-pan": {
        chicken: "Sheet-Pan Chicken with Vegetables",
        "pork chops": "Sheet-Pan Pork Chops with Potatoes",
        "pork ribs": "Sheet-Pan BBQ Ribs with Vegetables",
        "ground beef": "Sheet-Pan Meatballs with Vegetables",
        default: "Sheet-Pan Dinner with Vegetables"
      },
      casserole: { default: p ? titleCaseProtein(p) + " Casserole" : "Baked Vegetable Casserole" },
      salad: { default: p ? titleCaseProtein(p) + " Salad" : "Garden Salad" },
      curry: { default: p ? titleCaseProtein(p) + " Curry" : "Vegetable Curry" },
      "grain-bowl": { default: p ? titleCaseProtein(p) + " Rice Bowl" : "Rice Bowl" }
    };
    var map = classic[id];
    if (map) {
      if (p && map[p]) return map[p];
      if (map.default) return map.default;
    }
    if (templateRank(template) <= 22) {
      return template.shortName;
    }
    return titleCaseProtein(p || "Home") + " " + template.shortName;
  }

  function templateAllowsSauce(templateId, sauceItem) {
    if (!sauceItem) return false;
    var sk = stapleKey(sauceItem);
    if (templateId === "frittata" || templateId === "salad" || templateId === "sandwich" || templateId === "burger" || templateId === "wrap" ||
        templateId === "grilled-cheese" || templateId === "meatloaf") return false;
    if (sk.indexOf("broth") !== -1 && (templateId === "grain-bowl" || templateId === "tacos")) return false;
    if (sk.indexOf("peanut") !== -1) return templateId === "satay-stir-fry" || (templateId === "curry" && sk.indexOf("coconut") === -1);
    return true;
  }

  function addProfileIngredients(list, profile, have, servings, templateId) {
    var p = PROFILES[profile];
    var tid = templateId || "";
    if (tid !== "frittata" && tid !== "salad") {
      if (haveItem(have, "garlic")) {
        list.push(ingFormatted(2, "clove", "garlic", have, true));
      }
      if (haveItem(have, "onion") && tid !== "fried-rice") {
        list.push(ingFormatted(1, "", "onion", have, true));
      }
      if (profile === "asian" && haveItem(have, "ginger")) {
        list.push(ingFormatted(1, "tbsp", "ginger", have, true));
      }
    }
    if (p.sauce && templateAllowsSauce(tid, p.sauce.item)) {
      if (haveItem(have, p.sauce.item) || tid === "soup" || tid === "curry" || tid === "chili") {
        list.push(ingFormatted(scaleQty(p.sauce.qty, servings, 4), p.sauce.unit, p.sauce.item, have, haveItem(have, p.sauce.item)));
      }
    }
    p.season.forEach(function (s) {
      if (haveItem(have, s) || STAPLES[stapleKey(s)]) {
        list.push(ingFormatted(0.5, "tsp", s, have, haveItem(have, s) || !!STAPLES[stapleKey(s)]));
      }
    });
    list.push(ingFormatted(2, "tbsp", "olive oil", have, haveItem(have, "olive oil") || true));
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
      fits: function (b) { return b.protein && b.protein.def.label !== "eggs" && b.vegFast.length >= 1; },
      build: function (b, profile, servings) {
        var steps = [];
        var ings = [];
        var p = b.protein;
        addMainProtein(ings, p, servings);
        b.vegFast.forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        if (b.starch && stapleKey(b.starch.name).indexOf("rice") !== -1) {
          ings.push(ing(scaleQty(b.starch.def.qty, servings, 4), b.starch.def.unit, b.starch.name, true));
        }
        addProfileIngredients(ings, profile, b.have, servings, "stir-fry");
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
        if (b.protein) addMainProtein(ings, b.protein, servings);
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        addProfileIngredients(ings, profile, b.have, servings, "pasta");
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
      fits: function (b) { return b.protein && b.protein.def.label !== "eggs"; },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        b.vegSlow.concat(b.vegFast).slice(0, 3).forEach(function (v) {
          ings.push(ing(scaleQty(1, servings, 4), "", v, true));
        });
        addProfileIngredients(ings, profile, b.have, servings, "skillet");
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
      fits: function (b) { return b.protein && b.protein.def.label !== "eggs" && (b.vegSlow.length || b.vegFast.length); },
      build: function (b, profile, servings) {
        var ings = [];
        if (b.protein.def.label === "pork ribs") {
          ings.push(ing(scaleQty(2, servings, 4), "lb", b.protein.name, true));
        } else {
          ings.push(ing(scaleQty(1.25, servings, 4), "lb", b.protein.name, true));
        }
        (b.vegSlow.length ? b.vegSlow : b.vegFast).slice(0, 2).forEach(function (v) {
          ings.push(ing(scaleQty(1, servings, 4), "", v, true));
        });
        addProfileIngredients(ings, profile, b.have, servings, "sheet-pan");
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
      fits: function (b) {
        return b.protein && b.protein.def.label !== "eggs" && (b.vegFast.length + b.vegSlow.length >= 1);
      },
      build: function (b, profile, servings) {
        var ings = [];
        if (b.protein) addMainProtein(ings, b.protein, servings);
        b.vegSlow.concat(b.vegFast).slice(0, 3).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        ings.push(ing(scaleQty(4, servings, 4), "cup", "chicken broth", haveItem(b.have, "chicken broth") || haveItem(b.have, "broth")));
        addProfileIngredients(ings, profile, b.have, servings, "soup");
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
      fits: function (b) {
        return b.vegFast.length && ((b.protein && b.protein.def.label !== "eggs") || haveItem(b.have, "chickpeas"));
      },
      build: function (b, profile, servings) {
        var ings = [];
        if (b.protein) addMainProtein(ings, b.protein, servings);
        else ings.push(ing(scaleQty(1, servings, 4), "can", "chickpeas", haveItem(b.have, "chickpeas")));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        if (b.starch && stapleKey(b.starch.name).indexOf("rice") !== -1) {
          ings.push(ing(scaleQty(1.5, servings, 4), "cup", b.starch.name, true));
        }
        addProfileIngredients(ings, profile, b.have, servings, "curry");
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
      fits: function (b) { return isGrainBowlStarch(b.starch) && (b.protein || b.vegFast.length >= 2); },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(b.starch.def.qty, servings, 4), b.starch.def.unit, b.starch.name, true));
        if (b.protein) addMainProtein(ings, b.protein, servings);
        b.vegFast.slice(0, 3).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        addProfileIngredients(ings, profile, b.have, servings, "grain-bowl");
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
      fits: function (b) {
        return b.protein && b.protein.def.label !== "pork ribs" &&
          (haveItem(b.have, "tortilla") || haveItem(b.have, "tortillas") || haveItem(b.have, "wrap"));
      },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        ings.push(ing(scaleQty(8, servings, 4), "", "tortillas", true));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        addProfileIngredients(ings, profile, b.have, servings, "tacos");
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
        addProfileIngredients(ings, profile, b.have, servings, "frittata");
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
        if (b.protein) addMainProtein(ings, b.protein, servings);
        b.vegFast.slice(0, 4).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        ings.push(ing(2, "tbsp", "olive oil", true));
        ings.push(ing(1, "tbsp", "lemon juice", haveItem(b.have, "lemon")));
        addProfileIngredients(ings, profile, b.have, servings, "salad");
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
        if (b.protein) addMainProtein(ings, b.protein, servings);
        else ings.push(ing(scaleQty(2, servings, 4), "", "eggs", haveItem(b.have, "egg")));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(0.5, servings, 4), "cup", v, true)); });
        addProfileIngredients(ings, profile, b.have, servings, "fried-rice");
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
        addMainProtein(ings, b.protein, servings);
        b.vegSlow.slice(0, 2).forEach(function (v) { ings.push(ing(scaleQty(1, servings, 4), "", v, true)); });
        if (b.starch) ings.push(ing(scaleQty(b.starch.def.qty, servings, 4), b.starch.def.unit, b.starch.name, true));
        if (haveItem(b.have, "cheese")) ings.push(ing(scaleQty(1, servings, 4), "cup", "cheddar cheese", true));
        addProfileIngredients(ings, profile, b.have, servings, "casserole");
        var steps = [
          "Heat oven to 375°F. Grease a baking dish (2 minutes).",
          "Brown protein with aromatics 8 minutes. Blanch or sauté vegetables 6 minutes.",
          "Layer starch, vegetables, and protein in the dish. Pour sauce over top.",
          "Cover and bake 25 minutes. Uncover, add cheese if using, bake 8 minutes until bubbling."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 45 };
      }
    },
    {
      id: "burger",
      shortName: "Burgers",
      profiles: ["canadian", "mexican"],
      minutes: 22,
      tags: ["dinner", "lunch", "easy"],
      fits: function (b) {
        return b.protein && (b.protein.def.label === "ground beef" || b.protein.def.label === "ground turkey" || b.protein.def.label === "pork");
      },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        if (haveItem(b.have, "hamburger bun") || haveItem(b.have, "burger bun") || haveItem(b.have, "bread")) {
          ings.push(ing(scaleQty(4, servings, 4), "", "hamburger buns", haveItem(b.have, "hamburger bun") || haveItem(b.have, "bread")));
        }
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ingFormatted(1, "", v, b.have, true)); });
        if (haveItem(b.have, "mustard")) ings.push(ingFormatted(1, "tbsp", "mustard", b.have, true));
        if (haveItem(b.have, "cheddar")) ings.push(ing(scaleQty(4, servings, 4), "slice", "cheddar cheese", true));
        addProfileIngredients(ings, profile, b.have, servings, "burger");
        var steps = [
          "Form patties from " + b.protein.def.label + "; season with salt and pepper (3 minutes).",
          "Grill or skillet-cook patties " + b.protein.def.cookMin + " minutes per side to desired doneness.",
          "Toast buns 1 minute. Layer patty, cheese, and vegetables.",
          "Serve with mustard and your favourite toppings."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 22 };
      }
    },
    {
      id: "bbq-ribs",
      shortName: "BBQ Ribs",
      profiles: ["canadian", "mexican"],
      minutes: 75,
      tags: ["dinner", "easy"],
      fits: function (b) { return b.protein && b.protein.def.label === "pork ribs"; },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        if (haveItem(b.have, "mustard")) ings.push(ingFormatted(2, "tbsp", "mustard", b.have, true));
        b.vegFast.slice(0, 1).forEach(function (v) { ings.push(ingFormatted(1, "", v, b.have, true)); });
        addProfileIngredients(ings, profile, b.have, servings, "bbq-ribs");
        var steps = [
          "Rub ribs with mustard, salt, pepper, and spices (5 minutes).",
          "Wrap tightly in foil. Bake at 300°F 2 hours until tender (or simmer in covered pot).",
          "Unwrap, brush with sauce, and broil or grill 5 minutes to caramelize.",
          "Rest 5 minutes, slice between bones, and serve."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 75 };
      }
    },
    {
      id: "pan-chops",
      shortName: "Pan-Seared Chops",
      profiles: ["canadian", "italian"],
      minutes: 28,
      tags: ["dinner", "easy"],
      fits: function (b) { return b.protein && b.protein.def.label === "pork chops"; },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        b.vegFast.slice(0, 2).forEach(function (v) {
          if (stapleKey(v).indexOf("onion") !== -1 && haveItem(b.have, "onion")) return;
          ings.push(ingFormatted(1, "", v, b.have, true));
        });
        addProfileIngredients(ings, profile, b.have, servings, "pan-chops");
        var steps = [
          "Pat chops dry; season both sides (2 minutes).",
          "Sear in hot oiled skillet 4 minutes per side until golden and 145°F in the centre.",
          "Rest 3 minutes. Sauté vegetables in the same pan 5 minutes.",
          "Serve chops with pan juices and vegetables."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 28 };
      }
    },
    {
      id: "wrap",
      shortName: "Wraps",
      profiles: ["mexican", "canadian"],
      minutes: 20,
      tags: ["lunch", "dinner", "easy"],
      fits: function (b) {
        return b.protein && (haveItem(b.have, "tortilla") || haveItem(b.have, "wrap"));
      },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        ings.push(ing(scaleQty(6, servings, 4), "", "tortillas", true));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ingFormatted(1, "", v, b.have, true)); });
        if (haveItem(b.have, "mustard")) ings.push(ingFormatted(1, "tbsp", "mustard", b.have, true));
        addProfileIngredients(ings, profile, b.have, servings, "wrap");
        var steps = [
          "Cook " + b.protein.def.label + " with spices until done, " + b.protein.def.cookMin + " minutes.",
          "Warm tortillas 30 seconds per side.",
          "Fill with protein, vegetables, and sauce. Roll tightly and slice in half."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 20 };
      }
    },
    {
      id: "chili",
      shortName: "Chili",
      profiles: ["mexican", "canadian"],
      minutes: 42,
      tags: ["dinner", "easy"],
      fits: function (b) {
        return b.protein && (b.protein.def.label === "ground beef" || b.protein.def.label === "ground turkey" || b.protein.def.label === "pork");
      },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        if (haveItem(b.have, "onion")) ings.push(ingFormatted(1, "", "onion", b.have, true));
        if (haveItem(b.have, "beans") || haveItem(b.have, "kidney beans")) {
          ings.push(ing(scaleQty(1, servings, 4), "can", "kidney beans", true));
        }
        ings.push(ing(scaleQty(1, servings, 4), "can", "crushed tomatoes", haveItem(b.have, "crushed tomatoes")));
        addProfileIngredients(ings, profile, b.have, servings, "chili");
        var steps = [
          "Brown " + b.protein.def.label + " in a pot; drain excess fat (8 minutes).",
          "Add onion and spices; cook 3 minutes.",
          "Stir in tomatoes and beans; simmer 25 minutes, stirring occasionally.",
          "Taste and adjust salt. Serve with toppings if you like."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 42 };
      }
    },
    {
      id: "meatloaf",
      shortName: "Meatloaf",
      profiles: ["canadian"],
      minutes: 55,
      tags: ["dinner", "easy", "canadian"],
      fits: function (b) {
        return b.protein && (b.protein.def.label === "ground beef" || b.protein.def.label === "ground turkey");
      },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        if (haveItem(b.have, "egg") || haveItem(b.have, "eggs")) {
          ings.push(ing(scaleQty(1, servings, 4), "", "egg", true));
        }
        if (haveItem(b.have, "bread")) {
          ings.push(ing(scaleQty(0.5, servings, 4), "cup", "bread crumbs", true));
        }
        if (b.vegSlow[0] || hasPotatoes(b)) {
          ings.push(ing(scaleQty(1.5, servings, 4), "lb", "potatoes", true));
        }
        addProfileIngredients(ings, profile, b.have, servings, "meatloaf");
        var steps = [
          "Mix ground meat with egg, crumbs, onion, and seasonings (5 minutes).",
          "Shape into a loaf on a foil-lined baking sheet (2 minutes).",
          "Bake at 375°F 45 minutes until cooked through (internal 160°F).",
          "Rest 5 minutes. Serve with roasted potatoes if using."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 55 };
      }
    },
    {
      id: "shepherds-pie",
      shortName: "Shepherd's Pie",
      profiles: ["canadian"],
      minutes: 50,
      tags: ["dinner", "easy", "canadian"],
      fits: function (b) {
        return b.protein && (b.protein.def.label === "ground beef" || b.protein.def.label === "ground turkey") &&
          (hasPotatoes(b) || b.vegSlow.length);
      },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        ings.push(ing(scaleQty(2, servings, 4), "lb", "potatoes", true));
        if (haveItem(b.have, "onion")) ings.push(ingFormatted(1, "", "onion", b.have, true));
        ings.push(ing(scaleQty(1, servings, 4), "can", "crushed tomatoes", haveItem(b.have, "crushed tomatoes")));
        if (haveItem(b.have, "cheddar")) ings.push(ing(scaleQty(0.5, servings, 4), "cup", "cheddar cheese", true));
        addProfileIngredients(ings, profile, b.have, servings, "shepherds-pie");
        var steps = [
          "Boil potatoes until tender; mash with butter and salt (20 minutes).",
          "Brown ground meat with onion; stir in tomatoes and simmer 10 minutes.",
          "Spread meat in a baking dish; top with mashed potatoes.",
          "Bake at 400°F 20 minutes until golden on top. Rest 5 minutes before serving."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 50 };
      }
    },
    {
      id: "pot-roast",
      shortName: "Pot Roast",
      profiles: ["canadian"],
      minutes: 150,
      tags: ["dinner", "easy", "canadian"],
      fits: function (b) {
        return b.protein && b.protein.def.label === "pot roast" && (hasPotatoes(b) || b.vegSlow.length);
      },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(2, servings, 4), "lb", b.protein.name, true));
        ings.push(ing(scaleQty(1.5, servings, 4), "lb", "potatoes", true));
        if (b.vegSlow.indexOf("carrot") !== -1 || haveItem(b.have, "carrot")) {
          ings.push(ing(scaleQty(3, servings, 4), "", "carrots", haveItem(b.have, "carrot")));
        } else {
          ings.push(ing(scaleQty(2, servings, 4), "", "carrots", false));
        }
        if (haveItem(b.have, "onion")) ings.push(ingFormatted(1, "", "onion", b.have, true));
        ings.push(ing(scaleQty(2, servings, 4), "cup", "beef broth", haveItem(b.have, "beef broth") || haveItem(b.have, "broth")));
        addProfileIngredients(ings, profile, b.have, servings, "pot-roast");
        var steps = [
          "Season beef all over with salt and pepper (3 minutes).",
          "Brown beef in a heavy pot with oil on all sides (8 minutes).",
          "Add onion, carrots, potatoes, and broth. Bring to a simmer.",
          "Cover and cook on low 2–2½ hours until beef is fork-tender. Slice and serve with vegetables and pan juices."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 150 };
      }
    },
    {
      id: "roast-chicken",
      shortName: "Roast Chicken",
      profiles: ["canadian"],
      minutes: 75,
      tags: ["dinner", "easy", "canadian"],
      fits: function (b) {
        return b.protein && b.protein.def.label === "chicken" && (hasPotatoes(b) || b.vegSlow.length || b.vegFast.length);
      },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(1, servings, 4), "", "whole chicken", haveItem(b.have, "chicken") || true));
        if (hasPotatoes(b)) ings.push(ing(scaleQty(1.5, servings, 4), "lb", "potatoes", true));
        b.vegFast.slice(0, 2).forEach(function (v) {
          ings.push(ingFormatted(1, "", v, b.have, true));
        });
        addProfileIngredients(ings, profile, b.have, servings, "roast-chicken");
        var steps = [
          "Pat chicken dry; season inside and out (5 minutes).",
          "Heat oven to 425°F. Toss potatoes and vegetables with oil and salt.",
          "Roast chicken with vegetables 60–70 minutes until juices run clear (165°F in thigh).",
          "Rest 10 minutes before carving. Serve with pan drippings."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 75 };
      }
    },
    {
      id: "chicken-dinner",
      shortName: "Chicken Dinner",
      profiles: ["canadian"],
      minutes: 45,
      tags: ["dinner", "easy", "canadian"],
      fits: function (b) {
        return b.protein && b.protein.def.label === "chicken";
      },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(1.5, servings, 4), "lb", b.protein.name, true));
        if (hasPotatoes(b)) ings.push(ing(scaleQty(1, servings, 4), "lb", "potatoes", true));
        b.vegFast.slice(0, 2).forEach(function (v) { ings.push(ingFormatted(1, "", v, b.have, true)); });
        addProfileIngredients(ings, profile, b.have, servings, "chicken-dinner");
        var steps = [
          "Heat oven to 400°F (or use a large skillet on the stovetop).",
          "Season chicken; sear skin-side down until golden (6 minutes).",
          "Add potatoes and vegetables around chicken; roast or cover and cook 25–30 minutes until done.",
          "Rest 5 minutes. Serve with cooking juices."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 45 };
      }
    },
    {
      id: "grilled-cheese",
      shortName: "Grilled Cheese",
      profiles: ["canadian"],
      minutes: 12,
      tags: ["lunch", "easy", "canadian"],
      fits: function (b) {
        return haveItem(b.have, "bread") && (haveItem(b.have, "cheddar") || haveItem(b.have, "cheese"));
      },
      build: function (b, profile, servings) {
        var ings = [];
        ings.push(ing(scaleQty(8, servings, 4), "slice", "bread", true));
        ings.push(ing(scaleQty(8, servings, 4), "slice", "cheddar cheese", true));
        if (haveItem(b.have, "butter")) ings.push(ing(scaleQty(2, servings, 4), "tbsp", "butter", true));
        var steps = [
          "Butter one side of each bread slice (2 minutes).",
          "Layer cheese between unbuttered sides.",
          "Cook in a skillet over medium heat 3 minutes per side until golden and cheese melts.",
          "Slice and serve hot."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 12 };
      }
    },
    {
      id: "hash",
      shortName: "Skillet Hash",
      profiles: ["canadian"],
      minutes: 30,
      tags: ["breakfast", "dinner", "easy"],
      fits: function (b) { return b.protein && (b.vegSlow.length || b.vegFast.length || b.starch); },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        if (b.starch && stapleKey(b.starch.name).indexOf("potato") !== -1) {
          ings.push(ing(scaleQty(1, servings, 4), "lb", b.starch.name, true));
        } else if (b.vegSlow[0]) {
          ings.push(ing(scaleQty(1, servings, 4), "lb", b.vegSlow[0], true));
        }
        b.vegFast.slice(0, 1).forEach(function (v) { ings.push(ingFormatted(1, "", v, b.have, true)); });
        addProfileIngredients(ings, profile, b.have, servings, "hash");
        var steps = [
          "Dice potatoes or vegetables into 1/2-inch pieces (6 minutes).",
          "Brown protein in a large skillet; set aside (8 minutes).",
          "Crisp potatoes in the same pan 12 minutes, then fold in protein and onion.",
          "Serve hot from the skillet."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 30 };
      }
    },
    {
      id: "sandwich",
      shortName: "Hot Sandwich",
      profiles: ["canadian", "italian"],
      minutes: 18,
      tags: ["lunch", "dinner", "easy"],
      fits: function (b) {
        return b.protein && haveItem(b.have, "bread") && b.protein.def.label !== "pork ribs";
      },
      build: function (b, profile, servings) {
        var ings = [];
        addMainProtein(ings, b.protein, servings);
        ings.push(ing(scaleQty(4, servings, 4), "slice", "bread", true));
        if (haveItem(b.have, "mustard")) ings.push(ingFormatted(1, "tbsp", "mustard", b.have, true));
        if (haveItem(b.have, "cheddar")) ings.push(ing(scaleQty(4, servings, 4), "slice", "cheddar cheese", true));
        b.vegFast.slice(0, 1).forEach(function (v) { ings.push(ingFormatted(1, "", v, b.have, true)); });
        addProfileIngredients(ings, profile, b.have, servings, "sandwich");
        var steps = [
          "Cook " + b.protein.def.label + " in a skillet until done, " + b.protein.def.cookMin + " minutes.",
          "Layer bread with protein, cheese, and vegetables.",
          "Toast in a dry pan or broiler 2–3 minutes until cheese melts. Slice and serve."
        ];
        return { ingredients: markPantry(ings, b.have), steps: steps, minutes: 18 };
      }
    }
  ];

  var HASH_STORAGE_KEY = "pantry_week_smart_chef_hashes";
  var HASH_CAP = 240;
  var MAX_GENERATE_ATTEMPTS = 320;
  var NAME_STOP = /\b(rustic|weeknight|quick|hearty|home style|home-style|cozy|ginger|savory|zesty|smoky|fragrant|mild|garlic)\b/gi;

  function normalizeTitle(name) {
    return String(name || "").toLowerCase().replace(NAME_STOP, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function detectProteinFromRecipe(recipe) {
    var found = "none";
    (recipe.ingredients || []).forEach(function (ing) {
      var k = stapleKey(ing.item);
      LEX.protein.forEach(function (p) {
        p.keys.forEach(function (key) {
          if (k.indexOf(stapleKey(key)) !== -1 || stapleKey(key).indexOf(k) !== -1) found = p.label;
        });
      });
    });
    var n = normalizeTitle(recipe.name);
    if (found === "none") {
      if (n.indexOf("chicken") !== -1) found = "chicken";
      else if (n.indexOf("beef") !== -1) found = "ground beef";
      else if (n.indexOf("tofu") !== -1) found = "firm tofu";
      else if (n.indexOf("shrimp") !== -1) found = "shrimp";
      else if (n.indexOf("salmon") !== -1 || n.indexOf("fish") !== -1) found = "fish";
      else if (n.indexOf("egg") !== -1) found = "eggs";
    }
    return found;
  }

  function inferTemplateId(recipe) {
    var n = normalizeTitle(recipe.name);
    if (n.indexOf("stir fry") !== -1 || n.indexOf("stir-fry") !== -1) return "stir-fry";
    if (n.indexOf("pasta") !== -1) return "pasta";
    if (n.indexOf("sheet pan") !== -1) return "sheet-pan";
    if (n.indexOf("soup") !== -1) return "soup";
    if (n.indexOf("curry") !== -1) return "curry";
    if (n.indexOf("bowl") !== -1) return "grain-bowl";
    if (n.indexOf("taco") !== -1) return "tacos";
    if (n.indexOf("frittata") !== -1) return "frittata";
    if (n.indexOf("salad") !== -1) return "salad";
    if (n.indexOf("fried rice") !== -1) return "fried-rice";
    if (n.indexOf("casserole") !== -1) return "casserole";
    if (n.indexOf("skillet") !== -1) return "skillet";
    if (n.indexOf("burger") !== -1) return "burger";
    if (n.indexOf("bbq") !== -1 || n.indexOf("rib") !== -1) return "bbq-ribs";
    if (n.indexOf("chop") !== -1) return "pan-chops";
    if (n.indexOf("wrap") !== -1) return "wrap";
    if (n.indexOf("chili") !== -1) return "chili";
    if (n.indexOf("hash") !== -1) return "hash";
    if (n.indexOf("sandwich") !== -1) return "sandwich";
    if (n.indexOf("meatloaf") !== -1) return "meatloaf";
    if (n.indexOf("shepherd") !== -1) return "shepherds-pie";
    if (n.indexOf("pot roast") !== -1) return "pot-roast";
    if (n.indexOf("roast chicken") !== -1) return "roast-chicken";
    if (n.indexOf("grilled cheese") !== -1) return "grilled-cheese";
    if (n.indexOf("spaghetti") !== -1 || n.indexOf("meat sauce") !== -1) return "pasta";
    return "unknown";
  }

  function variationOfResult(base, attempt) {
    var recipe = JSON.parse(JSON.stringify(base.recipe));
    recipe.id = "sc_var_" + attempt + "_" + Date.now().toString(36);
    if (recipe.name.indexOf("variation") === -1) recipe.name = recipe.name + " (variation)";
    var sig = recipeSignature(recipe, base.templateId, base.profileId);
    return {
      recipe: recipe,
      templateId: base.templateId,
      templateLabel: base.templateLabel,
      profileId: base.profileId,
      profileLabel: base.profileLabel,
      variation: base.variation + attempt,
      missing: base.missing,
      ingredientMeta: base.ingredientMeta,
      signature: sig,
      fingerprint: signatureHash(sig) + "::v" + attempt
    };
  }

  function keyIngredientKeys(recipe) {
    var keys = [];
    (recipe.ingredients || []).forEach(function (ing) {
      if (!ing.item) return;
      var k = stapleKey(ing.item);
      if (!k || STAPLES[k]) return;
      if (keys.indexOf(k) === -1) keys.push(k);
    });
    keys.sort();
    return keys.slice(0, 6);
  }

  function recipeSignature(recipe, templateId, profileId) {
    return {
      template: templateId || inferTemplateId(recipe),
      profile: profileId || "",
      protein: detectProteinFromRecipe(recipe)
    };
  }

  function signatureHash(sig) {
    return [sig.template, sig.profile, sig.protein].join("::");
  }

  function tokenOverlap(a, b) {
    var ta = a.split(" ").filter(Boolean);
    var tb = b.split(" ").filter(Boolean);
    if (!ta.length || !tb.length) return 0;
    var inter = 0;
    ta.forEach(function (t) { if (tb.indexOf(t) !== -1) inter += 1; });
    return inter / Math.max(ta.length, tb.length);
  }

  function jaccard(a, b) {
    var setA = {};
    var setB = {};
    a.forEach(function (x) { setA[x] = 1; });
    b.forEach(function (x) { setB[x] = 1; });
    var inter = 0;
    var union = 0;
    Object.keys(setA).forEach(function (k) {
      union += 1;
      if (setB[k]) inter += 1;
    });
    Object.keys(setB).forEach(function (k) {
      if (!setA[k]) union += 1;
    });
    return union ? inter / union : 0;
  }

  function isNearDuplicate(sigA, sigB) {
    return signatureHash(sigA) === signatureHash(sigB);
  }

  function buildExistingSignatures(recipes) {
    return (recipes || []).map(function (r) {
      return recipeSignature(r, inferTemplateId(r), "");
    });
  }

  function loadHashes() {
    try {
      var raw = localStorage.getItem(HASH_STORAGE_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function persistHash(hash) {
    if (!hash) return;
    var list = loadHashes();
    if (list.indexOf(hash) !== -1) return;
    list.push(hash);
    if (list.length > HASH_CAP) list = list.slice(list.length - HASH_CAP);
    try {
      localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify(list));
    } catch (err) { /* storage full */ }
  }

  function buildOne(pantry, buckets, variation, servings) {
    buckets = bucketsForVariation(buckets, variation);
    var absurd = buckets.protein && buckets.protein.def.label === "fish" && buckets.starch && stapleKey(buckets.starch.name).indexOf("pasta") !== -1 && variation % 3 === 0;
    if (absurd) variation += 1;
    var template = pickTemplate(buckets, variation);
    var profile = pickProfile(template, variation);
    var built = template.build(buckets, profile, servings);
    built.ingredients = dedupeIngredients(built.ingredients || []);
    var name = buildName(template, profile, buckets, variation);
    var ingredients = built.ingredients;
    var missing = missingList(ingredients);
    var id = "sc_" + (variation + "_" + template.id + "_" + profile).replace(/[^a-z0-9_]/gi, "");
    var photoKey = template.id + "-" + profile;
    var recipe = {
      id: id,
      name: name,
      minutes: built.minutes,
      servings: servings,
      photoKey: photoKey,
      tags: (built.tags || template.tags || []).concat(["smart-chef"]),
      ingredients: ingredients.map(function (i) {
        return { qty: i.qty, unit: i.unit, item: i.item };
      }),
      steps: built.steps
    };
    var sig = recipeSignature(recipe, template.id, profile);
    return {
      recipe: recipe,
      templateId: template.id,
      templateLabel: template.shortName,
      profileId: profile,
      profileLabel: PROFILES[profile].label,
      variation: variation,
      missing: missing,
      ingredientMeta: built.ingredients,
      signature: sig,
      fingerprint: signatureHash(sig)
    };
  }

  var NOVELTY_NAME_RE = /\b(zesty|savory|savoury|fragrant|smoky|rustic|cozy|hearty|ginger|garlic|weeknight|quick)\b/i;

  function failsSanity(result, variation) {
    var recipe = result.recipe;
    var name = String(recipe.name || "");
    var nameL = name.toLowerCase();
    var tid = result.templateId;
    var rank = CLASSIC_RANK[tid] != null ? CLASSIC_RANK[tid] : 40;
    if (rank >= 28 && variation != null && variation < 56) return true;
    if (NOVELTY_NAME_RE.test(name) && rank >= 20) return true;
    if (/\bgrain bowl\b/i.test(name) && variation != null && variation < 56) return true;
    var items = (recipe.ingredients || []).map(function (i) { return stapleKey(i.item); }).join(" ");
    if (tid === "frittata" && items.indexOf("peanut butter") !== -1) return true;
    if (tid === "grain-bowl" && items.indexOf("bread") !== -1) return true;
    if (/clove.*onion|onion.*clove/.test(items) || /(\d+\s+clove).*onion/.test((recipe.ingredients || []).map(function (i) {
      return (i.qty || "") + " " + (i.unit || "") + " " + i.item;
    }).join(" ").toLowerCase())) return true;
    if (nameL.indexOf("peanut") !== -1 && tid === "frittata") return true;
    if (nameL.indexOf("grain bowl") !== -1 && items.indexOf("bread") !== -1) return true;
    return false;
  }

  function isRejected(result, rejectHashSet, existingSigs, variation) {
    if (failsSanity(result, variation)) return true;
    if (rejectHashSet[result.fingerprint]) return true;
    var i;
    for (i = 0; i < existingSigs.length; i++) {
      if (isNearDuplicate(result.signature, existingSigs[i])) return true;
    }
    return false;
  }

  function generate(pantry, options) {
    options = options || {};
    var servings = options.servings || 4;
    var startVar = options.variation || 0;
    var buckets = classifyPantry(pantry);
    if (buckets.count < 1) {
      return { error: "Add pantry items so Smart Chef can build a recipe." };
    }
    if (buckets.count < 2 && !buckets.protein && !buckets.starch) {
      return { error: "Add a protein or starch (for example ground beef or rice) so Smart Chef can build a recipe." };
    }
    var rejectHashSet = {};
    (options.rejectHashes || []).forEach(function (h) { if (h) rejectHashSet[h] = 1; });
    loadHashes().forEach(function (h) { if (h) rejectHashSet[h] = 1; });
    var existingSigs = buildExistingSignatures(options.existingRecipes || []);

    var attempt;
    var lastResult = null;
    for (attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
      var variation = startVar + attempt;
      var result = buildOne(pantry, buckets, variation, servings);
      lastResult = result;
      if (!isRejected(result, rejectHashSet, existingSigs, variation)) return result;
      rejectHashSet[result.fingerprint] = 1;
    }
    if (lastResult && (buckets.protein || buckets.starch)) {
      for (var v = 1; v <= 12; v++) {
        var alt = variationOfResult(lastResult, v);
        if (!isRejected(alt, rejectHashSet, existingSigs, variation + v)) return alt;
      }
      return variationOfResult(lastResult, 1);
    }
    return {
      error: "Smart Chef could not find a new combination with your pantry. Add another protein or vegetable, or clear some saved creations."
    };
  }

  function photoKeyFor(templateId, profileId) {
    return String(templateId || "") + "-" + String(profileId || "");
  }

  window.PW_SMART_CHEF = {
    generate: generate,
    classifyPantry: classifyPantry,
    persistHash: persistHash,
    loadHashes: loadHashes,
    signatureHash: signatureHash,
    photoKeyFor: photoKeyFor,
    templates: TEMPLATE_DEFS.map(function (t) { return { id: t.id, name: t.shortName }; })
  };
})();
