/* Smart Chef sourcing: library recipe, then one real web recipe, then the template builder. */
"use strict";

(function () {
  var WEB_TIMEOUT_MS = 6000;
  var SKIP = {
    salt: 1,
    pepper: 1,
    "black pepper": 1,
    water: 1,
    "olive oil": 1,
    oil: 1,
    butter: 1
  };

  function seenSet(list) {
    var set = {};
    (list || []).forEach(function (h) { if (h) set[h] = 1; });
    return set;
  }

  function isLibraryId(id) {
    return /^r\d+$/.test(String(id || ""));
  }

  function nameKey(name) {
    if (window.PW_IMPORT && PW_IMPORT.recipeNameKey) return PW_IMPORT.recipeNameKey(name);
    if (window.PW && PW.base) return PW.base(name);
    return String(name || "").toLowerCase().trim();
  }

  function addPart(parts, seen, name) {
    if (parts.length >= 4) return;
    var s = String(name || "").replace(/,.*/, "").replace(/^(medium|large|small)\s+/i, "").trim();
    if (!s) return;
    var key = window.PW && PW.stapleKey ? PW.stapleKey(s) : s.toLowerCase();
    if (!key || SKIP[key] || seen[key]) return;
    seen[key] = 1;
    parts.push(s);
  }

  function pantrySearchQuery(pantry) {
    var parts = [];
    var seen = {};
    if (window.PW_SMART_CHEF && PW_SMART_CHEF.classifyPantry) {
      var buckets = PW_SMART_CHEF.classifyPantry(pantry);
      if (buckets.protein && buckets.protein.name) addPart(parts, seen, buckets.protein.name);
      (buckets.vegFast || []).forEach(function (name) { addPart(parts, seen, name); });
      (buckets.vegSlow || []).forEach(function (name) { addPart(parts, seen, name); });
      if (buckets.starch && buckets.starch.name) addPart(parts, seen, buckets.starch.name);
    }
    (pantry || []).forEach(function (entry) {
      addPart(parts, seen, typeof entry === "string" ? entry : entry && entry.item);
    });
    if (!parts.length) return "";
    return parts.slice(0, 4).join(" ") + " recipe";
  }

  function fitOf(recipe, pantry) {
    if (!window.PW || !PW.recipePantryFit) return { matched: 0, missing: 99, missingItems: [], total: 0 };
    var have = PW.pantryHaveSet(pantry);
    return PW.recipePantryFit(recipe, have, PW.pantryStapleIgnore());
  }

  function makeable(fit) {
    return !!(fit && fit.total > 0 && fit.matched >= 2 && fit.missing <= 4);
  }

  function pickLibraryRecipe(pantry, recipes, seenList) {
    var seen = seenSet(seenList);
    var best = null;
    var bestFit = null;
    var bestScore = null;
    (recipes || []).forEach(function (recipe) {
      if (!recipe || !isLibraryId(recipe.id)) return;
      if ((recipe.tags || []).indexOf("smart-chef") !== -1) return;
      if (seen["lib:" + recipe.id]) return;
      var nk = nameKey(recipe.name);
      if (nk && seen["name:" + nk]) return;
      var fit = fitOf(recipe, pantry);
      if (!makeable(fit)) return;
      var classic = PW.recipeClassicBoost ? PW.recipeClassicBoost(recipe) : 0;
      var score = [fit.missing, -fit.matched, -classic, String(recipe.name || "")];
      if (!best || compareScore(score, bestScore) < 0) {
        best = recipe;
        bestFit = fit;
        bestScore = score;
      }
    });
    if (!best) return null;
    return {
      recipe: best,
      source: "library",
      sourceName: "Pantry Week library",
      sourceUrl: best.sourceUrl || "",
      templateLabel: "From your library",
      profileLabel: "",
      missing: bestFit.missingItems.slice(),
      fingerprint: "lib:" + best.id,
      nameHash: "name:" + nameKey(best.name)
    };
  }

  function compareScore(a, b) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return 0;
  }

  function webResult(draft, hit) {
    var recipe = window.PW_IMPORT ? PW_IMPORT.finalizeDraft(draft) : draft;
    if (hit && hit.image && !recipe.photoUrl) recipe.photoUrl = hit.image;
    if (hit && hit.url) {
      recipe.sourceUrl = hit.url;
      recipe.sourceName = hit.source || "Wikibooks";
      recipe.sourceLicense = hit.license || "";
    }
    var fit = fitOf(recipe, webResult._pantry || []);
    return {
      recipe: recipe,
      source: "web",
      sourceName: recipe.sourceName || "Wikibooks",
      sourceUrl: recipe.sourceUrl || "",
      sourceLicense: recipe.sourceLicense || "",
      templateLabel: "From the web",
      profileLabel: recipe.sourceName || "",
      missing: fit.missingItems || [],
      fingerprint: "web:" + (recipe.sourceUrl || recipe.name),
      nameHash: "name:" + nameKey(recipe.name)
    };
  }

  function findWebRecipe(query, seenList, pantry, timeoutMs) {
    if (!query || !window.PW_FIND || !window.PW_IMPORT || typeof AbortController === "undefined") {
      return Promise.resolve(null);
    }
    var seen = seenSet(seenList);
    var ms = timeoutMs || WEB_TIMEOUT_MS;
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    webResult._pantry = pantry;
    return PW_FIND.search(query, { signal: ctrl ? ctrl.signal : undefined }).then(function (body) {
      var hits = ((body && body.results) || []).filter(function (hit) {
        return hit && hit.url && !seen["web:" + hit.url];
      }).slice(0, 4);
      var chain = Promise.resolve(null);
      hits.forEach(function (hit) {
        chain = chain.then(function (found) {
          if (found) return found;
          if (ctrl && ctrl.signal.aborted) return null;
          return PW_IMPORT.fetchRecipeFromUrl(hit.url, { signal: ctrl ? ctrl.signal : undefined }).then(function (drafts) {
            var draft = drafts && drafts[0];
            if (!draft || !draft.name) return null;
            if (!draft.ingredients || !draft.ingredients.length) return null;
            if (hit.image && !draft.photoUrl) draft.photoUrl = hit.image;
            var nk = nameKey(draft.name);
            if (nk && seen["name:" + nk]) return null;
            return webResult(draft, hit);
          }).catch(function (err) {
            if (err && err.name === "AbortError") throw err;
            return null;
          });
        });
      });
      return chain;
    }).then(function (found) {
      clearTimeout(timer);
      return found || null;
    }).catch(function () {
      clearTimeout(timer);
      return null;
    });
  }

  window.PW_SOURCE = {
    WEB_TIMEOUT_MS: WEB_TIMEOUT_MS,
    isLibraryId: isLibraryId,
    pantrySearchQuery: pantrySearchQuery,
    pickLibraryRecipe: pickLibraryRecipe,
    findWebRecipe: findWebRecipe,
    makeable: makeable,
    nameKey: nameKey
  };
})();
