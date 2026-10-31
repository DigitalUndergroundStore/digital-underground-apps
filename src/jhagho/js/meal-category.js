/* Pantry Week — one breakfast / lunch / dinner category per recipe; plan-fill eligibility. */
"use strict";

(function () {
  var MEALS = ["breakfast", "lunch", "dinner"];

  var PLAN_BANNED_TAGS = {
    dessert: 1,
    drink: 1,
    beverage: 1,
    sauce: 1,
    condiment: 1,
    side: 1,
    sides: 1,
    appetizer: 1,
    appetiser: 1
  };

  var BREAKFAST_NAME = /\b(breakfast|brunch|pancake|waffle|omelette|omelet|scramble|parfait|granola|oatmeal|french toast|smoothie bowl|overnight oats|shakshuka|hash|frittata|eggs?\s+benedict|porridge|congee|acai|bagel|croissant|muesli|english breakfast|breakfast burrito|breakfast casserole|breakfast dürüm|breakfast durum|breakfast dog|latino scramble|appam|malpua|okonomiyaki|sinasir|roti jala|\bdosa\b|\bidli\b|\bvada\b|chilaquiles|huevos|muffins?\b|banana bread|cinnamon roll|crepe|blintz|latke|johnnycake|hoecake|yogurt parfait|chia parfait|berry chia)\b/i;

  var LUNCH_NAME = /\b(\blunch\b|sandwich|panini|sub\b|club\b|lunch box|lunch jar|grain bowl|lunch bowl|taco salad|chicken salad|egg salad|tuna salad|ceviche|gazpacho|broth\b|minestrone|pho\b|ramen\b|udon\b|soba\b|noodle bowl|quesadilla|tostada|empanada|samosa|banh mi|caprese toast|avocado toast|tartine|ploughman|picnic|wraps?\b|slider|burrito bowl|chef salad|cobb salad|greek salad|caesar salad|chowder|bisque|chili\b|curry\b|gumbo|stew\b|soup\b)\b/i;

  var SOUP_NAME = /\b(soup|chowder|bisque|stew|chili|curry|gumbo|ragout)\b/i;

  var DESSERT_NAME = /\b(cookie|brownie|mousse|(?<!pot )(?<!shepherd'?s )(?<!chicken )pie\b|crisp|(?<!butter )tart\b|bars\b|(?<!rice )pudding|cake|nice cream|nanaimo|fudge|truffle|cheesecake|cupcake|icing|frosting|compote|butter tart|turnover|scone\b(?!.*soup)|gelato|sorbet|lollipop|candy|fritter.*dessert|ginger biscuits?|shortbread|biscotti)\b/i;

  var DRINK_NAME = /\b(smoothie\b(?! bowl)|lassi\b|lemonade|cocktail|mocktail|punch\b|latte\b|espresso\b|milkshake|frappe|bubble tea|iced tea|hot chocolate drink|mulled wine|eggnog\b|horchata|agua fresca)\b/i;

  var SAUCE_NAME = /\b(barbecue sauce|bbq sauce|hot sauce|cocktail sauce|chimichurri|gravy only|aioli|mayonnaise|ketchup|relish\b|chutney\b|dressing only|vinaigrette only|marinade only|seasoning mix|demi.glace|hollandaise|béarnaise|bechamel sauce|pesto sauce|cranberry sauce|apple sauce|chipotle bbq sauce|eastern north carolina)\b/i;

  var SNACK_ONLY_NAME = /\b(onion rings?|deep fried mars|mars bar|nachos?\b|fritters?\b|bites\b|hummus dip|popcorn|trail mix|cheese board|charcuterie board|spring rolls?\b(?!.*meal)|egg rolls?\b(?!.*bowl)|samosa only|potato skins|mozzarella sticks|jalapeño poppers|pigs in a blanket)\b/i;

  var NOVELTY_JUNK = /\b(deep fried (twinkie|oreo|butter|ice cream)|turducken|energy drink|junk food|fair food)\b/i;

  var SIDE_DISH_NAME = /\b(colcannon|brussels sprouts(?!.*bowl)|mashed potatoes only|dinner rolls|garlic bread only|coleslaw only|side salad only)\b/i;

  function haystack(recipe) {
    var parts = [recipe && recipe.name || ""];
    (recipe && recipe.tags || []).forEach(function (t) { parts.push(t); });
    (recipe && recipe.ingredients || []).forEach(function (ing) {
      parts.push(ing && (ing.item || ing.name) || "");
    });
    return parts.join(" ").toLowerCase();
  }

  function existingMeals(tags) {
    var out = [];
    (tags || []).forEach(function (t) {
      var x = String(t || "").toLowerCase();
      if (MEALS.indexOf(x) !== -1 && out.indexOf(x) === -1) out.push(x);
    });
    return out;
  }

  function hasBannedTag(tags) {
    for (var i = 0; i < (tags || []).length; i++) {
      var t = String(tags[i] || "").toLowerCase();
      if (PLAN_BANNED_TAGS[t]) return t;
      if (t === "snack") return "snack";
    }
    return null;
  }

  function savoryMainName(name) {
    return /\b(pot pie|shepherd'?s pie|steak and ale|steak and kidney|kidney pudding|mushroom stout|corned beef pie|stargazy|meat pie|tourtière|tourtiere|fish pie|chicken pie|pork pie|beef pie|mince pie|macaroni pie|frito pie|steak pie|lamb pie|seafood pie|chicken pot pie)\b/i.test(name);
  }

  function lunchStyleMeal(recipe) {
    var name = String(recipe && recipe.name || "");
    if (LUNCH_NAME.test(name)) return true;
    if (/\b(wrap|panini|sandwich|salad|soup|bowl|quesadillas?|tostada|sliders?|toast|parfait)\b/i.test(name)) return true;
    return false;
  }

  function inferNonMealKind(recipe) {
    if (!recipe) return "invalid";
    var name = String(recipe.name || "");
    var tags = recipe.tags || [];
    var blob = haystack(recipe);

    if (NOVELTY_JUNK.test(name) || NOVELTY_JUNK.test(blob)) return "novelty";
    if (DRINK_NAME.test(name)) return "drink";
    if (SAUCE_NAME.test(name)) return "sauce";
    if (savoryMainName(name)) return null;
    if (DESSERT_NAME.test(name)) {
      if (/\b(parfaits?|muffin|oatmeal|granola|nice cream|berry chia|ricotta toast|avocado toast|french toast)\b/i.test(name)) {
        return null;
      }
      return "dessert";
    }
    if (/\bpoutine\b/i.test(name)) return null;
    if (/\bbannock\b/i.test(name)) return null;
    if (/\b(flatbread|khachapuri|cheese bread)\b/i.test(name)) return null;
    if (SNACK_ONLY_NAME.test(name)) return "snack";
    if (SIDE_DISH_NAME.test(name)) return "side";

    var banned = hasBannedTag(tags);
    if (banned === "snack") {
      if (lunchStyleMeal(recipe)) return null;
      if (/\b(shrimp|prawn|gambas|steak|chicken|salmon|pork|parfait|poutine|bannock|flatbread)\b/i.test(name)) {
        return null;
      }
      return "snack";
    }
    if (banned) return banned;

    if (/\b(dessert|sweet treat|after dinner)\b/i.test(blob) && !BREAKFAST_NAME.test(name)) return "dessert";

    return null;
  }

  /* Hard guard (v3.13): sweets, baked treats, drinks, and condiments never enter any plan slot,
     whatever their tags say. Savory pies/puddings and pancakes/crab cakes are meals. */
  var HARD_SWEET = /\b(cookies?|brownies?|cupcakes?|cheesecakes?|cakes?|muffins?|scones?|doughnuts?|donuts?|fudge|candy|candies|toffee|brittle|truffles?|icing|frosting|ice cream|nice cream|sorbet|gelato|sherbet|popsicles?|ice pops?|parkin|shortbread|biscotti|macarons?|macaroons?|meringues?|crumble|cobbler|crisp|tarts?|tiramis[uù]|pavlova|trifle|custard|mousse|flan|baklava|strudel|turnovers?|cinnamon rolls?|banana bread|sweet bread|fruit bread|gingerbread|snickerdoodles?|barfi|halwa|kheer|ladoo|jalebi|gulab jamun|mars bar|twinkie|oreo)\b/i;
  var HARD_DRINK = /\b(smoothie(?! bowl)|lassi|lemonade|cocktail|mocktail|punch|latte|espresso|coffee|tea|milkshake|shake|frappe|eggnog|horchata|juice|mead|wine|beer|liqueur|hot chocolate|cocoa)\b/i;
  var HARD_CONDIMENT = /\b(sauce|gravy|salsa|dressing|vinaigrette|dip|spread|chutney|relish|ketchup|mayonnaise|aioli|pesto|marinade|rub|seasoning|spice mix|masala powder|jam|jelly|marmalade|syrup|glaze|stock|broth|chili oil|pickles?|kimchi)\b/i;
  var MEAL_EXCEPTIONS = /\b(pancakes?|crab cakes?|fish ?cakes?|potato cakes?|corn ?cakes?|rice cakes?|griddle ?cakes?|johnny ?cakes?|hoe ?cakes?|pot pie|shepherd'?s pie|cottage pie|meat pie|tourti[eè]re|chicken pie|beef pie|pork pie|steak (and|&) (ale|kidney)|fish pie|frito pie|tamale pie|corned beef pie|stargazy pie|macaroni pie|mushroom stout pie|yorkshire pudding|kidney pudding|black pudding|sausage gravy|biscuits and gravy|with (pan )?gravy|in [a-z ]*sauce|with [a-z ]*sauce|sauce (and|with)|meat sauce|bolognese|enchilada|palaver sauce|yam and egg sauce|soup|stew|chowder|curry|pasta|spaghetti|penne|noodles?|rice|beef|chicken|pork|shrimp|salmon|fish|halibut|tilapia|cod|trout|tuna|lamb|turkey|steak|tofu|eggs?|omelett?e|burger|sandwich|tacos?|bowl|casserole|skillet|gnocchi|pizza|flatbread|wraps?|quesadillas?|lasagna|risotto|french toast|oatmeal(?! (raisin|chocolate|stout|cookie|bar))|porridge|grits|waffles?|crêpes? (with|filled)|broth\b.*(chicken|beef|noodle))\b/i;
  function hardNonMeal(recipe) {
    var name = String(recipe && recipe.name || "");
    if (!name) return null;
    if (HARD_SWEET.test(name)) {
      if (/\b(pancakes?|crab cakes?|fish ?cakes?|potato cakes?|corn ?cakes?|griddle ?cakes?|johnny ?cakes?|hoe ?cakes?|rice cakes?|pot pie|savory|savoury)\b/i.test(name) && !/\b(cookies?|brownies?|cupcakes?|cheesecakes?|muffins?|fudge|ice cream)\b/i.test(name)) return null;
      return "dessert";
    }
    if (HARD_DRINK.test(name) && !/\b(beer[- ]can chicken|beer[- ]battered|wine[- ](glazed|braised|roasted)|(in|with) (red |white )?wine|tilapia|halibut|cod|salmon|shrimp|tea[- ]smoked|coffee[- ]rubbed|ale pie|chicken|beef|pork|lamb|fish|stew|soup|chili)\b/i.test(name)) return "drink";
    if (HARD_CONDIMENT.test(name) && !MEAL_EXCEPTIONS.test(name)) return "condiment";
    return null;
  }

  function recipePlanEligible(recipe) {
    if (hardNonMeal(recipe)) return false;
    // Bundled recipes carry an explicit meal tag; the softer heuristics are for imports.
    if (recipe && recipe.meal && MEALS.indexOf(String(recipe.meal)) !== -1 && !recipe.userEdited) return true;
    return !inferNonMealKind(recipe);
  }

  function inferMealCategory(recipe) {
    /* v3.13: bundled recipes carry an explicit meal tag; a recipe with exactly one
       breakfast/lunch/dinner tag (user choice or a normalized save) keeps it. Heuristics only
       classify untagged imports. */
    var explicit = recipe && String(recipe.meal || "").toLowerCase();
    if (explicit && MEALS.indexOf(explicit) !== -1) return explicit;
    var tagged = existingMeals(recipe && recipe.tags);
    if (tagged.length === 1) return tagged[0];
    var name = String(recipe && recipe.name || "");
    var tags = recipe && recipe.tags || [];
    var minutes = recipe && recipe.minutes;
    var blob = haystack(recipe);

    if (inferNonMealKind(recipe) === "dessert" || inferNonMealKind(recipe) === "drink") {
      if (BREAKFAST_NAME.test(name) || BREAKFAST_NAME.test(blob)) return "breakfast";
    }

    if (BREAKFAST_NAME.test(name) || BREAKFAST_NAME.test(blob)) return "breakfast";
    if (/\blunch\b/i.test(name)) return "lunch";
    if (/\bdinner\b/i.test(name)) return "dinner";

    if (LUNCH_NAME.test(name)) {
      if (/\bdinner\b/i.test(name) && !/\blunch\b/i.test(name)) return "dinner";
      if (/\bgallina\b/i.test(name)) return "dinner";
      return "lunch";
    }

    if (typeof minutes === "number" && minutes <= 12) {
      if (/\b(yogurt|toast|berries|berry|chia|granola|fruit)\b/i.test(name)) return "breakfast";
    }

    if (SOUP_NAME.test(name) && !/\b(breakfast|pancake)\b/i.test(name)) {
      if (typeof minutes === "number" && minutes <= 35) return "lunch";
    }

    var have = existingMeals(tags);
    if (have.length === 1) return have[0];
    if (have.indexOf("breakfast") !== -1) return "breakfast";
    if (have.indexOf("lunch") !== -1 && have.indexOf("dinner") !== -1) {
      if (LUNCH_NAME.test(name) || SOUP_NAME.test(name)) return "lunch";
      if (typeof minutes === "number" && minutes <= 30 && /\b(bowl|salad|sandwich|wrap|soup)\b/i.test(name)) {
        return "lunch";
      }
      return "dinner";
    }
    if (have.indexOf("lunch") !== -1) return "lunch";

    return "dinner";
  }

  function scrubMealTags(tags, recipe) {
    var meal = inferMealCategory(recipe);
    var out = [];
    var seen = {};
    (tags || []).forEach(function (tag) {
      var t = String(tag || "").trim().toLowerCase();
      if (!t || MEALS.indexOf(t) !== -1) return;
      if (PLAN_BANNED_TAGS[t] || t === "snack" || t === "main-meal") return;
      if (seen[t]) return;
      seen[t] = 1;
      out.push(t);
    });
    if (recipePlanEligible(recipe)) {
      out.unshift("main-meal");
      seen["main-meal"] = 1;
    }
    out.unshift(meal);
    return out;
  }

  function recipeFitsMealSlot(recipe, slot) {
    if (!recipe || MEALS.indexOf(slot) === -1) return false;
    if (!recipePlanEligible(recipe)) return false;
    return inferMealCategory(recipe) === slot;
  }

  window.PW_MEAL = {
    MEALS: MEALS,
    PLAN_BANNED_TAGS: PLAN_BANNED_TAGS,
    inferMealCategory: inferMealCategory,
    inferNonMealKind: inferNonMealKind,
    recipePlanEligible: recipePlanEligible,
    hardNonMeal: hardNonMeal,
    scrubMealTags: scrubMealTags,
    recipeFitsMealSlot: recipeFitsMealSlot
  };
})();
