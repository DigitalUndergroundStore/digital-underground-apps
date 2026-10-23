/* Maker League: Wolf's layout (Oct 23 2026 mockup) wired to real data.
   Standings, eligible listings and the visitor's vote come from /api/league (server-side, one vote per visitor per week);
   maker names/images/videos are what makers set on their own listings/profiles; winner from /api/league/winner. No fake counts. */
(function () {
  var st = document.getElementById("standingsList"), grid = document.getElementById("voteGrid"), msg = document.getElementById("msgStatus"),
      meta = document.getElementById("standingsMeta"), q = document.getElementById("searchProjects"), motw = document.getElementById("motwSlot");
  var data = null;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pid(id) { return "/community/p/?id=" + encodeURIComponent(id); }
  function say(t, c) { msg.textContent = t; msg.className = "lg-msg" + (c ? " " + c : ""); }
  function toast(m) { var t = document.getElementById("toastNotice"); if (!t) return; t.textContent = m; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 2600); }
  function plural(n) { return n + (n === 1 ? " vote" : " votes"); }
  function media(l) {
    var v = l.video;
    if (v && v.kind === "file" && /^\/api\/community\/video\?v=/.test(v.src)) return '<div class="lg2-img"><video src="' + esc(v.src) + '" muted loop playsinline autoplay preload="metadata"' + (l.imageUrl ? ' poster="' + esc(l.imageUrl) + '"' : "") + ' aria-label="' + esc(l.name) + ' video"></video></div>';
    if (v && (v.kind === "youtube" || v.kind === "vimeo") && /^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(v.src)) return '<div class="lg2-img"><iframe src="' + esc(v.src) + '" title="' + esc(l.name) + ' video" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>';
    return '<a class="lg2-img" href="' + pid(l.id) + '" aria-label="Open ' + esc(l.name) + ' page">' + (l.imageUrl ? '<img src="' + esc(l.imageUrl) + '" alt="" loading="lazy">' : "") + "</a>";
  }
  function render() {
    meta.textContent = plural(data.totalVotes) + " · ends " + new Date(data.endsAt - 60000).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
    st.innerHTML = data.standings.length ? data.standings.map(function (s, i) {
      return '<li class="standings-item"><span class="rank">#' + (i + 1) + '</span><div class="project-icon"><a href="' + esc(s.url) + '" aria-label="Open ' + esc(s.name) + ' page">' + (s.imageUrl ? '<img src="' + esc(s.imageUrl) + '" alt="" loading="lazy" width="48" height="48">' : "") + '</a></div><div class="project-info"><strong><a href="' + esc(s.url) + '">' + esc(s.name) + "</a></strong><span>by " + esc(s.makerName) + '</span></div><span class="votes">' + plural(s.votes) + "</span></li>";
    }).join("") : '<li class="lg-empty">No votes yet this week. Be the first to vote below.</li>';
    var f = (q.value || "").trim().toLowerCase();
    grid.innerHTML = data.eligible.filter(function (l) { return !f || (l.name + " " + l.makerName).toLowerCase().indexOf(f) >= 0; }).map(function (l) {
      var mine = data.voted === l.id;
      return '<div class="vote-card' + (mine ? " voted" : "") + '" data-id="' + esc(l.id) + '"><div class="lg2-maker">' + esc(l.makerName) + "</div>" + media(l) + '<strong class="lg2-name"><a href="' + pid(l.id) + '">' + esc(l.name) + '</a></strong><div class="lg2-actions"><button type="button" class="vote-btn' + (mine ? " voted" : "") + '" data-vote="' + esc(l.id) + '"' + (data.voted ? " disabled" : "") + ' aria-label="Vote for ' + esc(l.name) + '">' + (mine ? "✓ Voted" : "Vote") + '</button><button type="button" class="share-btn" data-share="' + esc(l.id) + '" data-name="' + esc(l.name) + '" aria-label="Share ' + esc(l.name) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share</button></div></div>';
    }).join("") || '<p class="lg-empty">' + (data.eligible.length ? "No matching projects." : "No projects in the league yet.") + "</p>";
    if (data.voted && !msg.textContent) say("You've voted this week. Voting reopens after the week ends Thursday 11:59 PM ET.", "ok");
  }
  function load() {
    return fetch("/api/league", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (d) { data = d; render(); focusWanted(); })
      .catch(function () { st.innerHTML = '<li class="lg-empty">Couldn\'t load the league. Try again soon.</li>'; meta.textContent = ""; });
  }
  fetch("/api/league/winner", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
    var w = d && d.winner; if (!w || !motw) return;
    motw.innerHTML = '<a class="motw-card" href="' + esc(w.url) + '">' + (w.imageUrl ? '<img class="motw-img" src="' + esc(w.imageUrl) + '" alt="" loading="lazy">' : "") +
      '<div class="motw-content"><img class="motw-official" src="/assets/badges/maker-of-the-week.svg?v=1" alt="Maker of the Week" width="131" height="40"><h3 class="motw-name">' + esc(w.name) + '</h3><p class="motw-pitch">by <strong>' + esc(w.makerName) + "</strong>" + (w.week ? " · week of " + esc(w.week) : "") + (w.pitchShort ? " · " + esc(w.pitchShort) : "") + "</p></div></a>";
  });
  grid.addEventListener("click", function (e) {
    var sh = e.target.closest("button[data-share]");
    if (sh) {
      var nm = sh.getAttribute("data-name"), url = location.origin + "/league/?vote=" + encodeURIComponent(sh.getAttribute("data-share"));
      var text = "Come vote for " + nm + " in Digital Underground's Maker League! 🗳️ One free vote a week, and the winner becomes Maker of the Week.";
      if (navigator.share) navigator.share({ title: nm + " · Maker League", text: text, url: url }).catch(function () {});
      else { var w = window.open("https://x.com/intent/post?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url), "_blank", "noopener"); if (!w && navigator.clipboard) navigator.clipboard.writeText(text + " " + url).then(function () { toast("Link copied!"); }); }
      return;
    }
    var b = e.target.closest("button[data-vote]"); if (!b || b.disabled) return;
    var name = b.closest(".vote-card").querySelector(".lg2-name").textContent.trim();
    [].forEach.call(grid.querySelectorAll(".vote-btn"), function (x) { x.disabled = true; }); say("Counting your vote…");
    fetch("/api/league", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: b.getAttribute("data-vote"), hp: document.getElementById("hpField").value }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); }, function () { return {}; })
      .then(function (d) {
        if (d.ok) { say("Thanks! Your vote is in. Voting reopens after the week ends Thursday 11:59 PM ET.", "ok"); toast("You voted for " + name + "!"); }
        else say(d.error || "Couldn't record your vote. Please try again.", "err");
        return load(); // real tally from the server, never a local guess
      });
  });
  var want = new URLSearchParams(location.search).get("vote");
  function focusWanted() { if (!want) return; var c = grid.querySelector('.vote-card[data-id="' + want.replace(/["\\]/g, "") + '"]'); if (c) { c.classList.add("shared-pick"); c.scrollIntoView({ block: "center" }); want = null; } }
  q.addEventListener("input", function () { if (data) render(); });
  load();
})();
