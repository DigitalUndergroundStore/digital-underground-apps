/* Pantry Week — import parsers (Paprika, Mela, schema.org, CSV). No network. */
"use strict";

(function () {
  var PW = window.PW;

  function bytesToText(bytes) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  function decompress(format, bytes) {
    if (typeof DecompressionStream === "undefined") {
      return Promise.reject(new Error("This browser can't read compressed recipe files. Try a newer browser or paste the recipe text instead."));
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
    return new Response(stream).arrayBuffer().then(function (ab) {
      return new Uint8Array(ab);
    });
  }

  function gunzip(bytes) {
    return decompress("gzip", bytes);
  }

  function inflateZip(bytes) {
    return decompress("deflate-raw", bytes);
  }

  function readU16(dv, off) { return dv.getUint16(off, true); }
  function readU32(dv, off) { return dv.getUint32(off, true); }

  function unzipEntries(bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var len = bytes.byteLength;
    var eocd = -1;
    for (var i = len - 22; i >= Math.max(0, len - 65557); i--) {
      if (readU32(dv, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("That ZIP file could not be read.");
    var cdCount = readU16(dv, eocd + 10);
    var cdSize = readU32(dv, eocd + 12);
    var cdOffset = readU32(dv, eocd + 16);
    var out = [];
    var pos = cdOffset;
    for (var n = 0; n < cdCount && pos + 46 <= len; n++) {
      if (readU32(dv, pos) !== 0x02014b50) break;
      var comp = readU16(dv, pos + 10);
      var compSize = readU32(dv, pos + 20);
      var uncompSize = readU32(dv, pos + 24);
      var nameLen = readU16(dv, pos + 28);
      var extraLen = readU16(dv, pos + 30);
      var commentLen = readU16(dv, pos + 32);
      var localOff = readU32(dv, pos + 42);
      var name = bytesToText(bytes.subarray(pos + 46, pos + 46 + nameLen));
      pos += 46 + nameLen + extraLen + commentLen;
      if (readU32(dv, localOff) !== 0x04034b50) continue;
      var localNameLen = readU16(dv, localOff + 26);
      var localExtraLen = readU16(dv, localOff + 28);
      var dataStart = localOff + 30 + localNameLen + localExtraLen;
      var data = bytes.subarray(dataStart, dataStart + compSize);
      var body;
      out.push({ name: name, comp: comp, data: data, uncompSize: uncompSize });
    }
    return Promise.all(out.map(function (entry) {
      if (entry.comp === 0) {
        entry.body = entry.data;
        return entry;
      }
      if (entry.comp === 8) {
        return inflateZip(entry.data).then(function (plain) {
          entry.body = plain;
          return entry;
        });
      }
      throw new Error("Unsupported compression in " + entry.name);
    }));
  }

  function parseIngredientStrings(lines) {
    var list = [];
    (lines || []).forEach(function (line) {
      var parsed = PW.parseIngredientLine(String(line).trim());
      if (parsed && parsed.item) list.push(parsed);
      else if (String(line).trim()) list.push({ qty: null, unit: "", item: String(line).trim() });
    });
    return list;
  }

  function linesFromBlock(text) {
    return String(text || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function iso8601Minutes(val) {
    if (!val) return null;
    var s = String(val);
    var m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
    if (!m) return PW.parseMinutes(s);
    var mins = 0;
    if (m[1]) mins += parseInt(m[1], 10) * 60;
    if (m[2]) mins += parseInt(m[2], 10);
    return mins || null;
  }

  function pickImage(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    if (Array.isArray(obj) && obj.length) return pickImage(obj[0]);
    if (obj.url) return String(obj.url);
    return "";
  }

  function stepsFromInstructions(instr) {
    var steps = [];
    if (!instr) return steps;
    var list = Array.isArray(instr) ? instr : [instr];
    list.forEach(function (item) {
      if (item == null) return;
      if (typeof item === "string") {
        linesFromBlock(item).forEach(function (l) { steps.push(l); });
        return;
      }
      if (item.text) steps.push(String(item.text).trim());
      else if (item.name) steps.push(String(item.name).trim());
      else if (item.itemListElement) {
        steps = steps.concat(stepsFromInstructions(item.itemListElement));
      }
    });
    return steps.filter(Boolean);
  }

  function ingredientsFromSchema(obj) {
    var raw = obj.recipeIngredient || obj.ingredients;
    if (!raw) return [];
    var lines = [];
    if (Array.isArray(raw)) {
      raw.forEach(function (item) {
        if (typeof item === "string") lines.push(item);
        else if (item && item.name) lines.push(item.name);
      });
    } else if (typeof raw === "string") {
      lines = linesFromBlock(raw);
    }
    return parseIngredientStrings(lines);
  }

  function draftFromSchemaRecipe(obj) {
    if (!obj || typeof obj !== "object") return null;
    var type = obj["@type"];
    if (type && String(type).toLowerCase().indexOf("recipe") === -1 && type !== "Recipe") return null;
    var name = obj.name || obj.headline;
    if (!name) return null;
    var prep = iso8601Minutes(obj.prepTime);
    var cook = iso8601Minutes(obj.cookTime);
    var total = iso8601Minutes(obj.totalTime);
    var minutes = total || (prep && cook ? prep + cook : prep || cook);
    var servings = parseInt(obj.recipeYield, 10);
    if (!servings && Array.isArray(obj.recipeYield)) servings = parseInt(obj.recipeYield[0], 10);
    if (!servings && typeof obj.recipeYield === "string") {
      var y = obj.recipeYield.match(/(\d+)/);
      if (y) servings = parseInt(y[1], 10);
    }
    var tags = [];
    if (obj.recipeCategory) {
      (Array.isArray(obj.recipeCategory) ? obj.recipeCategory : [obj.recipeCategory]).forEach(function (c) {
        tags.push(String(c).toLowerCase());
      });
    }
    if (obj.keywords) {
      String(obj.keywords).split(/[,;]/).forEach(function (k) {
        var t = k.trim().toLowerCase();
        if (t) tags.push(t);
      });
    }
    var photoUrl = pickImage(obj.image);
    return {
      name: String(name).trim(),
      minutes: minutes,
      servings: servings || 4,
      tags: tags,
      ingredients: ingredientsFromSchema(obj),
      steps: stepsFromInstructions(obj.recipeInstructions),
      photoUrl: photoUrl && /^https?:\/\//i.test(photoUrl) ? photoUrl : ""
    };
  }

  function collectSchemaRecipes(data) {
    var out = [];
    function walk(node) {
      if (node == null) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node !== "object") return;
      if (node["@graph"]) walk(node["@graph"]);
      var types = node["@type"];
      var isRecipe = false;
      if (types) {
        var arr = Array.isArray(types) ? types : [types];
        isRecipe = arr.some(function (t) { return String(t).toLowerCase().indexOf("recipe") !== -1; });
      } else if (node.recipeIngredient || node.recipeInstructions) {
        isRecipe = true;
      }
      if (isRecipe) {
        var d = draftFromSchemaRecipe(node);
        if (d && d.name) out.push(d);
      }
      Object.keys(node).forEach(function (k) {
        if (k === "@context" || k === "@type") return;
        walk(node[k]);
      });
    }
    walk(data);
    return out;
  }

  function draftFromPaprika(obj) {
    if (!obj || !obj.name) return null;
    var ingredients = [];
    if (Array.isArray(obj.ingredients)) ingredients = parseIngredientStrings(obj.ingredients);
    else ingredients = parseIngredientStrings(linesFromBlock(obj.ingredients));
    var steps = [];
    if (Array.isArray(obj.directions)) steps = obj.directions.map(String);
    else steps = linesFromBlock(obj.directions);
    var minutes = PW.parseMinutes(obj.total_time || obj.cook_time || obj.prep_time);
    var servings = parseInt(obj.servings, 10) || 4;
    var tags = [];
    if (obj.categories) {
      (Array.isArray(obj.categories) ? obj.categories : [obj.categories]).forEach(function (c) {
        tags.push(String(c).toLowerCase());
      });
    }
    if (obj.rating) { /* ignore */ }
    var photoUrl = obj.photo_url || obj.photo || "";
    if (photoUrl && !/^https?:\/\//i.test(photoUrl)) photoUrl = "";
    return {
      name: String(obj.name).trim(),
      minutes: minutes,
      servings: servings,
      tags: tags,
      ingredients: ingredients,
      steps: steps,
      photoUrl: photoUrl
    };
  }

  function draftFromMela(obj) {
    if (!obj) return null;
    var name = obj.title || obj.name;
    if (!name) return null;
    var ingredients = [];
    (obj.ingredients || []).forEach(function (ing) {
      if (typeof ing === "string") {
        var p = PW.parseIngredientLine(ing);
        if (p && p.item) ingredients.push(p);
      } else if (ing && ing.name) {
        ingredients.push({ qty: ing.amount || ing.quantity || null, unit: ing.unit || "", item: ing.name });
      }
    });
    var steps = [];
    (obj.instructions || obj.steps || []).forEach(function (step) {
      if (typeof step === "string") steps.push(step);
      else if (step && step.text) steps.push(step.text);
    });
    var minutes = PW.parseMinutes(obj.totalTime || obj.cookTime || obj.prepTime);
    var servings = parseInt(obj.servings || obj.yield, 10) || 4;
    var photoUrl = pickImage(obj.image || obj.photo);
    return {
      name: String(name).trim(),
      minutes: minutes,
      servings: servings,
      tags: [],
      ingredients: ingredients,
      steps: steps,
      photoUrl: photoUrl && /^https?:\/\//i.test(photoUrl) ? photoUrl : ""
    };
  }

  function guessPhotoKey(draft) {
    var hay = (draft.name + " " + (draft.tags || []).join(" ")).toLowerCase();
    if (/soup|stew|chili|broth/.test(hay)) return "soup-italian";
    if (/taco|burrito|enchilada/.test(hay)) return "tacos-mexican";
    if (/stir.?fry|fried rice/.test(hay)) return "stir-fry-asian";
    if (/curry|tikka|masala|dal/.test(hay)) return "skillet-indian";
    if (/pasta|spaghetti|lasagna|risotto/.test(hay)) return "skillet-italian";
    if (/salad/.test(hay)) return "salad-canadian";
    if (/pancake|waffle|breakfast|omelette|frittata/.test(hay)) return "skillet-canadian";
    return "skillet-canadian";
  }

  function finalizeDraft(draft) {
    var tags = (draft.tags || []).slice();
    if (tags.indexOf("imported") === -1) tags.push("imported");
    if (tags.indexOf("my-creation") === -1) tags.push("my-creation");
    if (tags.indexOf("dinner") === -1 && tags.indexOf("lunch") === -1 && tags.indexOf("breakfast") === -1) {
      tags.push("dinner");
    }
    var recipe = PW.normalizeRecipe({
      id: PW.uid("c_"),
      name: draft.name,
      minutes: draft.minutes,
      servings: draft.servings,
      tags: tags,
      ingredients: draft.ingredients,
      steps: draft.steps
    });
    if (draft.photoUrl) recipe.photoUrl = draft.photoUrl;
    else if (!recipe.photoKey) recipe.photoKey = guessPhotoKey(draft);
    return recipe;
  }

  function recipeNameKey(name) {
    return PW.base(name);
  }

  function findDuplicate(recipes, name) {
    var key = recipeNameKey(name);
    if (!key) return null;
    for (var i = 0; i < recipes.length; i++) {
      if (recipeNameKey(recipes[i].name) === key) return recipes[i];
    }
    return null;
  }

  function parseJsonText(text) {
    var data = JSON.parse(text);
    if (data && data.state && data.state.recipes) {
      throw new Error("That file looks like a Pantry Week backup. Use Import backup on the More screen.");
    }
    var drafts = collectSchemaRecipes(data);
    if (!drafts.length && data.name && (data.ingredients || data.recipeIngredient)) {
      var one = draftFromSchemaRecipe(data);
      if (one) drafts = [one];
    }
    if (!drafts.length && data.name && data.ingredients) {
      var pap = draftFromPaprika(data);
      if (pap) drafts = [pap];
    }
    if (!drafts.length && (data.title || data.name) && data.ingredients) {
      var mel = draftFromMela(data);
      if (mel) drafts = [mel];
    }
    return drafts;
  }

  function parseFileBytes(bytes, filename) {
    var lower = String(filename || "").toLowerCase();
    if (lower.endsWith(".paprikarecipe") || lower.endsWith(".gz")) {
      return gunzip(bytes).then(function (plain) {
        return parseJsonText(bytesToText(plain));
      });
    }
    if (lower.endsWith(".paprikarecipes") || lower.endsWith(".melarecipes") || lower.endsWith(".zip")) {
      return unzipEntries(bytes).then(function (entries) {
        var drafts = [];
        return Promise.all(entries.map(function (entry) {
          var n = entry.name.toLowerCase();
          if (n.endsWith(".paprikarecipe")) {
            return gunzip(entry.body).then(function (plain) {
              var p = draftFromPaprika(JSON.parse(bytesToText(plain)));
              if (p) drafts.push(p);
            });
          }
          if (n.endsWith(".melarecipe")) {
            var m = draftFromMela(JSON.parse(bytesToText(entry.body)));
            if (m) drafts.push(m);
            return null;
          }
          if (n.endsWith(".json")) {
            try {
              var d = parseJsonText(bytesToText(entry.body));
              drafts = drafts.concat(d);
            } catch (e) { /* skip */ }
          }
          return null;
        })).then(function () { return drafts; });
      });
    }
    if (lower.endsWith(".melarecipe")) {
      return Promise.resolve([draftFromMela(JSON.parse(bytesToText(bytes)))].filter(Boolean));
    }
    if (lower.endsWith(".json") || lower.endsWith(".jsonld")) {
      return Promise.resolve(parseJsonText(bytesToText(bytes)));
    }
    if (lower.endsWith(".csv")) {
      return Promise.reject(new Error("csv-needs-map"));
    }
    return gunzip(bytes).then(function (plain) {
      return parseJsonText(bytesToText(plain));
    }).catch(function () {
      return parseJsonText(bytesToText(bytes));
    });
  }

  function parseCsv(text, map) {
    var lines = String(text || "").replace(/\r/g, "").split("\n").filter(function (l) { return l.trim(); });
    if (lines.length < 2) throw new Error("CSV needs a header row and at least one recipe row.");
    var header = splitCsvLine(lines[0]).map(function (h) { return h.trim().toLowerCase(); });
    var rows = lines.slice(1).map(splitCsvLine);
    var idx = {};
    Object.keys(map || {}).forEach(function (key) {
      var col = String(map[key] || "").trim().toLowerCase();
      if (!col) return;
      var i = header.indexOf(col);
      if (i >= 0) idx[key] = i;
    });
    if (idx.name == null) throw new Error("Map which column has the recipe name.");
    var drafts = [];
    rows.forEach(function (cells) {
      var name = cells[idx.name];
      if (!name || !String(name).trim()) return;
      var ingLines = [];
      if (idx.ingredients != null && cells[idx.ingredients]) {
        ingLines = String(cells[idx.ingredients]).split(/\||;/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (ingLines.length === 1 && ingLines[0].indexOf("\n") !== -1) {
          ingLines = linesFromBlock(ingLines[0]);
        }
      }
      var stepLines = [];
      if (idx.steps != null && cells[idx.steps]) {
        stepLines = String(cells[idx.steps]).split(/\||;/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (stepLines.length === 1) stepLines = linesFromBlock(stepLines[0]);
      }
      drafts.push({
        name: String(name).trim(),
        minutes: idx.minutes != null ? PW.parseMinutes(cells[idx.minutes]) : null,
        servings: idx.servings != null ? parseInt(cells[idx.servings], 10) : 4,
        tags: [],
        ingredients: parseIngredientStrings(ingLines),
        steps: stepLines,
        photoUrl: ""
      });
    });
    return drafts;
  }

  function splitCsvLine(line) {
    var out = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function csvHeaders(text) {
    var first = String(text || "").replace(/\r/g, "").split("\n").filter(Boolean)[0];
    if (!first) return [];
    return splitCsvLine(first).map(function (h) { return h.trim(); });
  }

  function recipeFetchEndpoint() {
    if (/^https?:$/i.test(String(location.protocol || "")) && /digitalundergroundstore\.com/i.test(String(location.hostname || ""))) {
      return "/api/recipe-fetch";
    }
    return "https://digitalundergroundstore.com/api/recipe-fetch";
  }

  function fetchRecipeFromUrl(url) {
    return fetch(recipeFetchEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url: String(url || "").trim() })
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body && body.error ? body.error : "Could not fetch that link.");
        return body;
      });
    }).then(function (body) {
      var drafts = collectSchemaRecipes(body.recipe || body);
      if (!drafts.length && body.recipe) {
        var one = draftFromSchemaRecipe(body.recipe);
        if (one) drafts = [one];
      }
      if (!drafts.length) throw new Error("No schema.org Recipe was found on that page.");
      return drafts;
    });
  }

  window.PW_IMPORT = {
    parseFileBytes: parseFileBytes,
    parseJsonText: parseJsonText,
    parseCsv: parseCsv,
    csvHeaders: csvHeaders,
    collectSchemaRecipes: collectSchemaRecipes,
    draftFromSchemaRecipe: draftFromSchemaRecipe,
    finalizeDraft: finalizeDraft,
    findDuplicate: findDuplicate,
    recipeNameKey: recipeNameKey,
    fetchRecipeFromUrl: fetchRecipeFromUrl,
    guessPhotoKey: guessPhotoKey
  };
})();
