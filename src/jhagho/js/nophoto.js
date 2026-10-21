/* Pantry Week: designed no-photo cards. One colour scheme + line-art motif per cuisine,
   dish name set in the app serif. Used wherever a recipe has no photo (incl. imports). */
"use strict";
(function () {
  var M = {
    fork: '<path d="M38 18v26c0 6 4 10 9 10v48M30 18v22M46 18v22M82 18c-8 6-10 18-10 30 0 7 4 10 9 10v44"/>',
    olive: '<path d="M20 100C44 76 70 52 104 22"/><ellipse cx="44" cy="70" rx="13" ry="6" transform="rotate(-50 44 70)"/><ellipse cx="62" cy="56" rx="13" ry="6" transform="rotate(10 62 56)"/><ellipse cx="76" cy="40" rx="13" ry="6" transform="rotate(-55 76 40)"/><ellipse cx="92" cy="30" rx="10" ry="5" transform="rotate(15 92 30)"/><circle cx="52" cy="80" r="5"/><circle cx="84" cy="52" r="5"/>',
    wheat: '<path d="M60 108V30"/><path d="M60 40c-10-4-14-12-14-20 8 2 14 8 14 20zM60 40c10-4 14-12 14-20-8 2-14 8-14 20zM60 58c-10-4-14-12-14-20 8 2 14 8 14 20zM60 58c10-4 14-12 14-20-8 2-14 8-14 20zM60 76c-10-4-14-12-14-20 8 2 14 8 14 20zM60 76c10-4 14-12 14-20-8 2-14 8-14 20z"/>',
    chili: '<path d="M34 40c4-10 14-14 22-10 6 3 8 10 8 18 0 26-14 46-40 54 14-14 20-30 18-48-1-6-4-10-8-14z"/><path d="M56 30c2-8 8-12 16-12M60 26c6 0 10 4 10 10"/>',
    bowl: '<path d="M18 60h84c0 22-18 38-42 38S18 82 18 60z"/><path d="M44 98h32"/><path d="M58 52l40-36M70 54l36-30"/><path d="M34 52c4-6 10-6 14 0M56 50c4-6 10-6 14 0"/>',
    leaf: '<path d="M60 104C30 90 22 58 34 28c30 6 50 30 44 62"/><path d="M60 104C60 76 54 54 38 34"/><circle cx="84" cy="30" r="3"/><circle cx="92" cy="42" r="2.5"/><circle cx="96" cy="56" r="2"/>',
    maple: '<path d="M60 14l8 18 12-6-4 20 16-6-6 14 14 4-24 16 4 10-20-4v26M60 14l-8 18-12-6 4 20-16-6 6 14-14 4 24 16-4 10 20-4"/>',
    pot: '<path d="M24 54h72v26c0 14-10 22-22 22H46c-12 0-22-8-22-22V54z"/><path d="M16 54h88M44 54c0-12 7-20 16-20s16 8 16 20M60 34v-6"/><path d="M42 20c0-6 6-6 6-12M60 20c0-6 6-6 6-12M78 20c0-6 6-6 6-12"/>',
    fish: '<path d="M16 60c16-22 50-26 72 0-22 26-56 22-72 0z"/><path d="M88 60l18-16v32z"/><circle cx="34" cy="56" r="3"/><path d="M50 46c6 8 6 20 0 28"/>'
  };
  /* bg1, bg2, ink, accent, motif */
  var C = {
    american:      ["#f6efe6", "#ecd9c3", "#5a3a22", "#b5652f", "fork", "American"],
    canadian:      ["#f8ece9", "#efd2cc", "#6b2a22", "#b8392a", "maple", "Canadian"],
    british:       ["#eef0ec", "#d6dccf", "#2f3b2c", "#5e7356", "fork", "British"],
    european:      ["#eef0ec", "#d6dccf", "#2f3b2c", "#5e7356", "wheat", "European"],
    french:        ["#eef0f6", "#d5dbea", "#28324f", "#4b5f93", "wheat", "French"],
    italian:       ["#f4f1e4", "#e4dcb9", "#3d3a18", "#7c7a2c", "wheat", "Italian"],
    greek:         ["#ecf3f6", "#cfe2ea", "#1f3d4d", "#3f7895", "olive", "Greek"],
    mediterranean: ["#eef4ee", "#d3e4d2", "#24402b", "#4c7d55", "olive", "Mediterranean"],
    middle_eastern:["#f7efe2", "#ead7b6", "#4f3615", "#a8722a", "pot", "Middle Eastern"],
    african:       ["#f7ebe0", "#ecd0b5", "#55301a", "#b4602b", "pot", "African"],
    caribbean:     ["#e9f4f0", "#c9e6dc", "#1d4237", "#2f8a6c", "leaf", "Caribbean"],
    mexican:       ["#f9ece4", "#f0d0bf", "#5c2414", "#c4502a", "chili", "Mexican"],
    latin_american:["#f9eee2", "#f0d6b8", "#5a3416", "#c27a2c", "chili", "Latin American"],
    indian:        ["#fbf0df", "#f2d9ad", "#5a3a0d", "#c88a1c", "leaf", "Indian"],
    chinese:       ["#f8ebea", "#eccfcd", "#5a1d1c", "#a83a34", "bowl", "Chinese"],
    japanese:      ["#f3f1ef", "#e1dcd7", "#2c2a28", "#8a3b2f", "fish", "Japanese"],
    korean:        ["#f1eef6", "#ddd5ea", "#33284d", "#6a54a3", "bowl", "Korean"],
    thai:          ["#eef5e8", "#d6e7c6", "#2b3f1c", "#5f8c34", "leaf", "Thai"],
    southeast_asian:["#eef5e8", "#d6e7c6", "#2b3f1c", "#5f8c34", "bowl", "Southeast Asian"],
    other:         ["#f2f0ea", "#e2ddd0", "#33302a", "#7a6f58", "fork", "Pantry Week"]
  };
  var ORDER = Object.keys(C);
  function cuisineOf(recipe) {
    var tags = (recipe && recipe.tags) || [];
    for (var i = 0; i < tags.length; i++) if (C[tags[i]] && tags[i] !== "other") return tags[i];
    var n = ((recipe && recipe.name) || "").toLowerCase();
    if (/taco|burrito|fajita|enchilada|quesadilla|salsa/.test(n)) return "mexican";
    if (/pasta|risotto|lasagna|pizza|gnocchi|parm/.test(n)) return "italian";
    if (/curry|dal|masala|tikka|biryani/.test(n)) return "indian";
    if (/stir.?fry|fried rice|lo mein|noodle/.test(n)) return "chinese";
    if (/fish|salmon|cod|tuna|shrimp/.test(n)) return "japanese";
    return "other";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function style(c) {
    var p = C[c] || C.other;
    return "--np-bg1:" + p[0] + ";--np-bg2:" + p[1] + ";--np-ink:" + p[2] + ";--np-accent:" + p[3];
  }
  function svg(c) {
    var p = C[c] || C.other;
    return '<svg class="pw-np__motif" viewBox="0 0 120 120" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + M[p[4]] + "</svg>";
  }
  /* variant: "card" | "hero" | "thumb" */
  function html(recipe, cls, variant) {
    var c = cuisineOf(recipe);
    var p = C[c] || C.other;
    var name = (recipe && recipe.name) || "";
    var inner = variant === "thumb" ? svg(c)
      : svg(c) + '<span class="pw-np__rule" aria-hidden="true"></span><span class="pw-np__kicker">' + esc(p[5]) + '</span><span class="pw-np__name">' + esc(name) + "</span>";
    var tag = variant === "thumb" ? "span" : "div";
    return '<' + tag + ' class="' + cls + ' pw-np pw-np--' + variant + ' pw-np--' + c + '" style="' + style(c) + '" role="img" aria-label="' + esc(name) + '">' + inner + "</" + tag + ">";
  }
  window.PW_NOPHOTO = { html: html, cuisineOf: cuisineOf, cuisines: ORDER };
})();
