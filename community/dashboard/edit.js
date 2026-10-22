/* Dashboard v2 full-size editor: form + live preview + gallery manager. */
(function () {
  "use strict";
  var D = window.DU2, esc = D.esc, $ = function (s, r) { return (r || document).querySelector(s); };
  var id = new URLSearchParams(location.search).get("id") || "";
  var root = $("#root"), L = null, saved = null, saveState = "saved", pendingRemovals = {};
  var STAGES = ["Concept", "In development", "Beta / testing", "Released", "Discontinued"];
  var LIM = { name: 120, pitchShort: 280, descriptionLong: 4000, statusLabel: 24 };
  var DKEY = "du2-draft:" + id, MAX_IMAGES = 8, MAX_SIDE = 1600, MAX_TAGS = 6, tags = [];

  /* ---------- toast with optional undo ---------- */
  var toastT;
  function toast(msg, actionLabel, onAction, ms) {
    var t = $("#toast"); clearTimeout(toastT);
    t.innerHTML = "<span>" + esc(msg) + "</span>" + (actionLabel ? '<button class="btn sm" type="button">' + esc(actionLabel) + "</button>" : "");
    if (actionLabel) $("button", t).onclick = function () { t.classList.remove("on"); onAction(); };
    t.classList.add("on"); toastT = setTimeout(function () { t.classList.remove("on"); }, ms || 3500);
  }

  /* ---------- form values / dirty state ---------- */
  function vals() {
    var f = $("#ef"); if (!f) return null;
    return { name: f.name.value, pitchShort: f.pitchShort.value, descriptionLong: f.descriptionLong.value, projectUrl: f.projectUrl.value.trim(), stage: f.stage.value, statusLabel: f.statusLabel.value, videoUrl: f.videoUrl.value.trim(), tags: tags.slice() };
  }
  function fromListing(l) { return { name: l.name || "", pitchShort: l.pitchShort || "", descriptionLong: l.descriptionLong || "", projectUrl: l.projectUrl || "", stage: l.stage || "Released", statusLabel: l.statusLabel || "", videoUrl: (l.pendingVideo && l.pendingVideo.url) || l.videoUrl || "", tags: (l.tags || []).slice() }; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function dirty() { var v = vals(); return !!v && !same(v, saved); }
  function setState(s) {
    saveState = s;
    var st = D.listingState(L), map = { saved: ["saved", "Saved"], saving: ["saving", "Saving…"], unsaved: ["unsaved", "Unsaved changes"], error: ["bad", "Not saved"] };
    var m = map[s];
    document.querySelectorAll("[data-savepill]").forEach(function (p) { p.className = "pill " + m[0]; p.textContent = m[1]; });
    document.querySelectorAll("[data-livepill]").forEach(function (p) { p.className = "pill " + st.cls; p.textContent = st.label; });
    document.querySelectorAll("[data-save]").forEach(function (b) { b.disabled = s === "saving" || (s === "saved"); });
  }

  /* ---------- validation (inline errors) ---------- */
  function fieldErr(name, msg) {
    var f = $("#ef"), el = f[name], e = $("#e-" + name);
    if (!el || !e) return;
    e.textContent = msg || "";
    if (msg) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
  }
  function validate(v) {
    var errs = {};
    if (!v.name.trim()) errs.name = "Add a title.";
    if (!v.pitchShort.trim()) errs.pitchShort = "Add a short pitch (one or two sentences).";
    if (!v.descriptionLong.trim()) errs.descriptionLong = "Add a description.";
    if (!/^https:\/\/[^\s/]+\.[^\s]+/.test(v.projectUrl)) errs.projectUrl = "Use a full https:// link to your project.";
    if (v.videoUrl && !/^(https:\/\/|upload:)/.test(v.videoUrl)) errs.videoUrl = "Use a YouTube or Vimeo https:// link.";
    Object.keys(LIM).forEach(function (k) { if (v[k] != null && v[k].length > LIM[k]) errs[k] = "Too long: " + v[k].length + "/" + LIM[k] + " characters."; });
    ["name", "pitchShort", "descriptionLong", "projectUrl", "statusLabel", "videoUrl"].forEach(function (k) { fieldErr(k, errs[k]); });
    return errs;
  }
  function serverErrField(msg) {
    if (/title/i.test(msg)) return "name";
    if (/descriptions/i.test(msg)) return "descriptionLong";
    if (/link must|https url/i.test(msg)) return "projectUrl";
    if (/video|youtube|vimeo/i.test(msg)) return "videoUrl";
    if (/stage/i.test(msg)) return "stage";
    return null;
  }

  /* ---------- draft autosave (this device; no server writes until Save) ---------- */
  var draftT;
  function autosave() {
    clearTimeout(draftT);
    draftT = setTimeout(function () {
      try { if (dirty()) localStorage.setItem(DKEY, JSON.stringify({ v: vals(), base: L.version, at: Date.now() })); else localStorage.removeItem(DKEY); } catch (_) {}
    }, 600);
  }
  function onInput() { counters(); preview(); setState(dirty() ? "unsaved" : "saved"); autosave(); }

  function save() {
    var v = vals(), errs = validate(v), first = Object.keys(errs)[0];
    if (first) { var el = $("#ef")[first]; if (el) el.focus(); showForm(); $("#formerr").textContent = "Fix the highlighted fields first."; return; }
    $("#formerr").textContent = ""; setState("saving");
    var fields = { name: v.name, pitchShort: v.pitchShort, descriptionLong: v.descriptionLong, projectUrl: v.projectUrl, stage: v.stage, statusLabel: v.statusLabel, tags: v.tags };
    if (v.videoUrl !== saved.videoUrl && v.videoUrl) fields.videoUrl = v.videoUrl;
    D.api("POST", { action: "save", id: id, version: L.version, fields: fields }).then(function (d) {
      if (d.ok) {
        L = d.listing; saved = fromListing(L);
        try { localStorage.removeItem(DKEY); } catch (_) {}
        setState(dirty() ? "unsaved" : "saved"); preview();
        toast(D.listingState(L).cls === "live" ? "Saved. Your listing is live." : "Saved. " + D.listingState(L).label + ".");
        return;
      }
      setState("error");
      if (d.conflict) { $("#conflict").hidden = false; return; }
      var f = serverErrField(d.error || "");
      if (f) { fieldErr(f, d.error); $("#ef")[f].focus(); }
      $("#formerr").textContent = d.error || "Could not save. Try again.";
    }).catch(function () { setState("error"); $("#formerr").textContent = "Network error. Your changes are kept as a draft on this device."; });
  }

  /* ---------- preview ---------- */
  var pvIdx = 0;
  function images() { return (L.images || []).filter(function (im) { return !pendingRemovals[im.id]; }); }
  function preview() {
    var v = vals() || saved, ims = images(), cov = ims[0] ? ims[0].src : (L.legacyImage || "");
    var ch = [L.priceLabel ? '<span class="chip cy">' + esc(L.priceLabel) + "</span>" : "", v.statusLabel ? '<span class="chip">' + esc(v.statusLabel) + "</span>" : '<span class="chip">' + esc(v.stage) + "</span>"].concat((v.tags || []).slice(0, 3).map(function (t) { return '<span class="chip">#' + esc(t) + "</span>"; })).join("");
    $("#pv-card").innerHTML = '<div class="pv-media">' + (cov ? '<img src="' + esc(cov) + '" alt="">' : esc((v.name || "?").charAt(0).toUpperCase())) + '</div><div class="pv-body"><strong>' + esc(v.name || "Untitled") + '</strong><span class="by">by ' + esc(L.makerName || "you") + "</span><p>" + esc(v.pitchShort || "Your short pitch appears here.") + '</p><div class="chips">' + ch + "</div></div>";
    if (pvIdx >= ims.length) pvIdx = 0;
    var gal = ims.length ? '<div class="pv-hero"><img src="' + esc(ims[pvIdx].src) + '" alt="' + esc(ims[pvIdx].alt) + '"></div>' + (ims.length > 1 ? '<div class="pv-strip">' + ims.map(function (im, i) { return '<img data-i="' + i + '" class="' + (i === pvIdx ? "on" : "") + '" src="' + esc(im.src) + '" alt="' + esc(im.alt || "Image " + (i + 1)) + '">'; }).join("") + "</div>" : "") : cov ? '<div class="pv-hero"><img src="' + esc(cov) + '" alt=""></div>' : "";
    $("#pv-detail").innerHTML = "<h4>" + esc(v.name || "Untitled") + '</h4><span class="by">by ' + esc(L.makerName || "you") + '</span><p class="pitch">' + esc(v.pitchShort) + '</p><span class="pv-visit">Visit website ↗</span>' + gal + '<div class="desc">' + String(v.descriptionLong || "").split(/\n{2,}/).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    $("#pv-detail").querySelectorAll(".pv-strip img").forEach(function (im) { im.onclick = function () { pvIdx = +im.dataset.i; preview(); }; });
  }
  function counters() {
    var f = $("#ef");
    Object.keys(LIM).forEach(function (k) { var c = $("#c-" + k); if (c) { c.textContent = f[k].value.length + "/" + LIM[k]; c.classList.toggle("over", f[k].value.length > LIM[k]); } });
  }
  function showForm() { var g = $(".edit-grid"); if (g && g.dataset.view === "preview") togglePv(); }
  function togglePv() {
    var g = $(".edit-grid"), pv = g.dataset.view !== "preview";
    g.dataset.view = pv ? "preview" : "form";
    document.querySelectorAll(".pv-toggle").forEach(function (b) { b.textContent = pv ? "Back to form" : "Preview"; b.setAttribute("aria-pressed", pv ? "true" : "false"); });
    scrollTo(0, 0);
  }

  /* ---------- gallery manager ---------- */
  function renderThumbs() {
    var ims = images(), ul = $("#thumbs");
    $("#gcount").textContent = ims.length + "/" + MAX_IMAGES;
    ul.innerHTML = ims.map(function (im, i) {
      return '<li class="thumb" data-id="' + esc(im.id) + '"><div class="ph" title="Drag to reorder"><img src="' + esc(im.src) + '" alt="">' + (i === 0 ? '<span class="badge">Cover</span>' : "") + "</div>" +
        '<div class="tools"><button type="button" class="btn sm" data-mv="-1" aria-label="Move image ' + (i + 1) + ' left"' + (i === 0 ? " disabled" : "") + '>←</button><button type="button" class="btn sm" data-mv="1" aria-label="Move image ' + (i + 1) + ' right"' + (i === ims.length - 1 ? " disabled" : "") + '>→</button>' +
        (i ? '<button type="button" class="btn sm grow" data-cover>Set cover</button>' : '<span class="grow"></span>') + '<button type="button" class="btn sm danger" data-del aria-label="Delete image ' + (i + 1) + '">✕</button></div>' +
        '<label class="sr" for="alt-' + esc(im.id) + '">Alt text for image ' + (i + 1) + '</label><input class="alt" id="alt-' + esc(im.id) + '" maxlength="160" placeholder="Alt text (describe the image)" value="' + esc(im.alt) + '"></li>';
    }).join("");
    $("#legacy").hidden = !!ims.length || !L.legacyImage;
    preview();
  }
  function applyListing(d) { if (d && d.listing) { L.images = d.listing.images; L.version = d.listing.version; L.status = d.listing.status; L.legacyImage = d.listing.legacyImage; setState(saveState); } }
  function gop(body, okMsg) {
    body.id = id;
    return D.api("POST", body).then(function (d) {
      if (d.ok) { applyListing(d); renderThumbs(); if (okMsg) toast(okMsg); return true; }
      if (d.listing) applyListing(d);
      renderThumbs(); toast(d.error || "Could not update the gallery."); return false;
    }).catch(function () { renderThumbs(); toast("Network error. Gallery not changed."); return false; });
  }
  function currentOrder() { return Array.prototype.map.call(document.querySelectorAll("#thumbs .thumb"), function (li) { return li.dataset.id; }); }
  function commitOrder(order) {
    var before = images().map(function (x) { return x.id; });
    if (same(order, before)) return;
    var all = (L.images || []).map(function (x) { return x.id; }), rest = all.filter(function (x) { return order.indexOf(x) < 0; });
    var byId = {}; L.images.forEach(function (x) { byId[x.id] = x; });
    L.images = order.concat(rest).map(function (x) { return byId[x]; });
    renderThumbs();
    gop({ action: "img_reorder", order: order.concat(rest) }, order[0] !== before[0] ? "Order saved. New cover image set." : "Order saved.");
  }
  function onThumbClick(e) {
    var li = e.target.closest(".thumb"); if (!li) return;
    var iid = li.dataset.id, ord = currentOrder(), i = ord.indexOf(iid);
    if (e.target.closest("[data-mv]")) {
      var j = i + (+e.target.closest("[data-mv]").dataset.mv); if (j < 0 || j >= ord.length) return;
      ord.splice(i, 1); ord.splice(j, 0, iid); commitOrder(ord);
      setTimeout(function () { var b = document.querySelector('.thumb[data-id="' + iid + '"] [data-mv="' + (j > i ? 1 : -1) + '"]'); (b && !b.disabled ? b : document.querySelector('.thumb[data-id="' + iid + '"] .alt')).focus(); }, 0);
    } else if (e.target.closest("[data-cover]")) {
      var byId = {}; L.images.forEach(function (x) { byId[x.id] = x; });
      L.images = [byId[iid]].concat(L.images.filter(function (x) { return x.id !== iid; })); renderThumbs();
      gop({ action: "img_cover", imageId: iid }, "Cover image set.");
    } else if (e.target.closest("[data-del]")) {
      // Delete with undo: hidden now, removed on the server after the undo window.
      var t = setTimeout(function () { delete pendingRemovals[iid]; gop({ action: "img_remove", imageId: iid }); }, 6000);
      pendingRemovals[iid] = t; renderThumbs();
      toast("Image removed.", "Undo", function () { clearTimeout(pendingRemovals[iid]); delete pendingRemovals[iid]; renderThumbs(); }, 6000);
    }
  }
  function onAlt(e) {
    var inp = e.target.closest("input.alt"); if (!inp) return;
    var iid = inp.closest(".thumb").dataset.id, im = L.images.filter(function (x) { return x.id === iid; })[0];
    if (!im || im.alt === inp.value.trim()) return;
    im.alt = inp.value.trim();
    gop({ action: "img_alt", imageId: iid, alt: im.alt }, "Alt text saved.");
  }

  /* Pointer-event drag to reorder. Mouse/pen: drag after a few px. Touch: long-press (350 ms), so normal scrolling still works. */
  var drag = null;
  function startDrag(li, x, y) {
    var r = li.getBoundingClientRect(), g = document.createElement("div");
    g.className = "drag-ghost"; g.style.width = r.width + "px"; g.style.height = (r.width * 0.625) + "px";
    g.innerHTML = '<img src="' + $("img", li).src + '" alt="">'; document.body.appendChild(g);
    drag.on = true; drag.ghost = g; drag.dx = x - r.left; drag.dy = y - r.top; li.classList.add("dragging");
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) {}
    moveGhost(x, y);
  }
  function moveGhost(x, y) {
    drag.ghost.style.left = (x - drag.dx) + "px"; drag.ghost.style.top = (y - drag.dy) + "px";
    var over = document.elementsFromPoint(x, y).map(function (el) { return el.closest && el.closest("#thumbs .thumb"); }).filter(Boolean)[0];
    if (over && over !== drag.li) {
      var ul = $("#thumbs"), items = Array.prototype.slice.call(ul.children), a = items.indexOf(drag.li), b = items.indexOf(over);
      ul.insertBefore(drag.li, a < b ? over.nextSibling : over);
    }
  }
  function endDrag(commit) {
    if (!drag) return;
    clearTimeout(drag.timer);
    if (drag.on) { drag.ghost.remove(); drag.li.classList.remove("dragging"); drag.li.classList.add("lift"); if (commit) commitOrder(currentOrder()); else renderThumbs(); }
    drag = null;
  }
  function bindDrag(ul) {
    ul.addEventListener("pointerdown", function (e) {
      var ph = e.target.closest(".ph"); if (!ph || e.button > 0) return;
      var li = ph.closest(".thumb");
      drag = { li: li, id: e.pointerId, sx: e.clientX, sy: e.clientY, on: false, touch: e.pointerType === "touch" };
      if (drag.touch) drag.timer = setTimeout(function () { if (drag && !drag.on) startDrag(li, drag.sx, drag.sy); }, 350);
      else e.preventDefault();
    });
    document.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) {
        var moved = Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy);
        if (drag.touch) { if (moved > 10) endDrag(false); return; } // finger moved first: it's a scroll
        if (moved > 5) startDrag(drag.li, e.clientX, e.clientY); else return;
      }
      moveGhost(e.clientX, e.clientY);
    });
    document.addEventListener("pointerup", function (e) { if (drag && e.pointerId === drag.id) endDrag(true); });
    document.addEventListener("pointercancel", function (e) { if (drag && e.pointerId === drag.id) endDrag(drag.on); });
    // While a touch drag is active, stop the page from scrolling.
    document.addEventListener("touchmove", function (e) { if (drag && drag.on) e.preventDefault(); }, { passive: false });
    ul.addEventListener("contextmenu", function (e) { if (e.target.closest(".ph")) e.preventDefault(); });
  }

  /* Upload queue: resize in the browser, then upload raw bytes with progress; failures keep a Retry button. */
  function resize(file) {
    return new Promise(function (res, rej) {
      if (!/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type)) return rej(new Error("Not an image file (use JPEG, PNG or WebP)."));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        var ctx = c.getContext("2d"); ctx.fillStyle = "#05040c"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (b && b.type === "image/webp") return res({ blob: b, w: w, h: h });
          c.toBlob(function (j) { j ? res({ blob: j, w: w, h: h }) : rej(new Error("Could not process this image.")); }, "image/jpeg", 0.85);
        }, "image/webp", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("This image couldn't be read.")); };
      img.src = url;
    });
  }
  /* One upload at a time, so two images never race to update the same listing. */
  var queue = [], busy = false;
  function enqueue(item) { queue.push(item); pump(); }
  function pump() { if (busy || !queue.length) return; busy = true; upload(queue.shift(), function () { busy = false; pump(); }); }
  function upload(item, done) {
    done = done || function () {};
    var li = item.li, bar = $(".prog i", li), st = $(".st", li);
    li.className = ""; st.textContent = "Resizing…"; bar.style.width = "3%";
    resize(item.file).then(function (r) {
      st.textContent = "Uploading…";
      var x = new XMLHttpRequest(), alt = item.file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 120);
      x.open("POST", D.API + "?action=img_upload&id=" + encodeURIComponent(id) + "&w=" + r.w + "&h=" + r.h + "&alt=" + encodeURIComponent(alt));
      x.setRequestHeader("Content-Type", r.blob.type);
      x.upload.onprogress = function (e) { if (e.lengthComputable) bar.style.width = Math.max(3, Math.round(e.loaded / e.total * 95)) + "%"; };
      x.upload.onload = function () { bar.style.width = "96%"; st.textContent = "Checking image…"; };
      x.onload = function () {
        var d = {}; try { d = JSON.parse(x.responseText); } catch (_) {}
        if (x.status === 200 && d.ok) { bar.style.width = "100%"; li.className = "done"; st.textContent = "Added"; applyListing(d); renderThumbs(); setTimeout(function () { li.remove(); }, 2500); }
        else fail(item, d.error || "Upload failed (" + x.status + ").");
        done();
      };
      x.onerror = function () { fail(item, "Network error."); done(); };
      x.send(r.blob);
    }).catch(function (e) { fail(item, e.message); done(); });
  }
  function fail(item, msg) {
    var li = item.li; li.className = "fail";
    $(".st", li).innerHTML = esc(msg) + ' <button type="button" class="btn sm">Retry</button> <button type="button" class="btn sm ghost" aria-label="Dismiss">✕</button>';
    var bs = li.querySelectorAll("button"); bs[0].onclick = function () { $(".st", li).textContent = "Waiting…"; li.className = ""; enqueue(item); }; bs[1].onclick = function () { li.remove(); };
  }
  function addFiles(files) {
    var room = MAX_IMAGES - images().length - document.querySelectorAll("#uploads li:not(.done):not(.fail)").length;
    Array.prototype.slice.call(files).forEach(function (file, n) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="nm">' + esc(file.name) + '</span><span class="st"></span><span class="prog"><i></i></span>';
      $("#uploads").appendChild(li);
      var item = { file: file, li: li };
      if (n >= room) fail(item, "Gallery is full (" + MAX_IMAGES + " images max)."); else { $(".st", li).textContent = "Waiting…"; enqueue(item); }
    });
  }
  function bindDrop() {
    var dz = $("#drop"), fi = $("#file");
    dz.onclick = function () { fi.click(); };
    dz.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } };
    fi.onchange = function () { addFiles(fi.files); fi.value = ""; };
    ["dragenter", "dragover"].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove("over"); }); });
    dz.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    // Dropping files anywhere on the page shouldn't navigate away from unsaved work.
    window.addEventListener("dragover", function (e) { e.preventDefault(); }); window.addEventListener("drop", function (e) { e.preventDefault(); });
  }

  /* ---------- tags: pill input (comma, Enter or paste adds; x or Backspace removes) ---------- */
  function cleanTag(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9 +#.-]/g, "").replace(/\s+/g, " ").trim().slice(0, 24); }
  function addTags(raw) {
    var added = false, full = false;
    String(raw || "").split(/[,\n]/).forEach(function (t) {
      var c = cleanTag(t); if (!c || tags.indexOf(c) >= 0) return;
      if (tags.length >= MAX_TAGS) { full = true; return; }
      tags.push(c); added = true;
    });
    $("#e-tags").textContent = full ? "Up to " + MAX_TAGS + " tags." : "";
    if (added) { renderTags(); onInput(); }
    return added;
  }
  function removeTag(i) { tags.splice(i, 1); $("#e-tags").textContent = ""; renderTags(); onInput(); }
  function renderTags() {
    var box = $("#tagbox"); if (!box) return;
    box.querySelectorAll(".tag").forEach(function (n) { n.remove(); });
    var inp = $("#f-tagin");
    tags.forEach(function (t, i) {
      var sp = document.createElement("span"); sp.className = "tag"; sp.style.animationDelay = "0s";
      sp.innerHTML = "<span>#" + esc(t) + '</span><button type="button" aria-label="Remove tag ' + esc(t) + '">×</button>';
      sp.querySelector("button").onclick = function () { removeTag(i); inp.focus(); };
      box.insertBefore(sp, inp);
    });
    $("#c-tags").textContent = tags.length + "/" + MAX_TAGS;
    inp.placeholder = tags.length ? (tags.length >= MAX_TAGS ? "" : "Add another…") : "e.g. productivity, ios";
  }
  function setTags(list) { tags = (list || []).map(cleanTag).filter(Boolean).slice(0, MAX_TAGS); renderTags(); }
  function bindTags() {
    var inp = $("#f-tagin"), box = $("#tagbox");
    box.addEventListener("click", function (e) { if (e.target === box) inp.focus(); });
    inp.addEventListener("input", function (e) {
      e.stopPropagation();
      if (inp.value.indexOf(",") >= 0) { var parts = inp.value.split(","), rest = parts.pop(); addTags(parts.join(",")); inp.value = rest.replace(/^\s+/, ""); }
    });
    inp.addEventListener("change", function (e) { e.stopPropagation(); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === "Tab" && inp.value.trim()) { if (inp.value.trim()) { e.preventDefault(); addTags(inp.value); inp.value = ""; } else if (e.key === "Enter") e.preventDefault(); }
      else if (e.key === "Backspace" && !inp.value && tags.length) { e.preventDefault(); removeTag(tags.length - 1); }
    });
    inp.addEventListener("paste", function (e) {
      var t = (e.clipboardData || window.clipboardData).getData("text");
      if (t && /[,\n]/.test(t)) { e.preventDefault(); addTags(inp.value + t); inp.value = ""; }
    });
    inp.addEventListener("blur", function () { if (inp.value.trim()) { addTags(inp.value); inp.value = ""; } });
  }

  /* ---------- page ---------- */
  function fld(name, label, html, hint) { return '<div class="fld"><label for="f-' + name + '">' + label + (LIM[name] ? ' <span class="count" id="c-' + name + '"></span>' : "") + "</label>" + html + (hint ? '<p class="hint">' + hint + "</p>" : "") + '<p class="err" id="e-' + name + '" role="alert"></p></div>'; }
  function render() {
    var v = saved;
    document.title = "Edit " + L.name + " — Digital Underground";
    root.innerHTML =
      '<div class="edit-top"><div><p class="crumbs"><a href="/community/dashboard/#listings">Listings</a> › Edit</p><h1>' + esc(L.name) + '</h1><div class="select-row" style="margin-top:4px"><span data-livepill class="pill"></span><span data-savepill class="pill"></span>' + (L.ownerEdit ? '<span class="pill owner">Owner edit · ' + esc(L.makerName) + "</span>" : "") + "</div></div>" +
      '<div class="edit-actions"><button type="button" class="btn pv-toggle" aria-pressed="false">Preview</button>' + (L.status === "approved" ? '<a class="btn ghost" target="_blank" rel="noopener" href="/community/p/?id=' + encodeURIComponent(id) + '">View live ↗</a>' : "") + '<button type="button" class="btn primary save-desk" data-save>Save changes</button></div></div>' +
      '<div class="banner warn" id="draftban" hidden></div>' +
      '<div class="banner bad" id="conflict" hidden><span>This listing was changed in another tab or device since you opened it. Saving now would overwrite those changes.</span><span class="select-row"><button type="button" class="btn sm" id="reload">Load latest (keeps your text as a draft)</button></span></div>' +
      (L.reasons && L.reasons.length && L.status !== "approved" ? '<div class="banner"><span><strong>Review notes:</strong> ' + L.reasons.map(esc).join(" · ") + "</span></div>" : "") +
      '<div class="edit-grid" data-view="form"><form class="edit-form" id="ef" novalidate>' +
      '<div class="card"><h2>Basics</h2>' +
      fld("name", "Title", '<input class="ctl" id="f-name" name="name" maxlength="140" value="' + esc(v.name) + '" required>') +
      fld("pitchShort", "Short pitch", '<textarea class="ctl" id="f-pitchShort" name="pitchShort" rows="3" style="min-height:84px">' + esc(v.pitchShort) + "</textarea>", "Shown on the marketplace card. One or two sentences.") +
      fld("descriptionLong", "Description", '<textarea class="ctl" id="f-descriptionLong" name="descriptionLong" rows="10" style="min-height:220px">' + esc(v.descriptionLong) + "</textarea>", "Shown on your listing page. Leave a blank line between paragraphs.") +
      fld("projectUrl", "Project link", '<input class="ctl" id="f-projectUrl" name="projectUrl" type="url" inputmode="url" placeholder="https://" value="' + esc(v.projectUrl) + '">') +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      fld("stage", "Stage", '<select class="ctl" id="f-stage" name="stage">' + STAGES.map(function (s) { return "<option" + (s === v.stage ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>") +
      fld("statusLabel", "Status label", '<input class="ctl" id="f-statusLabel" name="statusLabel" maxlength="30" placeholder="e.g. Coming soon" value="' + esc(v.statusLabel) + '">') + "</div>" +
      '<div class="fld"><label for="f-tagin">Tags <span class="count" id="c-tags"></span></label><div class="ctl tagbox" id="tagbox"><input id="f-tagin" autocomplete="off" aria-describedby="h-tags"></div><p class="hint" id="h-tags">Type a tag and press comma or Enter, or paste a comma-separated list. Up to ' + MAX_TAGS + ' tags. Click × to remove one.</p><p class="err" id="e-tags" role="alert"></p></div></div>' +
      '<div class="card"><div class="card-head"><h2>Gallery <span class="muted" style="font-weight:400;font-size:.85rem" id="gcount"></span></h2></div>' +
      '<p class="hint" style="margin:-6px 0 12px">The first image is the cover on your marketplace card. Drag to reorder (long-press on phones), or use the arrow buttons. Images are resized in your browser and checked before they show.</p>' +
      '<div class="drop" id="drop" role="button" tabindex="0" aria-describedby="drop-h"><strong>Drop images here</strong> or click to choose<div class="hint" id="drop-h">JPEG, PNG or WebP · up to ' + MAX_IMAGES + " images</div></div>" +
      '<input type="file" id="file" accept="image/jpeg,image/png,image/webp" multiple hidden>' +
      '<ul class="uploads" id="uploads" aria-live="polite"></ul><ul class="thumbs" id="thumbs" aria-label="Gallery images"></ul>' +
      '<div class="legacy" id="legacy" hidden><img src="' + esc(L.legacyImage) + '" alt=""><span>Current card image (single media slot). It stays as your cover until you add gallery images.</span></div></div>' +
      '<div class="card"><h2>Video (optional)</h2>' + fld("videoUrl", "YouTube or Vimeo link", '<input class="ctl" id="f-videoUrl" name="videoUrl" type="url" placeholder="https://youtube.com/watch?v=…" value="' + esc(v.videoUrl) + '">', (L.pendingVideo ? "Your new video is waiting for review. " : "") + "Uploaded videos and cover frames: use the current dashboard for now.") + "</div>" +
      '<p class="err" id="formerr" role="alert"></p>' +
      '<div class="savebar-mobile"><span data-savepill class="pill"></span><span class="select-row"><button type="button" class="btn pv-toggle">Preview</button><button type="button" class="btn primary" data-save>Save</button></span></div>' +
      "</form>" +
      '<aside class="preview-col" aria-label="Live preview"><h3>Marketplace card</h3><div class="pv-card" id="pv-card"></div><h3 style="margin-top:18px">Listing page</h3><div class="pv-detail" id="pv-detail"></div>' +
      '<div class="savebar-mobile"><span data-savepill class="pill"></span><span class="select-row"><button type="button" class="btn pv-toggle">Back to form</button><button type="button" class="btn primary" data-save>Save</button></span></div></aside></div>';

    var f = $("#ef");
    tags = []; setTags(saved.tags); bindTags();
    f.addEventListener("input", onInput); f.addEventListener("change", onInput);
    f.addEventListener("submit", function (e) { e.preventDefault(); save(); });
    ["name", "pitchShort", "descriptionLong", "projectUrl", "videoUrl"].forEach(function (k) { f[k].addEventListener("blur", function () { var e = validate(vals()); Object.keys(LIM).concat(["projectUrl", "videoUrl"]).forEach(function (kk) { if (kk !== k && !$("#e-" + kk).textContent) fieldErr(kk, ""); }); fieldErr(k, e[k]); }); });
    document.querySelectorAll("[data-save]").forEach(function (b) { b.onclick = save; });
    document.querySelectorAll(".pv-toggle").forEach(function (b) { b.onclick = togglePv; });
    $("#reload").onclick = function () { try { localStorage.setItem(DKEY, JSON.stringify({ v: vals(), base: -1, at: Date.now() })); } catch (_) {} skipWarn = true; location.reload(); };
    var ul = $("#thumbs"); ul.addEventListener("click", onThumbClick); ul.addEventListener("change", onAlt); bindDrag(ul); bindDrop();
    document.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (dirty()) save(); } });

    // Restore a draft saved on this device.
    try {
      var dr = JSON.parse(localStorage.getItem(DKEY) || "null");
      if (dr && dr.v && !same(dr.v, saved)) {
        Object.keys(dr.v).forEach(function (k) { if (k !== "tags" && f[k]) f[k].value = dr.v[k]; }); if (dr.v.tags) setTags(dr.v.tags);
        var ban = $("#draftban"); ban.hidden = false;
        ban.innerHTML = "<span>Restored your unsaved draft from " + new Date(dr.at).toLocaleString() + "." + (dr.base !== L.version ? " The listing changed since then, so check before saving." : "") + '</span><button type="button" class="btn sm" id="discard">Discard draft</button>';
        $("#discard").onclick = function () { localStorage.removeItem(DKEY); Object.keys(saved).forEach(function (k) { if (k !== "tags" && f[k]) f[k].value = saved[k]; }); setTags(saved.tags); ban.hidden = true; onInput(); };
      }
    } catch (_) {}
    counters(); renderThumbs(); setState(dirty() ? "unsaved" : "saved");
  }

  var skipWarn = false;
  window.addEventListener("beforeunload", function (e) {
    // Finish pending deletes now rather than losing them.
    Object.keys(pendingRemovals).forEach(function (iid) { clearTimeout(pendingRemovals[iid]); fetch(D.API, { method: "POST", keepalive: true, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "img_remove", id: id, imageId: iid }) }); });
    if (!skipWarn && L && (dirty() || saveState === "saving" || document.querySelector("#uploads li:not(.done):not(.fail)"))) { e.preventDefault(); e.returnValue = ""; }
  });

  D.linkAuth().then(function () { return D.api("GET"); }).then(function (d) {
    if (d._status === 401) return D.signIn(root, function () { location.reload(); });
    var l = (d.listings || []).filter(function (x) { return x.id === id; })[0];
    if (!l) { root.innerHTML = '<div class="card"><h2>Listing not found</h2><p class="muted">It isn\'t one of the listings you can edit. <a href="/community/dashboard/#edit">Pick another</a>.</p></div>'; return; }
    if (!l.canEdit) { root.innerHTML = '<div class="card"><h2>' + esc(l.name) + '</h2><p class="muted">This listing is on hold after visitor reports, so it can\'t be edited right now. Contact support if you have questions.</p></div>'; return; }
    L = l; saved = fromListing(l); render();
  }).catch(function () { root.innerHTML = '<div class="banner bad">Network error. <button class="btn sm" onclick="location.reload()">Retry</button></div>'; });
})();
