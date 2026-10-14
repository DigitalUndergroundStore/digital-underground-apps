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
        var reasonHtml = reasons.length
          ? '<p class="small">Why it’s here: ' + esc(reasons.join("; ")) + "</p>"
          : "";
        var actions =
          tab === "pending"
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
          reasonHtml +
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

  function loadAnalytics() {
    api("analytics").then(function (out) {
      if (!out.r.ok) { go("login"); return; }
      var chart = out.d.chart || [];
      var max = 1;
      chart.forEach(function (d) { if ((d.v || 0) > max) max = d.v; });
      $("chart").innerHTML = chart
        .map(function (d) {
          var h = Math.max(2, Math.round(((d.v || 0) / max) * 100));
          return "<i style=\"height:" + h + '%" title="' + esc(d.d) + ": " + (d.v || 0) + ' views"></i>';
        })
        .join("");
      var rows = out.d.listings || [];
      $("analytics-list").innerHTML = rows.length
        ? rows.map(function (L) {
            return (
              '<div class="item"><strong>' + esc(L.name) + "</strong>" +
              '<div class="stat-row"><span>Views</span><span>' + L.views + "</span></div>" +
              '<div class="stat-row"><span>Clicks</span><span>' + L.clicks + "</span></div>" +
              '<div class="stat-row"><span>CTR</span><span>' + L.ctr + "%</span></div></div>"
            );
          }).join("")
        : '<p class="muted">No listing traffic yet.</p>';
    });
  }

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
