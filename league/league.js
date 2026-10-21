(function () {
  var st = document.getElementById("standings"), pick = document.getElementById("pick"), msg = document.getElementById("msg"), meta = document.getElementById("meta"), q = document.getElementById("q");
  var data = null;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function img(u) { return u ? '<img src="' + esc(u) + '" alt="" loading="lazy" width="44" height="44">' : '<span class="lg-ph"></span>'; }
  function say(t, c) { msg.textContent = t; msg.className = "lg-msg" + (c ? " " + c : ""); }
  function render() {
    var ends = new Date(data.endsAt);
    meta.textContent = data.totalVotes + (data.totalVotes === 1 ? " vote" : " votes") + " · resets " + ends.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
    st.innerHTML = data.standings.length ? data.standings.map(function (s, i) {
      return '<li><span class="n">' + (i + 1) + "</span>" + img(s.imageUrl) + '<span><a href="' + esc(s.url) + '">' + esc(s.name) + "</a><small>by " + esc(s.makerName) + '</small></span><span class="v">' + s.votes + (s.votes === 1 ? " vote" : " votes") + "</span></li>";
    }).join("") : '<li class="lg-empty">No votes yet this week. Be the first to vote below.</li>';
    var f = (q.value || "").trim().toLowerCase();
    pick.innerHTML = data.eligible.filter(function (l) { return !f || (l.name + " " + l.makerName).toLowerCase().indexOf(f) >= 0; }).map(function (l) {
      var mine = data.voted === l.id;
      return '<li class="' + (mine ? "is-mine" : "") + '">' + img(l.imageUrl) + '<span class="t"><b>' + esc(l.name) + "</b><small>by " + esc(l.makerName) + '</small></span><button type="button" data-id="' + esc(l.id) + '"' + (data.voted ? " disabled" : "") + ' aria-label="Vote for ' + esc(l.name) + '">' + (mine ? "Voted ✓" : "Vote") + "</button></li>";
    }).join("") || '<li class="lg-empty">' + (data.eligible.length ? "No matching projects." : "No projects in the league yet.") + '</li>';
    if (data.voted && !msg.textContent) say("You've voted this week. Come back Monday to vote again.", "ok");
  }
  function load() { return fetch("/api/league", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { data = d; render(); }).catch(function () { st.innerHTML = '<li class="lg-empty">Couldn\'t load the league. Try again soon.</li>'; }); }
  pick.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-id]"); if (!b || b.disabled) return;
    [].forEach.call(pick.querySelectorAll("button"), function (x) { x.disabled = true; }); say("Counting your vote…");
    fetch("/api/league", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: b.getAttribute("data-id"), hp: document.getElementById("hp").value }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (d.ok) { say("Thanks! Your vote is in.", "ok"); optimistic(d.voted); }
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
  q.addEventListener("input", function () { if (data) render(); });
  load();
})();
