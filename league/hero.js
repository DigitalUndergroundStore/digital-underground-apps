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
    if (w) {
      html = '<div class="lgh-in"><div class="lgh-media">' + (w.imageUrl ? '<img src="' + esc(w.imageUrl) + '" alt="' + esc(w.name) + '" loading="lazy">' : '<img src="/league/media/league-hero-bg.webp" alt="">') + '</div>' +
        '<div class="lgh-body"><span class="lgh-badge">★ Maker of the Week</span><h2>' + esc(w.name) + '</h2><p class="lgh-by">by ' + esc(w.makerName) + ' · <span class="lgh-votes">' + w.votes + (w.votes === 1 ? " vote" : " votes") + "</span></p>" +
        (w.pitchShort ? '<p class="lgh-sub">' + esc(w.pitchShort) + "</p>" : "") +
        '<div class="lgh-btns"><a class="lgh-btn gold" href="' + esc(w.url) + '">Visit</a><a class="lgh-btn ghost" href="/league/">Vote this week</a></div>' +
        '<p class="lgh-meta"><span>Week ' + (wk - 1) + " winner</span><span>" + esc(reset) + "</span></p></div></div>";
    } else {
      html = '<div class="lgh-in"><div class="lgh-media"><img src="/league/media/league-hero-bg.webp" alt="" width="1600" height="900"></div>' +
        '<div class="lgh-body"><span class="lgh-badge">★ Maker of the Week</span><h2>Week ' + wk + ' — competition under way</h2>' +
        '<p class="lgh-sub">Vote for your favourite indie project. The top pick becomes Maker of the Week, right here at the top of the page.</p>' +
        '<div class="lgh-btns"><a class="lgh-btn pri" href="/league/">Vote now</a></div>' +
        '<p class="lgh-meta"><span>' + esc(reset) + "</span>" + (votes ? "<span>" + esc(votes) + "</span>" : "") + "<span>Free · 1 vote per week</span></p></div></div>";
    }
    slot.innerHTML = html; slot.hidden = false;
  });
})();
