/* Maker page editor (creator dashboard). POST /api/community/creator {action: profile_get|profile_save}. No polling. */
(function () {
  "use strict";
  var LABEL = { x: "X", github: "GitHub", youtube: "YouTube", linkedin: "LinkedIn", instagram: "Instagram", mastodon: "Mastodon", bluesky: "Bluesky", discord: "Discord" };
  var cur = null, imgs = { logo: "", banner: "" }, loaded = false;
  function $(id) { return document.getElementById(id); }
  function post(body) {
    if (body.action === "profile_get") return fetch("/api/community/creator?action=profile" + (body.slug ? "&slug=" + encodeURIComponent(body.slug) : ""), { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
    return fetch("/api/community/creator", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(el, text, kind) { el.hidden = !text; el.className = "alert " + (kind || "err"); el.textContent = text || ""; }
  function https(v) { if (!v) return true; try { var u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; } catch (_) { return false; } }

  /** Downscale an image file to WebP within a box so uploads stay small (server re-checks the size). */
  function shrink(file, w, h, maxKB) {
    return new Promise(function (res, rej) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej("Use a JPEG, PNG or WebP image.");
      if (file.size > 8 * 1024 * 1024) return rej("That image is over 8 MB.");
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var c = document.createElement("canvas"), s = Math.max(w / img.width, h / img.height);
        c.width = w; c.height = h;
        var dw = img.width * s, dh = img.height * s;
        c.getContext("2d").drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        URL.revokeObjectURL(url);
        var q = 0.85, out;
        do { out = c.toDataURL("image/webp", q); q -= 0.1; } while (out.length * 0.75 > maxKB * 1024 && q > 0.3);
        if (out.length * 0.75 > maxKB * 1024) return rej("Image is still too large after compressing. Try a simpler image.");
        res(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej("Could not read that image."); };
      img.src = url;
    });
  }
  function fill(d) {
    cur = d.profile; imgs = { logo: "", banner: "" };
    var p = cur.pending || cur.live || {}, f = $("pf-form");
    $("profile").hidden = false;
    $("pf-view").href = cur.url;
    var pick = $("pf-pick");
    $("pf-pick-wrap").hidden = !(d.makers && d.makers.length > 1);
    pick.innerHTML = ""; (d.makers || []).forEach(function (m) { var o = document.createElement("option"); o.value = m.slug; o.textContent = m.name; o.selected = m.slug === cur.slug; pick.appendChild(o); });
    f.name.value = p.name || cur.defaultName || ""; f.bio.value = p.bio || ""; f.website.value = p.website || "";
    var box = $("pf-socials"); box.innerHTML = "";
    (cur.socials || Object.keys(LABEL)).forEach(function (k) {
      var id = "pf-s-" + k, div = document.createElement("div"); div.className = "fld";
      div.innerHTML = '<label for="' + id + '"></label><input id="' + id + '" type="url" inputmode="url" maxlength="200" placeholder="https://">';
      div.querySelector("label").textContent = LABEL[k] || k; div.querySelector("input").value = (p.socials || {})[k] || ""; div.querySelector("input").dataset.k = k;
      box.appendChild(div);
    });
    [["logo", "pf-logo-prev"], ["banner", "pf-banner-prev"]].forEach(function (a) { var el = $(a[1]); el.hidden = !p[a[0]]; if (p[a[0]]) el.src = p[a[0]]; });
    var st = $("pf-state");
    if (cur.pending) msg(st, "Your latest changes are waiting for review. Your page shows the last approved version until then.", "ok");
    else if (cur.lastRejected) msg(st, "Your last profile change wasn't approved" + (cur.lastRejected.reason ? ": " + cur.lastRejected.reason : ".") + " You can edit and resubmit.", "err");
    else msg(st, cur.live ? "" : "Your page isn't live yet. Fill it in and submit it for review.", "ok");
  }
  function load(slug) {
    return post({ action: "profile_get", slug: slug }).then(function (d) { if (d._ok && d.profile) fill(d); });
  }
  window.duProfileLoad = function () { if (!loaded) { loaded = true; load(); } };
  document.addEventListener("DOMContentLoaded", function () {
    var f = $("pf-form"); if (!f) return;
    if ($("app") && !$("app").hidden) window.duProfileLoad(); // dashboard finished loading before this script ran
    $("pf-pick").addEventListener("change", function () { load(this.value); });
    [["pf-logo", "logo", 256, 256, cur ? cur.limits.logoKB : 100, "pf-logo-prev"], ["pf-banner", "banner", 1200, 400, 300, "pf-banner-prev"]].forEach(function (a) {
      $(a[0]).addEventListener("change", function () {
        var file = this.files && this.files[0]; if (!file) return;
        shrink(file, a[2], a[3], a[1] === "logo" ? 95 : 290).then(function (data) { imgs[a[1]] = data; var el = $(a[5]); el.src = data; el.hidden = false; msg($("pf-msg"), ""); })
          .catch(function (err) { msg($("pf-msg"), String(err)); });
      });
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var socials = {}, bad = "";
      [].forEach.call($("pf-socials").querySelectorAll("input"), function (i) { var v = i.value.trim(); if (v && !https(v)) bad = bad || (LABEL[i.dataset.k] + " link must start with https://"); if (v) socials[i.dataset.k] = v; });
      var web = f.website.value.trim();
      if (!https(web)) bad = "Website must start with https://";
      if (!f.name.value.trim()) bad = "Add a display name.";
      if (bad) { msg($("pf-msg"), bad); return; }
      var btn = $("pf-save"); btn.disabled = true; btn.textContent = "Submitting…";
      post({ action: "profile_save", slug: cur && cur.slug, profile: { name: f.name.value, bio: f.bio.value, website: web, socials: socials, logo: imgs.logo, banner: imgs.banner } }).then(function (d) {
        btn.disabled = false; btn.textContent = "Submit for review";
        if (!d._ok) { msg($("pf-msg"), d.error || "Could not save. Try again."); return; }
        msg($("pf-msg"), ""); fill(d);
        $("pf-state").focus && $("pf-state").setAttribute("tabindex", "-1"); $("pf-state").focus();
      }).catch(function () { btn.disabled = false; btn.textContent = "Submit for review"; msg($("pf-msg"), "Network error. Try again."); });
    });
  });
})();
