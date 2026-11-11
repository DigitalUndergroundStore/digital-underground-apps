/* Maker of the Week spotlight: renders last week's winner into #motw-slot (homepage, /league/) and a
   shareable badge on that winner's listing page. Data: /api/league/winner (changes when each week ends, Thursday 11:59 PM ET). */
(function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function css() { if (!document.querySelector('link[href^="/league/league.css"]')) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/league/league.css?v=15"; document.head.appendChild(l); } }
  fetch("/api/league/winner").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
    var w = d && d.winner; if (!w) return; css();
    var MOTW_COVER = { "cm_mvfnl9qp_80652919": "/assets/motw/media-renamer-pro-cover.webp?v=2" };
    if (MOTW_COVER[w.id]) w.imageUrl = MOTW_COVER[w.id];
    var slot = document.getElementById("motw-slot");
    var MOTW_VIDEO = { "cm_kerzy_neonbastion": "/community/media/rival-lanes-promo.mp4?v=20261104c" };
    function fileVideo(src) { return typeof src === "string" && /\.(mp4|webm)(?:[?#]|$)/i.test(src) && /^(?:https?:\/\/|\/(?!\/))/i.test(src) ? src : ""; }
    var videoSrc = fileVideo(w.video && w.video.kind === "file" && w.video.src) || fileVideo(w.videoApprovedUrl) || fileVideo(w.videoUrl) || fileVideo(MOTW_VIDEO[w.id]);
    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var media = videoSrc && !reducedMotion ? '<video class="motw-cover motw-vid" muted loop playsinline preload="metadata"' + (w.imageUrl ? ' poster="' + esc(w.imageUrl) + '"' : '') + ' src="' + esc(videoSrc) + '"></video>' : (w.imageUrl ? '<img class="motw-cover" src="' + esc(w.imageUrl) + '" alt="" width="1600" height="900">' : "");
    var shareCaption = (w.name || "") + (w.makerName ? " by " + w.makerName : "") + " is this week's Maker of the Week winner on Digital Underground";
    var shareUrl = w.url || "";
    function markCopied(btn) {
      var label = btn && btn.querySelector("[data-motw-share-label]");
      if (!label) return;
      var prev = label.getAttribute("data-prev") || label.textContent;
      label.setAttribute("data-prev", prev);
      label.textContent = "Link copied";
      setTimeout(function () { label.textContent = prev; }, 2200);
    }
    function copyWinner(btn) {
      var t = shareCaption + "\n" + shareUrl, ok = false;
      try {
        var ta = document.createElement("textarea");
        ta.value = t;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, t.length);
        ok = document.execCommand("copy");
        ta.remove();
      } catch (e) {}
      if (ok) { markCopied(btn); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { markCopied(btn); }).catch(function () {});
    }
    function shareWinner(btn) {
      var data = { title: shareCaption, text: shareCaption, url: shareUrl };
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        return navigator.share(data).catch(function (e) { if (!e || e.name !== "AbortError") copyWinner(btn); });
      }
      copyWinner(btn);
    }
    if (slot) {
      slot.innerHTML = '<div class="motw" aria-label="Maker of the Week: ' + esc(w.name) + ' by ' + esc(w.makerName) + '">' +
        '<a class="motw-media" href="' + esc(w.url) + '">' + media +
        '<span class="motw-crown"><img src="/assets/motw/crown.svg?v=2" alt="" width="160" height="130"><b>Maker of<br>the Week</b></span></a>' +
        '<span class="motw-copy"><h2>' + esc(w.name) + '</h2><p>by ' + esc(w.makerName) + (w.pitchShort ? " · " + esc(w.pitchShort) : "") + "</p>" +
        '<span class="motw-acts">' +
        '<a class="motw-cta" href="' + esc(w.url) + '">Visit ' + esc(w.name) + " &rarr;</a>" +
        '<button type="button" class="motw-share" data-motw-share aria-label="Share ' + esc(w.name) + ' as this week\'s Maker of the Week winner">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>' +
        '<span data-motw-share-label>Share this week\'s winner</span></button></span></span></div>';
      var shareBtn = slot.querySelector("[data-motw-share]");
      if (shareBtn) shareBtn.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); shareWinner(shareBtn); });
    }
    var video = slot && slot.querySelector("video.motw-vid");
    if (video) {
      video.muted = true;
      function play() { var pending = video.play(); if (pending && pending.catch) pending.catch(function () {}); }
      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) { if (entry.isIntersecting && entry.intersectionRatio >= 0.15) play(); else video.pause(); });
        }, { threshold: [0, 0.15] });
        observer.observe(video);
      }
    }
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
