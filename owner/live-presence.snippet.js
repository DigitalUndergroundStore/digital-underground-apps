/**
 * PASTE into the LIVE owner/owner.js, replacing the block that starts at
 * `function setAnTabs()` and ends at the `[data-live-app]` click listener
 * (the listener just before `function loadAnalytics()`).
 *
 * Do not replace the live owner/owner.js with this repo's owner/owner.js.
 * This fragment expects the live helpers already in that file:
 * $, esc, api, kpi, fmt, go, anSeq, anView.
 *
 * The repo's owner/owner.js has a matching Live panel for this git tree,
 * which is not the live dashboard.
 */
  function setAnTabs() {
    document.querySelectorAll("[data-an]").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-an") === anView ? "true" : "false"); });
  }

  var liveTimer = null, liveOpen = {}, liveVisitorOpen = {};
  var KZ_NAMES = { hub: "Kerzy Labs hub", "stack-attack-arena": "Stack Attack Arena", "quad-pong": "Quad Pong", cyberarena: "CyberArena 3D", "rival-lanes": "Rival Lanes", "neon-bastion": "Rival Lanes" };
  function appLabel(id) {
    if (id.indexOf("kz-") === 0) { var k = id.slice(3); return KZ_NAMES[k] || k; }
    return id === "home" ? "Homepage" : id.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function uniqVisitors(apps) {
    var seen = Object.create(null), n = 0;
    (apps || []).forEach(function (a) {
      var list = a.visitors || [];
      if (!list.length) { n += a.count || 0; return; }
      list.forEach(function (v, i) {
        var k = v.visitorKey || ("tab:" + ((v.sessions && v.sessions[0] && v.sessions[0].id) || i));
        if (!seen[k]) { seen[k] = 1; n++; }
      });
    });
    return n;
  }
  function peopleOf(a) {
    if (a.visitors && a.visitors.length) return a.visitors;
    return (a.sessions || []).map(function (s) {
      return { visitorKey: "", label: "Visitor", agoS: s.agoS, currentPath: s.path, sessions: [s], pages: [s.path] };
    });
  }
  function fmtWhen(ts) {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString(); } catch (e) { return "—"; }
  }
  function visitorCard(appId, v) {
    var key = appId + ":" + (v.visitorKey || (v.sessions && v.sessions[0] && v.sessions[0].id) || "x");
    var open = !!liveVisitorOpen[key];
    var status = v.status === "returning" ? "Returning" : v.status === "new" ? "New today" : "";
    var tabs = (v.sessions || []).length;
    var where = v.currentPath || (v.sessions && v.sessions[0] && v.sessions[0].path) || "/";
    var head = '<div data-live-visitor="' + esc(key) + '" style="cursor:pointer;padding:8px 0 4px 16px">' +
      '<div style="display:flex;justify-content:space-between;gap:8px"><strong>' + (open ? "▾ " : "▸ ") + esc(v.label || "Visitor") + "</strong>" +
      '<span class="muted small">' + (v.agoS != null ? v.agoS + "s ago" : "") + "</span></div>" +
      '<div class="muted small">' + esc(where) +
      (status ? " · " + esc(status) : "") +
      (tabs > 1 ? " · " + tabs + " tabs" : "") +
      (v.ipShort ? " · IP " + esc(v.ipShort) : "") + "</div></div>";
    if (!open) return head;
    var geo = [v.country, v.region, v.city].filter(Boolean).join(" · ");
    var device = [v.device, v.os, v.browser].filter(Boolean).join(" · ");
    var net = (v.asn ? "AS" + esc(String(v.asn)) : "") + (v.org ? (v.asn ? " · " : "") + esc(v.org) : "");
    var pages = (v.pages || []).map(function (p) { return esc(p); }).join(" · ");
    var sessions = (v.sessions || []).map(function (s) {
      return '<div class="muted small" style="padding-left:32px">Tab ' + esc(s.id) + " · " + esc(s.path) + " · " + s.agoS + "s ago</div>";
    }).join("");
    return head + '<div class="muted small" style="padding:0 0 8px 32px">' +
      (geo ? "<div>" + esc(geo) + "</div>" : "") +
      (device ? "<div>" + esc(device) + "</div>" : "") +
      (net ? "<div>" + net + "</div>" : "") +
      "<div>First seen " + esc(fmtWhen(v.firstSeen)) + " · last seen " + esc(fmtWhen(v.lastSeen)) + "</div>" +
      (v.referrer ? "<div>Referrer " + esc(v.referrer) + "</div>" : "") +
      (pages ? "<div>Pages " + pages + "</div>" : "") +
      (v.visitorKey ? "<div>Visitor key " + esc(v.visitorKey) + "</div>" : "<div>No stable network key on this session</div>") +
      (v.ip ? "<div>Owner-private IP " + esc(v.ip) + (v.ipShort ? " · shown as " + esc(v.ipShort) : "") + "</div>" : "") +
      sessions + "</div>";
  }
  function liveSection(title, apps, empty) {
    var n = uniqVisitors(apps);
    return '<div class="an-card"><h2>' + esc(title) + ' <span class="pill">' + n + " online</span></h2>" + (apps.length ? apps.map(function (a) {
      var open = liveOpen[a.appId];
      return '<div class="lrow" style="display:block"><div data-live-app="' + esc(a.appId) + '" style="cursor:pointer;display:flex;justify-content:space-between"><strong>' + (open ? "▾ " : "▸ ") + esc(appLabel(a.appId)) + '</strong><span><b>' + a.count + "</b> online</span></div>" +
        (open ? peopleOf(a).map(function (v) { return visitorCard(a.appId, v); }).join("") : "") + "</div>";
    }).join("") : '<p class="muted small">' + empty + "</p>") + "</div>";
  }
  function loadLive(seq) {
    api("presence").then(function (out) {
      if (seq !== anSeq) return;
      if (!out.r.ok) { if (out.r.status === 401) go("login"); return; }
      var d = out.d || {}, apps = d.apps || [];
      var du = apps.filter(function (a) { return a.appId.indexOf("kz-") !== 0; }), kz = apps.filter(function (a) { return a.appId.indexOf("kz-") === 0; });
      var dn = uniqVisitors(du), kn = uniqVisitors(kz);
      $("an-sub").textContent = "Online now · " + fmt(d.online || 0) + " unique visitors · " + fmt(d.sessionCount || d.online || 0) + " tabs · updated " + new Date(d.generatedAt || Date.now()).toLocaleTimeString() + " · refreshes every 20s";
      $("an-kpis").innerHTML = kpi("Online now", fmt(d.online || 0), '<span class="d">unique visitors · last 3 min</span>') + kpi("Digital Underground", fmt(dn), '<span class="d">' + du.length + " apps</span>") + kpi("Kerzy Labs", fmt(kn), '<span class="d">' + kz.length + " games</span>");
      $("an-lists").innerHTML = liveSection("Digital Underground", du, "Nobody on Digital Underground right now.") + liveSection("Kerzy Labs", kz, "Nobody playing Kerzy Labs games right now.");
      $("an-note").textContent = d.privacyNote || "Owner-only. Hashed IP visitor key, geo, and parsed device. No emails. Full IP is owner-private.";
    });
  }
  document.addEventListener("click", function (e) {
    var v = e.target.closest && e.target.closest("[data-live-visitor]");
    if (v) {
      var vk = v.getAttribute("data-live-visitor");
      liveVisitorOpen[vk] = !liveVisitorOpen[vk];
      loadLive(anSeq);
      return;
    }
    var r = e.target.closest && e.target.closest("[data-live-app]");
    if (!r) return;
    var id = r.getAttribute("data-live-app");
    liveOpen[id] = !liveOpen[id];
    loadLive(anSeq);
  });
