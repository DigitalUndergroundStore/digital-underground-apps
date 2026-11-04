/* Maker of the Week spotlight: renders last week's winner into #motw-slot (homepage, /league/) and a
   shareable badge on that winner's listing page. Data: /api/league/winner (changes when each week ends, Thursday 11:59 PM ET). */
(function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function css() { if (!document.querySelector('link[href^="/league/league.css"]')) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/league/league.css?v=11"; document.head.appendChild(l); } }
  fetch("/api/league/winner").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
    var w = d && d.winner; if (!w) return; css();
    var MOTW_COVER = { "cm_mvfnl9qp_80652919": "/assets/motw/media-renamer-pro-cover.webp?v=2" };
    if (MOTW_COVER[w.id]) w.imageUrl = MOTW_COVER[w.id];
    var slot = document.getElementById("motw-slot");
    if (slot) slot.innerHTML = '<a class="motw" href="' + esc(w.url) + '" aria-label="Maker of the Week: ' + esc(w.name) + ' by ' + esc(w.makerName) + '">' + '<span class="motw-media">' + (w.imageUrl ? '<img class="motw-cover" src="' + esc(w.imageUrl) + '" alt="" width="1600" height="900">' : "") +
      '<span class="motw-crown"><img src="/assets/motw/crown.svg?v=2" alt="" width="160" height="130"><b>Maker of<br>the Week</b></span></span>' +
      '<span><h2>' + esc(w.name) + '</h2><p>by ' + esc(w.makerName) + (w.pitchShort ? " · " + esc(w.pitchShort) : "") + "</p><span class=\"motw-cta\">Visit " + esc(w.name) + " &rarr;</span></span></a>";
    var id = window.__DU_LID || new URLSearchParams(location.search).get("id"), pm = location.pathname.match(/^\/community\/p(?:\/([^/]+))?\/?$/);
    if (pm && !id && pm[1]) id = String(w.id).split("_").pop().toLowerCase() === pm[1].toLowerCase().split("-").pop() ? w.id : null;
    if (pm && id === w.id) {
      (function put(n) {
        var cta = document.getElementById("cta"); if (!cta) { if (n < 40) setTimeout(function () { put(n + 1); }, 150); return; }
        if (document.querySelector(".motw-badge")) return;
        var b = document.createElement("p"); b.className = "motw-badge";
        b.innerHTML = '<a href="/league/" aria-label="Maker of the Week: official Digital Underground winner badge"><img src="/assets/badges/maker-of-the-week.svg?v=crown1" alt="Maker of the Week" width="157" height="48" style="vertical-align:middle"></a> week of ' + esc(w.week) + ' <button type="button">Share</button>';
        b.querySelector("button").addEventListener("click", function () {
          var u = location.origin + (function(r){var b=String(r&&r.name||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48).replace(/-+$/,""),t=String(r&&r.id||"").split("_").pop().toLowerCase().replace(/[^a-z0-9]/g,"");return "/community/p/"+(b&&b!==t?b+"-"+t:t)+"/";})(w), t = w.name + " is Maker of the Week on Digital Underground";
          if (navigator.share) navigator.share({ title: t, url: u }).catch(function () {});
          else if (navigator.clipboard) navigator.clipboard.writeText(t + " " + u).then(function () { b.querySelector("button").textContent = "Link copied"; });
        });
        cta.parentNode.insertBefore(b, cta);
      })(0);
    }
  });
})();
/* Share-click counts for the owner HUD (featured row, spotlight, nav). */
(function () {
  if (window.__duShareWatch || document.querySelector('script[src="/community/share-track.js"]')) return;
  var s = document.createElement("script");
  s.src = "/community/share-track.js";
  s.async = false;
  document.head.appendChild(s);
})();
