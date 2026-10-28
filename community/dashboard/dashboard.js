/* Creator dashboard v2. Same API as v1: GET/POST /api/community/creator, POST /api/community/creator-login. */
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var auth = params.get("k") ? "Creator " + params.get("k") : "";
  var data = null, range = 30, editing = null, lastFocus = null;
  var LABEL = { approved: "Live", pending: "Pending review", rejected: "Rejected", unpublished: "Unpublished" };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var SUPPORT = "digitalunderground.store@proton.me";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function ico(n) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function fmt(n) { return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : Number(n).toLocaleString("en-US"); }
  function pct(c, i) { return i ? (c / i) * 100 : 0; }
  function ctrText(t) { return t.i ? pct(t.c, t.i).toFixed(1) + "%" : "—"; }
  function dayLabel(d) { return MON[+d.slice(4, 6) - 1] + " " + (+d.slice(6)); }

  function api(method, body) {
    return fetch("/api/community/creator", {
      method: method, credentials: "same-origin",
      headers: Object.assign(auth ? { Authorization: auth } : {}, body ? { "Content-Type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; }); });
  }
  function login(body) {
    return fetch("/api/community/creator-login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }); });
  }
  function alertMsg(el, text, ok) {
    if (!text) { el.hidden = true; return; }
    el.hidden = false; el.className = "alert " + (ok ? "ok" : "err");
    el.innerHTML = ico(ok ? "ok" : "alert") + "<span>" + esc(text) + "</span>";
  }
  function toast(text, ok) {
    var t = document.createElement("div");
    t.className = "toast " + (ok === false ? "err" : "ok");
    t.setAttribute("role", ok === false ? "alert" : "status");
    t.innerHTML = ico(ok === false ? "alert" : "ok") + "<span>" + esc(text) + "</span>";
    $("toasts").appendChild(t);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 250); }, 3600);
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.old = btn.innerHTML; btn.disabled = true; btn.textContent = label || "Working…"; }
    else { btn.disabled = false; if (btn.dataset.old) btn.innerHTML = btn.dataset.old; }
  }

  /* ---------- views ---------- */
  var resetByEmail = false;
  function showView(v) {
    $("loading").hidden = v !== "loading";
    $("gate").hidden = v !== "gate";
    $("app").hidden = v !== "app";
    $("avatar-btn").hidden = v !== "app";
    $("tb-support").hidden = v !== "app";
    if (v !== "app") closeMenu();
  }
  function gate(linkFailed) {
    showView("gate"); $("claim").hidden = true;
    $("login").hidden = false; $("reset").hidden = true;
    $("gate-title").textContent = "Creator login";
    $("gate-lead").textContent = "Manage your listings and see how they perform.";
    alertMsg($("login-msg"), linkFailed ? "That private link is not valid anymore. Log in with your email and password, or contact support." : "", false);
    try { var em = localStorage.getItem("du_creator_email"); if (em && !$("login").email.value) $("login").email.value = em; } catch (_) {}
    login({}).then(function (d) { resetByEmail = !!d.resetByEmail; }).catch(function () {});
  }

  /* ---------- data helpers ---------- */
  function seriesFor(id) {
    var days = [];
    var ids = id === "all" ? Object.keys(data.stats) : (data.stats[id] ? [id] : []);
    ids.forEach(function (k) {
      data.stats[k].days.forEach(function (d, i) {
        if (!days[i]) days[i] = { d: d.d, i: 0, v: 0, c: 0 };
        days[i].i += d.i; days[i].v += d.v; days[i].c += d.c;
      });
    });
    return days;
  }
  function sum(days) { return days.reduce(function (t, d) { t.i += d.i; t.v += d.v; t.c += d.c; return t; }, { i: 0, v: 0, c: 0 }); }
  function deltaHtml(cur, prev, isPct) {
    if (isPct) {
      var dp = cur - prev;
      if (!cur && !prev) return '<span class="delta">No change</span>';
      return '<span class="delta ' + (dp > 0.05 ? "up" : dp < -0.05 ? "down" : "") + '">' + (dp > 0.05 ? ico("up") : "") + (dp >= 0 ? "+" : "") + dp.toFixed(1) + " pts</span>";
    }
    if (!prev && !cur) return '<span class="delta">No change</span>';
    if (!prev) return '<span class="delta up">New</span>';
    var p = ((cur - prev) / prev) * 100;
    return '<span class="delta ' + (p > 0 ? "up" : p < 0 ? "down" : "") + '">' + (p >= 0 ? "+" : "") + Math.round(p) + "%</span>";
  }

  /* ---------- render ---------- */
  function renderKpis() {
    var all = seriesFor("all"), n = all.length;
    var tot = sum(all), last7 = sum(all.slice(Math.max(0, n - 7))), prev7 = sum(all.slice(Math.max(0, n - 14), Math.max(0, n - 7)));
    function card(icon, label, val, delta, aria) {
      return '<div class="kpi2"><span class="k-label">' + ico(icon) + label + '</span><span class="k-val" aria-label="' + esc(aria) + '">' + val + "</span>" + delta + '<span class="k-sub">vs previous 7 days</span></div>';
    }
    $("summary").innerHTML =
      card("imp", "Impressions", fmt(tot.i), deltaHtml(last7.i, prev7.i), tot.i + " impressions") +
      card("eye", "Views", fmt(tot.v), deltaHtml(last7.v, prev7.v), tot.v + " views") +
      card("click", "Clicks", fmt(tot.c), deltaHtml(last7.c, prev7.c), tot.c + " clicks") +
      card("pct", "CTR", ctrText(tot), deltaHtml(pct(last7.c, last7.i), pct(prev7.c, prev7.i), true), "Click-through rate " + ctrText(tot));
  }

  function niceMax(m) {
    if (m <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    var r = nf * p; return r % 4 === 0 ? r : Math.ceil(m / 4) * 4 > r ? Math.ceil(m / 4) * 4 : r;
  }
  function smooth(pts) {
    if (pts.length < 2) return pts.length ? "M" + pts[0][0] + "," + pts[0][1] : "";
    var d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
    for (var k = 0; k < pts.length - 1; k++) {
      var p0 = pts[k - 1] || pts[k], p1 = pts[k], p2 = pts[k + 1], p3 = pts[k + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      var lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);
      c1y = Math.max(lo, Math.min(hi, c1y)); c2y = Math.max(lo, Math.min(hi, c2y)); // no overshoot below zero
      d += " C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + c2x.toFixed(1) + "," + c2y.toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d;
  }

  var chartState = null;
  function drawChart() {
    var id = $("chart-pick").value || "all";
    var days = seriesFor(id).slice(-range);
    var t = sum(days);
    $("perf-sub").textContent = "Last " + range + " days" + (id === "all" ? " · all listings" : "");
    $("legend").innerHTML =
      '<span><i class="dot dot-v"></i>Views <b>' + fmt(t.v) + "</b></span>" +
      '<span><i class="dot dot-c"></i>Clicks <b>' + fmt(t.c) + "</b></span>" +
      '<span><i class="dot dot-i"></i>Impressions <b>' + fmt(t.i) + "</b></span>";
    var el = $("chart");
    if (!days.length || !(t.i + t.v + t.c)) {
      chartState = null;
      el.removeAttribute("role"); el.removeAttribute("aria-label");
      el.innerHTML = '<div class="empty2"><span class="e-ico">' + ico("chart") + "</span><b>No data yet</b><p>Share your listing to start getting views. Numbers show up here within a day.</p></div>";
      return;
    }
    var W = Math.max(280, el.clientWidth), H = el.clientHeight || 220;
    var L = 34, R = 10, T = 12, B = 28, iw = W - L - R, ih = H - T - B, n = days.length;
    var max = niceMax(Math.max.apply(null, days.map(function (d) { return Math.max(d.i, d.v, d.c); })));
    function x(k) { return L + (n === 1 ? iw / 2 : (k / (n - 1)) * iw); }
    function y(v) { return T + ih - (v / max) * ih; }
    var g = "";
    for (var s = 0; s <= 4; s++) {
      var val = (max / 4) * s, yy = y(val).toFixed(1);
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 8) + '" y="' + yy + '" dy="4" text-anchor="end">' + fmt(Math.round(val * 10) / 10) + "</text>";
    }
    var ticks = range === 7 ? [0, 1, 2, 3, 4, 5, 6] : [0, 7, 14, 21, n - 1];
    if (W < 360 && range === 7) ticks = [0, 2, 4, 6];
    var xa = "";
    ticks.forEach(function (k, j) {
      if (k >= n) return;
      var anchor = j === 0 ? "start" : k === n - 1 ? "end" : "middle";
      xa += '<text x="' + x(k).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anchor + '">' + dayLabel(days[k].d) + "</text>";
    });
    function pts(key) { return days.map(function (d, k) { return [x(k), y(d[key])]; }); }
    var pv = pts("v"), pc = pts("c"), pi = pts("i");
    var base = (T + ih).toFixed(1);
    var area = smooth(pv) + " L" + x(n - 1).toFixed(1) + "," + base + " L" + x(0).toFixed(1) + "," + base + " Z";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "Chart of the last " + range + " days: " + t.v + " views, " + t.c + " clicks, " + t.i + " impressions.");
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
      '<defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".45"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs>' +
      '<g class="grid">' + g + "</g>" +
      '<path class="l-i" d="' + smooth(pi) + '"/>' +
      '<path d="' + area + '" fill="url(#gv)"/>' +
      '<path class="l-v" d="' + smooth(pv) + '"/>' +
      '<path class="l-c" d="' + smooth(pc) + '"/>' +
      '<g class="xax">' + xa + "</g>" +
      '<g id="hover" style="display:none"><line class="guide" y1="' + T + '" y2="' + base + '"/><circle class="pt" r="5" fill="#a78bfa" data-k="v"/><circle class="pt" r="5" fill="#67e8f9" data-k="c"/></g>' +
      '</svg><div class="tip" id="tip" hidden></div>';
    chartState = { days: days, x: x, y: y, n: n, L: L, iw: iw, W: W };
  }
  function hoverAt(clientX) {
    if (!chartState) return;
    var el = $("chart"), r = el.getBoundingClientRect(), s = chartState;
    var px = (clientX - r.left) * (s.W / r.width);
    var k = s.n === 1 ? 0 : Math.round(((px - s.L) / s.iw) * (s.n - 1));
    k = Math.max(0, Math.min(s.n - 1, k));
    var d = s.days[k], hx = s.x(k), g = el.querySelector("#hover"), tip = $("tip");
    g.style.display = "";
    g.querySelector("line").setAttribute("x1", hx); g.querySelector("line").setAttribute("x2", hx);
    g.querySelectorAll("circle").forEach(function (c) { var key = c.getAttribute("data-k"); c.setAttribute("cx", hx); c.setAttribute("cy", s.y(d[key])); });
    tip.hidden = false;
    tip.innerHTML = "<b>" + dayLabel(d.d) + "</b>" +
      '<div><span><i class="dot dot-v"></i>Views</span><span>' + d.v + "</span></div>" +
      '<div><span><i class="dot dot-c"></i>Clicks</span><span>' + d.c + "</span></div>" +
      '<div><span><i class="dot dot-i"></i>Impressions</span><span>' + d.i + "</span></div>";
    var left = (hx / s.W) * r.width, half = tip.offsetWidth / 2;
    tip.style.left = Math.max(half, Math.min(r.width - half, left)) + "px";
  }
  function hoverEnd() { var g = $("chart").querySelector("#hover"); if (g) g.style.display = "none"; var t = $("tip"); if (t) t.hidden = true; }

  function renderList() {
    var list = $("list");
    list.innerHTML = "";
    $("list-count").textContent = data.listings.length;
    if (!data.listings.length) {
      list.innerHTML = '<div class="card2 empty-list"><b>No listings yet</b><p>List your first project to start getting views.</p><a class="btn btn-primary" href="/community/submit/">' + ico("plus") + "New listing</a></div>";
      return;
    }
    data.listings.forEach(function (l) {
      var node = $("tpl").content.firstElementChild.cloneNode(true);
      var t = (data.stats[l.id] || { totals: { i: 0, v: 0, c: 0 } }).totals;
      setThumb(node.querySelector(".li-thumb"), node.querySelector(".li-thumb-wrap .ph"), l.imagePreview, l.name);
      node.querySelector(".li-title").textContent = l.name;
      var pill = node.querySelector(".pill"); pill.textContent = LABEL[l.status] || l.status; pill.className = "pill st-" + l.status;
      var when = l.updatedAt || l.createdAt;
      node.querySelector(".li-date").textContent = when ? (l.updatedAt ? "Updated " : "Listed ") + new Date(when).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
      var rs = node.querySelector(".li-reason");
      if ((l.status === "rejected" || l.status === "pending") && l.reasons && l.reasons.length) {
        rs.hidden = false; rs.textContent = (l.status === "rejected" ? "Reason: " : "Under review: ") + l.reasons.join(" ");
        if (l.status === "pending") rs.classList.add("pending");
      }
      node.querySelector(".li-stats").innerHTML =
        '<div role="listitem"><b>' + fmt(t.i) + "</b><span>Impr.</span></div>" +
        '<div role="listitem"><b>' + fmt(t.v) + "</b><span>Views</span></div>" +
        '<div role="listitem"><b>' + fmt(t.c) + "</b><span>Clicks</span></div>" +
        '<div role="listitem"><b>' + ctrText(t) + "</b><span>CTR</span></div>";
      var view = node.querySelector(".view");
      if (l.status === "approved") { view.href = "/community/p/?id=" + encodeURIComponent(l.id); view.setAttribute("aria-label", "View " + l.name + " (opens in new tab)"); }
      else view.remove();
      var un = node.querySelector('[data-a="unpublish"]'), re = node.querySelector('[data-a="republish"]');
      if (l.status === "unpublished") un.remove(); else re.remove();
      node.querySelectorAll("button[data-a]").forEach(function (b) { b.setAttribute("aria-label", (b.getAttribute("aria-label") || b.textContent.trim()) + " " + l.name); });
      node.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-a]"); if (!btn) return;
        var a = btn.getAttribute("data-a");
        if (a === "edit") return openEdit(l, btn);
        if (a === "delete") return confirmDlg({ title: "Delete this listing?", text: "\u201C" + l.name + "\u201D will be removed permanently, along with its analytics. This can't be undone.", yes: "Delete", danger: true }, btn).then(function (ok) { if (ok) act({ action: "delete", id: l.id }, btn); });
        if (a === "unpublish") return confirmDlg({ title: "Unpublish listing?", text: "\u201C" + l.name + "\u201D will be hidden from the marketplace. You can republish it any time.", yes: "Unpublish", danger: false }, btn).then(function (ok) { if (ok) act({ action: "unpublish", id: l.id }, btn); });
        act({ action: a, id: l.id }, btn);
      });
      list.appendChild(node);
    });
  }

  function render() {
    renderKpis();
    var pick = $("chart-pick"), cur = pick.value || "all";
    pick.innerHTML = '<option value="all">All listings</option>' + data.listings.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.name) + "</option>"; }).join("");
    pick.value = cur; if (!pick.value) pick.value = "all";
    drawChart();
    var sel = $("support-form").listingId, sv = sel.value;
    sel.innerHTML = '<option value="">None</option>' + data.listings.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.name) + "</option>"; }).join("");
    sel.value = sv;
    renderList();
    var em = (data.account && data.account.email) || "";
    $("menu-email").textContent = em;
    $("avatar").textContent = (em.charAt(0) || "C").toUpperCase();
    var h = new Date().getHours();
    $("greet").textContent = (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    var live = data.listings.filter(function (l) { return l.status === "approved"; }).length;
    $("greet-sub").textContent = data.listings.length ? live + " of " + data.listings.length + " listing" + (data.listings.length === 1 ? "" : "s") + " live · last 30 days below" : "List your first project to get started.";
  }

  function act(body, btn) {
    busy(btn, true, btn && btn.classList.contains("icon-btn") ? "…" : "Saving…");
    return api("POST", body).then(function (d) {
      busy(btn, false);
      if (!d.ok) { toast(d.error || "Something went wrong.", false); return d; }
      var note = body.action === "delete" ? "Listing deleted." : body.action === "unpublish" ? "Listing unpublished." : body.action === "republish" ? "Listing republished." :
        d.listing ? "Saved. Status: " + (LABEL[d.listing.status] || d.listing.status) + "." : "Done.";
      toast(note, true);
      load();
      return d;
    }).catch(function () { busy(btn, false); toast("Network error. Check your connection.", false); return {}; });
  }

  function load() {
    return api("GET").then(function (d) {
      if (d._status === 401) {
        var hadLink = !!auth;
        auth = "";
        if (hadLink) { history.replaceState(null, "", "/community/dashboard/"); return load().then(function () { if ($("app").hidden) gate(true); }); }
        gate(false); return;
      }
      if (auth) { auth = ""; history.replaceState(null, "", "/community/dashboard/"); }
      if (!d.listings) { gate(false); alertMsg($("login-msg"), d.error || "Could not load your dashboard. Try again.", false); return; }
      data = d; showView("app"); render();
      if (d.account && !d.account.hasPassword) {
        $("claim").hidden = false;
        try { var em = localStorage.getItem("du_creator_email"); if (em) $("claim-form").email.value = em; } catch (_) {}
      } else $("claim").hidden = true;
    }).catch(function () { gate(false); alertMsg($("login-msg"), "Network error. Check your connection and try again.", false); });
  }

  function setThumb(img, ph, src, name) {
    ph.textContent = (String(name || "?").replace(/^test\s+/i, "").trim().charAt(0) || "?").toUpperCase();
    function showPh() { img.hidden = true; ph.hidden = false; }
    if (!src) return showPh();
    img.hidden = false; ph.hidden = true; img.onerror = showPh; img.src = src;
  }

  /* ---------- edit sheet ---------- */
  var ed = {}, upState = null;
  function videoNote() {
    var note = $("ed-vid-note"), rm = $("ed-vid-remove"), lab = $("ed-vid-up-label"), th = document.querySelector(".mp-vid");
    var v = ed.videoUrl, typed = $("ed-video").value.trim();
    rm.hidden = !v && !typed; th.classList.toggle("has", !!(v || typed));
    lab.textContent = v ? "Replace video" : "Upload video";
    if (ed.videoRemoved && !v && !typed) { note.textContent = "Video will be removed when you save."; rm.hidden = true; return; }
    if (v && v.indexOf("upload:") === 0) {
      var f = editing && editing.videoFile;
      note.innerHTML = "Uploaded video" + (f ? " · " + esc(duUpload.mb(f.size)) : "") + (editing && editing.status === "pending" ? '<span class="chip-pending">In review</span>' : "");
      return;
    }
    if (v || typed) { var h = ""; try { h = new URL(v || typed).hostname.replace(/^www\./, ""); } catch (_) {} note.textContent = "Linked video" + (h ? " · " + h : ""); return; }
    note.textContent = "MP4 or WebM, up to 50 MB. New videos get a quick human review before they go live.";
  }
  function imageNote() {
    var has = !ed.removeImage && (ed.imageData || $("ed-img").value.trim() || (editing && editing.imagePreview));
    $("ed-img-remove").hidden = !has;
    $("ed-img-note").textContent = ed.removeImage ? "Image will be removed when you save. Your listing shows a clean placeholder." :
      ed.imageData ? "New image ready. Save to apply it." : "Square logo or 16:9 screenshot. JPEG, PNG or WebP.";
    var src = ed.removeImage ? "" : ed.imageData || ($("ed-img").value.trim() && /^https:\/\//.test($("ed-img").value.trim()) ? $("ed-img").value.trim() : editing && editing.imagePreview);
    setThumb($("ed-prev"), $("ed-ph"), src, $("edit-form").name.value);
  }
  $("ed-img-file").addEventListener("change", function (e) {
    var file = e.target.files[0]; e.target.value = ""; if (!file) return;
    $("ed-img-note").textContent = "Preparing image…";
    duUpload.image(file).then(function (d) { ed.imageData = d; ed.removeImage = false; $("ed-img").value = ""; imageNote(); })
      .catch(function (err) { imageNote(); toast(err.message, false); });
  });
  $("ed-img-remove").addEventListener("click", function () { ed.removeImage = true; ed.imageData = null; $("ed-img").value = ""; imageNote(); });
  $("ed-img").addEventListener("input", function () { ed.removeImage = false; ed.imageData = null; imageNote(); });
  $("ed-video").addEventListener("input", function () { videoNote(); });
  $("ed-vid-remove").addEventListener("click", function () { ed.videoUrl = ""; ed.videoRemoved = true; $("ed-video").value = ""; videoNote(); });
  function setUploading(on) {
    $("ed-vid-prog").hidden = !on; $("ed-vid-actions").hidden = on; $("edit-save").disabled = on;
    if (!on) { $("ed-vid-bar").style.width = "0"; $("ed-vid-pct").textContent = "0%"; }
  }
  $("ed-vid-file").addEventListener("change", function (e) {
    var file = e.target.files[0]; e.target.value = ""; if (!file || !editing) return;
    var l = editing; upState = {};
    setUploading(true);
    $("ed-vid-note").textContent = "Uploading " + file.name + " · " + duUpload.mb(file.size);
    duUpload.video(l.id, file, function (p) { var v = Math.round(p * 100); $("ed-vid-bar").style.width = v + "%"; $("ed-vid-pct").textContent = v + "%"; }, upState)
      .then(function (d) {
        setUploading(false);
        if (editing && editing.id === l.id) { editing = d.listing; ed.videoUrl = d.listing.videoUrl; ed.videoRemoved = false; $("ed-video").value = ""; videoNote(); }
        toast(d.listing.pendingVideo && d.listing.status === "approved" ? "Video uploaded. Your listing stays live; the new video appears after approval." : d.listing.status === "pending" ? "Video uploaded. It goes live after a quick review." : "Video uploaded.", true);
        load();
      })
      .catch(function (err) { setUploading(false); videoNote(); if (!err.canceled) toast(err.message, false); else toast("Upload canceled.", true); });
  });
  $("ed-vid-cancel").addEventListener("click", function () { if (upState) duUpload.cancel(upState); });
  function counters(root) {
    root.querySelectorAll("[data-cc-for]").forEach(function (cc) {
      var inp = $(cc.getAttribute("data-cc-for")), max = +inp.getAttribute("maxlength");
      var len = inp.value.length;
      cc.textContent = len + " / " + max;
      cc.className = "cc" + (len >= max ? " over" : len > max * 0.9 ? " near" : "");
    });
  }
  function trapFocus(container, e) {
    if (e.key !== "Tab") return;
    var f = [].filter.call(container.querySelectorAll("button, [href], input, select, textarea"), function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openLayer(el) {
    $("scrim").hidden = false; el.hidden = false; document.body.classList.add("lock");
    requestAnimationFrame(function () { requestAnimationFrame(function () { $("scrim").classList.add("open"); el.classList.add("open"); }); });
  }
  function closeLayer(el) {
    el.classList.remove("open"); $("scrim").classList.remove("open"); document.body.classList.remove("lock");
    setTimeout(function () { el.hidden = true; if (!$("sheet").classList.contains("open") && !$("dialog").classList.contains("open")) $("scrim").hidden = true; }, 260);
  }
  function openEdit(l, btn) {
    editing = l; lastFocus = btn;
    var f = $("edit-form");
    f.name.value = l.name || ""; f.projectUrl.value = l.projectUrl || ""; f.pitchShort.value = l.pitchShort || "";
    f.descriptionLong.value = l.descriptionLong || ""; f.tags.value = (l.tags || []).join(", ");
    ed = { removeImage: false, imageData: null, videoUrl: l.videoUrl || "", videoRemoved: false };
    var ext = l.videoUrl && l.videoUrl.indexOf("upload:") !== 0;
    f.videoUrl.value = ext ? l.videoUrl : ""; $("ed-vid-more").open = !!ext;
    if (ext) ed.videoUrl = "";
    f.imageUrl.value = l.imageUrl && l.imageUrl !== "(uploaded image)" ? l.imageUrl : ""; $("ed-img-more").open = false;
    setUploading(false); imageNote(); videoNote();
    alertMsg($("edit-msg"), "");
    counters(f);
    openLayer($("sheet"));
    f.scrollTop = 0;
    setTimeout(function () { $("sheet").querySelector(".sheet-head .icon-btn").focus({ preventScroll: true }); }, 60);
  }
  function closeEdit() { if ($("sheet").hidden) return; if (upState && !$("ed-vid-prog").hidden) duUpload.cancel(upState); closeLayer($("sheet")); editing = null; if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); }
  $("edit-form").addEventListener("input", function (e) {
    counters($("edit-form"));
    if (e.target.name === "imageUrl" && /^https:\/\/\S+\.\S+/.test(e.target.value)) $("ed-prev").src = e.target.value;
  });
  $("edit-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!editing) return;
    var f = e.target, l = editing;
    act({ action: "edit", id: l.id, fields: {
      name: f.name.value, projectUrl: f.projectUrl.value, pitchShort: f.pitchShort.value,
      descriptionLong: f.descriptionLong.value, imageUrl: f.imageUrl.value, tags: f.tags.value,
      removeImage: !!ed.removeImage, imageData: ed.imageData || undefined,
      videoUrl: f.videoUrl.value.trim() || ed.videoUrl || "" } }, $("edit-save"))
      .then(function (d) { if (d && d.ok) closeEdit(); else if (d && d.error) alertMsg($("edit-msg"), d.error, false); });
  });
  document.querySelectorAll("[data-close-sheet]").forEach(function (b) { b.addEventListener("click", closeEdit); });
  $("sheet").addEventListener("keydown", function (e) { if (e.key === "Escape") closeEdit(); trapFocus($("sheet"), e); });

  /* ---------- confirm dialog ---------- */
  var dlgResolve = null;
  function confirmDlg(o, btn) {
    lastFocus = btn;
    $("dlg-title").textContent = o.title; $("dlg-text").textContent = o.text;
    var yes = $("dlg-yes"); yes.textContent = o.yes; yes.className = "btn " + (o.danger ? "btn-danger" : "btn-primary");
    var di = $("dlg-ico"); di.className = "d-ico" + (o.danger ? "" : " neutral"); di.innerHTML = ico(o.danger ? "trash" : "eyeoff");
    openLayer($("dialog"));
    setTimeout(function () { $("dlg-no").focus(); }, 30);
    return new Promise(function (res) { dlgResolve = res; });
  }
  function dlgDone(v) { if (!dlgResolve) return; var r = dlgResolve; dlgResolve = null; closeLayer($("dialog")); if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); r(v); }
  $("dlg-yes").addEventListener("click", function () { dlgDone(true); });
  $("dlg-no").addEventListener("click", function () { dlgDone(false); });
  $("dialog").addEventListener("keydown", function (e) { if (e.key === "Escape") dlgDone(false); trapFocus($("dialog"), e); });
  $("scrim").addEventListener("click", function () { if (dlgResolve) dlgDone(false); else closeEdit(); });

  /* ---------- menu ---------- */
  function closeMenu() { $("menu").hidden = true; $("avatar-btn").setAttribute("aria-expanded", "false"); }
  $("avatar-btn").addEventListener("click", function (e) {
    e.stopPropagation();
    var open = $("menu").hidden; $("menu").hidden = !open; $("avatar-btn").setAttribute("aria-expanded", String(open));
    if (open) $("menu").querySelector("[role=menuitem]").focus();
  });
  document.addEventListener("click", function (e) { if (!$("menu").hidden && !e.target.closest("#menu")) closeMenu(); });
  $("menu").addEventListener("keydown", function (e) {
    var items = [].slice.call($("menu").querySelectorAll("[role=menuitem]")), i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { closeMenu(); $("avatar-btn").focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  $("menu").querySelectorAll("[data-close]").forEach(function (a) { a.addEventListener("click", closeMenu); });

  /* ---------- auth flows ---------- */
  $("login").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector("button[type=submit]");
    busy(btn, true, "Logging in…");
    login({ email: f.email.value, password: f.password.value }).then(function (d) {
      busy(btn, false);
      if (d.ok) { try { localStorage.setItem("du_creator_email", f.email.value.trim()); } catch (_) {} f.password.value = ""; alertMsg($("login-msg"), ""); showView("loading"); load(); }
      else { alertMsg($("login-msg"), d.error || "Could not log in.", false); f.password.focus(); }
    }).catch(function () { busy(btn, false); alertMsg($("login-msg"), "Network error. Check your connection and try again.", false); });
  });
  $("forgot-btn").addEventListener("click", function () {
    var em = $("login").email.value.trim();
    if (!resetByEmail) { alertMsg($("login-msg"), "Password reset by email is coming soon. For now, email " + SUPPORT + " from the address on your listing and we will reset it.", false); return; }
    if (!em) { alertMsg($("login-msg"), "Enter your email first, then tap Forgot password.", false); $("login").email.focus(); return; }
    var b = $("forgot-btn"); b.disabled = true;
    login({ action: "forgot", email: em }).then(function (d) {
      b.disabled = false;
      alertMsg($("login-msg"), d.message || d.error, !!d.ok);
      if (d.ok) { $("login").hidden = true; $("reset").hidden = false; $("gate-title").textContent = "Reset password"; $("gate-lead").textContent = "Enter the code we sent and choose a new password."; $("reset").code.focus(); }
    }).catch(function () { b.disabled = false; alertMsg($("login-msg"), "Network error.", false); });
  });
  $("reset").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector("button[type=submit]");
    if (f.password.value !== f.passwordConfirm.value) { alertMsg($("login-msg"), "Passwords don't match.", false); return; }
    busy(btn, true, "Saving…");
    login({ action: "reset", email: $("login").email.value, code: f.code.value, password: f.password.value, passwordConfirm: f.passwordConfirm.value }).then(function (d) {
      busy(btn, false);
      if (d.ok) { f.reset(); $("reset").hidden = true; $("login").hidden = false; alertMsg($("login-msg"), ""); showView("loading"); load().then(function () { toast("Password updated.", true); }); }
      else alertMsg($("login-msg"), d.error || "That did not work.", false);
    }).catch(function () { busy(btn, false); alertMsg($("login-msg"), "Network error.", false); });
  });
  $("reset-back").addEventListener("click", function () { $("reset").hidden = true; $("login").hidden = false; alertMsg($("login-msg"), ""); $("gate-title").textContent = "Creator login"; $("gate-lead").textContent = "Manage your listings and see how they perform."; });
  $("claim-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector("button[type=submit]");
    if (f.password.value !== f.passwordConfirm.value) { alertMsg($("claim-msg"), "Passwords don't match.", false); return; }
    busy(btn, true, "Saving…");
    api("POST", { action: "claim", email: f.email.value, password: f.password.value, passwordConfirm: f.passwordConfirm.value }).then(function (d) {
      busy(btn, false);
      if (d.ok) { try { localStorage.setItem("du_creator_email", f.email.value.trim()); } catch (_) {} $("claim").hidden = true; toast("Saved. From now on, log in with your email and password.", true); load(); }
      else alertMsg($("claim-msg"), d.error || "Could not save.", false);
    }).catch(function () { busy(btn, false); alertMsg($("claim-msg"), "Network error.", false); });
  });
  $("signout").addEventListener("click", function () {
    closeMenu();
    fetch("/api/community/creator?action=signout", { method: "POST", credentials: "same-origin" }).then(function () {
      data = null; gate(false); toast("Signed out.", true);
    }).catch(function () { toast("Network error.", false); });
  });

  /* ---------- chart controls ---------- */
  $("chart-pick").addEventListener("change", drawChart);
  document.querySelectorAll(".seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      range = +b.getAttribute("data-range");
      document.querySelectorAll(".seg button").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      drawChart();
    });
  });
  var ch = $("chart");
  ch.addEventListener("pointermove", function (e) { hoverAt(e.clientX); });
  ch.addEventListener("pointerdown", function (e) { hoverAt(e.clientX); });
  ch.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hoverEnd(); });
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (data) drawChart(); }, 120); });

  /* ---------- support ---------- */
  var sf = $("support-form");
  sf.addEventListener("input", function () { counters(sf); });
  counters(sf);
  sf.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector("button[type=submit]");
    alertMsg($("support-msg"), "");
    busy(btn, true, "Sending…");
    api("POST", { action: "support", subject: f.subject.value, message: f.message.value, listingId: f.listingId.value })
      .then(function (d) {
        busy(btn, false);
        if (d.ok) { toast("Message sent. We'll reply by email.", true); f.reset(); counters(f); }
        else alertMsg($("support-msg"), d.error || "Could not send.", false);
      }).catch(function () { busy(btn, false); alertMsg($("support-msg"), "Network error.", false); });
  });

  showView("loading");
  load();
})();
