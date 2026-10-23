/* Maker League: real /api/league data rendered into Wolf's layout (standings-item / vote-card / vote-btn). */
(function () {
  var st = document.getElementById("standings"), grid = document.getElementById("voteGrid"), msg = document.getElementById("msg"), meta = document.getElementById("meta"), q = document.getElementById("search");
  var data = null;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function icon(u, id, name) { var inner = u ? '<img src="' + esc(u) + '" alt="" loading="lazy" width="44" height="44">' : ""; return id ? '<a class="project-icon" style="display:block" href="/community/p/?id=' + encodeURIComponent(id) + '" aria-label="Open ' + esc(name || "product") + ' page">' + inner + "</a>" : '<div class="project-icon">' + inner + "</div>"; }
  function media(l) {
    var v = l.video, href = '/community/p/?id=' + encodeURIComponent(l.id);
    if (v && v.kind === "file" && /^\/api\/community\/video\?v=/.test(v.src)) return '<div class="lg2-img"><video src="' + esc(v.src) + '" muted loop playsinline autoplay preload="metadata"' + (l.imageUrl ? ' poster="' + esc(l.imageUrl) + '"' : "") + ' aria-label="' + esc(l.name) + ' video"></video></div>';
    if (v && (v.kind === "youtube" || v.kind === "vimeo") && /^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(v.src)) return '<div class="lg2-img"><iframe src="' + esc(v.src) + '" title="' + esc(l.name) + ' video" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>';
    return '<a class="lg2-img" href="' + href + '" aria-label="Open ' + esc(l.name) + ' page">' + (l.imageUrl ? '<img src="' + esc(l.imageUrl) + '" alt="" loading="lazy">' : "") + '</a>';
  }
  function say(t, c) { msg.textContent = t; msg.className = "lg-msg" + (c ? " " + c : ""); }
  function showToast(m) {
    var t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = m; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function render() {
    var ends = new Date(data.endsAt);
    meta.textContent = data.totalVotes + (data.totalVotes === 1 ? " vote" : " votes") + " · resets " + ends.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
    st.innerHTML = data.standings.length ? data.standings.map(function (s, i) {
      return '<li class="standings-item"><span class="rank">' + (i + 1) + "</span>" + icon(s.imageUrl, s.id, s.name) + '<div class="project-info"><strong><a href="' + esc(s.url) + '">' + esc(s.name) + "</a></strong><span>by " + esc(s.makerName) + '</span></div><span class="votes">' + s.votes + (s.votes === 1 ? " vote" : " votes") + "</span></li>";
    }).join("") : '<li class="lg-empty">No votes yet this week. Be the first to vote below.</li>';
    var f = (q.value || "").trim().toLowerCase();
    grid.innerHTML = data.eligible.filter(function (l) { return !f || (l.name + " " + l.makerName).toLowerCase().indexOf(f) >= 0; }).map(function (l) {
      var mine = data.voted === l.id;
      return '<div class="vote-card lg2' + (mine ? " voted" : "") + '"><div class="lg2-maker">' + esc(l.makerName) + '</div>' + media(l) + '<strong class="lg2-name"><a href="/community/p/?id=' + encodeURIComponent(l.id) + '">' + esc(l.name) + '</a></strong><div class="lg2-actions"><button type="button" class="vote-btn' + (mine ? " voted" : "") + '" data-id="' + esc(l.id) + '"' + (data.voted ? " disabled" : "") + ' aria-label="Vote for ' + esc(l.name) + '">' + (mine ? "Voted" : "Vote") + '</button><button type="button" class="share-btn" data-share="' + esc(l.id) + '" data-name="' + esc(l.name) + '" aria-label="Share ' + esc(l.name) + '">Share</button></div></div>';
    }).join("") || '<p class="lg-empty">' + (data.eligible.length ? "No matching projects." : "No projects in the league yet.") + "</p>";
    if (data.voted && !msg.textContent) say("You've voted this week. Come back Monday to vote again.", "ok");
  }
  function load() { return fetch("/api/league", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { data = d; render(); focusWanted(); }).catch(function () { st.innerHTML = '<li class="lg-empty">Couldn\'t load the league. Try again soon.</li>'; }); }
  grid.addEventListener("click", function (e) {
    var sh = e.target.closest("button[data-share]");
    if (sh) {
      var nm = sh.getAttribute("data-name"), url = location.origin + "/league/?vote=" + encodeURIComponent(sh.getAttribute("data-share"));
      var text = "Come vote for " + nm + " in Digital Underground's Maker League! 🗳️ One free vote a week, and the winner becomes Maker of the Week.";
      if (navigator.share) { navigator.share({ title: nm + " · Maker League", text: text, url: url }).catch(function () {}); }
      else { var w = window.open("https://x.com/intent/post?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url), "_blank", "noopener"); if (!w && navigator.clipboard) navigator.clipboard.writeText(text + " " + url).then(function () { showToast("Link copied!"); }); }
      return;
    }
    var b = e.target.closest("button[data-id]"); if (!b || b.disabled) return;
    var name = b.closest(".vote-card").querySelector(".lg2-name").textContent;
    [].forEach.call(grid.querySelectorAll("button"), function (x) { x.disabled = true; }); say("Counting your vote…");
    fetch("/api/league", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: b.getAttribute("data-id"), hp: document.getElementById("hp").value }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (d.ok) { say("Thanks! Your vote is in.", "ok"); showToast("You voted for " + name + "!"); optimistic(d.voted); }
        else say(d.error || "Couldn't record your vote.", "err");
        return load();
      });
  });
  function optimistic(id) {
    if (!data || !id) return;
    var s = data.standings.filter(function (x) { return x.id === id; })[0];
    if (s) s.votes++; else { var l = data.eligible.filter(function (x) { return x.id === id; })[0]; if (l) data.standings.push({ id: l.id, name: l.name, makerName: l.makerName, imageUrl: l.imageUrl, url: "/community/p/?id=" + encodeURIComponent(l.id), votes: 1 }); }
    data.standings.sort(function (a, b) { return b.votes - a.votes || a.name.localeCompare(b.name); });
    data.totalVotes++; data.voted = id; render();
  }
  var want = new URLSearchParams(location.search).get("vote");
  function focusWanted() { if (!want) return; var b = grid.querySelector('button[data-id="' + want.replace(/["\\]/g, "") + '"]'); if (b) { var c = b.closest(".vote-card"); c.classList.add("shared-pick"); c.scrollIntoView({ block: "center" }); want = null; } }
  q.addEventListener("input", function () { if (data) render(); });
  load();
})();
