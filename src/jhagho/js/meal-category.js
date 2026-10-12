/* Pantry Week — one breakfast / lunch / dinner category per recipe. */
"use strict";

(function () {
  var MEALS = ["breakfast", "lunch", "dinner"];

  var BREAKFAST_NAME = /\b(breakfast|brunch|pancake|waffle|omelette|omelet|scramble|parfait|granola|oatmeal|french toast|smoothie|overnight oats|shakshuka|hash|frittata|eggs?\s+benedict|porridge|congee|acai|bagel|croissant|muesli|english breakfast|breakfast burrito|breakfast casserole|breakfast dürüm|breakfast durum|breakfast dog|latino scramble|appam|malpua|okonomiyaki|sinasir|roti jala|\bdosa\b|\bidli\b|\bvada\b|chilaquiles|huevos|muffins?\b|banana bread|cinnamon roll|crepe|blintz|latke|johnnycake|hoecake|yogurt parfait|chia parfait|berry chia)\b/i;

  var LUNCH_NAME = /\b(\blunch\b|sandwich|panini|sub\b|club\b|lunch box|lunch jar|grain bowl|lunch bowl|\bbowl\b|taco salad|chicken salad|egg salad|tuna salad|ceviche|gazpacho|broth\b|minestrone|pho\b|ramen\b|udon\b|soba\b|noodle bowl|quesadilla|tostada|empanada|samosa|banh mi|caprese toast|avocado toast|tartine|ploughman|picnic|wraps?\b|panini|slider)\b/i;

  var SOUP_NAME = /\b(soup|chowder|bisque|stew|chili|curry|gumbo|ragout)\b/i;

  var DESSERT_NAME = /\b(cookie|brownie|mousse|crisp|tart|bars\b|pudding|cake|pie\b|nice cream|nanaimo|fudge|truffle|cheesecake)\b/i;

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

  function inferMealCategory(recipe) {
    var name = String(recipe && recipe.name || "");
    var tags = recipe && recipe.tags || [];
    var minutes = recipe && recipe.minutes;
    var blob = haystack(recipe);

    if (BREAKFAST_NAME.test(name) || BREAKFAST_NAME.test(blob)) return "breakfast";
    if (/\blunch\b/i.test(name)) return "lunch";
    if (/\bdinner\b/i.test(name)) return "dinner";

    if (LUNCH_NAME.test(name)) {
      if (/\bdinner\b/i.test(name) && !/\blunch\b/i.test(name)) return "dinner";
      return "lunch";
    }

    if (typeof minutes === "number" && minutes <= 12) {
      if (/\b(yogurt|toast|berries|berry|chia|granola|fruit)\b/i.test(name)) return "breakfast";
    }

    if (DESSERT_NAME.test(name)) {
      if (/\b(parfaits?|muffin|oatmeal|granola|nice cream)\b/i.test(name)) return "breakfast";
      return "dinner";
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
      if (seen[t]) return;
      seen[t] = 1;
      out.push(t);
    });
    out.unshift(meal);
    return out;
  }

  function recipeFitsMealSlot(recipe, slot) {
    return inferMealCategory(recipe) === slot;
  }

  window.PW_MEAL = {
    MEALS: MEALS,
    inferMealCategory: inferMealCategory,
    scrubMealTags: scrubMealTags,
    recipeFitsMealSlot: recipeFitsMealSlot
  };
})();
