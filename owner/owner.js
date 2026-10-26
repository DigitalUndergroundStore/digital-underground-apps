(function () {
  var view = "login";
  var overview = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }
  function showMsg(el, text, ok) {
    el.hidden = false;
    el.classList.remove("hidden", "ok", "err");
    el.classList.add(ok ? "ok" : "err");
    el.textContent = text;
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch("/api/owner/" + path, {
      method: opts.method || "GET",
      credentials: "same-origin",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      var ct = r.headers.get("content-type") || "";
      if (ct.indexOf("json") >= 0) {
        return r.json().then(function (d) { return { r: r, d: d }; });
      }
      return r.text().then(function (t) { return { r: r, d: { raw: t } }; });
    });
  }

  function go(name) {
    view = name;
    ["login", "home", "queue", "contacts", "crm", "support", "analytics", "apikeys", "backups", "links"].forEach(function (v) {
      var el = $("view-" + v);
      if (!el) return;
      if (v === "login") el.classList.toggle("hidden", name !== "login");
      else el.classList.toggle("is-on", name === v);
    });
    $("logout-btn").hidden = name === "login";
    document.body.setAttribute("data-view", name);
    if (name === "home") loadHome();
    if (name === "queue") { loadQueue("pending"); loadMakers(); loadReports(); }
    if (name === "contacts") loadContacts("");
    if (name === "crm" && window.duCrmLoad) window.duCrmLoad();
    if (name === "support") loadSupport("open");
    if (name === "analytics") loadAnalytics();
    if (name === "backups") loadBackups();
    if (name === "apikeys") loadKeys();
  }

  function loadHome() {
    api("overview").then(function (out) {
      if (!out.r.ok) { go("login"); return; }
      overview = out.d;
      var t = out.d.today || {};
      var w = out.d.last7 || {};
      var pending = out.d.pendingCount || 0;
      var support = out.d.supportOpen || 0;
      var backup = out.d.backup || {};
      $("home-sub").textContent =
        (out.d.listingsLive || 0) + " live listings · " + (out.d.contactsTotal || 0) + " contacts";
      $("home-cards").innerHTML =
        card("queue", "Review queue", pending + (out.d.flaggedCount || 0), (pending ? pending + " waiting" : "All clear") + (out.d.flaggedCount ? " · " + out.d.flaggedCount + " flagged" : ""), pending || out.d.flaggedCount ? "badge" : "badge ok") +
        card("support", "Feedback & support", support, support ? "Needs a reply" : "Inbox zero", support ? "badge" : "badge ok") +
        card("contacts", "Contacts", out.d.contactsTotal || 0, "+" + (t.contacts || 0) + " today", "") +
        card("crm", "CRM pipeline", "→", "Leads, makers, press, follow-ups", "") +
        card("analytics", "Stats", (w.views || 0), "marketplace views, " + (w.clicks || 0) + " clicks · 7 days", "") +
        card("backups", "Backups", shortDate(backup.lastSnapshot) || "—", backup.ok ? "Latest snapshot" : "Check backup", backup.ok ? "badge ok" : "badge warn") +
        '<button type="button" class="oh-card" data-go="analytics" data-an-go="live" id="home-live"><div class="oh-label">Online now</div><div class="oh-value">…</div><div class="oh-meta">DU + Kerzy Labs</div></button>' +
        '<button type="button" class="oh-card" data-go="analytics" data-an-go="health" id="home-health"><div class="oh-label">Health</div><div class="oh-value">…</div><div class="oh-meta">Checking site…</div></button>' +
        card("apikeys", "API keys", "→", "Creator API access", "") +
        card("links", "Quick links", "→", "Gumroad, Cloudflare, X…", "");
      homeHealth();
      $("home-today").innerHTML =
        '<div class="oh-today"><h2>Today</h2>' +
        '<div class="oh-row"><span>Views</span><span>' + (t.views || 0) + "</span></div>" +
        '<div class="oh-row"><span>Clicks</span><span>' + (t.clicks || 0) + "</span></div>" +
        '<div class="oh-row"><span>New submissions</span><span>' + (t.submissions || 0) + "</span></div>" +
        '<div class="oh-row"><span>New contacts</span><span>' + (t.contacts || 0) + "</span></div>" +
        '<div class="oh-row"><span>Support messages</span><span>' + (t.support || 0) + "</span></div>" +
        '<div class="oh-note">Last 7 days: ' +
        (w.views || 0) + " views · " + (w.clicks || 0) + " clicks · " +
        (w.submissions || 0) + " submissions · " + (w.contacts || 0) + " contacts</div></div>";
    });
  }

  function homeHealth() {
    api("presence").then(function (out) {
      var el = $("home-live"); if (!el || !out.r.ok) return;
      var dn = 0, kn = 0; (out.d.apps || []).forEach(function (a) { if (a.appId.indexOf("kz-") === 0) kn += a.count; else dn += a.count; });
      el.querySelector(".oh-value").textContent = out.d.online;
      el.querySelector(".oh-meta").textContent = "DU " + dn + " · Kerzy Labs " + kn;
    });
    api("health").then(function (out) {
      var el = $("home-health"); if (!el || !out.r.ok) return;
      var v = healthVerdict(out.d);
      el.innerHTML = '<div class="oh-badge ' + (v.level === "ok" ? "ok\">OK" : v.level === "warn" ? "need\">Check" : "warn\">Broken") + '</div><div class="oh-label">Health</div><div class="oh-value">' + v.okCount + "/" + v.total + '</div><div class="oh-meta">' + esc(v.issues.length ? v.issues[0] + (v.issues.length > 1 ? " +" + (v.issues.length - 1) + " more" : "") : "All pages up · no server errors") + "</div>";
    });
  }
  function healthVerdict(d) {
    var issues = [], bad = 0, warn = 0, probes = d.probes || [];
    probes.forEach(function (p) { if (p.state === "fail") { bad++; issues.push(p.name + " down (" + (p.status || p.error) + ")"); } else if (p.state === "slow") { warn++; issues.push(p.name + " slow (" + p.ms + " ms)"); } });
    var e = d.errors || {}; if (e.today) { warn++; issues.push(e.today + " server error" + (e.today > 1 ? "s" : "") + " today"); }
    var b = d.backup || {}; if (!b.ok) { warn++; issues.push("Backup check failed"); } else if (b.ageDays != null && b.ageDays > 2) { warn++; issues.push("Last backup " + b.ageDays + " days ago"); }
    var f = d.feedback || {}; if (f.open && f.oldestOpenDays > 3) { warn++; issues.push(f.open + " open feedback, oldest " + f.oldestOpenDays + "d"); }
    var q = d.queue || {}; if (q.pending > 5) { warn++; issues.push(q.pending + " listings waiting review"); }
    if (d.sampling && d.sampling.active) { warn++; issues.push("Store stats sampling (1 in " + d.sampling.sample + ")"); }
    return { level: bad ? "bad" : warn ? "warn" : "ok", issues: issues, okCount: probes.filter(function (p) { return p.state === "ok"; }).length, total: probes.length };
  }
  function ago(ts) { if (!ts) return "never"; var m = Math.round((Date.now() - ts) / 60000); return m < 60 ? m + " min ago" : m < 2880 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " days ago"; }
  function miniChart(chart, title, unit) {
    var max = 1; chart.forEach(function (d) { if (d.n > max) max = d.n; });
    return '<div class="an-card"><h2>' + esc(title) + '</h2><div class="an-chart an-mini" role="img" aria-label="' + esc(title) + '">' + chart.map(function (d) {
      return '<div class="col" title="' + esc(d.d) + ": " + d.n + " " + unit + '"><i class="s1" style="height:' + Math.max(d.n ? 4 : 1, Math.round((d.n / max) * 100)) + '%"></i></div>';
    }).join("") + '</div></div>';
  }
  function loadHealth(seq) {
    $("an-sub").textContent = "Checking live pages from Cloudflare…";
    api("health").then(function (out) {
      if (seq !== anSeq) return;
      if (!out.r.ok) { if (out.r.status === 401) go("login"); else $("an-sub").textContent = "Health check failed (" + out.r.status + ")"; return; }
      var d = out.d, v = healthVerdict(d), s = d.subscribers || {}, f = d.feedback || {}, e = d.errors || {}, b = d.backup || {}, sm = d.sampling || {}, q = d.queue || {};
      $("an-sub").textContent = (v.level === "ok" ? "✅ Everything looks smooth" : v.level === "warn" ? "⚠️ Running, with things to check" : "❌ Something is broken") + " · checked " + new Date(d.at).toLocaleTimeString();
      $("an-kpis").innerHTML =
        kpi("Pages up", v.okCount + "/" + v.total, '<span class="d ' + (v.level === "bad" ? "down" : "up") + '">' + (v.issues.length ? v.issues.length + " issue(s)" : "all OK") + "</span>") +
        kpi("Server errors", fmt(e.today), '<span class="d ' + (e.last7 ? "down" : "") + '">' + fmt(e.last7) + " in 7 days</span>") +
        kpi("Subscribers", fmt(s.active), '<span class="d ' + (s.last7 ? "up" : "") + '">+' + fmt(s.last7) + " 7d · +" + fmt(s.last30) + " 30d</span>") +
        kpi("Open feedback", fmt(f.open), '<span class="d">' + fmt(f.last7) + " new 7d · " + fmt(f.done) + " done</span>") +
        kpi("Last backup", shortDate(b.lastSnapshot) || "—", '<span class="d ' + (!b.ok || b.ageDays > 2 ? "down" : "") + '">' + (b.ok ? (b.ageDays === 0 ? "today" : b.ageDays + "d ago") : "check failed") + "</span>");
      var probes = (d.probes || []).map(function (p) {
        var cls = p.state === "ok" ? "ok" : p.state === "slow" ? "need" : "warn";
        return '<div class="bar-row"><div class="bar-top"><span class="bk"><span class="oh-badge hp ' + cls + '">' + (p.state === "ok" ? "OK" : p.state === "slow" ? "Slow" : "Fail") + "</span> " + '<a href="' + esc(p.path) + '" target="_blank" rel="noopener">' + esc(p.name) + "</a>" + '</span><span class="bv">' + (p.status || p.error) + " · " + p.ms + " ms</span></div></div>";
      }).join("");
      var errList = (e.paths || []).length ? (e.paths || []).map(function (r) { return '<div class="bar-row"><div class="bar-top"><span class="bk">' + esc(r.k) + '</span><span class="bv">' + r.v + "</span></div></div>"; }).join("") + '<p class="muted small">Last: ' + esc(e.last ? e.last.path + " (" + e.last.status + ") " + ago(e.last.at) : "") + "</p>" : '<p class="muted small">No 5xx responses or crashes logged on /api/ in the last 14 days.</p>';
      $("an-lists").innerHTML =
        '<div class="an-card"><h2>Is everything running smooth?</h2>' + (v.issues.length ? "<ul class=\"hl-issues\">" + v.issues.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : '<p class="muted small">No issues found.</p>') + "</div>" +
        '<div class="an-card"><h2>Uptime check (live, from Cloudflare)</h2><p class="muted small an-help">Each page is fetched right now from the server. Slow = over 1.5 s.</p>' + probes + "</div>" +
        '<div class="an-card"><h2>Server errors (API 5xx, 14 days)</h2>' + errList + "</div>" +
        miniChart(s.chart || [], "Email signups per day (30 days)", "signups") +
        listCard("Signup sources (30 days)", s.sources || [], "", "No signups in the last 30 days.") +
        miniChart(f.chart || [], "Feedback & support per day (30 days)", "messages") +
        listCard("Feedback by product (30 days)", f.products || [], "", "No feedback in the last 30 days.") +
        listCard("Feedback by source (30 days)", f.sources || [], "", "No feedback in the last 30 days.") +
        '<div class="an-card"><h2>Housekeeping</h2>' +
        '<div class="oh-row"><span>Subscribers active / total</span><span>' + fmt(s.active) + " / " + fmt(s.total) + "</span></div>" +
        '<div class="oh-row"><span>Unsubscribes (30 days)</span><span>' + fmt(s.unsub30) + "</span></div>" +
        '<div class="oh-row"><span>Last signup</span><span>' + ago(s.lastAt) + "</span></div>" +
        '<div class="oh-row"><span>Oldest open feedback</span><span>' + (f.open ? f.oldestOpenDays + " days" : "—") + "</span></div>" +
        '<div class="oh-row"><span>Listings waiting review / flagged</span><span>' + fmt(q.pending) + " / " + fmt(q.flagged) + "</span></div>" +
        '<div class="oh-row"><span>Store stat writes today</span><span>' + fmt(sm.writesToday) + " / " + sm.softCap + (sm.active ? " (sampling 1 in " + sm.sample + ")" : "") + "</span></div>" +
        '<div class="oh-row"><span>Backups stored</span><span>' + (b.count != null ? b.count : "—") + "</span></div></div>";
      $("an-note").textContent = "All first-party. Server errors are counted from now on (Oct 26, 2026) for /api/ requests that return 5xx or crash; there is no request total, so this is a count, not a percentage. Page-level 4xx/5xx and traffic-wide error rates would need a Cloudflare API token (Analytics read), which isn't configured.";
    });
  }
  function shortDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ""));
    if (!m) return v;
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1] + " " + (+m[3]);
  }

  function card(goTo, title, count, sub, badgeClass) {
    var badge = "";
    if (badgeClass === "badge" && count) badge = '<div class="oh-badge need">' + esc(count) + " need you</div>";
    if (badgeClass === "badge ok") badge = '<div class="oh-badge ok">OK</div>';
    if (badgeClass === "badge warn") badge = '<div class="oh-badge warn">Check</div>';
    var val = count === "→"
      ? '<div class="oh-arrow" aria-hidden="true">→</div>'
      : '<div class="oh-value">' + esc(count) + "</div>";
    return (
      '<button type="button" class="oh-card" data-go="' + goTo + '">' +
      badge +
      '<div class="oh-label">' + esc(title) + "</div>" +
      val +
      '<div class="oh-meta">' + esc(sub) + "</div></button>"
    );
  }

  var asf = document.getElementById("assign-form");
  if (asf) asf.addEventListener("submit", function (e) {
    e.preventDefault();
    api("assign", { method: "POST", body: { email: $("as-email").value, listingIds: $("as-ids").value } }).then(function (out) {
      var d = out.d || {};
      $("as-msg").textContent = out.r.ok ? "Assigned " + (d.assigned || []).length + " listing(s)" + ((d.skipped || []).length ? ", skipped " + d.skipped.map(function (x) { return x.id + " (" + x.reason + ")"; }).join(", ") : "") + "." : (d.error || "Failed");
    });
  });
  function loadMakers() {
    api("makers").then(function (out) {
      var box = $("maker-list"); if (!box) return;
      var rows = (out.d && out.d.pending) || [];
      if (!rows.length) { box.innerHTML = '<p class="muted">No maker profiles waiting.</p>'; return; }
      box.innerHTML = rows.map(function (r) {
        var p = r.pending || {}, img = function (u, w) { return u && /^(data:image\/|\/makers\/media\/)/.test(u) ? '<img src="' + esc(u) + '" alt="" style="max-width:' + w + 'px;border-radius:8px">' : ""; };
        var links = [p.website].concat(Object.keys(p.socials || {}).map(function (k) { return p.socials[k]; })).filter(Boolean);
        return '<div class="item"><p><b>' + esc(p.name) + '</b> <span class="small">/makers/' + esc(r.slug) + '/</span></p>' + img(p.logo, 64) + " " + img(p.banner, 240) +
          '<p class="small" style="white-space:pre-wrap">' + esc(p.bio) + '</p><p class="small">' + links.map(esc).join("<br>") + '</p><p class="small muted">' + esc((p.screening || []).join(" ")) + "</p>" +
          '<button type="button" class="btn ok" data-mk="approve_profile" data-slug="' + esc(r.slug) + '">Approve profile</button> <button type="button" class="btn danger" data-mk="reject_profile" data-slug="' + esc(r.slug) + '">Reject</button></div>';
      }).join("");
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-mk]"); if (!b) return;
    var body = { action: b.getAttribute("data-mk"), slug: b.getAttribute("data-slug") };
    if (body.action === "reject_profile") body.reason = prompt("Optional reason shown to the maker:", "") || "";
    b.disabled = true;
    api("makers", { method: "POST", body: body }).then(function (out) { if (!out.r.ok) alert((out.d && out.d.error) || "Failed"); loadMakers(); });
  });

  function loadReports() {
    api("reports").then(function (out) {
      var box = $("report-list"); if (!box || !out.r.ok) return;
      var rows = (out.d && out.d.reports) || [];
      box.innerHTML = rows.length ? rows.map(function (r) {
        var counts = Object.keys(r.counts || {}).map(function (k) { return esc(k) + " ×" + r.counts[k]; }).join(", ");
        var notes = (r.reports || []).filter(function (x) { return x.note; }).map(function (x) { return "<li>" + esc(x.reason) + ": " + esc(x.note) + "</li>"; }).join("");
        var label = r.state === "flagged" ? "Hidden (flagged)" : r.state === "open" ? "Live, below threshold" : r.state === "removed" ? "Removed (hidden)" : "Restored";
        return '<article class="item"><strong>' + esc(r.name || r.id) + "</strong>" +
          '<div class="small">' + esc(label) + " · " + r.reporters + " reporter(s)" + (r.seed ? " · seeded listing" : "") + "</div>" +
          '<p class="small">Reasons: ' + (counts || "-") + "</p>" + (notes ? '<ul class="small">' + notes + "</ul>" : "") +
          '<p><a href="/community/p/?id=' + encodeURIComponent(r.id) + '" target="_blank" rel="noopener">Open listing ↗</a></p>' +
          '<div class="actions">' +
          (r.state !== "restored" && r.state !== "open" ? '<button type="button" class="btn ok" data-rep="restore" data-id="' + esc(r.id) + '">Restore</button>' : "") +
          (r.state !== "removed" ? '<button type="button" class="btn danger" data-rep="remove" data-id="' + esc(r.id) + '">Remove</button>' : "") +
          '<button type="button" class="btn ghost" data-rep="dismiss" data-id="' + esc(r.id) + '">Clear reports</button></div></article>';
      }).join("") : '<p class="muted">No reports.</p>';
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-rep]"); if (!b) return;
    var act = b.getAttribute("data-rep");
    if (act === "remove" && !confirm("Remove keeps this listing hidden for good (data is kept, nothing deleted). Continue?")) return;
    b.disabled = true;
    api("reports", { method: "POST", body: { action: act, id: b.getAttribute("data-id") } }).then(function (out) { if (!out.r.ok) alert((out.d && out.d.error) || "Failed"); loadReports(); });
  });

  function loadQueue(tab) {
    document.querySelectorAll("#view-queue .tabs button").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-tab") === tab);
    });
    api("queue?tab=" + encodeURIComponent(tab)).then(function (out) {
      if (!out.r.ok) { go("login"); return; }
      var rows = tab === "all" ? out.d.listings || [] : out.d.pending || [];
      var box = $("queue-list");
      if (!rows.length) {
        box.innerHTML = '<p class="muted">Nothing here right now.</p>';
        return;
      }
      box.innerHTML = rows.map(function (row) {
        var img = row.imageUrl && String(row.imageUrl).indexOf("http") === 0
          ? '<img class="thumb" src="' + esc(row.imageUrl) + '" alt="" loading="lazy">'
          : row.imageUrl && String(row.imageUrl).indexOf("data:image") === 0
          ? '<img class="thumb" src="' + esc(row.imageUrl) + '" alt="" loading="lazy">'
          : "";
        var reasons = (row.screening && row.screening.reasons) || [];
        var pv = row.pendingVideo && row.pendingVideo.url;
        var vm = /^upload:(v_[A-Za-z0-9_-]+)$/.exec(pv || row.videoUrl || "");
        var vidSrc = pv || row.videoUrl || "";
        var vidHref = vm ? "/api/community/video?v=" + vm[1] : /^https:\/\//.test(vidSrc) ? vidSrc : "";
        var videoHtml = vidHref ? '<p class="small">Video' + (pv ? " (new, needs review — listing stays live)" : " (approved)") + ': <a href="' + esc(vidHref) + '" target="_blank" rel="noopener">watch</a></p>' : "";
        var reasonHtml = reasons.length
          ? '<p class="small">Why it’s here: ' + esc(reasons.join("; ")) + "</p>"
          : "";
        var rv = row.pendingRevision && row.status !== "pending" ? row.pendingRevision.fields || {} : null;
        if (rv) {
          var ch = [];
          [["name", "Title"], ["pitchShort", "Tagline"], ["descriptionLong", "Description"], ["projectUrl", "URL"], ["tags", "Tags"], ["imageUrl", "Image"], ["videoUrl", "Video"]].forEach(function (p) {
            if (rv[p[0]] === undefined) return;
            var nv = Array.isArray(rv[p[0]]) ? rv[p[0]].join(", ") : String(rv[p[0]] || "");
            var ov = Array.isArray(row[p[0]]) ? row[p[0]].join(", ") : String(row[p[0]] || "");
            if (nv === ov) return;
            var show = /^data:/.test(nv) ? "(new uploaded image)" : nv || "(removed)";
            ch.push('<li><b>' + p[1] + ':</b> ' + esc(show.length > 300 ? show.slice(0, 300) + "…" : show) + "</li>");
          });
          reasonHtml += '<div class="small rev"><p><b>API edit waiting</b>: the approved version stays live until you approve.</p><ul>' + (ch.join("") || "<li>No visible changes</li>") + "</ul></div>";
        }
        var actions =
          tab === "pending" && rv
            ? '<div class="actions">' +
              '<button type="button" class="btn ok" data-act="approve_revision" data-id="' + esc(row.id) + '">Approve edit</button>' +
              '<button type="button" class="btn danger" data-act="reject_revision" data-id="' + esc(row.id) + '">Reject edit</button>' +
              (pv ? '<button type="button" class="btn ok" data-act="approve_video" data-id="' + esc(row.id) + '">Approve video</button><button type="button" class="btn danger" data-act="reject_video" data-id="' + esc(row.id) + '">Reject video</button>' : "") +
              "</div>"
          : tab === "pending" && pv && row.status !== "pending"
            ? '<div class="actions">' +
              '<button type="button" class="btn ok" data-act="approve_video" data-id="' + esc(row.id) + '">Approve video</button>' +
              '<button type="button" class="btn danger" data-act="reject_video" data-id="' + esc(row.id) + '">Reject video</button>' +
              "</div>"
          : tab === "pending"
            ? '<div class="actions">' +
              '<button type="button" class="btn ok" data-act="approve" data-id="' + esc(row.id) + '">Approve</button>' +
              '<button type="button" class="btn danger" data-act="reject" data-id="' + esc(row.id) + '">Reject</button>' +
              "</div>"
            : '<div class="actions">' +
              (row.status === "approved"
                ? '<button type="button" class="btn ghost" data-act="unpublish" data-id="' + esc(row.id) + '">Unpublish</button>'
                : "") +
              '<button type="button" class="btn danger" data-act="delete" data-id="' + esc(row.id) + '">Delete</button>' +
              '<span class="small">' + esc(row.status || "") + "</span></div>";
        return (
          '<article class="item" data-id="' + esc(row.id) + '">' +
          img +
          "<strong>" + esc(row.name || row.id) + "</strong>" +
          '<div class="small">' + esc(row.makerName || "") + " · " + esc(row.category || "") + "</div>" +
          '<p class="small">' + esc(row.pitchShort || "") + "</p>" +
          (row.projectUrl
            ? '<p><a href="' + esc(row.projectUrl) + '" target="_blank" rel="noopener">Open project ↗</a></p>'
            : "") +
          reasonHtml + videoHtml +
          actions +
          "</article>"
        );
      }).join("");
    });
  }

  function loadContacts(q) {
    api("contacts?q=" + encodeURIComponent(q || "")).then(function (out) {
      if (!out.r.ok) { go("login"); return; }
      var rows = out.d.contacts || [];
      $("contact-list").innerHTML = rows.length
        ? rows.map(function (r) {
            return (
              '<div class="item"><strong>' + esc(r.name || "—") + "</strong>" +
              '<div class="small">' + esc(r.email) + "</div>" +
              '<div class="small">' + (r.listingIds || []).length + " listing(s) · source " + esc(r.source || "") + "</div></div>"
            );
          }).join("")
        : '<p class="muted">No contacts yet.</p>';
    });
  }

  function loadSupport(status) {
    document.querySelectorAll("#view-support .tabs button").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-sup") === status);
    });
    api("support?status=" + encodeURIComponent(status)).then(function (out) {
      if (!out.r.ok) { go("login"); return; }
      var rows = out.d.messages || [];
      $("support-list").innerHTML = rows.length
        ? rows.map(function (m) {
            return (
              '<article class="item">' +
              (m.product ? '<span class="badge">' + esc(m.product) + "</span> " : "") +
              "<strong>" + esc(m.subject) + "</strong>" +
              '<div class="small">' + esc(m.source || "marketplace") + (m.kind ? " · " + esc(m.kind) : "") + " · " + esc(new Date(m.createdAt || 0).toLocaleString()) +
              (m.replyTo ? " · " + esc(m.replyTo) : "") +
              "</div>" +
              "<p>" + esc(m.message) + "</p>" +
              (status === "open"
                ? '<div class="actions"><button type="button" class="btn ok" data-sup-done="' + esc(m.id) + '">Mark done</button></div>'
                : '<div class="small">Done</div>') +
              "</article>"
            );
          }).join("")
        : '<p class="muted">No messages.</p>';
    });
  }

  var AN_KEY = "du_owner_stats_view";
  var anView = (function () { try { return (function (v) { return v === "market" || v === "health" || v === "live" ? v : "store"; })(localStorage.getItem(AN_KEY)); } catch (_) { return "store"; } })();
  var anSeq = 0;
  function fmt(n) { n = n || 0; return n >= 10000 ? (Math.round(n / 100) / 10) + "k" : String(n); }
  function sum(arr, k, from) { var t = 0; for (var i = from || 0; i < arr.length; i++) t += arr[i][k] || 0; return t; }
  function delta(chart, k) {
    var n = chart.length, a = 0, b = 0;
    for (var i = 0; i < n; i++) { if (i >= n - 7) a += chart[i][k] || 0; else if (i >= n - 14) b += chart[i][k] || 0; }
    if (!b) return a ? '<span class="d up">new</span>' : '<span class="d">–</span>';
    var p = Math.round(((a - b) / b) * 100);
    return '<span class="d ' + (p >= 0 ? "up" : "down") + '">' + (p >= 0 ? "▲" : "▼") + Math.abs(p) + "%</span>";
  }
  function kpi(label, val, d) { return '<div class="kpi"><span class="kl">' + esc(label) + '</span><strong>' + esc(val) + "</strong>" + (d || "") + "</div>"; }
  function drawChart(chart, series) {
    var max = 1;
    chart.forEach(function (d) { series.forEach(function (s) { if ((d[s.k] || 0) > max) max = d[s.k]; }); });
    $("an-legend").innerHTML = series.map(function (s) { return '<span><i class="sw ' + s.cls + '"></i>' + esc(s.label) + "</span>"; }).join("");
    $("an-chart").innerHTML = chart.map(function (d) {
      return '<div class="col" title="' + esc(d.d) + ": " + series.map(function (s) { return (d[s.k] || 0) + " " + s.label.toLowerCase(); }).join(", ") + '">' +
        series.map(function (s) { return '<i class="' + s.cls + '" style="height:' + Math.max(d[s.k] ? 3 : 1, Math.round(((d[s.k] || 0) / max) * 100)) + '%"></i>'; }).join("") + "</div>";
    }).join("");
    $("an-chart").setAttribute("aria-label", "Daily " + series.map(function (s) { return s.label; }).join(" and ") + ", last 30 days");
    function lab(d) { return d && d.d && d.d.length === 8 ? d.d.slice(4, 6) + "/" + d.d.slice(6) : ""; }
    $("an-axis").innerHTML = "<span>" + lab(chart[0]) + "</span><span>" + lab(chart[Math.floor(chart.length / 2)]) + "</span><span>Today</span>";
  }
  function listCard(title, rows, unit, empty) {
    var max = rows.length ? rows[0].v : 1;
    return '<div class="an-card"><h2>' + esc(title) + "</h2>" + (rows.length ? rows.map(function (r) {
      return '<div class="bar-row"><div class="bar-top"><span class="bk">' + esc(r.k) + '</span><span class="bv">' + fmt(r.v) + (unit ? " " + unit : "") + '</span></div><div class="bar"><i style="width:' + Math.max(2, Math.round((r.v / max) * 100)) + '%"></i></div></div>';
    }).join("") : '<p class="muted small">' + esc(empty) + "</p>") + "</div>";
  }
  function pageName(p) {
    if (p === "/store/" || p === "/store") return "Store home";
    var m = /^\/store\/p\/([^/]+)\/?$/.exec(p);
    if (m) return m[1].replace(/-/g, " ").replace(/\b\w/g, function (x) { return x.toUpperCase(); }) + " (product page)";
    return p;
  }
  function pageLink(p) { return /^\/[\w\-./]*$/.test(p) ? '<a href="' + esc(p) + '" target="_blank" rel="noopener">' + esc(pageName(p)) + "</a>" : esc(pageName(p)); }
  function leaveCard(rows, bh) {
    var max = 1; rows.forEach(function (r) { if (r.exits > max) max = r.exits; });
    return '<div class="an-card"><h2>Where people leave</h2><p class="muted small an-help">The page people were on when they left the site, most exits first. Exit rate is the share of that page\'s views that ended the visit. "Left without clicking" means they left without clicking through to a product.</p>' +
      (rows.length ? rows.map(function (r) {
        return '<div class="bar-row"><div class="bar-top"><span class="bk">' + pageLink(r.k) + '</span><span class="bv">' + fmt(r.exits) + " exits · " + r.rate + '%</span></div>' +
          '<div class="bar"><i style="width:' + Math.max(2, Math.round((r.exits / max) * 100)) + '%"></i></div>' +
          '<div class="muted small">' + fmt(r.views) + " views · " + fmt(r.quiet) + " left without clicking · " + fmt(r.exits - r.quiet) + " left after clicking a product</div></div>";
      }).join("") : '<p class="muted small">No exits recorded yet. This fills in as people visit the store.</p>') + "</div>";
  }
  function bounceCard(rows) {
    return '<div class="an-card"><h2>Bounce rate by landing page</h2><p class="muted small an-help">The first page of each visit, and how often people left from it without opening a second page.</p>' +
      (rows.length ? rows.map(function (r) {
        return '<div class="bar-row"><div class="bar-top"><span class="bk">' + pageLink(r.k) + '</span><span class="bv">' + r.rate + "% bounce</span></div>" +
          '<div class="bar"><i style="width:' + Math.max(2, Math.round(r.rate)) + '%"></i></div>' +
          '<div class="muted small">' + fmt(r.visits) + " visits landed here · " + fmt(r.bounces) + " bounced</div></div>";
      }).join("") : '<p class="muted small">No visits recorded yet.</p>') + "</div>";
  }
  function setAnTabs() {
    document.querySelectorAll("[data-an]").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-an") === anView ? "true" : "false"); });
  }

  var liveTimer = null, liveOpen = {};
  var KZ_NAMES = { hub: "Kerzy Labs hub", "stack-attack-arena": "Stack Attack Arena", "quad-pong": "Quad Pong", cyberarena: "CyberArena 3D", "rival-lanes": "Rival Lanes", "neon-bastion": "Rival Lanes" };
  function appLabel(id) {
    if (id.indexOf("kz-") === 0) { var k = id.slice(3); return KZ_NAMES[k] || k; }
    return id === "home" ? "Homepage" : id.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function liveSection(title, apps, empty) {
    var n = 0; apps.forEach(function (a) { n += a.count; });
    return '<div class="an-card"><h2>' + esc(title) + ' <span class="pill">' + n + ' online</span></h2>' + (apps.length ? apps.map(function (a) {
      var open = liveOpen[a.appId];
      return '<div class="lrow" data-live-app="' + esc(a.appId) + '" style="cursor:pointer;display:block"><div style="display:flex;justify-content:space-between"><strong>' + (open ? "▾ " : "▸ ") + esc(appLabel(a.appId)) + '</strong><span><b>' + a.count + '</b> online</span></div>' +
        (open ? a.sessions.map(function (s) { return '<div class="muted small" style="padding-left:16px">#' + esc(s.id) + " · " + esc(s.path) + " · " + s.agoS + "s ago" + (s.ua ? " · ua " + esc(s.ua) : "") + "</div>"; }).join("") : "") + "</div>";
    }).join("") : '<p class="muted small">' + empty + "</p>") + "</div>";
  }
  function loadLive(seq) {
    api("presence").then(function (out) {
      if (seq !== anSeq) return;
      if (!out.r.ok) { if (out.r.status === 401) go("login"); return; }
      var d = out.d, apps = d.apps || [];
      var du = apps.filter(function (a) { return a.appId.indexOf("kz-") !== 0; }), kz = apps.filter(function (a) { return a.appId.indexOf("kz-") === 0; });
      var dn = 0, kn = 0; du.forEach(function (a) { dn += a.count; }); kz.forEach(function (a) { kn += a.count; });
      $("an-sub").textContent = "Online now · updated " + new Date(d.generatedAt).toLocaleTimeString() + " · refreshes every 20s";
      $("an-kpis").innerHTML = kpi("Online now", fmt(d.online), '<span class="d">active in last 3 min</span>') + kpi("Digital Underground", fmt(dn), '<span class="d">' + du.length + " apps</span>") + kpi("Kerzy Labs", fmt(kn), '<span class="d">' + kz.length + " games</span>");
      $("an-lists").innerHTML = liveSection("Digital Underground", du, "Nobody on Digital Underground right now.") + liveSection("Kerzy Labs", kz, "Nobody playing Kerzy Labs games right now.");
      $("an-note").textContent = "Anonymous random session ids (no names, emails, IPs or cookies). A session counts as online for 3 minutes after its last heartbeat; tap an app to see sessions.";
    });
  }
  document.addEventListener("click", function (e) {
    var r = e.target.closest && e.target.closest("[data-live-app]");
    if (!r) return; var id = r.getAttribute("data-live-app"); liveOpen[id] = !liveOpen[id]; loadLive(anSeq);
  });
  function loadAnalytics() {
    setAnTabs();
    var seq = ++anSeq;
    $("an-kpis").innerHTML = '<div class="kpi sk"></div><div class="kpi sk"></div><div class="kpi sk"></div><div class="kpi sk"></div>' + (anView === "store" ? '<div class="kpi sk"></div>' : "");
    $("an-lists").innerHTML = ""; $("an-note").textContent = "";
    $("an-chart").parentNode.hidden = anView === "health" || anView === "live";
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    if (anView === "health") { loadHealth(seq); return; }
    if (anView === "live") { loadLive(seq); liveTimer = setInterval(function () { if (anView !== "live" || $("view-analytics").offsetParent === null) { clearInterval(liveTimer); liveTimer = null; return; } if (document.visibilityState === "visible") loadLive(anSeq); }, 20000); return; }
    if (anView === "store") {
      api("storestats").then(function (out) {
        if (seq !== anSeq) return;
        if (!out.r.ok) { if (out.r.status === 401) go("login"); return; }
        var d = out.d, c = d.chart || [], pv = sum(c, "pv"), ss = sum(c, "s"), cl = sum(c, "c");
        $("an-sub").textContent = "digitalundergroundstore.com · last 30 days";
        var bh = d.behaviour || {};
        $("an-kpis").innerHTML = kpi("Page views", fmt(pv), delta(c, "pv")) + kpi("Visits", fmt(ss), delta(c, "s")) +
          kpi("Bounce rate", bh.visits ? bh.bounceRate + "%" : "–", '<span class="d">' + (bh.visits ? fmt(bh.bounces) + " of " + fmt(bh.visits) + " visits left after 1 page" : "collecting data") + "</span>") +
          kpi("Product clicks", fmt(cl), delta(c, "c")) + kpi("Click rate", (ss ? Math.round((cl / ss) * 1000) / 10 : 0) + "%", '<span class="d">per visit</span>');
        drawChart(c, [{ k: "pv", label: "Views", cls: "s1" }, { k: "c", label: "Clicks", cls: "s2" }]);
        var dv = d.dev || {}, dt = (dv.m || 0) + (dv.d || 0);
        $("an-lists").innerHTML = leaveCard(d.exitPages || [], bh) + bounceCard(d.landPages || []) + listCard("Top products clicked", d.clicks || [], "", "No product clicks yet.") +
          listCard("Referrers", d.refs || [], "", "No visits yet.") +
          listCard("Devices", dt ? [{ k: "Phone", v: dv.m || 0 }, { k: "Desktop / tablet", v: dv.d || 0 }].sort(function (a, b) { return b.v - a.v; }) : [], "", "No visits yet.") +
          listCard("Pages", d.pages || [], "", "No visits yet.");
        $("an-note").textContent = "First-party, cookie-free counts. Tracking started when this was deployed; bots excluded. Bounce and exit tracking started Oct 22, 2026, so those numbers cover visits since then. A bounce is a visit that left the site from the first page it opened (going back with the browser's Back button can count as leaving).";
      });
    } else {
      api("analytics").then(function (out) {
        if (seq !== anSeq) return;
        if (!out.r.ok) { if (out.r.status === 401) go("login"); return; }
        var c = out.d.chart || [], rows = (out.d.listings || []).slice();
        var im = 0, v = 0, cl = 0; rows.forEach(function (L) { im += L.impressions || 0; v += L.views || 0; cl += L.clicks || 0; });
        $("an-sub").textContent = rows.length + " listings · last 30 days";
        $("an-kpis").innerHTML = kpi("Impressions", fmt(im), delta(c, "i")) + kpi("Views", fmt(v), delta(c, "v")) +
          kpi("Clicks", fmt(cl), delta(c, "c")) + kpi("CTR", (v ? Math.round((cl / v) * 1000) / 10 : 0) + "%", '<span class="d">clicks / views</span>');
        drawChart(c, [{ k: "v", label: "Views", cls: "s1" }, { k: "c", label: "Clicks", cls: "s2" }]);
        rows.sort(function (a, b) { return (b.views + b.impressions) - (a.views + a.impressions); });
        $("an-lists").innerHTML = '<div class="an-card"><h2>Per listing</h2>' + (rows.length ? rows.map(function (L) {
          return '<div class="lrow"><div class="lname"><strong>' + esc(L.name) + "</strong>" + (L.status !== "approved" ? '<span class="pill">' + esc(L.status) + "</span>" : "") + '</div><div class="lnums">' +
            "<span><b>" + fmt(L.impressions) + "</b>impr.</span><span><b>" + fmt(L.views) + "</b>views</span><span><b>" + fmt(L.clicks) + "</b>clicks</span><span><b>" + L.ctr + "%</b>CTR</span></div></div>";
        }).join("") : '<p class="muted small">No listings yet.</p>') + "</div>";
      });
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-an]");
    if (!b) return;
    var v = b.getAttribute("data-an");
    if (v === anView) return;
    anView = v;
    try { localStorage.setItem(AN_KEY, v); } catch (_) {}
    loadAnalytics();
  });

  document.addEventListener("click", function (e) {
    var hg = e.target.closest && e.target.closest("[data-an-go]");
    if (hg) { anView = hg.getAttribute("data-an-go"); try { localStorage.setItem(AN_KEY, anView); } catch (_) {} }
  }, true);

  function loadKeys() {
    api("apikeys").then(function (out) {
      if (!out.r.ok) { if (out.r.status === 401) go("login"); return; }
      var keys = out.d.keys || [];
      $("apikeys-list").innerHTML = keys.length ? keys.map(function (k) {
        return '<div class="item"><strong>' + esc(k.label) + '</strong>' +
          '<div class="stat-row"><span>Key</span><span>duk_…' + esc(k.last4) + "</span></div>" +
          '<div class="stat-row"><span>Creator</span><span>' + esc(k.creatorId) + "</span></div>" +
          '<div class="stat-row"><span>Created</span><span>' + esc(new Date(k.createdAt).toLocaleString()) + "</span></div>" +
          '<button type="button" class="btn danger" data-revoke-key="' + esc(k.id) + '">Revoke</button></div>';
      }).join("") : '<p class="muted">No API keys yet.</p>';
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-revoke-key]");
    if (!b || !confirm("Revoke this API key? Anything using it stops working.")) return;
    b.disabled = true;
    api("apikeys", { method: "POST", body: { keyId: b.getAttribute("data-revoke-key") } }).then(function () { loadKeys(); });
  });

  function loadBackups() {
    api("backups").then(function (out) {
      var snaps = (out.d && out.d.snapshots) || [];
      var last = snaps.length ? snaps[snaps.length - 1].date : null;
      $("backup-meta").textContent = last
        ? "Latest snapshot: " + last + " (" + snaps.length + " kept)"
        : "No snapshots found yet.";
      $("backup-list").innerHTML = snaps
        .slice()
        .reverse()
        .map(function (s) {
          return '<div class="item"><strong>' + esc(s.date) + '</strong><div class="small">' + esc(s.key) + "</div></div>";
        })
        .join("") || '<p class="muted">Empty.</p>';
    });
  }

  // Events
  $("login-btn").addEventListener("click", function () {
    var pass = $("passcode").value;
    var btn = $("login-btn");
    btn.disabled = true;
    api("login", { method: "POST", body: { passcode: pass } }).then(function (out) {
      btn.disabled = false;
      if (!out.r.ok) {
        showMsg($("login-msg"), (out.d && out.d.error) || "Sign-in failed.", false);
        return;
      }
      $("passcode").value = "";
      go("home");
    }).catch(function () {
      btn.disabled = false;
      showMsg($("login-msg"), "Network error.", false);
    });
  });
  $("passcode").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("login-btn").click();
  });
  $("logout-btn").addEventListener("click", function () {
    api("logout", { method: "POST" }).then(function () { go("login"); });
  });

  document.body.addEventListener("click", function (e) {
    var goBtn = e.target.closest("[data-go]");
    if (goBtn && goBtn.getAttribute("data-go")) {
      go(goBtn.getAttribute("data-go"));
      return;
    }
    var tab = e.target.closest("#view-queue [data-tab]");
    if (tab) { loadQueue(tab.getAttribute("data-tab")); return; }
    var sup = e.target.closest("#view-support [data-sup]");
    if (sup && !sup.getAttribute("data-sup-done")) {
      loadSupport(sup.getAttribute("data-sup"));
      return;
    }
    var done = e.target.closest("[data-sup-done]");
    if (done) {
      api("support", { method: "POST", body: { action: "done", id: done.getAttribute("data-sup-done") } })
        .then(function () { loadSupport("open"); });
      return;
    }
    var act = e.target.closest("[data-act]");
    if (act) {
      var action = act.getAttribute("data-act");
      var id = act.getAttribute("data-id");
      var body = { action: action, id: id };
      if (action === "reject_revision" && !confirm("Discard this API edit? The live listing stays as it is.")) return;
      if (action === "reject_video" && !confirm("Reject this video? The listing stays live with its current media.")) return;
      if (action === "reject") {
        var reason = prompt("Optional reject reason (makers may see this later):", "") || "";
        body.reason = reason;
      }
      if (action === "delete" && !confirm("Delete this listing permanently?")) return;
      act.disabled = true;
      api("queue", { method: "POST", body: body }).then(function (out) {
        act.disabled = false;
        if (!out.r.ok) { alert((out.d && out.d.error) || "Failed"); return; }
        var tabBtn = document.querySelector("#view-queue .tabs button.is-on");
        loadQueue(tabBtn ? tabBtn.getAttribute("data-tab") : "pending");
      });
    }
  });

  var qTimer;
  $("contact-q").addEventListener("input", function () {
    clearTimeout(qTimer);
    var v = $("contact-q").value;
    qTimer = setTimeout(function () { loadContacts(v); }, 200);
  });

  $("backup-now").addEventListener("click", function () {
    var btn = $("backup-now");
    btn.disabled = true;
    btn.textContent = "Backing up…";
    api("backups", { method: "POST", body: { email: false } }).then(function (out) {
      btn.disabled = false;
      btn.textContent = "Back up now";
      if (!out.r.ok) { alert((out.d && out.d.error) || "Backup failed"); return; }
      alert("Backup saved" + (out.d.date ? ": " + out.d.date : ""));
      loadBackups();
    });
  });

  // Boot
  api("me").then(function (out) {
    if (out.r.ok) go("home");
    else go("login");
  }).catch(function () { go("login"); });
})();
