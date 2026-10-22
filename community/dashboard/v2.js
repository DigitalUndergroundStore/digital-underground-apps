/* Dashboard v2: Listings, Edit (picker → full edit page), Analytics, Profile. */
(function () {
  "use strict";
  var D = window.DU2, esc = D.esc, data = null;
  var $ = function (s) { return document.querySelector(s); };
  var CATS = { apps: "App", "ai-tools": "AI tool", games: "Game", books: "Book", templates: "Template", other: "Other" };
  var nf = new Intl.NumberFormat();

  function showTab(name, push) {
    if (!document.getElementById(name)) name = "listings";
    document.querySelectorAll(".tab[data-tab]").forEach(function (t) { var on = t.dataset.tab === name; t.classList.toggle("active", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("active", p.id === name); });
    if (push) history.replaceState(null, "", "#" + name);
    if (name === "analytics" && data) renderAnalytics();
    if (name === "profile" && data) loadProfile();
  }
  document.querySelectorAll(".tab[data-tab]").forEach(function (tab) { tab.addEventListener("click", function () { showTab(tab.dataset.tab, true); }); });

  function tot(id) { return (data.stats[id] || { totals: { i: 0, v: 0, c: 0 } }).totals; }
  function sumWindow(ids, from, to) {
    var o = { i: 0, v: 0, c: 0 };
    ids.forEach(function (id) { var s = data.stats[id]; if (!s) return; s.days.slice(from, to).forEach(function (d) { o.i += d.i; o.v += d.v; o.c += d.c; }); });
    return o;
  }
  function pct(a, b) { if (!b) return a ? "new this week" : "no change"; var p = Math.round((a - b) / b * 100); return (p >= 0 ? "+" : "") + p + "% vs last week"; }

  function row(l) {
    var st = D.listingState(l), t = tot(l.id);
    var meta = [CATS[l.category] || "", l.priceLabel || "", l.ownerEdit ? l.makerName : ""].filter(Boolean).map(esc).join(" · ");
    return '<div class="listing">' + D.icon(l) +
      '<div class="listing-info"><strong>' + esc(l.name) + "</strong><span>" + (meta || "&nbsp;") + "</span></div>" +
      '<div class="listing-stats"><span>' + nf.format(t.v) + " views · " + nf.format(t.c) + ' clicks</span><span class="pill ' + st.cls + '">' + st.label + "</span>" +
      (l.ownerEdit ? '<span class="pill owner">Owner</span>' : "") +
      (l.canEdit ? '<a class="btn sm" href="edit/?id=' + encodeURIComponent(l.id) + '">Edit</a>' : "") +
      (l.status === "approved" ? '<a class="btn sm ghost" href="/community/p/?id=' + encodeURIComponent(l.id) + '" target="_blank" rel="noopener">View</a>' : "") +
      "</div></div>";
  }

  function renderListings() {
    var ls = data.listings, ids = ls.map(function (l) { return l.id; });
    var wk = sumWindow(ids, 23, 30), prev = sumWindow(ids, 16, 23);
    var live = ls.filter(function (l) { return l.status === "approved"; }).length;
    var own = ls.filter(function (l) { return !l.ownerEdit; }), master = ls.filter(function (l) { return l.ownerEdit; });
    var h = '<div class="stats">' +
      '<div class="stat"><div class="stat-label">Views this week</div><div class="stat-value">' + nf.format(wk.v) + '</div><div class="stat-change">' + pct(wk.v, prev.v) + "</div></div>" +
      '<div class="stat"><div class="stat-label">Impressions</div><div class="stat-value">' + nf.format(wk.i) + '</div><div class="stat-change">' + pct(wk.i, prev.i) + "</div></div>" +
      '<div class="stat"><div class="stat-label">Clicks</div><div class="stat-value">' + nf.format(wk.c) + '</div><div class="stat-change">' + pct(wk.c, prev.c) + "</div></div>" +
      '<div class="stat"><div class="stat-label">Active listings</div><div class="stat-value">' + live + '</div><div class="stat-change">' + (live === ls.length ? "All live" : (ls.length - live) + " not live") + "</div></div></div>";
    h += '<div class="card"><div class="card-head"><h2>Your listings</h2><a class="btn sm primary" href="/community/submit/">+ New listing</a></div>' +
      (own.length ? own.map(row).join("") : '<p class="empty">No listings yet. <a href="/community/submit/">List your project free</a>.</p>') + "</div>";
    if (data.master) h += '<div class="card"><div class="card-head"><h2>Digital Underground &amp; Kerzy Labs</h2><span class="pill owner">Owner master view</span></div>' +
      (master.length ? master.map(row).join("") : '<p class="empty">No other DU or Kerzy Labs listings in storage.</p>') + "</div>";
    $("#listings").innerHTML = h;

    var ed = ls.filter(function (l) { return l.canEdit; });
    $("#edit").innerHTML = '<div class="card"><h2>Pick a listing to edit</h2><p class="muted" style="font-size:.9rem;margin-bottom:6px">Opens the full-size editor with a live preview and the image gallery.</p>' +
      (ed.length ? ed.map(function (l) { var st = D.listingState(l); return '<div class="listing">' + D.icon(l) + '<div class="listing-info"><strong>' + esc(l.name) + "</strong><span>" + esc(l.makerName || "") + '</span></div><div class="listing-stats"><span class="pill ' + st.cls + '">' + st.label + '</span><a class="btn sm primary" href="edit/?id=' + encodeURIComponent(l.id) + '">Open editor</a></div></div>'; }).join("") : '<p class="empty">Nothing to edit yet.</p>') + "</div>";
  }

  /* ---------- Analytics ---------- */
  var an = { range: 30, id: "all" };
  function bars(days, key, cls, big) {
    var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d[key]; })));
    return '<div class="chart-placeholder' + (big ? "" : " sm") + '">' + days.map(function (d) {
      var lab = d.d.slice(4, 6) + "/" + d.d.slice(6, 8);
      return '<div class="bar' + (cls ? " " + cls : "") + '" style="height:0" data-h="' + Math.max(2, Math.round(d[key] / max * 100)) + '%" data-tip="' + lab + ": " + d[key] + '"></div>';
    }).join("") + "</div>";
  }
  function series(ids) {
    var n = an.range, out = [];
    for (var k = 30 - n; k < 30; k++) {
      var o = null;
      ids.forEach(function (id) { var s = data.stats[id]; if (!s || !s.days[k]) return; var d = s.days[k]; if (!o) o = { d: d.d, i: 0, v: 0, c: 0 }; o.i += d.i; o.v += d.v; o.c += d.c; });
      if (o) out.push(o);
    }
    return out;
  }
  function axis(s) { return s.length ? '<div class="chart-axis"><span>' + s[0].d.slice(4, 6) + "/" + s[0].d.slice(6) + "</span><span>" + s[s.length - 1].d.slice(4, 6) + "/" + s[s.length - 1].d.slice(6) + "</span></div>" : ""; }
  function renderAnalytics() {
    var ls = data.listings, ids = an.id === "all" ? ls.map(function (l) { return l.id; }) : [an.id];
    var s = series(ids), t = s.reduce(function (a, d) { a.i += d.i; a.v += d.v; a.c += d.c; return a; }, { i: 0, v: 0, c: 0 });
    var opts = '<option value="all">All listings</option>' + ls.map(function (l) { return '<option value="' + esc(l.id) + '"' + (an.id === l.id ? " selected" : "") + ">" + esc(l.name) + "</option>"; }).join("");
    var h = '<div class="card"><div class="card-head"><h2>Views over time</h2><div class="select-row">' +
      '<label class="sr" for="an-l">Listing</label><select class="ctl inline" id="an-l">' + opts + "</select>" +
      '<label class="sr" for="an-r">Date range</label><select class="ctl inline" id="an-r">' + [7, 14, 30].map(function (n) { return '<option value="' + n + '"' + (an.range === n ? " selected" : "") + ">Last " + n + " days</option>"; }).join("") + "</select></div></div>" +
      bars(s, "v", "", true) + axis(s) + '<div class="legend" style="margin-top:8px"><span><i></i>Detail views</span></div></div>' +
      '<div class="stats"><div class="stat"><div class="stat-label">Impressions</div><div class="stat-value">' + nf.format(t.i) + '</div></div><div class="stat"><div class="stat-label">Detail views</div><div class="stat-value">' + nf.format(t.v) + '</div></div><div class="stat"><div class="stat-label">Clicks</div><div class="stat-value">' + nf.format(t.c) + '</div></div><div class="stat"><div class="stat-label">Click-through</div><div class="stat-value">' + (t.i ? (t.c / t.i * 100).toFixed(1) + "%" : "—") + "</div></div></div>" +
      '<h2 style="font-size:1rem;margin:6px 0 12px">Per listing · last ' + an.range + ' days</h2><div class="charts-grid">' +
      ls.map(function (l) { var ss = series([l.id]), tt = ss.reduce(function (a, d) { a.v += d.v; a.c += d.c; a.i += d.i; return a; }, { i: 0, v: 0, c: 0 });
        return '<div class="card"><div class="card-head" style="margin-bottom:8px"><h2 style="font-size:.92rem">' + esc(l.name) + '</h2><span class="pill ' + D.listingState(l).cls + '">' + D.listingState(l).label + "</span></div>" + bars(ss, "v", "", false) + bars(ss, "c", "c", false).replace("chart-placeholder sm", "chart-placeholder sm\" style=\"height:50px;margin-top:6px") + axis(ss) +
          '<div class="legend" style="margin-top:6px"><span><i></i>' + tt.v + ' views</span><span><i class="c"></i>' + tt.c + " clicks</span><span>" + tt.i + " impressions</span></div></div>"; }).join("") + "</div>" +
      '<p class="hint">Counts come from the marketplace\'s own privacy-friendly counters (no cookies), kept for 30 days.</p>';
    $("#analytics").innerHTML = h;
    $("#an-l").onchange = function () { an.id = this.value; renderAnalytics(); };
    $("#an-r").onchange = function () { an.range = +this.value; renderAnalytics(); };
    requestAnimationFrame(function () { requestAnimationFrame(function () { document.querySelectorAll("#analytics .bar").forEach(function (b) { b.style.height = b.dataset.h; }); }); });
  }

  /* ---------- Profile ---------- */
  var prof = null;
  function loadProfile() {
    var el = $("#profile");
    var acct = '<div class="card"><h2>Account</h2><p class="muted" style="font-size:.92rem">Signed in as <strong>' + esc(data.account && data.account.email || (data.account && data.account.identities && data.account.identities.length ? "X or Google (no email yet)" : "private link")) + "</strong>" + (data.master ? ' <span class="pill owner">Owner</span>' : "") + '</p>' + (data.account && !data.account.email ? '<div class="banner warn" style="margin-top:10px">Add your email so logging in with email, Google or X always opens this same account. <a href="/login/security/?addemail=1">Add email</a></div>' : "") + '<p style="margin-top:12px" class="select-row"><a class="btn sm" href="/login/security/">Sign-in methods &amp; 2FA</a><a class="btn sm" href="/community/dashboard/classic/">Password, API keys &amp; support (classic dashboard)</a><button class="btn sm ghost" id="so">Sign out</button></p></div>';
    if (prof) return;
    prof = true;
    el.innerHTML = acct + '<div class="card" id="mk"><div class="skel"></div></div>';
    $("#so").onclick = function () { fetch("/api/community/creator?action=signout", { method: "POST", credentials: "same-origin" }).then(function () { location.reload(); }); };
    D.api("GET", null, "?action=profile").then(function (d) {
      var mk = $("#mk");
      if (!d.ok) { mk.innerHTML = "<h2>Maker page</h2><p class=\"muted\">" + esc(d.error || "Unavailable.") + "</p>"; return; }
      var p = d.profile, cur = p.pending || p.live || { name: p.defaultName, bio: "", website: "" };
      mk.innerHTML = '<div class="card-head"><h2>Maker page</h2><a class="btn sm ghost" href="' + esc(p.url) + '" target="_blank" rel="noopener">View page</a></div>' +
        (p.pending ? '<div class="banner warn">Your last change is waiting for review.</div>' : "") +
        (d.makers.length > 1 ? '<div class="fld"><label for="pf-s">Maker</label><select class="ctl" id="pf-s">' + d.makers.map(function (m) { return '<option value="' + esc(m.slug) + '"' + (m.slug === p.slug ? " selected" : "") + ">" + esc(m.name) + "</option>"; }).join("") + "</select></div>" : "") +
        '<form id="pf" novalidate><div class="fld"><label for="pf-n">Display name</label><input class="ctl" id="pf-n" maxlength="' + p.limits.name + '" value="' + esc(cur.name) + '"></div>' +
        '<div class="fld"><label for="pf-b">Bio <span class="count" id="pf-bc"></span></label><textarea class="ctl" id="pf-b" maxlength="' + p.limits.bio + '">' + esc(cur.bio) + "</textarea></div>" +
        '<div class="fld"><label for="pf-w">Website</label><input class="ctl" id="pf-w" type="url" placeholder="https://" value="' + esc(cur.website) + '"><p class="err" id="pf-we"></p></div>' +
        '<p class="hint" style="margin-bottom:12px">Logo, banner and social links: edit them on the <a href="/community/dashboard/classic/#profile">classic dashboard</a> for now. Changes are reviewed before they appear.</p>' +
        '<p class="err" id="pf-err" role="alert"></p><button class="btn primary" type="submit">Submit for review</button> <span class="muted" id="pf-ok" style="font-size:.85rem"></span></form>';
      var b = $("#pf-b"), bc = $("#pf-bc"); var upd = function () { bc.textContent = b.value.length + "/" + p.limits.bio; }; b.oninput = upd; upd();
      if ($("#pf-s")) $("#pf-s").onchange = function () { prof = null; D.api("GET", null, "?action=profile&slug=" + encodeURIComponent(this.value)).then(function () { loadProfile(); }); };
      $("#pf").onsubmit = function (e) {
        e.preventDefault();
        var w = $("#pf-w").value.trim(); $("#pf-we").textContent = ""; $("#pf-err").textContent = "";
        if (w && !/^https:\/\/[^\s]+\.[^\s]+/.test(w)) { $("#pf-we").textContent = "Use a full https:// link."; $("#pf-w").setAttribute("aria-invalid", "true"); return; }
        $("#pf-w").removeAttribute("aria-invalid");
        fetch("/api/community/creator", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "profile_save", slug: p.slug, profile: { name: $("#pf-n").value, bio: b.value, website: w, socials: cur.socials || {}, logo: cur.logo || "", banner: cur.banner || "" } }) })
          .then(function (r) { return r.json(); }).then(function (r) { if (r.ok) $("#pf-ok").textContent = "Submitted for review."; else $("#pf-err").textContent = r.error || "Could not save."; });
      };
    });
  }

  function load() {
    D.api("GET").then(function (d) {
      if (d._status === 401) { $("#sub").textContent = "Sign in to manage your listings."; document.querySelector(".tabs").hidden = true; D.signIn($("#root"), function () { location.reload(); }); return; }
      if (!d.listings) { $("#listings").innerHTML = '<div class="banner bad">' + esc(d.error || "Could not load the dashboard.") + "</div>"; return; }
      data = d;
      var live = d.listings.filter(function (l) { return l.status === "approved"; }).length;
      $("#sub").textContent = (d.account && d.account.email ? d.account.email + " · " : "") + live + " live listing" + (live === 1 ? "" : "s") + (d.master ? " · owner master view" : "");
      renderListings();
      showTab((location.hash || "#listings").slice(1));
    }).catch(function () { $("#listings").innerHTML = '<div class="banner bad">Network error. <button class="btn sm" onclick="location.reload()">Retry</button></div>'; });
  }
  D.linkAuth().then(load);
})();
