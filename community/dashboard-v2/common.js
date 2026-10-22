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
  function signIn(root, then) {
    root.innerHTML =
      '<div class="card signin"><h2>Sign in</h2><p class="muted" style="margin-bottom:14px;font-size:.9rem">This is the new dashboard preview. Use the same email and password as the current dashboard.</p>' +
      '<form id="si"><div class="fld"><label for="si-e">Email</label><input class="ctl" id="si-e" type="email" autocomplete="email" required></div>' +
      '<div class="fld"><label for="si-p">Password</label><input class="ctl" id="si-p" type="password" autocomplete="current-password" required></div>' +
      '<p class="err" id="si-err" role="alert"></p><button class="btn primary" type="submit">Sign in</button> ' +
      '<a class="btn ghost" href="/community/dashboard/">Other sign-in options</a></form></div>';
    root.querySelector("#si").addEventListener("submit", function (e) {
      e.preventDefault();
      var err = root.querySelector("#si-err"); err.textContent = "";
      fetch("/api/community/creator-login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: root.querySelector("#si-e").value, password: root.querySelector("#si-p").value }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (r.ok && d.ok !== false) then(); else err.textContent = d.error || "Sign-in failed."; }); })
        .catch(function () { err.textContent = "Network error. Try again."; });
    });
  }
  /* Private dashboard links (?k=) work here too: exchange once for the session cookie, then drop it from the URL. */
  function linkAuth() {
    var k = new URLSearchParams(location.search).get("k");
    if (!k) return Promise.resolve();
    return fetch(API, { headers: { Authorization: "Creator " + k }, credentials: "same-origin" }).catch(function () {}).then(function () {
      var u = new URL(location.href); u.searchParams.delete("k"); history.replaceState(null, "", u.pathname + u.search + u.hash);
    });
  }
  window.DU2 = { api: api, esc: esc, listingState: listingState, cover: cover, icon: icon, signIn: signIn, linkAuth: linkAuth, API: API };
})();
