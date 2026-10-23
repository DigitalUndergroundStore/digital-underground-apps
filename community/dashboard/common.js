/* Dashboard v2 shared helpers. */
(function () {
  "use strict";
  var API = "/api/community/creator-v2";
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function api(method, body, qs) {
    return fetch(API + (qs || ""), {
      method: method, credentials: "same-origin", cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; }); });
  }
  /** Published state of a listing: Live / In review / Unpublished / Rejected / On hold. */
  function listingState(l) {
    if (l.status === "approved" && !l.pendingRevision && !l.pendingVideo) return { cls: "live", label: "Live" };
    if (l.status === "approved") return { cls: "review", label: "Live · update in review" };
    if (l.status === "pending") return { cls: "review", label: "In review" };
    if (l.status === "unpublished") return { cls: "off", label: "Unpublished" };
    if (l.status === "rejected") return { cls: "bad", label: "Rejected" };
    if (l.status === "flagged") return { cls: "bad", label: "On hold" };
    return { cls: "off", label: l.status || "Draft" };
  }
  function cover(l) { return (l.images && l.images[0] && l.images[0].src) || l.legacyImage || (l.video && l.video.poster) || ""; }
  function icon(l) {
    var c = cover(l);
    return '<div class="listing-icon">' + (c ? '<img src="' + esc(c) + '" alt="" loading="lazy">' : esc((l.name || "?").charAt(0).toUpperCase())) + "</div>";
  }
  /* Logged out: send people to the one standard auth screen (Log in / Register / Forgot password) and come back here after.
     Nothing from the dashboard (tabs, profile or maker page editor) is shown until they are signed in. */
  function signIn(root) {
    var back = location.pathname + location.search + location.hash;
    if (root) root.innerHTML = '<div class="card signin"><h2>Log in to continue</h2><p class="muted" style="margin:8px 0 14px;font-size:.92rem">Taking you to the log in page…</p>' +
      '<p class="select-row"><a class="btn primary" href="/login/?next=' + encodeURIComponent(back) + '">Log in</a><a class="btn" href="/login/?mode=signup&amp;next=' + encodeURIComponent(back) + '">Register</a><a class="btn ghost" href="/login/?forgot=1&amp;next=' + encodeURIComponent(back) + '">Forgot password?</a></p></div>';
    location.replace("/login/?next=" + encodeURIComponent(back));
  }
  /* Private dashboard links (?k=) work here too: exchange once for the session cookie, then drop it from the URL. */
  function linkAuth() {
    var k = new URLSearchParams(location.search).get("k");
    if (!k) return Promise.resolve();
    /* Old private links go to the classic dashboard, which also lets the creator set an email and password. */
    if (location.pathname.indexOf("/classic/") < 0) { location.replace("/community/dashboard/classic/" + location.search + location.hash); return new Promise(function () {}); }
    return fetch(API, { headers: { Authorization: "Creator " + k }, credentials: "same-origin" }).catch(function () {}).then(function () {
      var u = new URL(location.href); u.searchParams.delete("k"); history.replaceState(null, "", u.pathname + u.search + u.hash);
    });
  }
  window.DU2 = { api: api, esc: esc, listingState: listingState, cover: cover, icon: icon, signIn: signIn, linkAuth: linkAuth, API: API };
})();
