/* Share the Maker League. Prefers sharing the 13s League clip as a file (Web Share API Level 2),
   falls back to the previous behaviour: navigator.share with text+URL, then copy-link. */
(function () {
  var CLIP = "/assets/league/league-share-logo.png", clipFile = null, clipP = null;
  function loadClip() {
    if (clipP) return clipP;
    if (!window.File || !window.fetch || !navigator.canShare) return (clipP = Promise.resolve(null));
    clipP = fetch(CLIP).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
      .then(function (b) { var f = new File([b], "maker-league.png", { type: "image/png" }); return (clipFile = navigator.canShare({ files: [f] }) ? f : null); })
      .catch(function () { return null; });
    return clipP;
  }
  function copyLink(u) {
    if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { var x = document.createElement("div"); x.className = "dun-x"; x.setAttribute("role", "status"); x.textContent = "Link copied"; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 1800); });
  }
  var CAPTION = "Builders, this one's for you. The Maker League is a weekly competition for indie builders on Digital Underground: list your project free, get your followers to vote, and the winner takes the homepage spotlight as Maker of the Week. Vote or enter: https://digitalundergroundstore.com/league/";
  function toast(msg, ms) { var x = document.createElement("div"); x.className = "dun-x"; x.setAttribute("role", "status"); x.textContent = msg; document.body.appendChild(x); setTimeout(function () { x.remove(); }, ms || 1800); }
  // Copy synchronously inside the click gesture (iOS/X drop text+url when a file is attached).
  function copyCaption() {
    var ok = false;
    try {
      var ta = document.createElement("textarea"); ta.value = CAPTION; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, CAPTION.length);
      ok = document.execCommand("copy"); ta.remove();
    } catch (e) {}
    if (!ok && navigator.clipboard) { try { navigator.clipboard.writeText(CAPTION).catch(function () {}); ok = true; } catch (e) {} }
    if (ok) toast("Caption + link copied, paste it into your post", 3500);
  }
  function plain(t, u) {
    if (navigator.share) return navigator.share({ title: t, text: t, url: u }).catch(function () {});
    copyLink(u);
  }
  function share() {
    var u = location.origin + "/league/", t = "Vote in this week\u2019s Maker League on Digital Underground";
    // Use the preloaded file synchronously so the click's user activation is still valid.
    if (clipFile) {
      copyCaption();
      return navigator.share({ files: [clipFile], title: t, text: CAPTION, url: u }).catch(function (e) { if (!e || e.name !== "AbortError") plain(t, u); });
    }
    loadClip(); // start fetching for next time
    plain(t, u);
  }
  window.duShareLeague = share;
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-lg-share]"); if (b) { e.preventDefault(); share(); } });
  // Preload the clip on touch devices only, when the user hovers/focuses a share button elsewhere.
  function warm(e) { if (e.target.closest && e.target.closest("[data-lg-share]")) loadClip(); }
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("touchstart", warm, { passive: true });
  document.addEventListener("focusin", warm);
  if (navigator.canShare && matchMedia("(pointer: coarse)").matches) (window.requestIdleCallback || setTimeout)(loadClip, 2500);
})();
