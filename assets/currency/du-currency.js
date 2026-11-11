/* Digital Underground currency switcher.
 * Base prices on the site are USD. This only changes the DISPLAY; checkout stays on Gumroad.
 * Approximate display rates (1 USD =), set 2026-11-01, update by hand occasionally:
 *   USD 1.00 · CAD 1.38 · EUR 0.92 · GBP 0.79
 * Default currency: saved choice (localStorage "du_ccy") > Cloudflare country (/cdn-cgi/trace loc=)
 * > browser timezone/locale heuristic > USD.  Map: US→USD, CA→CAD, GB→GBP, EU/EEA→EUR. */
(function () {
  var RATES = { USD: 1, CAD: 1.38, EUR: 0.92, GBP: 0.79 };
  var SYM = { USD: "$", CAD: "CA$", EUR: "€", GBP: "£" };
  var KEY = "du_ccy";
  var EU = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO".split(" ");
  function fromCountry(c) { c = (c || "").toUpperCase(); if (c === "US") return "USD"; if (c === "CA") return "CAD"; if (c === "GB" || c === "UK") return "GBP"; if (EU.indexOf(c) >= 0) return "EUR"; return c ? "USD" : null; }
  function heuristic() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      var ca = /^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Whitehorse|Yellowknife|Iqaluit|Glace_Bay|Goose_Bay|Dawson_Creek|Creston|Swift_Current|Rankin_Inlet|Cambridge_Bay|Inuvik|Atikokan|Nipigon|Thunder_Bay|Rainy_River)$/;
      if (ca.test(tz)) return "CAD";
      if (tz === "Europe/London") return "GBP";
      if (/^Europe\//.test(tz) && !/^Europe\/(Moscow|Istanbul|Kiev|Kyiv|Minsk|Zurich|Belgrade|Sarajevo|Skopje|Tirane|Chisinau)$/.test(tz)) return "EUR";
    } catch (e) {}
    var l = (navigator.language || "").split("-")[1];
    return fromCountry(l) || "USD";
  }
  var RE = /(^|[^A-Za-z0-9])\$(\d{1,4}(?:,\d{3})?(?:\.\d{2})?)(?![\d])/g;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1, NOSCRIPT: 1, OPTION: 1, SELECT: 1 };
  function wrap(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) {
      var p = n.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest("[data-no-fx],.du-price,.du-ccy"))) continue;
      RE.lastIndex = 0; if (RE.test(n.nodeValue)) list.push(n);
    }
    list.forEach(function (t) {
      var s = t.nodeValue, frag = document.createDocumentFragment(), last = 0, m; RE.lastIndex = 0;
      while ((m = RE.exec(s))) {
        var start = m.index + m[1].length, usd = parseFloat(m[2].replace(/,/g, ""));
        frag.appendChild(document.createTextNode(s.slice(last, start)));
        if (usd > 0) { var sp = document.createElement("span"); sp.className = "du-price"; sp.setAttribute("data-usd", String(usd)); sp.textContent = "$" + m[2]; frag.appendChild(sp); }
        else frag.appendChild(document.createTextNode("$" + m[2]));
        last = start + 1 + m[2].length;
      }
      frag.appendChild(document.createTextNode(s.slice(last))); t.parentNode.replaceChild(frag, t);
    });
  }
  function fmt(usd, c) {
    var v = usd * RATES[c];
    if (c === "USD") return "$" + (usd % 1 ? usd.toFixed(2) : String(usd));
    var whole = usd % 1 === 0; v = whole ? Math.round(v) : Math.round(v) - 0.01; if (v < 0.99) v = 0.99;
    return SYM[c] + (whole ? String(v) : v.toFixed(2));
  }
  var cur = "USD";
  function render() {
    document.querySelectorAll(".du-price").forEach(function (el) { el.textContent = fmt(parseFloat(el.getAttribute("data-usd")), cur); el.title = cur === "USD" ? "" : "≈ approx. " + cur + " · charged in USD at checkout"; });
    document.querySelectorAll(".du-ccy button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-c") === cur ? "true" : "false"); });
    var note = document.querySelector(".du-ccy-note"); if (note) note.hidden = cur === "USD";
    document.documentElement.setAttribute("data-ccy", cur);
  }
  function set(c, save) { if (!RATES[c]) return; cur = c; if (save) try { localStorage.setItem(KEY, c); } catch (e) {} render(); }
  function ui() {
    if (document.querySelector(".du-ccy")) return;
    var box = document.createElement("div"); box.className = "du-ccy"; box.setAttribute("role", "group"); box.setAttribute("aria-label", "Display currency");
    ["USD", "CAD", "EUR", "GBP"].forEach(function (c) { var b = document.createElement("button"); b.type = "button"; b.textContent = c; b.setAttribute("data-c", c); b.onclick = function () { set(c, true); }; box.appendChild(b); });
    var note = document.createElement("span"); note.className = "du-ccy-note"; note.textContent = "≈ approx · billed in USD"; note.hidden = true; box.appendChild(note);
    var bar = document.createElement("div"); bar.className = "du-ccy-bar"; bar.appendChild(box);
    var slot = document.querySelector("[data-du-ccy-slot]"), main = document.querySelector("main");
    var f = document.querySelector("footer.duf") || document.querySelector("footer");
    if (slot) slot.appendChild(bar); else if (f) f.insertBefore(bar, f.firstChild); else if (main) main.appendChild(bar); else document.body.appendChild(bar);
  }
  function init() {
    wrap(document.body); ui();
    var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved && RATES[saved]) return set(saved, false);
    set(heuristic(), false);
    if (window.fetch) fetch("/cdn-cgi/trace", { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (t) {
      var m = /(?:^|\n)loc=([A-Z]{2})/.exec(t || ""); var c = m && fromCountry(m[1]);
      var s2 = null; try { s2 = localStorage.getItem(KEY); } catch (e) {}
      if (c && !s2) set(c, false);
    }).catch(function () {});
  }
  window.DUCurrency = { set: function (c) { set(c, true); }, rates: RATES };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
