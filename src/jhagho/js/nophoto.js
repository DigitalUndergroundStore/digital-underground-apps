/* Pantry Week: designed no-photo cards (food-magazine style).
   Cuisine colours, 2-3 refined line motifs per cuisine picked by recipe id, dish name in the
   app serif, a small Pantry Week mark, and an optional "No photo yet · Add yours" button. */
"use strict";
(function () {
  var M = {
    forkknife: '<path d="M44 16v30c0 7 4 11 9 11v47"/><path d="M36 16v24M52 16v24"/><path d="M84 16c-9 7-12 20-12 32 0 7 4 11 10 11v45"/>',
    skillet: '<circle cx="52" cy="64" r="30"/><circle cx="52" cy="64" r="22" opacity=".5"/><path d="M80 52l30-14"/><path d="M42 58c3-5 9-5 12 0s9 5 12 0" opacity=".7"/><circle cx="46" cy="72" r="2.5"/><circle cx="60" cy="70" r="2"/>',
    drumstick: '<path d="M70 26c16 0 26 12 24 26-2 16-18 24-34 18L38 92"/><path d="M38 92c-4-2-10 0-10 6s7 8 10 4c3 3 9 1 8-5-1-4-5-6-8-5"/><path d="M62 40c6-3 14-1 18 5" opacity=".6"/>',
    burger: '<path d="M22 56c0-20 18-32 38-32s38 12 38 32z"/><path d="M18 66h84"/><path d="M20 76c8 6 16-6 24 0s16-6 24 0 16-6 24 0 8 2 8 2"/><path d="M24 86h72c0 8-6 12-14 12H38c-8 0-14-4-14-12z"/><path d="M44 38l2 2M60 34l2 2M74 40l2 2" opacity=".7"/>',
    pie: '<ellipse cx="60" cy="70" rx="44" ry="16"/><path d="M16 70v8c0 9 20 16 44 16s44-7 44-16v-8"/><path d="M28 62l64 0M34 56l52 16M86 56l-52 16" opacity=".6"/><path d="M60 54v32" opacity=".6"/>',
    teapot: '<path d="M30 54h52v20c0 14-12 24-26 24s-26-10-26-24z"/><path d="M82 60c12-2 16 10 6 16-4 2-8 2-8 2"/><path d="M30 62c-10-4-16 4-12 12l8 8"/><path d="M48 54c0-6 4-10 8-10s8 4 8 10M56 44v-4"/>',
    wheat: '<path d="M60 108V28"/><path d="M60 38c-10-4-14-12-14-20 8 2 14 8 14 20zM60 38c10-4 14-12 14-20-8 2-14 8-14 20zM60 56c-10-4-14-12-14-20 8 2 14 8 14 20zM60 56c10-4 14-12 14-20-8 2-14 8-14 20zM60 74c-10-4-14-12-14-20 8 2 14 8 14 20zM60 74c10-4 14-12 14-20-8 2-14 8-14 20z"/>',
    wine: '<path d="M44 16h32c2 20-2 34-16 38-14-4-18-18-16-38z"/><path d="M46 32h28" opacity=".6"/><path d="M60 54v36M44 92h32"/>',
    herb: '<path d="M60 108C58 80 56 54 60 18"/><path d="M60 40c-12-2-20-10-22-20 10 0 20 8 22 20zM60 58c12-2 20-10 22-20-10 0-20 8-22 20zM60 76c-12-2-20-10-22-20 10 0 20 8 22 20zM60 92c12-2 18-8 20-16-8 0-18 6-20 16z"/>',
    tomato: '<circle cx="58" cy="70" r="28"/><path d="M58 42c-6-6-16-6-20-2 6 0 10 2 12 6M58 42c4-8 14-10 20-6-6 1-10 4-12 8M58 42v-14c4-6 12-8 18-6"/><path d="M40 62c2-6 6-10 12-12" opacity=".5"/>',
    pasta: '<path d="M60 16v40"/><path d="M52 16v18c0 6 4 9 8 9s8-3 8-9V16"/><ellipse cx="60" cy="78" rx="34" ry="18"/><path d="M34 76c8-8 18 6 26-2s18 6 26-2M38 86c8-6 16 4 22-2s16 4 22-2" opacity=".7"/>',
    olive: '<path d="M18 102C44 76 70 52 106 20"/><ellipse cx="42" cy="72" rx="13" ry="5.5" transform="rotate(-50 42 72)"/><ellipse cx="62" cy="56" rx="13" ry="5.5" transform="rotate(12 62 56)"/><ellipse cx="78" cy="40" rx="13" ry="5.5" transform="rotate(-55 78 40)"/><ellipse cx="94" cy="30" rx="10" ry="4.5" transform="rotate(15 94 30)"/><ellipse cx="50" cy="84" rx="5" ry="6.5"/><ellipse cx="86" cy="54" rx="5" ry="6.5"/>',
    fish: '<path d="M14 60c18-24 54-28 76 0-22 28-58 24-76 0z"/><path d="M90 60l18-16v32z"/><circle cx="32" cy="56" r="2.5"/><path d="M48 44c7 9 7 23 0 32M62 46c5 8 5 20 0 28" opacity=".6"/>',
    chili: '<path d="M34 42c4-10 14-14 22-10 6 3 8 10 8 18 0 26-14 46-40 54 14-14 20-30 18-48-1-6-4-10-8-14z"/><path d="M56 32c2-8 8-12 16-12M60 28c6 0 10 4 10 10"/><path d="M42 56c2 10 0 22-6 32" opacity=".5"/>',
    corn: '<path d="M60 20c14 0 20 20 20 42s-8 40-20 40-20-18-20-40 6-42 20-42z"/><path d="M48 40h24M45 54h30M45 68h30M48 82h24M60 22v78" opacity=".55"/><path d="M40 70C26 66 20 82 26 100c10-4 20-14 22-24M80 70c14-4 20 12 14 30-10-4-20-14-22-24"/>',
    bowl: '<path d="M16 60h88c0 22-20 38-44 38S16 82 16 60z"/><path d="M44 98h32"/><path d="M58 52l42-36M70 54l38-30"/><path d="M32 52c4-6 10-6 14 0M54 50c4-6 10-6 14 0"/>',
    dumpling: '<path d="M18 74c0-18 18-30 42-30s42 12 42 30z"/><path d="M18 74h84"/><path d="M28 60c4 2 6 6 6 10M42 50c3 3 4 8 4 14M58 46c2 4 2 10 2 18M74 48c-1 4-2 10-2 16M88 56c-3 3-4 7-4 12" opacity=".7"/><path d="M30 86h60" opacity=".5"/>',
    wave: '<path d="M14 84c14-20 34-20 40 0 6-24 34-36 52-20"/><path d="M24 98c10-10 24-10 30 0s20 10 30 0 18-6 22 0" opacity=".6"/><circle cx="86" cy="32" r="12"/>',
    pot: '<path d="M22 54h76v26c0 14-10 22-22 22H44c-12 0-22-8-22-22V54z"/><path d="M14 54h92M44 54c0-12 7-20 16-20s16 8 16 20M60 34v-6"/><path d="M42 20c0-6 6-6 6-12M60 20c0-6 6-6 6-12M78 20c0-6 6-6 6-12" opacity=".6"/>',
    tagine: '<path d="M20 88h80c0 8-10 12-40 12S20 96 20 88z"/><path d="M26 88C30 60 46 34 60 22c14 12 30 38 34 66"/><circle cx="60" cy="18" r="4"/><path d="M40 70c12-4 28-4 40 0" opacity=".6"/>',
    leaf: '<path d="M60 106C30 92 22 58 34 26c30 6 50 30 44 62"/><path d="M60 106C60 78 54 54 38 32"/><path d="M48 60l14-6M44 76l18-4" opacity=".6"/>',
    maple: '<path d="M60 12l8 18 12-6-4 20 16-6-6 14 14 4-24 16 4 10-20-4v28M60 12l-8 18-12-6 4 20-16-6 6 14-14 4 24 16-4 10 20-4"/>'
  };
  var C = { /* bg1, bg2, ink, accent, [motifs], label */
    american:      ["#f7efe4", "#ead6bd", "#4a2f1b", "#a85d2a", ["burger", "skillet", "drumstick"], "American"],
    canadian:      ["#f8ece8", "#eccfc8", "#5e241d", "#ad3a2b", ["maple", "pie", "skillet"], "Canadian"],
    british:       ["#eef0ea", "#d5dbcc", "#2c3829", "#56704f", ["pie", "teapot", "forkknife"], "British"],
    european:      ["#eef0ea", "#d5dbcc", "#2c3829", "#56704f", ["wheat", "herb", "forkknife"], "European"],
    french:        ["#eef0f6", "#d4daea", "#26304c", "#485c90", ["wine", "wheat", "herb"], "French"],
    italian:       ["#f5f1e3", "#e5dbb5", "#3a3716", "#7b7328", ["tomato", "pasta", "olive"], "Italian"],
    greek:         ["#ebf3f6", "#cde0e9", "#1c3a4a", "#3b7393", ["olive", "fish", "herb"], "Greek"],
    mediterranean: ["#edf4ec", "#d0e3cf", "#223e29", "#4a7a52", ["olive", "tomato", "fish"], "Mediterranean"],
    middle_eastern:["#f8efe0", "#ebd5b0", "#4c3413", "#a46e26", ["tagine", "herb", "pot"], "Middle Eastern"],
    african:       ["#f8ebde", "#eccfb1", "#522e18", "#b05c28", ["pot", "tagine", "leaf"], "African"],
    caribbean:     ["#e8f4ef", "#c7e5d9", "#1b4034", "#2b8667", ["leaf", "chili", "fish"], "Caribbean"],
    mexican:       ["#f9ebe2", "#efcdba", "#592212", "#c04d27", ["chili", "corn", "skillet"], "Mexican"],
    latin_american:["#f9eee0", "#f0d5b4", "#573214", "#bd7629", ["corn", "chili", "pot"], "Latin American"],
    indian:        ["#fbf0dc", "#f1d7a6", "#57380b", "#c3851a", ["pot", "leaf", "chili"], "Indian"],
    chinese:       ["#f8eae8", "#ebcdca", "#561b1a", "#a33832", ["dumpling", "bowl", "fish"], "Chinese"],
    japanese:      ["#f4f2ef", "#e2dcd5", "#2a2826", "#8a3a2e", ["wave", "fish", "bowl"], "Japanese"],
    korean:        ["#f1eef6", "#dbd3e9", "#31264b", "#67519f", ["bowl", "dumpling", "chili"], "Korean"],
    thai:          ["#edf5e7", "#d4e6c3", "#293d1a", "#5c8932", ["leaf", "chili", "bowl"], "Thai"],
    southeast_asian:["#edf5e7", "#d4e6c3", "#293d1a", "#5c8932", ["bowl", "leaf", "fish"], "Southeast Asian"],
    other:         ["#f3f0e9", "#e2dccd", "#312e28", "#786c54", ["forkknife", "wheat", "herb"], "Home cooking"]
  };
  function cuisineOf(recipe) {
    var tags = (recipe && recipe.tags) || [];
    for (var i = 0; i < tags.length; i++) if (C[tags[i]] && tags[i] !== "other") return tags[i];
    var n = ((recipe && recipe.name) || "").toLowerCase();
    if (/taco|burrito|fajita|enchilada|quesadilla|salsa/.test(n)) return "mexican";
    if (/pasta|risotto|lasagna|pizza|gnocchi|parm/.test(n)) return "italian";
    if (/curry|dal|masala|tikka|biryani/.test(n)) return "indian";
    if (/stir.?fry|fried rice|lo mein|dumpling/.test(n)) return "chinese";
    return "other";
  }
  function hash(s) { var h = 2166136261; s = String(s || ""); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function motifFor(recipe, c) {
    var set = (C[c] || C.other)[4];
    return set[hash((recipe && (recipe.id || recipe.name)) || "") % set.length];
  }
  var MARK = '<span class="pw-np__mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 17V7h4.5a3 3 0 0 1 0 6H8"/></svg><span>Pantry Week</span></span>';
  var CAM = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg>';
  function addButton(recipe, compact) {
    if (!recipe || !recipe.id) return "";
    return '<button type="button" class="pw-np__add" data-action="add-photo" data-id="' + esc(recipe.id) + '" aria-label="No photo yet. Add your own photo of ' + esc(recipe.name || "this recipe") + '">' + CAM +
      '<span>' + (compact ? "Add yours" : "No photo yet · Add yours") + "</span></button>";
  }
  /* variant: "card" | "hero" | "thumb"; opts.add = show the camera button */
  function html(recipe, cls, variant, opts) {
    var c = cuisineOf(recipe), p = C[c] || C.other, m = motifFor(recipe, c);
    var name = (recipe && recipe.name) || "";
    var style = "--np-bg1:" + p[0] + ";--np-bg2:" + p[1] + ";--np-ink:" + p[2] + ";--np-accent:" + p[3];
    var svg = '<svg class="pw-np__motif" viewBox="0 0 120 120" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + M[m] + "</svg>";
    var tag = variant === "thumb" ? "span" : "div";
    var inner = variant === "thumb" ? svg
      : '<span class="pw-np__frame" aria-hidden="true"></span>' + MARK + svg +
        '<span class="pw-np__text"><span class="pw-np__kicker">' + esc(p[5]) + '</span><span class="pw-np__name">' + esc(name) + "</span></span>" +
        (opts && opts.add ? addButton(recipe, variant === "card") : "");
    return "<" + tag + ' class="' + cls + " pw-np pw-np--" + variant + " pw-np--" + c + " pw-np--m-" + m + '" style="' + style + '"' + (opts && opts.add ? "" : ' role="img" aria-label="' + esc(name) + '"') + ">" + inner + "</" + tag + ">";
  }
  window.PW_NOPHOTO = { html: html, cuisineOf: cuisineOf, motifFor: motifFor, addButton: addButton };
})();
