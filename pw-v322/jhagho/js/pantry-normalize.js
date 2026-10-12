/* Pantry Week — Canadian grocery synonyms for pantry ↔ recipe matching (offline). */
"use strict";

(function () {
  function stapleKey(item) {
    if (window.PW && window.PW.stapleKey) return window.PW.stapleKey(item);
    var parts = String(item || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().split(" ");
    if (!parts.length) return "";
    var last = parts[parts.length - 1];
    if (last.endsWith("ies") && last.length > 4) parts[parts.length - 1] = last.slice(0, -3) + "y";
    else if (last.endsWith("s") && !last.endsWith("ss") && last.length > 3) parts[parts.length - 1] = last.slice(0, -1);
    return parts.join(" ");
  }

  /** Canonical grocery name → aliases (Canadian supermarkets). */
  var SYNONYM_GROUPS = [
    ["ground beef", "hamburger", "hamburger meat", "lean ground beef", "extra lean ground beef", "medium ground beef", "ground chuck", "minced beef"],
    ["onion", "white onion", "yellow onion", "cooking onion", "spanish onion", "sweet onion", "vidalia onion"],
    ["red onion", "purple onion"],
    ["green onion", "scallion", "scallions", "spring onion"],
    ["tortilla", "tortillas", "flour tortilla", "corn tortilla", "soft tortilla", "whole wheat tortilla"],
    ["wrap", "wraps", "tortilla wrap", "flour wrap"],
    ["pork ribs", "ribs", "back ribs", "side ribs", "spare ribs", "baby back ribs", "pork side ribs"],
    ["pork chop", "pork chops", "boneless pork chop", "bone in pork chop", "centre cut pork chop"],
    ["mustard", "dijon mustard", "yellow mustard", "prepared mustard", "honey mustard"],
    ["garlic", "garlic clove", "garlic bulb", "fresh garlic"],
    ["bell pepper", "sweet pepper", "red bell pepper", "green bell pepper"],
    ["chicken breast", "chicken breasts", "boneless chicken breast", "skinless chicken breast"],
    ["chicken thigh", "chicken thighs", "boneless chicken thigh"],
    ["chicken", "whole chicken", "chicken pieces"],
    ["ground pork", "pork lean ground"],
    ["pork", "pork loin", "pork roast"],
    ["bacon", "streaky bacon", "side bacon"],
    ["egg", "eggs", "large egg", "large eggs"],
    ["cheddar", "cheddar cheese", "old cheddar", "medium cheddar"],
    ["bread", "sandwich bread", "white bread", "whole wheat bread"],
    ["hamburger bun", "burger bun", "burger buns", "hamburger buns", "buns"],
    ["cheese", "cheddar cheese", "mozzarella", "mozzarella cheese", "swiss cheese", "monterey jack", "parmesan", "feta", "gouda"],
    ["rice", "white rice", "long grain rice", "jasmine rice", "basmati rice"],
    ["brown rice", "whole grain rice"],
    ["pasta", "spaghetti", "penne", "rotini", "macaroni"],
    ["potato", "potatoes", "russet potato", "yukon gold potato"],
    ["sweet potato", "sweet potatoes", "yam"],
    ["broth", "chicken broth", "chicken stock", "stock"],
    ["peanut butter", "smooth peanut butter", "crunchy peanut butter"],
    ["soy sauce", "soya sauce"],
    ["salsa", "jarred salsa", "tomato salsa"],
    ["tomato", "tomatoes", "roma tomato", "vine tomato"],
    ["crushed tomato", "crushed tomatoes", "canned tomato", "canned tomatoes"],
    ["lettuce", "romaine", "romaine lettuce", "iceberg lettuce"],
    ["mushroom", "mushrooms", "button mushroom", "cremini mushroom"],
    ["zucchini", "courgette"],
    ["ground turkey", "turkey ground", "lean ground turkey"],
    ["sausage", "italian sausage", "mild italian sausage", "hot italian sausage"],
    ["steak", "beef steak", "sirloin steak", "strip loin steak"],
    ["beef", "stewing beef", "beef stew meat", "cubed beef"],
    ["shrimp", "prawns", "large shrimp"],
    ["salmon", "salmon fillet", "atlantic salmon"],
    ["tofu", "firm tofu", "extra firm tofu"],
    ["beans", "black beans", "kidney beans", "roman beans"],
    ["chickpea", "chickpeas", "garbanzo beans"],
    ["lime", "limes"],
    ["lemon", "lemons"],
    ["ginger", "fresh ginger", "ginger root"],
    ["cilantro", "fresh cilantro", "coriander leaf"],
    ["parsley", "fresh parsley"],
    ["butter", "unsalted butter", "salted butter"],
    ["milk", "homogenized milk", "2 percent milk", "skim milk"],
    ["cream", "heavy cream", "whipping cream", "35 percent cream"],
    ["oil", "vegetable oil", "canola oil"],
    ["olive oil", "extra virgin olive oil"]
  ];

  var CANON_BY_KEY = {};
  SYNONYM_GROUPS.forEach(function (group) {
    var canon = stapleKey(group[0]);
    group.forEach(function (alias) {
      CANON_BY_KEY[stapleKey(alias)] = canon;
    });
    CANON_BY_KEY[canon] = canon;
  });

  function canonPantryKey(item) {
    var k = stapleKey(item);
    if (!k) return "";
    if (CANON_BY_KEY[k]) return CANON_BY_KEY[k];
    var parts = k.split(" ");
    for (var i = 0; i < parts.length; i++) {
      var sub = parts.slice(i).join(" ");
      if (CANON_BY_KEY[sub]) return CANON_BY_KEY[sub];
    }
    /* No loose substring matching: it made honey match honey mustard, flour match flour tortilla, etc. */
    return k;
  }

  function keysForPantryItem(name) {
    var keys = {};
    var raw = stapleKey(name);
    var canon = canonPantryKey(name);
    if (raw) keys[raw] = 1;
    if (canon) keys[canon] = 1;
    return keys;
  }

  var haveSetCache = { key: "", value: null };
  var keysCache = {};

  function pantryListKey(pantry) {
    return (pantry || []).map(function (entry) {
      return typeof entry === "string" ? entry : (entry && entry.item) || "";
    }).join("\u0001");
  }

  function pantryHaveSet(pantry) {
    var key = pantryListKey(pantry);
    if (haveSetCache.key === key && haveSetCache.value) return haveSetCache.value;
    var have = {};
    (pantry || []).forEach(function (entry) {
      var name = typeof entry === "string" ? entry : entry.item;
      var all = keysForPantryItem(name);
      Object.keys(all).forEach(function (k) {
        have[k] = 1;
      });
    });
    haveSetCache = { key: key, value: have };
    return have;
  }

  function keysForPantryItemCached(name) {
    var k = stapleKey(name);
    if (!k) return {};
    if (keysCache[k]) return keysCache[k];
    var all = keysForPantryItem(name);
    keysCache[k] = all;
    return all;
  }

  function isCheeseKey(k) {
    return k && (k === "cheese" || k === "cheddar" || k === "mozzarella" || k.indexOf("cheese") !== -1);
  }

  function haveAnyCheese(have) {
    var keys = Object.keys(have || {});
    for (var i = 0; i < keys.length; i++) {
      if (isCheeseKey(keys[i])) return true;
    }
    return false;
  }

  function ingredientLookupKeys(ingredientItem) {
    var keys = {};
    var raw = stapleKey(ingredientItem);
    if (raw) keys[raw] = 1;
    var canon = canonPantryKey(ingredientItem);
    if (canon) keys[canon] = 1;
    var base = String(ingredientItem || "").toLowerCase().replace(/,.*$/, "").trim();
    base = base.replace(/^(medium|large|small)\s+/, "").replace(/\s+(minced|diced|sliced|chopped|grated)$/, "").trim();
    if (base) {
      keys[stapleKey(base)] = 1;
      keys[canonPantryKey(base)] = 1;
    }
    return keys;
  }

  function pantryMatchesIngredient(ingredientItem, have) {
    if (!ingredientItem || !have) return false;
    var raw = stapleKey(ingredientItem);
    var canon = canonPantryKey(ingredientItem);
    if (isCheeseKey(canon) || isCheeseKey(raw) || /\bcheese\b/.test(raw)) return haveAnyCheese(have);
    var keys = ingredientLookupKeys(ingredientItem);
    var list = Object.keys(keys);
    for (var i = 0; i < list.length; i++) {
      if (have[list[i]]) return true;
    }
    return false;
  }

  function samePantryItem(a, b) {
    return canonPantryKey(a) === canonPantryKey(b) && canonPantryKey(a) !== "";
  }

  window.PW_PANTRY_NORM = {
    stapleKey: stapleKey,
    canonPantryKey: canonPantryKey,
    keysForPantryItem: keysForPantryItemCached,
    invalidatePantryCaches: function () {
      haveSetCache = { key: "", value: null };
      keysCache = {};
    },
    pantryHaveSet: pantryHaveSet,
    pantryMatchesIngredient: pantryMatchesIngredient,
    samePantryItem: samePantryItem,
    SYNONYM_GROUPS: SYNONYM_GROUPS
  };
})();
