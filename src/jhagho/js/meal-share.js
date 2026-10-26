/* Pantry Week v3.16.0: "Share a photo of a meal I made". Unlike Add-from-photo (OCR, on-device only) and
   "Use my photo" (IndexedDB, never uploaded), this UPLOADS the photo to Digital Underground after the cook
   ticks a consent box. Endpoint: /api/pantry-week/meal-photo. window.PW_MEAL_SHARE */
"use strict";
(function () {
  var API = "/api/pantry-week/meal-photo", MAX = 1280, LS = "pantry_week_shared_meals";
  var CONSENT = "I made this meal and took this photo. I'm OK with it being saved to Pantry Week / Digital Underground, " +
    "and if it's a good shot it may be shown on the Digital Underground website or in promotion for Pantry Week " +
    "(with the name below as credit, if I give one). Photos are reviewed before anything is shown publicly.";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function shared() { try { return JSON.parse(localStorage.getItem(LS) || "[]") || []; } catch (e) { return []; } }
  function remember(entry) { try { var a = shared(); a.unshift(entry); localStorage.setItem(LS, JSON.stringify(a.slice(0, 100))); } catch (e) { /* ok */ } }
  function forget(id) { try { localStorage.setItem(LS, JSON.stringify(shared().filter(function (x) { return x.id !== id; }))); } catch (e) { /* ok */ } }
  function online() { return /^https?:$/.test(location.protocol); }
  function resize(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, MAX / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        var d = c.toDataURL("image/jpeg", 0.82);
        c.toBlob(function (b) { if (!b) { reject(new Error("That photo could not be prepared.")); return; } resolve({ dataUrl: d, blob: b, w: c.width, h: c.height }); }, "image/jpeg", 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(u); reject(new Error("That file is not a photo this browser can read.")); };
      img.src = u;
    });
  }
  var root = null, cur = null, picked = null, prevFocus = null;
  function close() { if (root) { root.hidden = true; root.innerHTML = ""; } picked = null; cur = null; if (prevFocus && prevFocus.focus) prevFocus.focus(); }
  function render(msg, busy) {
    var r = cur || {};
    var list = shared().filter(function (x) { return !r.id || x.recipeId === r.id; }).slice(0, 6);
    root.innerHTML = '<div class="modal-card meal-share">' +
      '<div class="modal-head"><h2 id="mealShareTitle">Share a photo of your meal</h2>' +
      '<button type="button" class="text-btn" data-ms="close">Close</button></div>' +
      '<p class="lead">Made <strong>' + esc(r.name || "something good") + '</strong>? Snap it and send it to Pantry Week.</p>' +
      '<p class="meal-share__note"><strong>This photo is uploaded</strong> to Digital Underground (it is not only saved on this phone). ' +
      'Good shots may be used on the site or in promo for Pantry Week.</p>' +
      '<div class="meal-share__pick">' +
        (picked ? '<img class="meal-share__preview" alt="Your meal photo" src="' + picked.dataUrl + '">' : "") +
        '<button type="button" data-ms="pick">' + (picked ? "Choose a different photo" : "Take or choose a photo") + '</button></div>' +
      '<label class="field">Your name or handle for credit (optional)<input id="msName" maxlength="40" autocomplete="nickname" value="' + esc(r._name || "") + '"></label>' +
      '<label class="meal-share__consent"><input type="checkbox" id="msConsent"' + (r._consent ? " checked" : "") + '> <span>' + esc(CONSENT) + '</span></label>' +
      (msg ? '<p class="meal-share__msg" role="status">' + esc(msg) + '</p>' : "") +
      '<div class="toolbar"><button type="button" class="primary" data-ms="send"' + (busy ? " disabled" : "") + '>' + (busy ? "Uploading…" : "Upload photo") + '</button>' +
      '<button type="button" data-ms="close">Not now</button></div>' +
      (list.length ? '<h3>Photos you shared</h3><ul class="meal-share__list">' + list.map(function (x) {
        return '<li><span>' + esc(x.recipeName || "Meal photo") + ' · ' + esc(new Date(x.at).toLocaleDateString()) + '</span> ' + (x.token ? '<button type="button" class="danger text-btn" data-ms="del" data-id="' + esc(x.id) + '">Delete</button>' : "") + '</li>';
      }).join("") + "</ul>" : "") +
      '<p class="meal-share__fine">Changed your mind? Tap Delete above on this device, or ask us at digitalundergroundstore.com/support.</p>' +
      "</div>";
  }
  function keep() { if (!cur) return; var n = document.getElementById("msName"), c = null, k = document.getElementById("msConsent");
    if (n) cur._name = n.value; if (c) cur._caption = c.value; if (k) cur._consent = k.checked; }
  function pick() {
    var input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.className = "pw-photo-input";
    input.addEventListener("change", function () {
      var f = input.files && input.files[0]; input.remove();
      if (!f) return;
      resize(f).then(function (p) { picked = p; render(); }, function (e) { render(e.message); });
    });
    document.body.appendChild(input); input.click();
  }
  function send() {
    keep();
    if (!picked) { render("Take or choose a photo first."); return; }
    if (!cur._consent) { render("Please tick the box to agree before uploading."); return; }
    if (!online()) { render("Uploading only works in the hosted app at digitalundergroundstore.com/pantry-week."); return; }
    render("", true);
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      image: picked.dataUrl, w: picked.w, h: picked.h, consent: true, consentText: CONSENT,
      recipeId: cur.id || "", recipeName: cur.name || "", name: cur._name || "",
      appVersion: window.__DU_APP_SEMVER__ || ""
    }) }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, d: d }; }); })
      .then(function (o) {
        if (!o.ok || !o.d.ok) { render(o.d.error || "Upload failed. Please try again."); return; }
        if (o.d.status === "rejected") {
          picked = null; cur._consent = false;
          render("Sorry, that photo wasn't accepted — we only keep clear photos of the meal itself (no people or screenshots). It was not saved. Try another shot of your dish.");
          return;
        }
        remember({ id: o.d.id, token: o.d.deleteToken, recipeId: cur.id || "", recipeName: cur.name || "", at: Date.now() });
        picked = null; cur._caption = ""; cur._consent = false;
        render(o.d.status === "approved"
          ? "Thanks! Your meal photo was accepted and saved — it may be shown on Pantry Week."
          : "Thanks! Your photo was uploaded and is under review — good ones may be featured.");
      }).catch(function () { render("You seem to be offline. Your photo was not uploaded — try again when you're connected."); });
  }
  function del(id) {
    var e = shared().filter(function (x) { return x.id === id; })[0];
    if (!e || !confirm("Delete this photo from Digital Underground?")) return;
    fetch(API + "?id=" + encodeURIComponent(id) + "&token=" + encodeURIComponent(e.token), { method: "DELETE" })
      .then(function (res) { if (res.ok || res.status === 404) { forget(id); render("Photo deleted."); } else render("Could not delete. Try again later."); })
      .catch(function () { render("You seem to be offline."); });
  }
  function open(recipe) {
    if (!root) {
      root = document.createElement("div");
      root.id = "mealShare"; root.className = "modal"; root.setAttribute("role", "dialog");
      root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "mealShareTitle");
      root.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (ev.target === root) { close(); return; }
        var b = ev.target.closest && ev.target.closest("[data-ms]");
        if (!b) return;
        var a = b.getAttribute("data-ms");
        keep();
        if (a === "close") close(); else if (a === "pick") pick(); else if (a === "send") send(); else if (a === "del") del(b.getAttribute("data-id"));
      });
      root.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { ev.stopPropagation(); close(); } });
      document.body.appendChild(root);
    }
    prevFocus = document.activeElement;
    cur = { id: recipe && recipe.id || "", name: recipe && recipe.name || "" };
    picked = null;
    render();
    root.hidden = false;
    var h = root.querySelector("[data-ms=pick]"); if (h) h.focus();
  }
  window.PW_MEAL_SHARE = { open: open, isOpen: function () { return !!(root && !root.hidden); }, close: close, CONSENT: CONSENT };
})();
