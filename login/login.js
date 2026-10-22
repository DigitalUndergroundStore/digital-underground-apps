/* PREVIEW ONLY (do not deploy) */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var mode = "login", ticket = "", qs = new URLSearchParams(location.search), next = qs.get("next") || "/community/dashboard/";
  if (!/^\/(?!\/)/.test(next)) next = "/community/dashboard/";
  var COPY = { login: ["Welcome back", "Log in to manage your listings.", "Log in", "current-password"],
               signup: ["Create your creator account", "List your apps free. Takes a minute.", "Create account", "new-password"] };
  var ERR = { cancelled: "Sign-in was cancelled.", state: "That sign-in expired. Try again.", token: "The provider didn't confirm the sign-in. Try again.",
              provider: "Couldn't reach the provider. Try again.", profile: "The provider didn't share an account id.", rate: "Too many attempts. Try again in a few minutes.",
              "google-unavailable": "Google sign-in isn't set up yet. Use email for now.", "x-unavailable": "X sign-in isn't set up yet. Use email for now." };
  function say(t, ok) { var m = $("au-msg"); m.hidden = !t; m.textContent = t || ""; m.className = "au-alert" + (ok ? " ok" : ""); }
  function setMode(m) {
    mode = m; var c = COPY[m];
    $("t-login").setAttribute("aria-selected", m === "login"); $("t-signup").setAttribute("aria-selected", m === "signup");
    $("au-title").textContent = c[0]; $("au-sub").textContent = c[1]; $("go").textContent = c[2];
    $("pw").setAttribute("autocomplete", c[3]); $("forgot").hidden = m !== "login"; $("pw-hint").hidden = m !== "signup"; say("");
  }
  document.querySelectorAll(".au-tabs [data-mode]").forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.mode); }); });
  if (qs.get("mode") === "signup" || location.hash === "#signup") setMode("signup");
  document.querySelectorAll(".au-oauth [data-p]").forEach(function (a) { a.href = "/api/auth/" + a.dataset.p + "/start?next=" + encodeURIComponent(next); });
  fetch("/api/auth/providers").then(function (r) { return r.json(); }).then(function (d) {
    ["google", "x"].forEach(function (p) { if (d && d[p] === false) { var a = document.querySelector('[data-p="' + p + '"]'); a.setAttribute("aria-disabled", "true"); a.title = "Not set up yet"; } });
  }).catch(function () {});
  $("eye").addEventListener("click", function () { var s = $("pw").type === "password"; $("pw").type = s ? "text" : "password"; this.textContent = s ? "Hide" : "Show"; this.setAttribute("aria-pressed", s); });
  function showMfa(t) { ticket = t; $("f-auth").hidden = true; document.querySelector(".au-oauth").hidden = true; document.querySelector(".au-or").hidden = true; document.querySelector(".au-tabs").hidden = true;
    $("f-mfa").hidden = false; $("au-title").textContent = "Two-factor check"; $("au-sub").textContent = "Open your authenticator app."; $("code").focus(); }
  function post(path, body) { return fetch("/api/auth/" + path, { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) })
    .then(function (r) { return r.json().catch(function () { return { ok: false, error: "Something went wrong. Try again." }; }); }); }
  $("f-auth").addEventListener("submit", function (e) {
    e.preventDefault(); var em = $("em").value.trim(), pw = $("pw").value;
    if (!/^\S+@\S+\.\S+$/.test(em)) return say("Enter a valid email."), $("em").focus();
    if (pw.length < 8) return say("Password must be at least 8 characters."), $("pw").focus();
    var b = $("go"); b.disabled = true; say("");
    post(mode, { email: em, password: pw }).then(function (d) {
      if (d.mfa) return showMfa(d.ticket);
      if (d.ok) { say(mode === "signup" ? "Account created. Taking you to your dashboard…" : "Logged in…", true); location.href = next; return; }
      say(d.error || "Something went wrong. Try again.");
      if (d.exists) setMode("login");
    }).catch(function () { say("Network error. Try again."); }).then(function () { b.disabled = false; });
  });
  $("f-mfa").addEventListener("submit", function (e) {
    e.preventDefault();
    post("2fa", { ticket: ticket, code: $("code").value.trim() }).then(function (d) { if (d.ok) location.href = next; else say(d.error); });
  });
  function only(id, title, sub) { ["f-auth", "f-mfa", "f-forgot", "f-reset"].forEach(function (f) { $(f).hidden = f !== id; });
    [".au-oauth", ".au-or", ".au-tabs"].forEach(function (q) { document.querySelector(q).hidden = true; });
    $("au-title").textContent = title; $("au-sub").textContent = sub; }
  $("f-forgot").addEventListener("submit", function (e) {
    e.preventDefault(); var em = $("fem").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return say("Enter a valid email.");
    $("fgo").disabled = true;
    post("forgot", { email: em }).then(function (d) { say(d.message || d.error, !!d.ok); }).catch(function () { say("Network error. Try again."); }).then(function () { $("fgo").disabled = false; });
  });
  var resetTok = qs.get("reset");
  $("f-reset").addEventListener("submit", function (e) {
    e.preventDefault(); var a = $("npw").value;
    if (a.length < 8) return say("Password must be at least 8 characters.");
    if (a !== $("npw2").value) return say("The passwords don't match.");
    $("rgo").disabled = true;
    post("reset", { token: resetTok, password: a }).then(function (d) {
      say(d.message || d.error, !!d.ok);
      if (d.ok) { history.replaceState(null, "", "/login/"); setTimeout(function () { location.href = "/login/"; }, 1800); }
    }).catch(function () { say("Network error. Try again."); }).then(function () { $("rgo").disabled = false; });
  });
  if (resetTok) { history.replaceState(null, "", "/login/?reset=1"); if (resetTok === "1") resetTok = ""; only("f-reset", "Choose a new password", "Pick something you don't use anywhere else."); }
  else if (qs.get("forgot")) only("f-forgot", "Reset your password", "We'll email you a link that works for 1 hour.");
  if (qs.get("mfa")) showMfa(qs.get("mfa"));
  if (qs.get("err")) say(ERR[qs.get("err")] || "Sign-in failed. Try again.");
})();
