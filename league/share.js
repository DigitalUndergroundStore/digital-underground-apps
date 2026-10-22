/* Share the Maker League: text + URL only (no file). The link preview (og:video / poster) carries the promo. */
(function () {
  var URL_ = "https://digitalundergroundstore.com/";
  var TITLE = "Maker League | Digital Underground";
  var CAPTION = "Builders, this one's for you. The Maker League is a weekly competition for indie builders on Digital Underground: list your project free, get your followers to vote, and the winner takes the homepage spotlight as Maker of the Week. Vote or enter on the marketplace:";
  function toast(msg, ms) { var x = document.createElement("div"); x.className = "dun-x"; x.setAttribute("role", "status"); x.textContent = msg; document.body.appendChild(x); setTimeout(function () { x.remove(); }, ms || 1800); }
  function copy() {
    var t = CAPTION + " " + URL_, ok = false;
    try {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
      ok = document.execCommand("copy"); ta.remove();
    } catch (e) {}
    if (!ok && navigator.clipboard) { try { navigator.clipboard.writeText(t).catch(function () {}); ok = true; } catch (e) {} }
    if (ok) toast("Caption + link copied, paste it into your post", 3500);
  }
  function share() {
    var data = { title: TITLE, text: CAPTION, url: URL_ };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      return navigator.share(data).catch(function (e) { if (!e || e.name !== "AbortError") copy(); });
    }
    copy();
  }
  window.duShareLeague = share;
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-lg-share]"); if (b) { e.preventDefault(); share(); } });
})();
