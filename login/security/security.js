/* Security settings: sign-in methods (email, Google, X on one account), 2FA + backup codes */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function say(t, ok) { var m = $("msg"); m.hidden = !t; m.textContent = t || ""; m.className = "au-alert" + (ok ? " ok" : ""); }
  function api(path, body) {
    return fetch("/api/auth/" + path, body ? { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: "Something went wrong." }; }); });
  }
  function view(st) {
    $("v-off").hidden = st.totp; $("v-on").hidden = !st.totp; $("v-enroll").hidden = true; $("s-backup").hidden = !st.totp;
    $("pill").textContent = st.totp ? "On" : "Off"; $("pill").className = "sec-pill" + (st.totp ? " on" : "");
    $("bc-left").textContent = st.backupLeft + " of 10 left";
  }
  var qs = new URLSearchParams(location.search);
  function pill(t, on) { return '<span class="sec-pill' + (on ? ' on' : '') + '">' + t + '</span>'; }
  function methods(d) {
    var ids = d.identities || [];
    $("m-email").textContent = d.email || "Not added";
    $("s-email").innerHTML = d.email ? pill("Added", true) : "";
    $("f-email").hidden = !!d.email;
    ["google", "x"].forEach(function (p) {
      var on = ids.indexOf(p) >= 0;
      $("m-" + p).textContent = on ? "Linked" : "Not linked";
      $("s-" + p).innerHTML = on ? pill("Linked", true) : '<a class="sec-ghost" href="/api/auth/' + p + '/start?link=1&next=%2Flogin%2Fsecurity%2F">Link</a>';
    });
    var n = (d.email ? 1 : 0) + ids.length;
    $("si-pill").textContent = n + (n === 1 ? " way" : " ways") + " to sign in";
  }
  function load() {
    return api("security").then(function (d) {
      if (!d.ok) { location.href = "/login/?next=" + encodeURIComponent(location.pathname + location.search); return; }
      $("who").textContent = d.email ? "Signed in as " + d.email : "Signed in"; view(d); methods(d);
      if (qs.get("addemail") && !d.email) { say("Add your email below so logging in with your email, Google or X always opens this same account."); $("e-add").focus(); }
      if (qs.get("linked")) say((qs.get("linked") === "x" ? "X" : "Google") + " is now linked to this account.", true);
      if (qs.get("err") === "linked-elsewhere") say("That sign-in already belongs to another account with its own email. Log in with it and add this account's email there instead.");
    });
  }
  $("f-email").addEventListener("submit", function (e) {
    e.preventDefault();
    var em = $("e-add").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return say("Enter a valid email.");
    api("email/add", { email: em }).then(function (d) { say(d.ok ? d.message : d.error, d.ok); });
  });
  var lastCodes = [];
  function showCodes(codes) {
    lastCodes = codes; $("codes").innerHTML = "";
    codes.forEach(function (c) { var li = document.createElement("li"); li.textContent = c; $("codes").appendChild(li); });
    $("codes-box").hidden = false; $("bc-left").textContent = codes.length + " of 10 left";
  }
  $("b-setup").addEventListener("click", function () {
    api("totp/setup", {}).then(function (d) {
      if (!d.ok) return say(d.error);
      var q = qrcode(0, "M"); q.addData(d.otpauth); q.make();
      $("qr").innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      $("key").textContent = d.secret.replace(/(.{4})/g, "$1 ").trim();
      $("v-off").hidden = true; $("v-enroll").hidden = false; $("c-enable").focus(); say("");
    });
  });
  $("f-enable").addEventListener("submit", function (e) {
    e.preventDefault();
    api("totp/enable", { code: $("c-enable").value.trim() }).then(function (d) {
      if (!d.ok) return say(d.error);
      say("2FA is on. Save your backup codes below.", true);
      view({ totp: true, backupLeft: d.codes.length }); showCodes(d.codes); $("qr").innerHTML = ""; $("key").textContent = "";
    });
  });
  $("f-disable").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!confirm("Turn off two-factor authentication? Your backup codes will stop working.")) return;
    api("totp/disable", { code: $("c-disable").value.trim() }).then(function (d) {
      if (!d.ok) return say(d.error);
      $("c-disable").value = ""; $("codes-box").hidden = true; say("2FA is off.", true); view({ totp: false, backupLeft: 0 });
    });
  });
  $("f-regen").addEventListener("submit", function (e) {
    e.preventDefault();
    api("backup/regenerate", { code: $("c-regen").value.trim() }).then(function (d) {
      if (!d.ok) return say(d.error);
      $("c-regen").value = ""; showCodes(d.codes); say("New backup codes made. The old ones no longer work.", true);
    });
  });
  $("b-copy").addEventListener("click", function () { navigator.clipboard && navigator.clipboard.writeText(lastCodes.join("\n")).then(function () { say("Copied.", true); }); });
  $("b-dl").addEventListener("click", function () {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["Digital Underground backup codes (each works once)\n\n" + lastCodes.join("\n") + "\n"], { type: "text/plain" }));
    a.download = "digital-underground-backup-codes.txt"; a.click();
  });
  if (qs.get("verify")) {
    var tok = qs.get("verify");
    api("email/verify", { token: tok }).then(function (d) {
      if (d.needLogin) { location.href = "/login/?next=" + encodeURIComponent("/login/security/?verify=" + tok); return; }
      history.replaceState(null, "", "/login/security/");
      if (d.ok && d.login) { location.href = "/login/?next=" + encodeURIComponent("/login/security/"); return; }
      load().then(function () { say(d.ok ? d.message : d.error, d.ok); });
    });
  } else load();
})();
