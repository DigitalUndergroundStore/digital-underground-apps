/* Share the Maker League. Prefers sharing the 13s League clip as a file (Web Share API Level 2),
   falls back to the previous behaviour: navigator.share with text+URL, then copy-link. */
(function () {
  var CLIP = "/assets/league/league-share-clip.mp4", clipFile = null, clipP = null;
  function loadClip() {
    if (clipP) return clipP;
    if (!window.File || !window.fetch || !navigator.canShare) return (clipP = Promise.resolve(null));
    clipP = fetch(CLIP).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
      .then(function (b) { var f = new File([b], "maker-league.mp4", { type: "video/mp4" }); return (clipFile = navigator.canShare({ files: [f] }) ? f : null); })
      .catch(function () { return null; });
    return clipP;
  }
  function copyLink(u) {
    if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { var x = document.createElement("div"); x.className = "dun-x"; x.setAttribute("role", "status"); x.textContent = "Link copied"; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 1800); });
  }
  function plain(t, u) {
    if (navigator.share) return navigator.share({ title: t, text: t, url: u }).catch(function () {});
    copyLink(u);
  }
  function share() {
    var u = location.origin + "/league/", t = "Vote in this week\u2019s Maker League on Digital Underground";
    // Use the preloaded file synchronously so the click's user activation is still valid.
    if (clipFile) {
      return navigator.share({ files: [clipFile], title: t, text: t + " " + u, url: u }).catch(function (e) { if (!e || e.name !== "AbortError") plain(t, u); });
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
