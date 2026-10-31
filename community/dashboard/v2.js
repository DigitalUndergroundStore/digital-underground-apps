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
      (own.length ? own.map(row).join("") : '<p class="empty">No listings yet. Add your app, game, book or tool in a few minutes: free, zero cut, buyers go straight to your checkout.</p><p class="empty" style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn sm primary" href="/community/submit/">List your project free</a><a class="btn sm" href="/#projects">See what others listed</a><a class="btn sm" href="/league/">Maker League</a></p>') + "</div>";
    if (data.master) h += '<div class="card"><div class="card-head"><h2>Digital Underground &amp; Kerzy Labs</h2><span class="pill owner">Owner master view</span></div>' +
      (master.length ? master.map(row).join("") : '<p class="empty">No other DU or Kerzy Labs listings in storage.</p>') + "</div>";
    if (own.length || data.master) h += '<div class="card" style="border-color:rgba(154,151,232,.45)"><div class="card-head"><h2>Customize your public page</h2><a class="btn sm primary" href="#profile" data-goto="profile">Customize \u2192</a></div><p class="muted" style="margin:0;font-size:.9rem">Your creator page lists everything you publish. Add your logo, banner, bio, links and an accent colour, with a live preview.</p></div>';
    if (live) h += '<div class="card"><div class="card-head"><h2>Get more eyes on it</h2></div><p style="margin:0 0 10px">Your listing is live. Put it in the Maker League or share it.</p><a class="btn sm primary" href="/league/">Enter Maker League \u2192</a> <a class="btn sm" target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + encodeURIComponent("My project is live on Digital Underground, the free indie marketplace") + '&url=' + encodeURIComponent("https://digitalundergroundstore.com/") + '">Share on X</a></div>';
    $("#listings").innerHTML = h;
    document.querySelectorAll("[data-goto]").forEach(function (a) { a.onclick = function (ev) { ev.preventDefault(); showTab(a.dataset.goto, true); scrollTo(0, 0); }; });

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

  /* ---------- Profile: Customize your public page (live preview) ---------- */
  var prof = null;
  var SOC_LABEL = { x: "X", github: "GitHub", youtube: "YouTube", linkedin: "LinkedIn", instagram: "Instagram", mastodon: "Mastodon", bluesky: "Bluesky", discord: "Discord" };
  var HTTPS = /^https:\/\/[^\s]+\.[^\s]+/;
  function loadProfile(slug) {
    var el = $("#profile");
    var acct = '<div class="card"><h2>Account</h2><p class="muted" style="font-size:.92rem">Signed in as <strong>' + esc(data.account && data.account.email || (data.account && data.account.identities && data.account.identities.length ? "X or Google (no email yet)" : "private link")) + "</strong>" + (data.master ? ' <span class="pill owner">Owner</span>' : "") + '</p>' + (data.account && !data.account.email ? '<div class="banner warn" style="margin-top:10px">Add your email so logging in with email, Google or X always opens this same account. <a href="/login/security/?addemail=1">Add email</a></div>' : "") + '<p style="margin-top:12px" class="select-row"><a class="btn sm" href="/login/security/">Sign-in methods &amp; 2FA</a><a class="btn sm" href="/community/dashboard/classic/">Password, API keys &amp; support (classic dashboard)</a><button class="btn sm ghost" id="so">Sign out</button></p></div>';
    if (prof && !slug) return;
    prof = true;
    el.innerHTML = '<div class="card" id="mk"><div class="skel"></div></div>' + acct;
    $("#so").onclick = function () { fetch("/api/community/creator?action=signout", { method: "POST", credentials: "same-origin" }).then(function () { location.reload(); }); };
    fetch("/api/community/creator?action=profile" + (slug ? "&slug=" + encodeURIComponent(slug) : ""), { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      var mk = $("#mk");
      if (!d.ok) { mk.innerHTML = '<h2>Customize your public page</h2><p class="muted">' + esc(d.error || "Unavailable.") + "</p>"; return; }
      var p = d.profile, cur = p.pending || p.live || { name: p.defaultName, bio: "", website: "", socials: {} };
      var st = { name: cur.name || p.defaultName || "", bio: cur.bio || "", website: cur.website || "", socials: Object.assign({}, cur.socials || {}), logo: cur.logo || "", banner: cur.banner || "", accent: cur.accent || "", newLogo: "", newBanner: "" };
      if (/ on the Digital Underground marketplace$/.test(st.bio)) st.bio = ""; // bare auto-bio: start fresh
      var acc = p.accents || {}, full = location.origin + p.url;
      var socF = (p.socials || []).map(function (k) { return '<div class="fld" style="margin-bottom:10px"><label for="pf-so-' + k + '">' + esc(SOC_LABEL[k] || k) + '</label><input class="ctl" id="pf-so-' + k + '" data-soc="' + k + '" type="url" placeholder="https://" value="' + esc(st.socials[k] || "") + '"></div>'; }).join("");
      var accF = '<label style="display:inline-flex;gap:6px;align-items:center;margin:0 12px 8px 0"><input type="radio" name="pf-ac" value=""' + (st.accent ? "" : " checked") + "> Default</label>" + Object.keys(acc).map(function (k) { return '<label style="display:inline-flex;gap:6px;align-items:center;margin:0 12px 8px 0"><input type="radio" name="pf-ac" value="' + k + '"' + (st.accent === k ? " checked" : "") + '><span style="width:16px;height:16px;border-radius:50%;background:' + acc[k] + ';display:inline-block"></span>' + k.charAt(0).toUpperCase() + k.slice(1) + "</label>"; }).join("");
      mk.innerHTML = '<div class="card-head"><h2>Customize your public page</h2><a class="btn sm ghost" href="' + esc(p.url) + '" target="_blank" rel="noopener">Open live page ↗</a></div>' +
        '<p class="muted" style="font-size:.9rem;margin-bottom:12px">This is the page buyers see at <a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(full) + '</a>. Edit on the left, the preview updates as you type. Changes that pass automatic checks go live right away.</p>' +
        (p.pending ? '<div class="banner warn">Your last change is waiting for a quick review; your current page stays up meanwhile.</div>' : "") +
        (p.lastRejected && !p.pending ? '<div class="banner bad">Your last change was not approved' + (p.lastRejected.reason ? ": " + esc(p.lastRejected.reason) : "") + "</div>" : "") +
        (d.makers.length > 1 ? '<div class="fld"><label for="pf-s">Which page</label><select class="ctl" id="pf-s">' + d.makers.map(function (m) { return '<option value="' + esc(m.slug) + '"' + (m.slug === p.slug ? " selected" : "") + ">" + esc(m.name) + "</option>"; }).join("") + "</select></div>" : "") +
        '<div class="cz-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;align-items:start">' +
        '<form id="pf" novalidate>' +
        '<div class="fld"><label for="pf-n">Company / display name</label><input class="ctl" id="pf-n" maxlength="' + p.limits.name + '" value="' + esc(st.name) + '"><p class="hint">Shown as the page title. Your page address (' + esc(p.url) + ') stays the same.</p></div>' +
        '<div class="fld"><label for="pf-b">About you <span class="count" id="pf-bc"></span></label><textarea class="ctl" id="pf-b" maxlength="' + p.limits.bio + '" placeholder="Who you are, what you build, and who it is for. 2–3 sentences works best.">' + esc(st.bio) + "</textarea></div>" +
        '<div class="fld"><label for="pf-w">Website</label><input class="ctl" id="pf-w" type="url" placeholder="https://yoursite.com" value="' + esc(st.website) + '"></div>' +
        '<div class="fld"><label for="pf-lg">Logo <span class="muted" style="font-weight:400">(square, JPEG/PNG/WebP, max ' + p.limits.logoKB + ' KB)</span></label><input class="ctl" id="pf-lg" type="file" accept="image/jpeg,image/png,image/webp"></div>' +
        '<div class="fld"><label for="pf-bn">Banner <span class="muted" style="font-weight:400">(wide 1200×400, max ' + p.limits.bannerKB + ' KB)</span></label><input class="ctl" id="pf-bn" type="file" accept="image/jpeg,image/png,image/webp"></div>' +
        '<div class="fld"><span class="lbl">Accent colour</span><div id="pf-ac">' + accF + "</div></div>" +
        '<details class="fld"><summary style="cursor:pointer;font-weight:600">Social links (optional)</summary><div style="margin-top:10px">' + socF + "</div></details>" +
        '<p class="err" id="pf-err" role="alert"></p><button class="btn primary" type="submit" id="pf-go">Save &amp; publish</button> <span id="pf-ok" role="status" style="font-size:.9rem"></span></form>' +
        '<div><p class="muted" style="font-size:.8rem;margin-bottom:6px">Live preview</p><div id="pf-pv" style="border:1px solid var(--border);border-radius:14px;overflow:hidden;background:#11141a"></div></div></div>';
      function img(k) { var n = st["new" + k.charAt(0).toUpperCase() + k.slice(1)]; return n || st[k]; }
      function render() {
        var a = acc[st.accent] || "#9a97e8", lg = img("logo"), bn = img("banner"), nm = st.name || p.defaultName || "Your name";
        var links = (st.website ? '<span style="padding:4px 10px;border-radius:999px;font-size:.78rem;background:' + a + ';color:#11141a">' + esc(st.website.replace(/^https:\/\/(www\.)?/, "").split("/")[0]) + "</span>" : "") +
          Object.keys(st.socials).filter(function (k) { return st.socials[k]; }).map(function (k) { return '<span style="padding:4px 10px;border-radius:999px;font-size:.78rem;border:1px solid ' + a + '">' + esc(SOC_LABEL[k] || k) + "</span>"; }).join("");
        $("#pf-pv").innerHTML = '<div style="aspect-ratio:3/1;background:' + (bn ? "#282d37" : "linear-gradient(135deg," + a + "55,#282d37 70%)") + '">' + (bn ? '<img src="' + esc(bn) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">' : "") + "</div>" +
          '<div style="padding:0 16px 16px"><div style="display:flex;gap:12px;align-items:flex-end;margin-top:-28px">' +
          (lg ? '<img src="' + esc(lg) + '" alt="" style="width:64px;height:64px;border-radius:16px;object-fit:contain;background:#1a1e26;border:3px solid #11141a">' : '<span style="width:64px;height:64px;border-radius:16px;display:grid;place-items:center;font:800 28px/1 system-ui;background:' + a + ';color:#11141a;border:3px solid #11141a">' + esc(nm.charAt(0)) + "</span>") +
          '<div><p style="font-size:.7rem;color:#a8acb5;margin:0"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + a + ';margin-right:5px"></span>Creator on the Developer Marketplace</p><strong style="font-size:1.3rem">' + esc(nm) + "</strong></div></div>" +
          (st.bio ? '<p style="margin:12px 0 0;color:#c9ccd3;font-size:.92rem;white-space:pre-line">' + esc(st.bio) + "</p>" : '<p style="margin:12px 0 0;color:#6b7080;font-size:.88rem;font-style:italic">Add a short bio so buyers know who you are.</p>') +
          (links ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">' + links + "</div>" : "") +
          '<p style="margin:14px 0 0;font-size:.8rem;color:#a8acb5">+ your live listings appear below</p></div>';
      }
      var b = $("#pf-b"), bc = $("#pf-bc"); var upd = function () { bc.textContent = b.value.length + "/" + p.limits.bio; };
      $("#pf-n").oninput = function () { st.name = this.value; render(); };
      b.oninput = function () { st.bio = b.value; upd(); render(); };
      $("#pf-w").oninput = function () { st.website = this.value.trim(); render(); };
      document.querySelectorAll("[data-soc]").forEach(function (i) { i.oninput = function () { st.socials[i.dataset.soc] = i.value.trim(); render(); }; });
      document.querySelectorAll('input[name="pf-ac"]').forEach(function (r) { r.onchange = function () { st.accent = r.value; render(); }; });
      function file(id, key, maxKB) {
        $(id).onchange = function () {
          var f = this.files[0]; $("#pf-err").textContent = "";
          if (!f) return;
          if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { $("#pf-err").textContent = "Use a JPEG, PNG or WebP image."; this.value = ""; return; }
          if (f.size > maxKB * 1024) { $("#pf-err").textContent = "That image is " + Math.round(f.size / 1024) + " KB; the limit is " + maxKB + " KB. Try a smaller or compressed version."; this.value = ""; return; }
          var rd = new FileReader(); rd.onload = function () { st[key] = rd.result; render(); }; rd.readAsDataURL(f);
        };
      }
      file("#pf-lg", "newLogo", p.limits.logoKB); file("#pf-bn", "newBanner", p.limits.bannerKB);
      upd(); render();
      if ($("#pf-s")) $("#pf-s").onchange = function () { loadProfile(this.value); };
      $("#pf").onsubmit = function (e) {
        e.preventDefault();
        var err = $("#pf-err"), ok = $("#pf-ok"); err.textContent = ""; ok.textContent = "";
        if (!st.name.trim()) { err.textContent = "Add a display name."; return; }
        if (st.website && !HTTPS.test(st.website)) { err.textContent = "Website must be a full https:// link."; return; }
        for (var k in st.socials) if (st.socials[k] && !HTTPS.test(st.socials[k])) { err.textContent = (SOC_LABEL[k] || k) + " link must be a full https:// link."; return; }
        var go = $("#pf-go"); go.disabled = true; go.textContent = "Saving…";
        // Unchanged images are sent empty: the server keeps the current ones.
        fetch("/api/community/creator", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "profile_save", slug: p.slug, profile: { name: st.name, bio: st.bio, website: st.website, socials: st.socials, logo: st.newLogo, banner: st.newBanner, accent: st.accent } }) })
          .then(function (r) { return r.json(); }).then(function (r) {
            go.disabled = false; go.innerHTML = "Save &amp; publish";
            if (!r.ok) { err.textContent = r.error || "Could not save."; return; }
            var pend = r.profile && r.profile.pending;
            ok.innerHTML = pend ? '<span style="color:#f5c26b">Saved. A quick review is needed before it goes live; your current page stays up.</span>' : '<span style="color:#7ee2a8">✓ Saved and live.</span> <a href="' + esc(p.url) + '" target="_blank" rel="noopener">View your page ↗</a>';
          }).catch(function () { go.disabled = false; go.innerHTML = "Save &amp; publish"; err.textContent = "Network error. Try again."; });
      };
    });
  }

  function load() {
    D.api("GET").then(function (d) {
      if (d._status === 401) { $("#sub").innerHTML = 'Digital Underground is a free marketplace for indie apps, games, books and tools. You keep 100% of your sales — we just link to your checkout.'; var cta = document.createElement("p"); cta.className = "du-lo-cta"; cta.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 22px"; cta.innerHTML = '<a class="btn" href="/community/submit/" style="font-weight:700">List your project free →</a><a class="btn sm" href="/login/">Log in</a>'; $("#sub").after(cta); D.signIn($("#root")); return; }
      if (!d.listings) { $("#listings").innerHTML = '<div class="banner bad">' + esc(d.error || "Could not load the dashboard.") + "</div>"; return; }
      data = d; document.querySelector(".tabs").hidden = false;
      var live = d.listings.filter(function (l) { return l.status === "approved"; }).length;
      $("#sub").textContent = (d.account && d.account.email ? d.account.email + " · " : "") + live + " live listing" + (live === 1 ? "" : "s") + (d.master ? " · owner master view" : "");
      renderListings();
      showTab((location.hash || "#listings").slice(1));
    }).catch(function () { $("#listings").innerHTML = '<div class="banner bad">Network error. <button class="btn sm" onclick="location.reload()">Retry</button></div>'; });
  }
  D.linkAuth().then(load);
})();
