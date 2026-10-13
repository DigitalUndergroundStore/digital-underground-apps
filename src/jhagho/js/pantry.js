/* Pantry Week v3.12.0 — data, shopping list, migration. No network. */
"use strict";

(function () {
  var STARTERS = (typeof PW_STARTERS !== "undefined" && PW_STARTERS) ? PW_STARTERS : [];
  var V1_ORIGINALS = (typeof PW_V1_ORIGINALS !== "undefined" && PW_V1_ORIGINALS) ? PW_V1_ORIGINALS : [];

  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var SLOTS = ["breakfast", "lunch", "dinner"];
  var DAY_LABEL = {
    Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
    Fri: "Friday", Sat: "Saturday", Sun: "Sunday"
  };
  var SLOT_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
  var AISLE_ORDER = ["produce", "dairy", "meat", "pantry", "frozen", "other"];
  var AISLE_LABEL = {
    produce: "Produce", dairy: "Dairy", meat: "Meat & seafood",
    pantry: "Pantry", frozen: "Frozen", other: "Other"
  };
  var KEY = "pantry_week_v2";
  var KEY_V1 = "pantry_week_v1";

  var UNIT_MAP = {
    cup: "cup", cups: "cup",
    tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbs: "tbsp",
    teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp",
    ounce: "oz", ounces: "oz", oz: "oz",
    pound: "lb", pounds: "lb", lb: "lb", lbs: "lb",
    gram: "g", grams: "g", g: "g",
    kilogram: "kg", kilograms: "kg", kg: "kg",
    milliliter: "ml", milliliters: "ml", ml: "ml",
    liter: "l", liters: "l", litre: "l", litres: "l", l: "l",
    clove: "clove", cloves: "clove",
    can: "can", cans: "can",
    head: "head", heads: "head",
    slice: "slice", slices: "slice",
    piece: "piece", pieces: "piece",
    bunch: "bunch", bunches: "bunch",
    fillet: "fillet", fillets: "fillet",
    pinch: "pinch", pinches: "pinch",
    sprig: "sprig", sprigs: "sprig",
    stalk: "stalk", stalks: "stalk",
    ear: "ear", ears: "ear",
    package: "package", packages: "package", pkg: "package",
    bag: "bag", bags: "bag",
    jar: "jar", jars: "jar"
  };

  var UNIT_PLURAL = {
    cup: "cups", tbsp: "tbsp", tsp: "tsp", oz: "oz", lb: "lb", g: "g", kg: "kg",
    ml: "ml", l: "l", clove: "cloves", can: "cans", head: "heads", slice: "slices",
    piece: "pieces", bunch: "bunches", fillet: "fillets", pinch: "pinches",
    sprig: "sprigs", stalk: "stalks", ear: "ears", package: "packages", bag: "bags", jar: "jars"
  };

  var UNCOUNTABLE = { asparagus: 1, couscous: 1, hummus: 1, molasses: 1, oats: 1, series: 1, species: 1 };
  var FILLER = { dry: 1, fresh: 1, optional: 1, chopped: 1, minced: 1, diced: 1, rinsed: 1, drained: 1 };
  var QTY_RE = "(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+\\.\\d+|\\d+)";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function base(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function singularWord(word) {
    if (!word || UNCOUNTABLE[word]) return word;
    if (word.length <= 3) return word;
    if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
    if (/(ches|shes|sses|xes|zes|oes)$/.test(word)) return word.slice(0, -2);
    if (word.endsWith("us") || word.endsWith("is") || word.endsWith("ss")) return word;
    if (word.endsWith("s")) return word.slice(0, -1);
    return word;
  }

  function singularKey(item) {
    var parts = base(item).split(" ").filter(Boolean);
    if (!parts.length) return "";
    parts[parts.length - 1] = singularWord(parts[parts.length - 1]);
    return parts.join(" ");
  }

  function sameItem(a, b) {
    return singularKey(a) === singularKey(b) && singularKey(a) !== "";
  }

  function pluralWord(word) {
    if (!word || UNCOUNTABLE[word] || /s$/.test(word)) return word;
    if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + "ies";
    if (/(ch|sh|x|z|o)$/.test(word)) return word + "es";
    return word + "s";
  }

  function pluralizeItem(item, qty) {
    var text = String(item || "").trim();
    if (!(qty > 1)) return text;
    var parts = text.split(" ");
    parts[parts.length - 1] = pluralWord(parts[parts.length - 1]);
    return parts.join(" ");
  }

  function canonUnit(unit) {
    var key = String(unit || "").toLowerCase().trim();
    if (!key) return "";
    return Object.prototype.hasOwnProperty.call(UNIT_MAP, key) ? UNIT_MAP[key] : key;
  }

  function isUnit(word) {
    return Object.prototype.hasOwnProperty.call(UNIT_MAP, String(word || "").toLowerCase());
  }

  function parseQty(text) {
    var t = String(text || "").trim();
    if (!t) return null;
    var mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return (+mixed[1]) + ((+mixed[2]) / (+mixed[3]));
    var frac = t.match(/^(\d+)\/(\d+)$/);
    if (frac) return (+frac[1]) / (+frac[2]);
    var n = parseFloat(t);
    return isFinite(n) ? n : null;
  }

  function cleanItem(text) {
    return String(text || "").replace(/\s+/g, " ").replace(/^[,.\s]+|[,.\s]+$/g, "").trim();
  }

  function tidyItem(item, unit) {
    var name = cleanItem(item);
    var u = canonUnit(unit || "");
    if (u === "can") name = name.replace(/^canned\s+/i, "");
    if (u === "fillet") name = name.replace(/\s+fillets?$/i, "");
    return cleanItem(name);
  }

  function stapleKey(item) {
    var key = singularKey(item);
    key = key.replace(/^canned /, "");
    key = key.replace(/ fillet$/, "");
    return key;
  }

  function parseIngredientLine(line) {
    var s = String(line || "");
    s = s.replace(/[½¼¾⅓⅔⅛]/g, function (ch) {
      return { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8" }[ch];
    });
    s = s.replace(/\s*\(optional\)\s*/ig, " ").replace(/\boptional\b/ig, " ");
    s = s.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
    s = s.replace(/\s+/g, " ").trim();
    if (!s) return null;

    var lead = s.match(new RegExp("^" + QTY_RE + "\\s+(.+)$"));
    if (lead) {
      var qty = parseQty(lead[1]);
      var rest = lead[2];
      var um = rest.match(/^([A-Za-z]+)\s+(.+)$/);
      if (um && isUnit(um[1])) {
        return { qty: qty, unit: canonUnit(um[1]), item: cleanItem(um[2]) };
      }
      return { qty: qty, unit: "", item: cleanItem(rest) };
    }

    var trailExtra = s.match(new RegExp("^(.*)\\s+" + QTY_RE + "\\s+([A-Za-z]+)\\s+([A-Za-z]+)$"));
    if (trailExtra && isUnit(trailExtra[3]) && FILLER[trailExtra[4].toLowerCase()]) {
      return { qty: parseQty(trailExtra[2]), unit: canonUnit(trailExtra[3]), item: cleanItem(trailExtra[1]) };
    }

    var trail = s.match(new RegExp("^(.*)\\s+" + QTY_RE + "\\s+([A-Za-z]+)$"));
    if (trail && isUnit(trail[3]) && cleanItem(trail[1])) {
      return { qty: parseQty(trail[2]), unit: canonUnit(trail[3]), item: cleanItem(trail[1]) };
    }

    var trailQty = s.match(new RegExp("^(.*)\\s+" + QTY_RE + "$"));
    if (trailQty && cleanItem(trailQty[1])) {
      return { qty: parseQty(trailQty[2]), unit: "", item: cleanItem(trailQty[1]) };
    }

    return { qty: null, unit: "", item: cleanItem(s) };
  }

  function formatQty(n) {
    if (n == null || !isFinite(n) || n <= 0) return "";
    var fracs = [[0, ""], [0.125, "1/8"], [0.25, "1/4"], [1 / 3, "1/3"], [0.375, "3/8"], [0.5, "1/2"], [2 / 3, "2/3"], [0.75, "3/4"], [0.875, "7/8"]];
    var whole = Math.floor(n + 1e-9);
    var frac = n - whole;
    if (frac < 0.02) return String(whole || roundLoose(n));
    if (1 - frac < 0.02) return String(whole + 1);
    var best = "";
    var bestD = 1;
    for (var i = 0; i < fracs.length; i++) {
      var d = Math.abs(frac - fracs[i][0]);
      if (d < bestD) { bestD = d; best = fracs[i][1]; }
    }
    if (bestD <= 0.03) {
      if (!best) return String(whole);
      return whole ? (whole + " " + best) : best;
    }
    return String(roundLoose(n));
  }

  function roundLoose(n) {
    var rounded = Math.round(n * 100) / 100;
    return rounded;
  }

  function displayUnit(unit, qty) {
    if (!unit) return "";
    if (qty > 1 && UNIT_PLURAL[unit]) return UNIT_PLURAL[unit];
    return unit;
  }

  function metricNote(qty, unit) {
    if (qty == null || !isFinite(qty)) return "";
    var u = canonUnit(unit || "");
    if (u === "lb") return Math.round(qty * 454) + " g";
    if (u === "oz") return Math.round(qty * 28.35) + " g";
    return "";
  }

  function formatLine(qty, unit, item) {
    var q = formatQty(qty);
    var u = displayUnit(unit, qty);
    var name = String(item || "");
    if (!unit) name = pluralizeItem(name, qty);
    var line = [q, u, name].filter(Boolean).join(" ");
    var note = metricNote(qty, unit);
    if (note) line = line + " (" + note + ")";
    return line ? line.charAt(0).toUpperCase() + line.slice(1) : "";
  }

  function mergeKey(item, unit) {
    return singularKey(item) + "|" + canonUnit(unit);
  }

  function aisleOf(item, unit) {
    var s = base(item);
    var u = canonUnit(unit || "");
    if (!s) return "other";
    if (/frozen|ice cream/.test(s)) return "frozen";
    if (u === "can") return "pantry";
    if (/green bean|snap pea|snow pea|bell pepper|cherry tomato|sweet potato|fresh corn/.test(s)) return "produce";
    if (/^water$/.test(s)) return "pantry";
    if (/broth|stock|canned|paste|powder|seasoning|dried|soy sauce|tamari|miso|pesto|marinara|salsa|honey|hummus|granola|baking|mustard|mayonnaise|\bmayo\b|tortilla|\bbread\b|muffin|pita|noodle|\bpasta\b|penne|gnocchi|orzo|soba|spaghetti|quinoa|couscous|rolled oat|\boats\b|\bflour\b|sugar|peanut|tahini|chia|\boil\b|vinegar|spice|cumin|coriander|paprika|oregano|thyme|chili|taco|\bsalt\b|pepper flake|red pepper|black pepper|\bpepper\b|\bbeans?\b|chickpea|lentil|\brice\b|sesame|cornstarch|vanilla|balsamic|gochujang|harissa|curry|tikka|chipotle|kimchi|maple syrup|vinegar|mirin|fish sauce|artichoke|falafel|pierogi|pizza dough|tortilla chips|granola|cocoa|dates|almonds|cardamom|cinnamon|baking powder|brown sugar|shredded coconut|cocoa nibs|dark chocolate|pistachio/.test(s)) {
      return "pantry";
    }
    if (/lemon|lime|garlic|onion|broccoli|spinach|tomato|cucumber|avocado|lettuce|basil|cilantro|parsley|carrot|celery|mushroom|zucchini|kale|potato|banana|berr|cabbage|ginger|apple|salad|dill|scallion|chive|herb|greens|corn\b|beet|eggplant|fennel|pear|grape|mango|bok choy|lemongrass|Thai basil|Thai chili|brussels sprout|cauliflower|artichoke|pepper\b|yellow onion|mixed greens|green bean|roasted red pepper/.test(s)) {
      return "produce";
    }
    if (/\b(chicken|turkey|beef|pork|bacon|sausage|salmon|cod|shrimp|tuna|fish|steak|lamb|mussels|sirloin|roast beef|ground beef|ground pork|ground lamb|pork chops|chicken breast|chicken thighs|Italian sausage|sushi-grade tuna)\b/.test(s)) return "meat";
    if (/\b(milk|yogurt|cheese|cheddar|mozzarella|parmesan|feta|butter|cream|eggs?|tofu|ricotta|paneer|goat cheese|fresh mozzarella|heavy cream)\b/.test(s)) return "dairy";
    if (/frozen pierogi|frozen banana|frozen mango|ice cream/.test(s)) return "frozen";
    return "other";
  }

  function parseMinutes(text) {
    if (text == null || text === "") return null;
    if (typeof text === "number" && isFinite(text)) return Math.round(text);
    var s = String(text).toLowerCase();
    var min = 0;
    var found = false;
    var h = s.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)\b/);
    var m = s.match(/(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min)\b/);
    if (h) { min += parseFloat(h[1]) * 60; found = true; }
    if (m) { min += parseFloat(m[1]); found = true; }
    if (!found) {
      var n = s.match(/(\d+)/);
      return n ? parseInt(n[1], 10) : null;
    }
    return Math.round(min);
  }

  function parseTagList(tags) {
    var list = Array.isArray(tags) ? tags : String(tags || "").split(",");
    var out = [];
    var seen = {};
    list.forEach(function (tag) {
      var t = String(tag || "").trim().toLowerCase();
      if (!t || seen[t]) return;
      seen[t] = 1;
      out.push(t);
    });
    return out;
  }

  function splitSteps(steps) {
    if (Array.isArray(steps)) {
      return steps.map(function (s) { return String(s || "").trim(); }).filter(Boolean);
    }
    var text = String(steps || "").trim();
    if (!text) return [];
    if (text.indexOf("\n") !== -1) {
      return text.split(/\n+/).map(function (s) { return s.replace(/^\d+[.)]\s+/, "").trim(); }).filter(Boolean);
    }
    var parts = text.split(/(?<=[.!])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    return parts.length ? parts : [text];
  }

  function blankSlot() {
    return { recipeId: "", custom: "", servings: 4, leftover: false };
  }

  function blankWeek() {
    var week = {};
    DAYS.forEach(function (day) {
      week[day] = {};
      SLOTS.forEach(function (slot) { week[day][slot] = blankSlot(); });
    });
    return week;
  }

  function normalizeIngredient(raw) {
    if (raw == null) return null;
    if (typeof raw === "string") {
      var parsed = parseIngredientLine(raw);
      if (!parsed || !parsed.item) return null;
      parsed.item = tidyItem(parsed.item, parsed.unit);
      return parsed.item ? parsed : null;
    }
    var item = tidyItem(raw.item || raw.name || "", raw.unit || "");
    if (!item) return null;
    var qty = raw.qty == null || raw.qty === "" ? null : parseQty(raw.qty);
    if (raw.qty != null && raw.qty !== "" && qty == null && typeof raw.qty === "number") qty = raw.qty;
    return { qty: qty, unit: canonUnit(raw.unit || ""), item: item };
  }

  function normalizeRecipe(raw) {
    var ingredients = [];
    (raw.ingredients || []).forEach(function (line) {
      var ing = normalizeIngredient(line);
      if (ing && ing.item) ingredients.push(ing);
    });
    var minutes = parseMinutes(raw.minutes != null ? raw.minutes : raw.time);
    var tags = parseTagList(raw.tags);
    if (typeof minutes === "number" && minutes > 20) {
      tags = tags.filter(function (t) { return t !== "quick" && t !== "fast"; });
    } else {
      if (tags.indexOf("fast") !== -1 && tags.indexOf("quick") === -1) tags.push("quick");
      if (typeof minutes === "number" && minutes <= 20 && tags.indexOf("quick") === -1) tags.push("quick");
    }
    var servings = parseInt(raw.servings, 10);
    if (!servings || servings < 1) servings = 4;
    if (servings > 24) servings = 24;
    var name = String(raw.name || "Untitled recipe").trim() || "Untitled recipe";
    if (window.PW_MEAL && typeof window.PW_MEAL.scrubMealTags === "function") {
      tags = window.PW_MEAL.scrubMealTags(tags, { name: name, tags: tags, minutes: minutes, ingredients: ingredients });
    }
    var out = {
      id: String(raw.id || uid("c_")),
      name: name,
      minutes: minutes,
      servings: servings,
      tags: tags,
      ingredients: ingredients,
      steps: splitSteps(raw.steps)
    };
    if (raw.photoKey) out.photoKey = String(raw.photoKey);
    if (raw.photoUrl && /^https?:\/\//i.test(String(raw.photoUrl))) out.photoUrl = String(raw.photoUrl).trim();
    if (raw.sourceUrl && /^https?:\/\//i.test(String(raw.sourceUrl))) out.sourceUrl = String(raw.sourceUrl).trim();
    if (raw.sourceName) out.sourceName = String(raw.sourceName).trim().slice(0, 80);
    if (raw.sourceLicense) out.sourceLicense = String(raw.sourceLicense).trim().slice(0, 40);
    return out;
  }

  function normalizeSlot(raw, recipes) {
    var slot = blankSlot();
    if (raw == null || raw === "") return slot;
    if (typeof raw === "string") {
      var name = raw.trim();
      if (!name) return slot;
      var rec = (recipes || []).find(function (r) { return r.name.toLowerCase() === name.toLowerCase(); });
      if (rec) {
        slot.recipeId = rec.id;
        slot.servings = rec.servings || 4;
      } else {
        slot.custom = name;
      }
      return slot;
    }
    slot.recipeId = raw.recipeId ? String(raw.recipeId) : "";
    slot.custom = raw.custom ? String(raw.custom) : "";
    var servings = parseInt(raw.servings, 10);
    slot.servings = servings >= 1 && servings <= 24 ? servings : 4;
    slot.leftover = !!raw.leftover;
    if (slot.recipeId) slot.custom = "";
    return slot;
  }

  function normalizeWeek(week, recipes) {
    var out = blankWeek();
    var src = week && typeof week === "object" ? week : {};
    DAYS.forEach(function (day) {
      var from = src[day] && typeof src[day] === "object" ? src[day] : {};
      SLOTS.forEach(function (slot) {
        out[day][slot] = normalizeSlot(from[slot], recipes);
      });
    });
    return out;
  }

  function dedupeRecipes(list) {
    var seen = {};
    return list.map(function (recipe) {
      var id = recipe.id;
      if (seen[id]) {
        recipe = clone(recipe);
        recipe.id = uid("c_");
      }
      seen[recipe.id] = 1;
      return recipe;
    });
  }

  function normalize(state) {
    var src = state && typeof state === "object" ? state : {};
    var recipes = dedupeRecipes((src.recipes || []).map(normalizeRecipe).filter(function (r) { return r.name; }));
    var extras = [];
    (src.extras || src.customItems || []).forEach(function (extra) {
      if (extra == null || extra === "") return;
      if (typeof extra === "string") {
        var parsed = parseIngredientLine(extra);
        if (!parsed) return;
        extras.push({ id: uid("x_"), qty: parsed.qty, unit: parsed.unit, item: parsed.item });
        return;
      }
      var ing = normalizeIngredient(extra);
      if (!ing) return;
      extras.push({ id: String(extra.id || uid("x_")), qty: ing.qty, unit: ing.unit, item: ing.item });
    });
    var pantry = [];
    var seenPantry = {};
    (src.pantry || []).forEach(function (item) {
      var name = cleanItem(typeof item === "string" ? item : (item && item.item));
      if (!name) return;
      var key = stapleKey(name);
      if (!key || seenPantry[key]) return;
      seenPantry[key] = 1;
      pantry.push({ id: String((item && item.id) || uid("p_")), item: name });
    });
    var checked = {};
    if (src.checked && typeof src.checked === "object") {
      Object.keys(src.checked).forEach(function (key) {
        var value = src.checked[key];
        if (value === true) checked[key] = true;
        else if (typeof value === "number" && isFinite(value) && value > 0) checked[key] = value;
      });
    }
    var fillPrefs = src.fillPrefs && typeof src.fillPrefs === "object" ? src.fillPrefs : {};
    var scope = String(fillPrefs.scope || "dinner");
    if (scope !== "dinner" && scope !== "lunch_dinner" && scope !== "all") scope = "dinner";
    var assume = src.assumeStaples && typeof src.assumeStaples === "object" ? src.assumeStaples : {};
    return {
      version: 2,
      recipes: recipes,
      week: normalizeWeek(src.week, recipes),
      previousWeek: src.previousWeek ? normalizeWeek(src.previousWeek, recipes) : null,
      repeatWeek: src.repeatWeek ? normalizeWeek(src.repeatWeek, recipes) : null,
      checked: checked,
      extras: extras,
      pantry: pantry,
      assumeStaples: window.PW_PANTRY_MATCH
        ? PW_PANTRY_MATCH.normalizeAssume(assume)
        : { flour: !!assume.flour, sugar: !!assume.sugar, butter: !!assume.butter },
      hideChecked: !!src.hideChecked,
      tipSeen: !!src.tipSeen,
      fillPrefs: { scope: scope, replaceAll: !!fillPrefs.replaceAll },
      legacy: src.legacy && typeof src.legacy === "object" ? src.legacy : null
    };
  }

  function v1Signature(recipe) {
    return [
      recipe && recipe.name,
      JSON.stringify(recipe && recipe.ingredients || []),
      recipe && recipe.steps
    ].join("\n");
  }

  function v1Unmodified(raw) {
    if (!raw || !raw.id) return null;
    for (var i = 0; i < V1_ORIGINALS.length; i++) {
      if (V1_ORIGINALS[i].id === raw.id && v1Signature(V1_ORIGINALS[i]) === v1Signature(raw)) {
        return V1_ORIGINALS[i];
      }
    }
    return null;
  }

  function starterById(id) {
    for (var i = 0; i < STARTERS.length; i++) if (STARTERS[i].id === id) return STARTERS[i];
    return null;
  }

  function migrationItemMatch(oldItem, newItem) {
    if (sameItem(oldItem, newItem)) return true;
    var a = singularKey(oldItem);
    var b = singularKey(newItem);
    if (a === "pepper" && b === "black pepper") return true;
    if (a === "onion" && b.endsWith("onion")) return true;
    if (a === "tomato" && (b === "tomato" || b.endsWith(" tomato"))) return true;
    return false;
  }

  function migrateV1(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    var oldRecipes = Array.isArray(source.recipes) ? source.recipes : [];
    var recipes = [];
    if (!oldRecipes.length) {
      recipes = STARTERS.map(function (r) { return normalizeRecipe(clone(r)); });
    } else {
      oldRecipes.forEach(function (old) {
        if (v1Unmodified(old)) {
          var upgraded = starterById(old.id);
          recipes.push(normalizeRecipe(clone(upgraded || old)));
        } else {
          recipes.push(normalizeRecipe(old));
        }
      });
    }
    var ids = {};
    recipes.forEach(function (r) { ids[r.id] = 1; });
    STARTERS.forEach(function (starter) {
      if (!ids[starter.id]) {
        recipes.push(normalizeRecipe(clone(starter)));
        ids[starter.id] = 1;
      }
    });

    var week = blankWeek();
    var oldWeek = source.week && typeof source.week === "object" ? source.week : {};
    DAYS.forEach(function (day) {
      var from = oldWeek[day] && typeof oldWeek[day] === "object" ? oldWeek[day] : {};
      SLOTS.forEach(function (slot) {
        var value = from[slot];
        if (value && typeof value === "object") {
          week[day][slot] = normalizeSlot(value, recipes);
          return;
        }
        var name = String(value || "").trim();
        if (!name) return;
        var match = recipes.find(function (r) { return r.name === name; }) ||
          recipes.find(function (r) { return r.name.toLowerCase() === name.toLowerCase(); });
        if (match) {
          week[day][slot] = { recipeId: match.id, custom: "", servings: match.servings || 4, leftover: false };
        } else {
          week[day][slot] = { recipeId: "", custom: name, servings: 4, leftover: false };
        }
      });
    });

    var checked = {};
    var oldChecked = source.checked && typeof source.checked === "object" ? source.checked : {};
    oldRecipes.forEach(function (old) {
      var neu = recipes.find(function (r) { return r.id === old.id; });
      (old.ingredients || []).forEach(function (line) {
        var key = String(line).trim().toLowerCase();
        if (!oldChecked[key]) return;
        var parsed = parseIngredientLine(String(line));
        if (!parsed || !parsed.item) return;
        checked[mergeKey(parsed.item, parsed.unit)] = true;
        if (neu) {
          neu.ingredients.forEach(function (ing) {
            if (migrationItemMatch(parsed.item, ing.item)) checked[mergeKey(ing.item, ing.unit)] = true;
          });
        }
      });
    });

    var extras = [];
    (source.customItems || []).forEach(function (line) {
      var parsed = parseIngredientLine(String(line));
      if (!parsed || !parsed.item) return;
      var extra = { id: uid("x_"), qty: parsed.qty, unit: parsed.unit, item: parsed.item };
      extras.push(extra);
      var key = String(line).trim().toLowerCase();
      if (oldChecked[key]) checked[mergeKey(parsed.item, parsed.unit)] = true;
    });

    Object.keys(oldChecked).forEach(function (key) {
      if (!oldChecked[key]) return;
      var suffix = " (custom meal — add ingredients manually)";
      if (key.slice(-suffix.length) === suffix) {
        var name = key.slice(0, -suffix.length);
        DAYS.forEach(function (day) {
          SLOTS.forEach(function (slot) {
            if (week[day][slot].custom.toLowerCase() === name) checked["note|" + day + "|" + slot] = true;
          });
        });
      }
    });

    return normalize({
      version: 2,
      recipes: recipes,
      week: week,
      previousWeek: null,
      repeatWeek: null,
      checked: checked,
      extras: extras,
      pantry: [],
      hideChecked: false,
      tipSeen: false,
      legacy: { v1: source }
    });
  }

  function freshState() {
    return normalize({
      version: 2,
      recipes: STARTERS.map(function (r) { return clone(r); }),
      week: blankWeek(),
      previousWeek: null,
      repeatWeek: null,
      checked: {},
      extras: [],
      pantry: [],
      hideChecked: false,
      tipSeen: false,
      legacy: null
    });
  }

  function storage() {
    try {
      var probe = "__pantry_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return localStorage;
    } catch (err) {
      return null;
    }
  }

  function load() {
    var store = storage();
    var warning = "";
    var migratedFlag = false;
    var state = null;
    if (store) {
      var rawV2 = null;
      try { rawV2 = store.getItem(KEY); } catch (err) { rawV2 = null; }
      if (rawV2) {
        try {
          state = normalize(JSON.parse(rawV2));
        } catch (err) {
          try { store.setItem(KEY + "_corrupt", rawV2); } catch (e2) {}
          warning = "Saved Pantry Week data could not be read. A copy was kept in this browser. You can import a backup if you have one.";
        }
      }
      if (!state) {
        var rawV1 = null;
        try { rawV1 = store.getItem(KEY_V1); } catch (err) { rawV1 = null; }
        if (rawV1) {
          try {
            state = migrateV1(JSON.parse(rawV1));
            migratedFlag = true;
            try { store.setItem(KEY, JSON.stringify(state)); } catch (e3) {}
          } catch (err) {
            warning = warning || "Your older Pantry Week save could not be read. It was left in place.";
          }
        }
      }
    }
    if (!state) state = freshState();
    state = ensureStarterRecipes(state);
    PW.lastWarning = warning;
    PW.lastMigrated = migratedFlag;
    return state;
  }

  function ensureStarterRecipes(state) {
    if (!STARTERS.length) return state;
    var recipes = state.recipes || [];
    var ids = {};
    recipes.forEach(function (r) { ids[r.id] = 1; });
    var added = false;
    STARTERS.forEach(function (starter) {
      if (ids[starter.id]) return;
      recipes.push(normalizeRecipe(clone(starter)));
      ids[starter.id] = 1;
      added = true;
    });
    if (!added) return state;
    state.recipes = recipes;
    return normalize(state);
  }

  function save(state) {
    var store = storage();
    if (!store) {
      alert("Couldn't save: this browser is blocking storage (private mode?).");
      return false;
    }
    try {
      store.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      alert("Couldn't save: this browser is blocking storage (private mode?).");
      return false;
    }
  }

  function recipeById(state, id) {
    if (!id) return null;
    var list = state.recipes || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function slotLabel(state, slot) {
    if (!slot) return "";
    var recipe = recipeById(state, slot.recipeId);
    if (slot.recipeId && !recipe) return "Missing recipe";
    if (recipe) return recipe.name;
    return slot.custom || "";
  }

  function scaleQty(qty, factor) {
    if (qty == null || !isFinite(qty)) return null;
    var next = qty * factor;
    if (!isFinite(next) || next <= 0) return null;
    return next;
  }

  function hasCookedSource(week, recipeId) {
    if (!recipeId) return false;
    for (var d = 0; d < DAYS.length; d++) {
      for (var s = 0; s < SLOTS.length; s++) {
        var slot = week[DAYS[d]][SLOTS[s]];
        if (slot.recipeId === recipeId && !slot.leftover) return true;
      }
    }
    return false;
  }

  function firstUse(week, recipeId) {
    for (var d = 0; d < DAYS.length; d++) {
      for (var s = 0; s < SLOTS.length; s++) {
        if (week[DAYS[d]][SLOTS[s]].recipeId === recipeId) return DAYS[d] + "|" + SLOTS[s];
      }
    }
    return "";
  }

  function addQty(row, qty, source) {
    if (qty == null) {
      if (source === "extra") row.extraUnmeasured = true;
      else row.recipeUnmeasured = true;
      return;
    }
    if (source === "extra") row.extraQty += qty;
    else row.recipeQty += qty;
  }

  function ensureRow(map, item, unit) {
    var key = mergeKey(item, unit);
    if (!map[key]) {
      map[key] = {
        key: key,
        item: item,
        unit: canonUnit(unit),
        recipeQty: 0,
        extraQty: 0,
        recipeUnmeasured: false,
        extraUnmeasured: false,
        aisle: aisleOf(item, unit)
      };
    }
    return map[key];
  }

  function tickKeys(item, unit) {
    var keys = [];
    var seen = {};
    function add(it, un) {
      var key = mergeKey(it, un);
      if (!key || seen[key]) return;
      seen[key] = 1;
      keys.push(key);
    }
    var forms = [String(item || "")];
    var tidy = tidyItem(item, unit);
    if (tidy && tidy !== item) forms.push(tidy);
    var u = canonUnit(unit || "");
    if (u === "can" && !/^canned\s+/i.test(String(item || ""))) forms.push("canned " + item);
    if (u === "fillet" && !/\s+fillets?$/i.test(String(item || ""))) forms.push(String(item || "") + " fillet");
    forms.forEach(function (it) {
      add(it, unit);
      add(it, "");
    });
    return keys;
  }

  function inPantry(state, item) {
    if (window.PW_PANTRY_NORM) {
      var have = PW_PANTRY_NORM.pantryHaveSet(state.pantry || []);
      return PW_PANTRY_NORM.pantryMatchesIngredient(item, have);
    }
    var key = stapleKey(item);
    if (!key) return false;
    return (state.pantry || []).some(function (entry) { return stapleKey(entry.item) === key; });
  }

  function isRowChecked(state, row, unitForKey, qty) {
    var keys = tickKeys(row.item, unitForKey || row.unit || "");
    var legacy = false;
    var storedQty = null;
    for (var i = 0; i < keys.length; i++) {
      var value = state.checked[keys[i]];
      if (value === true) legacy = true;
      else if (typeof value === "number" && isFinite(value)) {
        if (storedQty == null || value > storedQty) storedQty = value;
      }
    }
    if (legacy) return true;
    if (storedQty == null) return false;
    if (qty == null || !isFinite(qty)) return true;
    return qty <= storedQty + 0.001;
  }

  function buildShoppingList(state) {
    var map = {};
    var notes = [];
    var excluded = [];
    var excludedSeen = {};
    DAYS.forEach(function (day) {
      SLOTS.forEach(function (slotName) {
        var slot = state.week[day][slotName];
        if (!slot) return;
        var recipe = recipeById(state, slot.recipeId);
        if (recipe) {
          var skip = false;
          if (slot.leftover && hasCookedSource(state.week, recipe.id)) skip = true;
          else if (slot.leftover && firstUse(state.week, recipe.id) !== day + "|" + slotName) skip = true;
          if (skip) return;
          var baseServings = recipe.servings || 4;
          var factor = (slot.servings || baseServings) / baseServings;
          recipe.ingredients.forEach(function (ing) {
            var row = ensureRow(map, ing.item, ing.unit);
            addQty(row, scaleQty(ing.qty, factor), "recipe");
          });
        } else if (slot.custom) {
          notes.push({
            key: "note|" + day + "|" + slotName,
            label: "Custom meal (" + DAY_LABEL[day] + " " + slotName + "): " + slot.custom,
            aisle: "other",
            checked: !!state.checked["note|" + day + "|" + slotName],
            kind: "note"
          });
        }
      });
    });

    (state.extras || []).forEach(function (extra) {
      var row = ensureRow(map, extra.item, extra.unit);
      addQty(row, extra.qty, "extra");
    });

    var items = [];
    Object.keys(map).forEach(function (key) {
      var row = map[key];
      var pantryHit = inPantry(state, row.item);
      var recipeQty = pantryHit ? 0 : row.recipeQty;
      var recipeUnmeasured = pantryHit ? false : row.recipeUnmeasured;
      var fullyStocked = pantryHit && !(row.extraQty > 0) && !row.extraUnmeasured && (row.recipeQty > 0 || row.recipeUnmeasured);
      if (fullyStocked && !excludedSeen[singularKey(row.item)]) {
        excludedSeen[singularKey(row.item)] = 1;
        excluded.push(row.item);
      }
      var showQty = recipeQty + row.extraQty;
      var showUnmeasured = (recipeUnmeasured || row.extraUnmeasured) && !(showQty > 0);
      if (!(showQty > 0) && !showUnmeasured && !recipeUnmeasured && !row.extraUnmeasured) return;
      if (!(showQty > 0) && !recipeUnmeasured && !row.extraUnmeasured) return;
      var displayQty = showQty > 0 ? showQty : null;
      var hasRecipe = recipeQty > 0 || recipeUnmeasured;
      var hasExtra = row.extraQty > 0 || row.extraUnmeasured;
      items.push({
        key: row.key,
        item: row.item,
        unit: row.unit,
        qty: displayQty,
        label: formatLine(displayQty, row.unit, row.item),
        aisle: row.aisle,
        checked: isRowChecked(state, row, row.unit, displayQty),
        fromExtra: hasExtra,
        extraOnly: hasExtra && !hasRecipe,
        kind: "item"
      });
    });

    items.sort(function (a, b) { return a.label.localeCompare(b.label); });
    notes.sort(function (a, b) { return a.label.localeCompare(b.label); });

    var aisles = AISLE_ORDER.map(function (id) {
      return {
        id: id,
        label: AISLE_LABEL[id],
        items: items.filter(function (item) { return item.aisle === id; }).concat(id === "other" ? notes : [])
      };
    }).filter(function (aisle) { return aisle.items.length; });

    var flat = [];
    aisles.forEach(function (aisle) { flat = flat.concat(aisle.items); });
    return { aisles: aisles, items: flat, excluded: excluded };
  }

  function removeManualExtra(state, item, unit) {
    var key = mergeKey(item, unit || "");
    state.extras = (state.extras || []).filter(function (extra) {
      return mergeKey(extra.item, extra.unit) !== key;
    });
  }

  function pantryHaveSet(pantry) {
    if (window.PW_PANTRY_NORM) return PW_PANTRY_NORM.pantryHaveSet(pantry);
    var have = {};
    (pantry || []).forEach(function (entry) {
      var name = typeof entry === "string" ? entry : entry.item;
      var key = stapleKey(name);
      if (key) have[key] = 1;
    });
    return have;
  }

  function pantryStapleIgnore() {
    return { salt: 1, "black pepper": 1, pepper: 1, water: 1, "olive oil": 1, oil: 1 };
  }

  function recipePantryFit(recipe, have, ignore) {
    var ings = (recipe.ingredients || []).filter(function (ing) {
      return ing.item && !ignore[stapleKey(ing.item)];
    });
    var matched = 0;
    var missingItems = [];
    ings.forEach(function (ing) {
      var hit = have[stapleKey(ing.item)];
      if (!hit && window.PW_PANTRY_NORM) {
        hit = PW_PANTRY_NORM.pantryMatchesIngredient(ing.item, have);
      }
      if (hit) matched += 1;
      else missingItems.push(ing.item);
    });
    return {
      matched: matched,
      missing: missingItems.length,
      missingItems: missingItems,
      total: ings.length
    };
  }

  function recipeOneLiner(recipe) {
    var parts = (recipe.ingredients || []).slice(0, 3).map(function (ing) { return ing.item; }).filter(Boolean);
    if (parts.length) return parts.join(", ");
    if (recipe.steps && recipe.steps[0]) {
      var step = String(recipe.steps[0]);
      return step.length > 70 ? step.slice(0, 67) + "…" : step;
    }
    return "";
  }

  function suggestRecipes(recipes, pantry, assumeStaples) {
    if (window.PW_PANTRY_MATCH) {
      return PW_PANTRY_MATCH.suggestFromPantry(recipes, pantry, assumeStaples, function (recipe) {
        return recipeClassicBoost(recipe);
      });
    }
    var have = pantryHaveSet(pantry);
    if (!Object.keys(have).length) return [];
    var ignore = pantryStapleIgnore();
    return (recipes || []).map(function (recipe) {
      var fit = recipePantryFit(recipe, have, ignore);
      return {
        id: recipe.id,
        name: recipe.name,
        minutes: recipe.minutes,
        matched: fit.matched,
        missing: fit.missing,
        missingItems: fit.missingItems,
        total: fit.total,
        tier: fit.missing === 0 ? "ready" : (fit.missing === 1 ? "miss1" : "miss23"),
        badge: fit.missing === 0 ? "Ready to cook" : ("Missing " + fit.missing),
        ready: fit.missing === 0
      };
    }).filter(function (row) {
      return row.matched >= 2 && row.missing <= 3 && row.total > 0;
    }).sort(function (a, b) {
      return a.missing - b.missing || b.matched - a.matched || a.name.localeCompare(b.name);
    });
  }

  function formatPantryShareText(recipes, pantry, assumeStaples) {
    if (!pantry || !pantry.length) return "";
    var rows = suggestRecipes(recipes, pantry, assumeStaples);
    if (!rows.length) return "";

    var ready = [];
    var near = [];
    var more = [];
    rows.forEach(function (row) {
      var recipe = recipeById({ recipes: recipes }, row.id);
      if (!recipe) return;
      var entry = { recipe: recipe, fit: row };
      if (row.ready) ready.push(entry);
      else if (row.missing <= 2) near.push(entry);
      else more.push(entry);
    });

    function lineFor(entry, withMissing) {
      var recipe = entry.recipe;
      var time = recipe.minutes != null ? recipe.minutes + " min" : "";
      var blurb = recipeOneLiner(recipe);
      var head = "• " + recipe.name;
      if (time) head += " — " + time;
      if (blurb) head += " — " + blurb;
      if (withMissing && entry.fit.missingItems && entry.fit.missingItems.length) {
        head += " (need: " + entry.fit.missingItems.slice(0, 3).join(", ") + ")";
      }
      return head;
    }

    var lines = ["Meals we can make at home", ""];
    if (ready.length) {
      ready.forEach(function (entry) { lines.push(lineFor(entry, false)); });
    }
    if (near.length) {
      if (ready.length) lines.push("");
      lines.push("Almost there (missing 1–2):");
      near.forEach(function (entry) { lines.push(lineFor(entry, true)); });
    }
    if (more.length) {
      lines.push("");
      lines.push("More ideas:");
      more.forEach(function (entry) { lines.push(lineFor(entry, true)); });
    }
    var text = lines.join("\n");
    if (text.length > 2400) text = text.slice(0, 2397) + "…";
    return text;
  }

  function looksLikeHeader(line) {
    return /^(ingredients?|directions?|instructions?|method|steps?|preparation)\s*:?\s*$/i.test(line);
  }

  function parseRecipeText(text) {
    var lines = String(text || "").replace(/\r/g, "").split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
    var name = "";
    var minutes = null;
    var servings = null;
    var tags = [];
    var ingredients = [];
    var steps = [];
    var mode = "auto";
    var seenIngredient = false;

    lines.forEach(function (line) {
      if (/^[-—]{3,}$/.test(line)) return;
      if (looksLikeHeader(line)) {
        mode = /ingredient/i.test(line) ? "ingredients" : "steps";
        return;
      }
      var serv = line.match(/^(?:servings?|serves|yield)\s*:?\s*(\d+)\s*$/i);
      if (serv && mode !== "steps") { servings = parseInt(serv[1], 10); return; }
      var time = line.match(/^(?:prep(?:\s*time)?|cook(?:\s*time)?|total(?:\s*time)?|ready in|time)\s*:\s*(.+)$/i);
      if (time && mode !== "steps") {
        var parsedMin = parseMinutes(time[1]);
        if (parsedMin != null) { minutes = parsedMin; return; }
      }
      var tagLine = line.match(/^tags?\s*:\s*(.+)$/i);
      if (tagLine && mode !== "steps") { tags = tags.concat(parseTagList(tagLine[1])); return; }

      var parsed = parseIngredientLine(line);
      var ingredientLike = !!(parsed && parsed.qty != null);

      if (!name && mode === "auto" && !ingredientLike && line.length <= 80 && !/[.!?]$/.test(line)) {
        name = line;
        return;
      }
      if (mode === "steps") { steps.push(line.replace(/^\d+[.)]\s+/, "")); return; }
      if (mode === "ingredients") {
        if (parsed) ingredients.push(parsed);
        seenIngredient = true;
        return;
      }
      if (ingredientLike) {
        ingredients.push(parsed);
        seenIngredient = true;
        return;
      }
      if (seenIngredient && line.length <= 40 && !/[.!?]$/.test(line) && parsed) {
        ingredients.push(parsed);
        return;
      }
      steps.push(line.replace(/^\d+[.)]\s+/, ""));
    });

    var warning = "";
    if (!name && !ingredients.length && !steps.length) warning = "Couldn't find a recipe in that text. Try a title, then one ingredient per line.";
    else if (!ingredients.length) warning = "No ingredient lines were found. You can add them below.";
    return {
      name: name,
      minutes: minutes,
      servings: servings,
      tags: parseTagList(tags),
      ingredients: ingredients.filter(function (ing) { return ing && ing.item; }),
      steps: steps,
      warning: warning
    };
  }

  var PLAN_CUISINE_TAGS = [
    "canadian", "american", "italian", "mexican", "chinese", "indian",
    "british", "french", "mediterranean", "other"
  ];
  var PLAN_CUISINE_KEY = "pantry_week_plan_cuisines_v1";

  var CUISINE_WORDS = [
    "thai", "korean", "mexican", "italian", "indian", "greek", "japanese", "chinese", "vietnamese",
    "moroccan", "ethiopian", "jamaican", "turkish", "sichuan", "brazilian", "french", "caribbean",
    "lebanese", "peruvian", "spanish", "german", "colombian", "egyptian", "polish", "irish",
    "senegalese", "australian", "chilean", "georgian", "russian", "israeli", "cuban", "nepalese",
    "portuguese", "indonesian", "malaysian", "argentine", "tunisian", "hawaiian", "british", "filipino",
    "persian", "cajun", "swedish", "southern"
  ];

  function shuffleInPlace(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function recipeHaystack(recipe) {
    return [recipe.name]
      .concat(recipe.tags || [])
      .concat((recipe.ingredients || []).map(function (ing) { return ing.item; }))
      .join(" ")
      .toLowerCase();
  }

  function recipeProtein(recipe) {
    var hay = recipeHaystack(recipe);
    if (/\b(vegan|tofu|tempeh)\b/.test(hay) && !/\b(chicken|beef|pork|fish|shrimp|salmon|cod|tuna|lamb|sausage|steak)\b/.test(hay)) return "plant";
    if (/\b(shrimp|salmon|cod|tuna|fish|mussel|ahi|seafood)\b/.test(hay)) return "seafood";
    if (/\b(chicken|turkey)\b/.test(hay)) return "poultry";
    if (/\b(beef|steak|sirloin)\b/.test(hay)) return "beef";
    if (/\b(pork|bacon|sausage|ham|prosciutto)\b/.test(hay)) return "pork";
    if (/\b(lamb|kofta)\b/.test(hay)) return "lamb";
    if (/\b(egg|omelette|frittata|shakshuka)\b/.test(hay)) return "egg";
    if (recipe.tags && recipe.tags.indexOf("vegetarian") !== -1) return "vegetarian";
    return "other";
  }

  function recipePlanCuisine(recipe) {
    var tags = recipe && recipe.tags || [];
    for (var i = 0; i < PLAN_CUISINE_TAGS.length; i++) {
      if (tags.indexOf(PLAN_CUISINE_TAGS[i]) !== -1) return PLAN_CUISINE_TAGS[i];
    }
    return "other";
  }

  function recipeMatchesPlanCuisines(recipe, selected) {
    var list = selected || [];
    if (!list.length) return true;
    return list.indexOf(recipePlanCuisine(recipe)) !== -1;
  }

  function loadPlanCuisineFilters() {
    try {
      var raw = storage().getItem(PLAN_CUISINE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (id) { return PLAN_CUISINE_TAGS.indexOf(id) !== -1; });
    } catch (err) {
      return [];
    }
  }

  function savePlanCuisineFilters(list) {
    try {
      storage().setItem(PLAN_CUISINE_KEY, JSON.stringify(list || []));
    } catch (err) { /* ignore */ }
  }

  function recipeCuisine(recipe) {
    return recipePlanCuisine(recipe);
  }

  function slotsForFillScope(scope) {
    if (scope === "lunch_dinner") return ["lunch", "dinner"];
    if (scope === "all") return SLOTS.slice();
    return ["dinner"];
  }

  function recipeMealType(recipe) {
    if (window.PW_MEAL && typeof window.PW_MEAL.inferMealCategory === "function") {
      return window.PW_MEAL.inferMealCategory(recipe);
    }
    var tags = recipe && recipe.tags || [];
    if (tags.indexOf("breakfast") !== -1) return "breakfast";
    if (tags.indexOf("lunch") !== -1) return "lunch";
    return "dinner";
  }

  function recipePlanEligible(recipe) {
    if (window.PW_MEAL && typeof window.PW_MEAL.recipePlanEligible === "function") {
      return window.PW_MEAL.recipePlanEligible(recipe);
    }
    return true;
  }

  function recipeFitsSlot(recipe, slot) {
    if (window.PW_MEAL && typeof window.PW_MEAL.recipeFitsMealSlot === "function") {
      return window.PW_MEAL.recipeFitsMealSlot(recipe, slot);
    }
    var tags = recipe.tags || [];
    return tags.indexOf(slot) !== -1;
  }

  function recipeClassicBoost(recipe) {
    var tags = recipe.tags || [];
    if (tags.indexOf("classic") !== -1 || tags.indexOf("collection-classic") !== -1) return 4.5;
    if (tags.indexOf("canadian") !== -1) return 2.2;
    if (tags.indexOf("collection-comfort") !== -1) return 1.8;
    var name = String(recipe.name || "").toLowerCase();
    if (/meatloaf|pot roast|shepherd|grilled cheese|cheeseburger|spaghetti|lasagna|chili|taco|fajita|roast chicken|pork chop|chicken parm|bbq|beef stew|chicken noodle|mac and cheese|butter chicken|tourtière|poutine|butter tart|pancake|omelette|fish and chips|sloppy joe|fried rice|stir.fry|bangers|meat sauce|burgers/.test(name)) {
      return 3.5;
    }
    if (/\bbowl\b/i.test(name) && !/soup/i.test(name)) return -3;
    return 0;
  }

  function pickWeighted(pool) {
    if (!pool.length) return null;
    var total = 0;
    var weights = pool.map(function (recipe) {
      var w = 1 + Math.max(0, recipeClassicBoost(recipe)) * 0.42;
      if ((recipe.tags || []).indexOf("canadian") !== -1) w += 0.35;
      total += w;
      return w;
    });
    var roll = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function pickVariedRecipe(candidates, usedProteins, usedCuisines) {
    if (!candidates || !candidates.length) return null;
    var pool = candidates.filter(function (recipe) {
      return usedProteins.indexOf(recipeProtein(recipe)) === -1;
    });
    if (!pool.length) {
      pool = candidates.filter(function (recipe) {
        return usedCuisines.indexOf(recipeCuisine(recipe)) === -1;
      });
    }
    if (!pool.length) pool = candidates;
    return pickWeighted(pool);
  }

  function fillSimpleWeek(week, recipes, options) {
    var opts = options && typeof options === "object" ? options : {};
    var scope = opts.scope || "dinner";
    var replaceAll = !!opts.replaceAll;
    var filter = opts.filter || "all";
    var query = opts.query || "";
    var list = recipes || [];
    var out = normalizeWeek(week || blankWeek(), list);
    var targetSlots = slotsForFillScope(scope);
    var usedIds = {};
    var usedProteins = [];
    var usedCuisines = [];

    DAYS.forEach(function (day) {
      SLOTS.forEach(function (slot) {
        var cell = out[day][slot];
        if (cell && cell.recipeId) {
          if (targetSlots.indexOf(slot) === -1 || !replaceAll) {
            usedIds[cell.recipeId] = 1;
            var existing = list.find(function (r) { return r.id === cell.recipeId; });
            if (existing) {
              usedProteins.push(recipeProtein(existing));
              usedCuisines.push(recipeCuisine(existing));
            }
          }
        }
      });
    });

    var targets = [];
    DAYS.forEach(function (day) {
      targetSlots.forEach(function (slot) {
        var cell = out[day][slot];
        var empty = !cell || (!cell.recipeId && !String(cell.custom || "").trim());
        if (replaceAll || empty) targets.push({ day: day, slot: slot });
      });
    });
    shuffleInPlace(targets);

    var cuisineFilters = Array.isArray(opts.cuisineFilters) ? opts.cuisineFilters : [];
    var cuisineFallbacks = 0;

    targets.forEach(function (target) {
      function slotCandidates(strictCuisine, allowReuse) {
        return list.filter(function (recipe) {
          if (!recipeMatches(recipe, query, filter)) return false;
          if (!recipePlanEligible(recipe)) return false;
          if (!recipeFitsSlot(recipe, target.slot)) return false;
          if (strictCuisine && cuisineFilters.length && !recipeMatchesPlanCuisines(recipe, cuisineFilters)) return false;
          if (!allowReuse && usedIds[recipe.id]) return false;
          return true;
        });
      }
      if (replaceAll) out[target.day][target.slot] = blankSlot();
      var candidates = slotCandidates(true, false);
      if (!candidates.length) {
        candidates = slotCandidates(false, false);
      }
      if (!candidates.length) {
        candidates = slotCandidates(true, true);
      }
      if (!candidates.length && cuisineFilters.length) {
        candidates = slotCandidates(false, true);
        if (candidates.length) cuisineFallbacks += 1;
      }
      var pick = pickVariedRecipe(candidates, usedProteins, usedCuisines);
      if (!pick) return;
      out[target.day][target.slot] = {
        recipeId: pick.id,
        custom: "",
        servings: pick.servings || 4,
        leftover: false
      };
      usedIds[pick.id] = 1;
      usedProteins.push(recipeProtein(pick));
      usedCuisines.push(recipeCuisine(pick));
    });
    if (opts.returnMeta) {
      return { week: out, cuisineFallbacks: cuisineFallbacks };
    }
    return out;
  }

  function weekHasMeals(week) {
    if (!week) return false;
    return DAYS.some(function (day) {
      return SLOTS.some(function (slot) {
        var value = week[day] && week[day][slot];
        return !!(value && (value.recipeId || value.custom));
      });
    });
  }

  function weeksEqual(a, b) {
    if (!a || !b) return false;
    return DAYS.every(function (day) {
      return SLOTS.every(function (slot) {
        var left = a[day][slot];
        var right = b[day][slot];
        return left.recipeId === right.recipeId && left.custom === right.custom &&
          left.servings === right.servings && !!left.leftover === !!right.leftover;
      });
    });
  }

  function todayKey(date) {
    var d = date || new Date();
    return DAYS[(d.getDay() + 6) % 7];
  }

  function nextDay(day) {
    var index = DAYS.indexOf(day);
    if (index < 0 || index === DAYS.length - 1) return null;
    return DAYS[index + 1];
  }

  function weekOfLabel(date) {
    var d = new Date(date || new Date());
    var delta = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - delta);
    try {
      return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    } catch (err) {
      return "";
    }
  }

  function recipeMatches(recipe, query, filter) {
    if (filter && filter !== "all") {
      if (filter === "quick") {
        if (!(typeof recipe.minutes === "number" && recipe.minutes <= 20)) return false;
      } else if (filter === "my-creation") {
        if (recipe.tags.indexOf("my-creation") === -1) return false;
      } else if (recipe.tags.indexOf(filter) === -1) {
        return false;
      }
    }
    var q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    var hay = [recipe.name].concat(recipe.tags).concat(recipe.ingredients.map(function (ing) { return ing.item; })).concat(recipe.steps).join(" ").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function exportPayload(state) {
    return {
      app: "Pantry Week",
      version: "2.0.1",
      exportedAt: new Date().toISOString(),
      state: state
    };
  }

  function isV1Shape(data) {
    if (!data || typeof data !== "object") return false;
    if (data.version >= 2) return false;
    if (data.version === 1) return true;
    if (data.week && data.week.Mon && typeof data.week.Mon.dinner === "string") return true;
    if (Array.isArray(data.recipes) && data.recipes.some(function (recipe) {
      return recipe && Array.isArray(recipe.ingredients) && typeof recipe.ingredients[0] === "string";
    })) return true;
    return false;
  }

  function importBackup(input) {
    var data = input;
    if (typeof data === "string") {
      try { data = JSON.parse(data); }
      catch (err) { throw new Error("That text is not valid JSON."); }
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("That file is not a Pantry Week backup.");
    if (data.state && typeof data.state === "object" && (data.app || data.version)) data = data.state;
    if (isV1Shape(data)) return migrateV1(data);
    if (!Array.isArray(data.recipes) || !data.week || typeof data.week !== "object") {
      throw new Error("That backup is missing recipes or the week plan.");
    }
    return normalize(data);
  }

  function listAsText(list) {
    var lines = ["Pantry Week shopping list", ""];
    if (!list.items.length) {
      lines.push("No groceries yet.");
    } else {
      list.aisles.forEach(function (aisle) {
        lines.push(aisle.label);
        aisle.items.forEach(function (item) {
          lines.push((item.checked ? "[x] " : "[ ] ") + item.label);
        });
        lines.push("");
      });
    }
    if (list.excluded.length) {
      lines.push("Already at home: " + list.excluded.map(function (item) {
        return item.charAt(0).toUpperCase() + item.slice(1);
      }).join(", "));
    }
    return lines.join("\n").replace(/\n+$/, "") + "\n";
  }

  var META_TAGS = {
    vegetarian: 1, vegan: 1, "gluten-free": 1, "dairy-free": 1, "high-protein": 1,
    budget: 1, moderate: 1, splurge: 1, easy: 1, medium: 1, hard: 1
  };

  function dietTags(recipe) {
    return (recipe.tags || []).filter(function (tag) {
      return tag === "vegetarian" || tag === "vegan" || tag === "gluten-free" || tag === "dairy-free" || tag === "high-protein";
    });
  }

  function metaTags(recipe) {
    return (recipe.tags || []).filter(function (tag) {
      return Object.prototype.hasOwnProperty.call(META_TAGS, tag);
    });
  }

  function tagLabel(tag) {
    if (tag === "gluten-free") return "Gluten-free";
    if (tag === "dairy-free") return "Dairy-free";
    if (tag === "vegetarian") return "Vegetarian";
    if (tag === "vegan") return "Vegan";
    if (tag === "high-protein") return "High protein";
    if (tag === "quick") return "Quick (20 min)";
    if (tag === "canadian") return "Canadian";
    if (tag === "american") return "American";
    if (tag === "italian") return "Italian";
    if (tag === "mexican") return "Mexican";
    if (tag === "chinese") return "Chinese";
    if (tag === "indian") return "Indian";
    if (tag === "british") return "British";
    if (tag === "french") return "French";
    if (tag === "mediterranean") return "Mediterranean";
    if (tag === "other") return "Other";
    if (tag === "my-creation") return "My creation";
    if (tag === "budget") return "Budget";
    if (tag === "moderate") return "Moderate";
    if (tag === "splurge") return "Splurge";
    if (tag === "easy") return "Easy";
    if (tag === "medium") return "Medium";
    if (tag === "hard") return "Hard";
    if (tag === "imported") return "Imported";
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  }

  var STAPLES = ["salt", "black pepper", "olive oil"];

  var PW = {
    VERSION: "3.12.0",
    KEY: KEY,
    KEY_V1: KEY_V1,
    DAYS: DAYS,
    SLOTS: SLOTS,
    DAY_LABEL: DAY_LABEL,
    SLOT_LABEL: SLOT_LABEL,
    AISLE_ORDER: AISLE_ORDER,
    AISLE_LABEL: AISLE_LABEL,
    STARTERS: STARTERS,
    STAPLES: STAPLES,
    clone: clone,
    escapeHtml: escapeHtml,
    uid: uid,
    base: base,
    singularKey: singularKey,
    sameItem: sameItem,
    canonUnit: canonUnit,
    parseQty: parseQty,
    parseIngredientLine: parseIngredientLine,
    formatQty: formatQty,
    formatLine: formatLine,
    mergeKey: mergeKey,
    tidyItem: tidyItem,
    stapleKey: stapleKey,
    tickKeys: tickKeys,
    aisleOf: aisleOf,
    parseMinutes: parseMinutes,
    splitSteps: splitSteps,
    blankSlot: blankSlot,
    blankWeek: blankWeek,
    normalize: normalize,
    normalizeRecipe: normalizeRecipe,
    migrateV1: migrateV1,
    freshState: freshState,
    load: load,
    save: save,
    recipeById: recipeById,
    slotLabel: slotLabel,
    buildShoppingList: buildShoppingList,
    removeManualExtra: removeManualExtra,
    formatPantryShareText: formatPantryShareText,
    suggestRecipes: suggestRecipes,
    recipePantryFit: recipePantryFit,
    pantryHaveSet: pantryHaveSet,
    pantryStapleIgnore: pantryStapleIgnore,
    recipeClassicBoost: recipeClassicBoost,
    recipePlanEligible: recipePlanEligible,
    parseRecipeText: parseRecipeText,
    fillSimpleWeek: fillSimpleWeek,
    PLAN_CUISINE_TAGS: PLAN_CUISINE_TAGS,
    PLAN_CUISINE_KEY: PLAN_CUISINE_KEY,
    recipePlanCuisine: recipePlanCuisine,
    recipeMatchesPlanCuisines: recipeMatchesPlanCuisines,
    loadPlanCuisineFilters: loadPlanCuisineFilters,
    savePlanCuisineFilters: savePlanCuisineFilters,
    recipeMealType: recipeMealType,
    recipeFitsSlot: recipeFitsSlot,
    slotsForFillScope: slotsForFillScope,
    weekHasMeals: weekHasMeals,
    weeksEqual: weeksEqual,
    todayKey: todayKey,
    nextDay: nextDay,
    weekOfLabel: weekOfLabel,
    recipeMatches: recipeMatches,
    exportPayload: exportPayload,
    importBackup: importBackup,
    listAsText: listAsText,
    dietTags: dietTags,
    metaTags: metaTags,
    tagLabel: tagLabel,
    ensureStarterRecipes: ensureStarterRecipes,
    storage: storage
  };

  window.PW = PW;
})();
