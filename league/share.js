/* Share the Maker League: text + URL only (no file). The link preview (og:video / poster) carries the promo. */
(function () {
  var URL_ = "https://digitalundergroundstore.com/join/";
  var TITLE = "Maker League | Digital Underground";
  /* Rotates every 2 days (UTC day bucket) so shares in the same window match. */
  var CAPTIONS = [
    "Maker League: indie builders put real products on the board. The best product with the most votes wins the homepage as Maker of the Week. Free to list. Vote or enter:",
    "Weekly Maker League on Digital Underground. Vote for the product you think is best — most votes takes Maker of the Week and the homepage spotlight. Enter free or cast your vote:",
    "How Maker League works: list your product free, the community votes, and the best product with the most votes becomes Maker of the Week. Enter or vote:",
    "Not a follower contest. Maker League crowns the week's best indie product by votes — winner gets the homepage. Join or vote:",
    "Built something good? Put it in Maker League. Best product, most votes, Maker of the Week on Digital Underground. Vote or enter:"
  ];
  var CAPTION = CAPTIONS[Math.floor(Date.now() / 864e5 / 2) % CAPTIONS.length];
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
