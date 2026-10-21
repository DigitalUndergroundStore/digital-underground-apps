/* Maker of the Week spotlight: renders last week's winner into #motw-slot (homepage, /league/) and a
   shareable badge on that winner's listing page. Data: /api/league/winner (changes every Monday 00:00 ET). */
(function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function css() { if (!document.querySelector('link[href^="/league/league.css"]')) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/league/league.css?v=1"; document.head.appendChild(l); } }
  fetch("/api/league/winner").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
    var w = d && d.winner; if (!w) return; css();
    var slot = document.getElementById("motw-slot");
    if (slot) slot.innerHTML = '<a class="motw" href="' + esc(w.url) + '">' + (w.imageUrl ? '<img src="' + esc(w.imageUrl) + '" alt="" width="96" height="96">' : "") +
      '<span><span class="k">★ Maker of the Week</span><h2>' + esc(w.name) + '</h2><p>by ' + esc(w.makerName) + (w.pitchShort ? " · " + esc(w.pitchShort) : "") + "</p></span></a>";
    var id = new URLSearchParams(location.search).get("id");
    if (/\/community\/p\/?$/.test(location.pathname) && id === w.id) {
      (function put(n) {
        var cta = document.getElementById("cta"); if (!cta) { if (n < 40) setTimeout(function () { put(n + 1); }, 150); return; }
        if (document.querySelector(".motw-badge")) return;
        var b = document.createElement("p"); b.className = "motw-badge";
        b.innerHTML = "★ Maker of the Week · week of " + esc(w.week) + ' <button type="button">Share</button>';
        b.querySelector("button").addEventListener("click", function () {
          var u = location.origin + "/community/p/?id=" + encodeURIComponent(w.id), t = w.name + " is Maker of the Week on Digital Underground";
          if (navigator.share) navigator.share({ title: t, url: u }).catch(function () {});
          else if (navigator.clipboard) navigator.clipboard.writeText(t + " " + u).then(function () { b.querySelector("button").textContent = "Link copied"; });
        });
        cta.parentNode.insertBefore(b, cta);
      })(0);
    }
  });
})();
