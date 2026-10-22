/* Maker League hero: last week's Maker of the Week, or (no winner yet) the "competition under way" banner.
   Switches by itself after each Monday 00:00 ET reset; data from /api/league/winner and /api/league. */
(function () {
  var slot = document.getElementById("lg-hero"); if (!slot) return;
  var LAUNCH = Date.parse("2026-10-19T12:00:00Z"); // League week 1 (Monday, ET)
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function j(u) { return fetch(u, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function resets(ms) { return new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "America/New_York" }).replace(",", ""); }
  Promise.all([j("/api/league/winner"), j("/api/league")]).then(function (r) {
    var w = r[0] && r[0].winner, lg = r[1] || {};
    var wk = lg.week ? Math.max(1, Math.round((Date.parse(lg.week + "T12:00:00Z") - LAUNCH) / 6048e5) + 1) : 1;
    var reset = lg.endsAt ? "Resets " + resets(lg.endsAt) + ", 12:00 AM ET" : "Resets Monday 12:00 AM ET";
    var votes = typeof lg.totalVotes === "number" ? lg.totalVotes + (lg.totalVotes === 1 ? " vote" : " votes") + " so far" : "";
    var html;
    if (slot.getAttribute("data-mode") === "badge") {
      slot.innerHTML = '<a class="lgp" href="' + esc(w ? w.url : "/league/") + '"><img class="lgp-m" src="/league/media/medal.svg?v=1" alt="" width="52" height="52"><span class="lgp-t"><span class="lgp-b">Maker of the Week</span><span class="lgp-n">' + esc(w ? w.name : "Week " + wk + " under way") + "</span></span></a>";
      slot.hidden = false; return;
    }
    if (w) {
      html = '<div class="lgh-in"><div class="lgh-media">' + (w.imageUrl ? '<img src="' + esc(w.imageUrl) + '" alt="' + esc(w.name) + '" loading="lazy">' : '<img src="/league/media/league-hero-bg.webp" alt="">') + '</div>' +
        '<div class="lgh-body"><span class="lgh-badge">★ Maker of the Week</span><h2>' + esc(w.name) + '</h2><p class="lgh-by">by ' + esc(w.makerName) + ' · <span class="lgh-votes">' + w.votes + (w.votes === 1 ? " vote" : " votes") + "</span></p>" +
        (w.pitchShort ? '<p class="lgh-sub">' + esc(w.pitchShort) + "</p>" : "") +
        '<div class="lgh-btns"><a class="lgh-btn gold" href="' + esc(w.url) + '">Visit</a><a class="lgh-btn ghost" href="/league/">Vote this week</a><button type="button" class="lgh-btn ghost" data-lg-share>Share</button></div>' +
        '<p class="lgh-meta"><span>' + (w.week ? "Week of " + new Date(w.week + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "Last week") + " winner</span><span>" + esc(reset) + "</span></p></div></div>";
    } else {
      html = '<div class="lgh-in"><div class="lgh-media lgh-vid"><img src="/league/media/league-hero-bg.webp" alt="" width="1600" height="900"><video class="lgh-v" src="/assets/promo/maker-league-promo-square.mp4" poster="/assets/promo/league-card-poster.jpg?v=1" width="1080" height="1080" muted autoplay loop playsinline preload="metadata" aria-label="Maker League promo video"></video><button type="button" class="lgh-snd" aria-label="Unmute promo video" aria-pressed="false">🔇</button></div>' +
        '<div class="lgh-body"><span class="lgh-badge">★ Maker of the Week</span><h2>Week ' + wk + ' — competition under way</h2>' +
        '<p class="lgh-sub">Vote for your favourite indie project. The top pick becomes Maker of the Week, right here at the top of the page.</p>' +
        '<div class="lgh-btns"><a class="lgh-btn pri" href="/league/">Vote now</a><button type="button" class="lgh-btn ghost" data-lg-share>Share</button></div>' +
        '<p class="lgh-meta"><span>' + esc(reset) + "</span>" + (votes ? "<span>" + esc(votes) + "</span>" : "") + "<span>Free · 1 vote per week</span></p></div></div>";
    }
    slot.innerHTML = html; slot.hidden = false;
    var v = slot.querySelector(".lgh-v"), b = slot.querySelector(".lgh-snd");
    if (v) { v.muted = true; var p = v.play && v.play(); if (p && p.catch) p.catch(function () {}); }
    if (v && b) b.addEventListener("click", function (e) { e.preventDefault(); v.muted = !v.muted; if (!v.muted) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } b.textContent = v.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"; b.setAttribute("aria-pressed", String(!v.muted)); b.setAttribute("aria-label", v.muted ? "Unmute promo video" : "Mute promo video"); });
  });
})();
