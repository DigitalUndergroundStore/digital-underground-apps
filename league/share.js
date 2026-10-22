/* Share the Maker League (same behaviour as the nav Share: Web Share API, copy-link fallback). */
(function () {
  function share() {
    var u = location.origin + "/league/", t = "Vote in this week\u2019s Maker League on Digital Underground";
    if (navigator.share) return navigator.share({ title: t, text: t, url: u }).catch(function () {});
    if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { var x = document.createElement("div"); x.className = "dun-x"; x.setAttribute("role", "status"); x.textContent = "Link copied"; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 1800); });
  }
  window.duShareLeague = share;
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-lg-share]"); if (b) { e.preventDefault(); share(); } });
})();
