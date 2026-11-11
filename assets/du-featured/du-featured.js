/* Featured badge on cards (manual picks). Does NOT reorder the main list — Featured live in the spotlight + keep the badge in place. */
(function () {
  var STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';
  var N = 4, ids = null, makers = null;
  /* Keep in sync with functions/_lib/order.js FEATURED_IDS + index.html Featured row. */
  var MANUAL = ["cm_kerzy_neonbastion"];
  function j(u) { return fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function badge() { var s = document.createElement("span"); s.className = "du-fb"; s.innerHTML = STAR + "Featured"; return s; }
  function markGrid(grid, sel, mediaSel) {
    if (!grid || !ids) return;
    [].slice.call(grid.querySelectorAll(sel)).forEach(function (c) {
      var on = !!ids[c.getAttribute("data-id")];
      c.classList.toggle("du-feat", on);
      var b = c.querySelector(".du-fb");
      if (on && !b) { var m = c.querySelector(mediaSel) || c; if (getComputedStyle(m).position === "static") m.style.position = "relative"; m.appendChild(badge()); }
      if (!on && b) b.remove();
    });
  }
  var busy = false;
  function apply() {
    if (busy) return; busy = true;
    try {
      markGrid(document.getElementById("projectGrid"), "article.card[data-id]", ".card-media");
      markGrid(document.getElementById("grid"), "li.card[data-id]", ".media");
      if (document.querySelector(".listings .grid")) markGrid(document.querySelector(".listings .grid"), "li.card[data-id]", ".media");
      var mg = document.getElementById("mgrid");
      if (mg && makers) {
        [].slice.call(mg.querySelectorAll(".mk-card")).forEach(function (c) {
          var a = c.querySelector("a"), h = a ? a.getAttribute("href") || "" : "";
          var k = (h.match(/^\/makers\/([^/]+)\//) || [])[1];
          if (!k) return;
          var on = makers[k] != null;
          var b = c.querySelector(".du-fb");
          c.classList.toggle("du-feat", on);
          if (on && !b) { c.appendChild(badge()); }
          if (!on && b) b.remove();
        });
      }
    } finally { setTimeout(function () { busy = false; }, 0); }
  }
  Promise.all([j("/api/community/listings"), j("/api/league")]).then(function (a) {
    var L = (a[0] && a[0].listings) || [], by = {}, pick = [], seen = {};
    L.forEach(function (x) { by[x.id] = x; });
    MANUAL.forEach(function (i) { var x = by[i]; if (x && !seen[i]) { pick.push(x); seen[i] = 1; } });
    pick = pick.slice(0, N); ids = {}; makers = {};
    pick.forEach(function (x, i) {
      ids[x.id] = i + 1;
      var k = (x.makerSlug || "").toLowerCase();
      if (!k) k = String(x.makerName || "").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (k && makers[k] == null) makers[k] = i;
    });
    apply();
    ["projectGrid", "grid"].forEach(function (id) { var g = document.getElementById(id); if (g && window.MutationObserver) new MutationObserver(function () { if (!busy) apply(); }).observe(g, { childList: true }); });
  });
})();
