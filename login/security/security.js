/* PREVIEW ONLY (do not deploy) — 2FA + backup codes settings */
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
  function load() {
    return api("security").then(function (d) {
      if (!d.ok) { location.href = "/login/?next=" + encodeURIComponent("/login/security/"); return; }
      $("who").textContent = d.email ? "Signed in as " + d.email : "Signed in"; view(d);
    });
  }
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
  load();
})();
