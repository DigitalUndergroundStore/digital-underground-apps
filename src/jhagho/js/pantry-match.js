/* Pantry Week — smart pantry ↔ recipe matching for "Cook from what you have". */
"use strict";

(function () {
  var NORM = function () { return window.PW_PANTRY_NORM; };

  function stapleKey(item) {
    if (window.PW && window.PW.stapleKey) return window.PW.stapleKey(item);
    return String(item || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function canon(item) {
    var n = NORM();
    return n ? n.canonPantryKey(item) : stapleKey(item);
  }

  function haveSet(pantry) {
    var n = NORM();
    if (n) return n.pantryHaveSet(pantry);
    var have = {};
    (pantry || []).forEach(function (entry) {
      var name = typeof entry === "string" ? entry : entry.item;
      var k = stapleKey(name);
      if (k) have[k] = 1;
    });
    return have;
  }

  var CHEESE_KEYS = {
    cheese: 1, cheddar: 1, mozzarella: 1, parmesan: 1, "parmesan cheese": 1, swiss: 1,
    "monterey jack": 1, feta: 1, brie: 1, gouda: 1, provolone: 1, "cream cheese": 1,
    "goat cheese": 1, ricotta: 1, gruyere: 1, "blue cheese": 1
  };

  function isCheeseName(item) {
    var c = canon(item);
    var s = stapleKey(item);
    if (CHEESE_KEYS[c] || CHEESE_KEYS[s]) return true;
    return /\bcheese\b/.test(s);
  }

  function haveAnyCheese(have) {
    var keys = Object.keys(have || {});
    for (var i = 0; i < keys.length; i++) {
      if (CHEESE_KEYS[keys[i]]) return true;
    }
    return false;
  }

  function defaultAssumeStaples() {
    return { flour: false, sugar: false, butter: false };
  }

  function normalizeAssume(assume) {
    var src = assume && typeof assume === "object" ? assume : {};
    return {
      flour: !!src.flour,
      sugar: !!src.sugar,
      butter: !!src.butter
    };
  }

  var ALWAYS_STAPLES = {
    salt: 1, "black pepper": 1, pepper: 1, water: 1, oil: 1, "olive oil": 1,
    "vegetable oil": 1, "canola oil": 1
  };

  function isAssumedStaple(item, assume) {
    var c = canon(item);
    var s = stapleKey(item);
    if (ALWAYS_STAPLES[c] || ALWAYS_STAPLES[s]) return true;
    var a = normalizeAssume(assume);
    if (a.flour && (c === "flour" || s === "flour" || /\bflour\b/.test(s))) return true;
    if (a.sugar && (c === "sugar" || s === "sugar" || /\bsugar\b/.test(s))) return true;
    if (a.butter && (c === "butter" || s === "butter")) return true;
    return false;
  }

  var CONDIMENT = {
    mustard: 1, ketchup: 1, mayonnaise: 1, mayo: 1, relish: 1, "hot sauce": 1, honey: 1,
    vinegar: 1, "soy sauce": 1, "maple syrup": 1, salsa: 1, "barbecue sauce": 1, "bbq sauce": 1,
    "worcestershire sauce": 1, "fish sauce": 1, sriracha: 1
  };

  var GARNISH = {
    parsley: 1, cilantro: 1, chives: 1, dill: 1, basil: 1, "fresh herbs": 1, sesame: 1,
    "sesame seeds": 1, scallion: 1, "green onion": 1
  };

  function isOptionalText(item) {
    var s = String(item || "").toLowerCase();
    return /\boptional\b/.test(s) || /\bto taste\b/.test(s) || /\bif desired\b/.test(s) ||
      /\bfor garnish\b/.test(s) || /\bfor serving\b/.test(s);
  }

  function isCondiment(item) {
    var c = canon(item);
    return !!(CONDIMENT[c] || CONDIMENT[stapleKey(item)]);
  }

  function isGarnish(item) {
    var c = canon(item);
    var s = stapleKey(item);
    if (GARNISH[c] || GARNISH[s]) return true;
    if (/\bfor garnish\b/.test(s)) return true;
    return false;
  }

  function roleOf(item) {
    var c = canon(item);
    var s = stapleKey(item);
    if (/ground beef|ground turkey|ground pork|beef|chicken|turkey|pork|salmon|fish|shrimp|prawn|egg|tofu|sausage|bacon|ham|steak|ribs|chop|beans|chickpea|lentil/.test(c) ||
      /ground beef|ground turkey|chicken breast|pork chop|salmon/.test(s)) return "protein";
    if (isCheeseName(item)) return "dairy";
    if (/bun|bread|pasta|rice|potato|tortilla|wrap|noodle|quinoa|couscous|macaroni|spaghetti|penne|bagel|roll/.test(c) ||
      /hamburger bun|burger bun/.test(s)) return "starch";
    if (/onion|broccoli|carrot|celery|bell pepper|lettuce|tomato|mushroom|zucchini|spinach|cabbage|corn|cauliflower|pepper(?!corn)/.test(c) ||
      /\bonion\b/.test(s) && s.indexOf("green onion") === -1 && s.indexOf("scallion") === -1) return "veg";
    if (/garlic|ginger|shallot/.test(c)) return "aromatic";
    return "other";
  }

  function ingredientMatched(item, have) {
    if (isAssumedStaple(item, {})) return true;
    var n = NORM();
    if (isCheeseName(item)) return haveAnyCheese(have);
    if (n) return n.pantryMatchesIngredient(item, have);
    var c = canon(item);
    return !!(have[c] || have[stapleKey(item)]);
  }

  function pantryLabelForIngredient(ingredientItem, pantry) {
    var n = NORM();
    var best = "";
    (pantry || []).forEach(function (entry) {
      var name = typeof entry === "string" ? entry : entry.item;
      if (!name) return;
      if (n && n.samePantryItem && n.samePantryItem(name, ingredientItem)) {
        best = name;
        return;
      }
      if (stapleKey(name) === stapleKey(ingredientItem) || canon(name) === canon(ingredientItem)) best = name;
    });
    return best;
  }

  function recipeUsesPantryItem(recipe, pantryItem, pantry, assume) {
    if (!recipe || !pantryItem) return false;
    var have = haveSet(pantry);
    var n = NORM();
    var target = typeof pantryItem === "string" ? pantryItem : pantryItem.item;
    if (!target) return false;
    var keys = n ? n.keysForPantryItem(target) : { [stapleKey(target)]: 1 };
    var ingHit = false;
    (recipe.ingredients || []).forEach(function (ing) {
      if (!ing.item || isAssumedStaple(ing.item, assume)) return;
      if (isOptionalText(ing.item) || isGarnish(ing.item) || isCondiment(ing.item)) return;
      if (!ingredientMatched(ing.item, have)) return;
      var label = pantryLabelForIngredient(ing.item, pantry) || ing.item;
      var lk = stapleKey(label);
      if (keys[lk] || keys[canon(label)]) ingHit = true;
      if (n && n.samePantryItem && n.samePantryItem(label, target)) ingHit = true;
    });
    return ingHit;
  }

  var recipeMetaCache = {};

  function recipeMeta(recipe) {
    var id = recipe && recipe.id;
    if (id && recipeMetaCache[id]) return recipeMetaCache[id];
    var mains = { protein: 0, starch: 0, veg: 0, dairy: 0 };
    var lines = [];
    (recipe.ingredients || []).forEach(function (ing) {
      var item = ing.item;
      if (!item) return;
      var role = roleOf(item);
      var optional = isOptionalText(item) || isGarnish(item);
      var condiment = isCondiment(item);
      if (role === "protein" || role === "starch" || role === "veg" || role === "dairy") mains[role] += 1;
      lines.push({ item: item, role: role, optional: optional, condiment: condiment });
    });
    var meta = { lines: lines, mains: mains };
    if (id) recipeMetaCache[id] = meta;
    return meta;
  }

  function fitRecipe(recipe, pantry, assume) {
    var have = haveSet(pantry);
    var a = normalizeAssume(assume);
    var meta = recipeMeta(recipe);
    var missingItems = [];
    var blockingMissing = 0;
    var pantryHits = 0;
    var usedPantry = [];
    var usedSeen = {};
    var mainsNeed = { protein: 0, starch: 0, veg: 0, dairy: 0 };
    var mainsHave = { protein: 0, starch: 0, veg: 0, dairy: 0 };

    meta.lines.forEach(function (row) {
      var item = row.item;
      if (isAssumedStaple(item, a)) return;
      if (row.optional) return;
      if (row.condiment) return;
      if (row.role === "aromatic") return;

      var hit = ingredientMatched(item, have);
      if (hit) {
        pantryHits += 1;
        var label = pantryLabelForIngredient(item, pantry) || item;
        var uk = stapleKey(label);
        if (!usedSeen[uk]) {
          usedSeen[uk] = 1;
          usedPantry.push(label);
        }
      } else {
        missingItems.push(item);
        blockingMissing += 1;
      }

      var role = row.role;
      if (role === "protein" || role === "starch" || role === "veg" || role === "dairy") {
        mainsNeed[role] += 1;
        if (hit) mainsHave[role] += 1;
      }
    });

    var mainsOk = true;
    ["protein", "starch", "veg", "dairy"].forEach(function (role) {
      if (mainsNeed[role] > 0 && mainsHave[role] < mainsNeed[role]) mainsOk = false;
    });

    var pantryUses = 0;
    (recipe.ingredients || []).forEach(function (ing) {
      if (!ing.item || isAssumedStaple(ing.item, a)) return;
      if (ingredientMatched(ing.item, have)) pantryUses += 1;
    });

    var ready = blockingMissing === 0 && mainsOk;
    var tier;
    var badge;
    if (ready) {
      tier = "ready";
      badge = "Ready to cook";
    } else if (blockingMissing === 1) {
      tier = "miss1";
      badge = "Missing 1";
    } else if (blockingMissing >= 2 && blockingMissing <= 3) {
      tier = "miss23";
      badge = "Missing " + blockingMissing;
    } else {
      tier = "more";
      badge = "Missing " + blockingMissing;
    }

    return {
      kind: "library",
      id: recipe.id,
      name: recipe.name,
      minutes: recipe.minutes,
      matched: pantryUses,
      missing: blockingMissing,
      missingItems: missingItems,
      usedPantry: usedPantry,
      total: pantryHits + blockingMissing,
      ready: ready,
      tier: tier,
      badge: badge,
      mainsOk: mainsOk
    };
  }

  function classicBoostFor(recipe, boostFn) {
    if (typeof boostFn === "function") return boostFn(recipe) || 0;
    return 0;
  }

  function compareRows(a, b) {
    return a.missing - b.missing ||
      b.matched - a.matched ||
      (b.classicBoost || 0) - (a.classicBoost || 0) ||
      String(a.name).localeCompare(String(b.name));
  }

  function suggestFromPantry(recipes, pantry, assume, boostFn) {
    var have = haveSet(pantry);
    if (!Object.keys(have).length) return [];

    var out = [];
    (recipes || []).forEach(function (recipe) {
      var fit = fitRecipe(recipe, pantry, assume);
      if (fit.matched < 1) return;
      if (fit.missing > 3) return; // groups: Ready / Missing 1 / Missing 2-3
      if (fit.matched < 2 && !fit.ready) return;
      fit.classicBoost = classicBoostFor(recipe, boostFn);
      out.push(fit);
    });

    out.sort(compareRows);
    return out;
  }

  function applySpotlight(rows, pantryItem, pantry, assume, recipeById) {
    if (!pantryItem || !rows.length) return rows;
    var spotlight = [];
    var rest = [];
    rows.forEach(function (row) {
      if (row.kind === "smart-chef") {
        rest.push(row);
        return;
      }
      var recipe = recipeById ? recipeById(row.id) : null;
      if (recipe && recipeUsesPantryItem(recipe, pantryItem, pantry, assume)) {
        row.spotlight = true;
        row.spotlightLabel = pantryItem;
        spotlight.push(row);
      } else {
        rest.push(row);
      }
    });
    // Spotlight rows lead within their own group, so group headers never repeat.
    var tierRank = function (r) { return r.missing === 0 ? 0 : (r.missing === 1 ? 1 : 2); };
    return spotlight.concat(rest).sort(function (a, b) {
      return tierRank(a) - tierRank(b) || (b.spotlight ? 1 : 0) - (a.spotlight ? 1 : 0) || compareRows(a, b);
    });
  }

  function rowFromSmartChefResult(result, pantry, assume) {
    if (!result || result.error || !result.recipe) return null;
    var fit = fitRecipe(result.recipe, pantry, assume);
    fit.kind = "smart-chef";
    fit.id = "sc_suggest_" + result.fingerprint;
    fit.name = result.recipe.name;
    fit.minutes = result.recipe.minutes;
    fit.smartChefFp = result.fingerprint;
    fit.smartChefResult = result;
    fit.badge = fit.ready ? "Ready to cook" : fit.badge;
    return fit;
  }

  window.PW_PANTRY_MATCH = {
    defaultAssumeStaples: defaultAssumeStaples,
    normalizeAssume: normalizeAssume,
    fitRecipe: fitRecipe,
    suggestFromPantry: suggestFromPantry,
    applySpotlight: applySpotlight,
    rowFromSmartChefResult: rowFromSmartChefResult,
    recipeUsesPantryItem: recipeUsesPantryItem,
    ingredientMatched: ingredientMatched,
    haveSet: haveSet,
    compareRows: compareRows
  };
})();
