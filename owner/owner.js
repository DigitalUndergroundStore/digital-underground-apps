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
    ["login", "home", "queue", "contacts", "support", "analytics", "backups", "links"].forEach(function (v) {
      var el = $("view-" + v);
      if (!el) return;
      if (v === "login") el.classList.toggle("hidden", name !== "login");
      else el.classList.toggle("is-on", name === v);
    });
    $("logout-btn").hidden = name === "login";
    if (name === "home") loadHome();
    if (name === "queue") loadQueue("pending");
    if (name === "contacts") loadContacts("");
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
        card("queue", "Review queue", pending, pending ? pending + " waiting" : "All clear", pending ? "badge" : "badge ok") +
        card("support", "Support inbox", support, support ? "Needs a reply" : "Inbox zero", support ? "badge" : "badge ok") +
        card("contacts", "Contacts", out.d.contactsTotal || 0, "+" + (t.contacts || 0) + " today", "") +
        card("analytics", "Analytics", (w.views || 0), (w.clicks || 0) + " clicks · 7 days", "") +
        card("backups", "Backups", backup.lastSnapshot || "—", backup.ok ? "Latest snapshot" : "Check backup", backup.ok ? "badge ok" : "badge warn") +
        card("apikeys", "API keys", "→", "Creator API access", "") +
        card("links", "Quick links", "→", "Gumroad, Cloudflare, X…", "");
      $("home-today").innerHTML =
        '<div class="item" style="margin-top:14px"><strong>Today</strong>' +
        '<div class="stat-row"><span>Views</span><span>' + (t.views || 0) + "</span></div>" +
        '<div class="stat-row"><span>Clicks</span><span>' + (t.clicks || 0) + "</span></div>" +
        '<div class="stat-row"><span>New submissions</span><span>' + (t.submissions || 0) + "</span></div>" +
        '<div class="stat-row"><span>New contacts</span><span>' + (t.contacts || 0) + "</span></div>" +
        '<div class="stat-row"><span>Support messages</span><span>' + (t.support || 0) + "</span></div>" +
        '<p class="small" style="margin:10px 0 0">Last 7 days: ' +
        (w.views || 0) + " views · " + (w.clicks || 0) + " clicks · " +
        (w.submissions || 0) + " submissions · " + (w.contacts || 0) + " contacts</p></div>";
    });
  }

  function card(goTo, title, count, sub, badgeClass) {
    var badge = "";
    if (badgeClass === "badge" && count) badge = '<span class="badge">' + esc(count) + " need you</span>";
    if (badgeClass === "badge ok") badge = '<span class="badge ok">OK</span>';
    if (badgeClass === "badge warn") badge = '<span class="badge warn">Check</span>';
    return (
      '<button type="button" class="nav-card" data-go="' + goTo + '">' +
      badge +
      "<strong>" + esc(title) + "</strong>" +
      '<span class="count">' + esc(count) + "</span>" +
      '<span class="sub">' + esc(sub) + "</span></button>"
    );
  }

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
              "<strong>" + esc(m.subject) + "</strong>" +
              '<div class="small">' + esc(m.listingName || "No listing") +
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
  var anView = (function () { try { return localStorage.getItem(AN_KEY) === "market" ? "market" : "store"; } catch (_) { return "store"; } })();
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
  function setAnTabs() {
    document.querySelectorAll("[data-an]").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-an") === anView ? "true" : "false"); });
  }
  function loadAnalytics() {
    setAnTabs();
    var seq = ++anSeq;
    $("an-kpis").innerHTML = '<div class="kpi sk"></div><div class="kpi sk"></div><div class="kpi sk"></div><div class="kpi sk"></div>';
    $("an-lists").innerHTML = ""; $("an-note").textContent = "";
    if (anView === "store") {
      api("storestats").then(function (out) {
        if (seq !== anSeq) return;
        if (!out.r.ok) { if (out.r.status === 401) go("login"); return; }
        var d = out.d, c = d.chart || [], pv = sum(c, "pv"), ss = sum(c, "s"), cl = sum(c, "c");
        $("an-sub").textContent = "digitalundergroundstore.com · last 30 days";
        $("an-kpis").innerHTML = kpi("Page views", fmt(pv), delta(c, "pv")) + kpi("Visits", fmt(ss), delta(c, "s")) +
          kpi("Product clicks", fmt(cl), delta(c, "c")) + kpi("Click rate", (ss ? Math.round((cl / ss) * 1000) / 10 : 0) + "%", '<span class="d">per visit</span>');
        drawChart(c, [{ k: "pv", label: "Views", cls: "s1" }, { k: "c", label: "Clicks", cls: "s2" }]);
        var dv = d.dev || {}, dt = (dv.m || 0) + (dv.d || 0);
        $("an-lists").innerHTML = listCard("Top products clicked", d.clicks || [], "", "No product clicks yet.") +
          listCard("Referrers", d.refs || [], "", "No visits yet.") +
          listCard("Devices", dt ? [{ k: "Phone", v: dv.m || 0 }, { k: "Desktop / tablet", v: dv.d || 0 }].sort(function (a, b) { return b.v - a.v; }) : [], "", "No visits yet.") +
          listCard("Pages", d.pages || [], "", "No visits yet.");
        $("an-note").textContent = "First-party, cookie-free counts. Tracking started when this was deployed; bots excluded.";
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
