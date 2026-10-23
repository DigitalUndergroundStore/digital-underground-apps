/* Owner CRM contacts. Talks to /api/owner/crm (owner session cookie). */
(function () {
  var STATUSES = ["new", "contacted", "replied", "interested", "won", "not interested"];
  var CATS = ["lead", "maker", "partner", "press", "buyer", "other"];
  var LTS = ["cold", "warm", "hot", "vip"];
  var rows = [], editing = null, pipeStatus = "", pipeLead = "";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function opts(sel, list, keep) { sel.innerHTML = (keep || "") + list.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v === "vip" ? "VIP" : v) + "</option>"; }).join(""); }
  function api(path, method, body) {
    return fetch("/api/owner/crm" + path, { method: method || "GET", credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); });
  }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function srcKey(s) { return String(s || "").split(";")[0].trim(); }

  function load() {
    $("crm-list").innerHTML = '<p class="muted">Loading…</p>';
    api("").then(function (o) {
      if (!o.r.ok) { $("crm-list").innerHTML = '<p class="muted">Please sign in again.</p>'; return; }
      rows = o.d.contacts || [];
      var srcs = {}; rows.forEach(function (r) { String(r.source || "").split(";").forEach(function (s) { s = s.trim(); if (s) srcs[s] = 1; }); });
      var cur = $("crm-f-source").value;
      opts($("crm-f-source"), Object.keys(srcs).sort(), '<option value="">All sources</option>');
      $("crm-f-source").value = cur;
      render();
    });
  }
  function pipe() {
    var c = {}, l = {};
    rows.forEach(function (r) { c[r.status] = (c[r.status] || 0) + 1; l[r.leadType] = (l[r.leadType] || 0) + 1; });
    $("crm-pipe").innerHTML = STATUSES.map(function (s) { return '<button type="button" data-ps="' + esc(s) + '" class="' + (pipeStatus === s ? "is-on" : "") + '"><b>' + (c[s] || 0) + "</b><span>" + esc(s) + "</span></button>"; }).join("");
    $("crm-pipe-lt").innerHTML = LTS.map(function (s) { return '<button type="button" data-pl="' + s + '" class="' + (pipeLead === s ? "is-on" : "") + '"><b>' + (l[s] || 0) + '</b><span class="crm-b lt-' + s + '">' + (s === "vip" ? "VIP" : s) + "</span></button>"; }).join("");
  }
  function render() {
    pipe();
    var q = $("crm-q").value.toLowerCase().trim();
    var fs = $("crm-f-status").value || pipeStatus, fc = $("crm-f-category").value, fl = $("crm-f-lead").value || pipeLead, fsrc = $("crm-f-source").value;
    var sp = $("crm-sort").value.split(":"), sk = sp[0], dir = sp[1] === "desc" ? -1 : 1;
    var list = rows.filter(function (r) {
      if (fs && r.status !== fs) return false;
      if (fc && r.category !== fc) return false;
      if (fl && r.leadType !== fl) return false;
      if (fsrc && String(r.source || "").split(";").map(function (s) { return s.trim(); }).indexOf(fsrc) < 0) return false;
      if (q && [r.name, r.email, r.handle, r.website, r.notes, r.offer, r.source].join(" ").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    list.sort(function (a, b) {
      var x, y;
      if (sk === "status") { x = STATUSES.indexOf(a.status); y = STATUSES.indexOf(b.status); }
      else if (sk === "leadType") { x = LTS.indexOf(a.leadType); y = LTS.indexOf(b.leadType); }
      else { x = a[sk] || ""; y = b[sk] || ""; if (typeof x === "string") { x = x.toLowerCase(); y = String(y).toLowerCase(); } }
      if (sk === "nextFollowUp") { if (!x && y) return 1; if (x && !y) return -1; }
      return x < y ? -dir : x > y ? dir : 0;
    });
    $("crm-count").textContent = list.length + " of " + rows.length + " contacts";
    var t = today();
    $("crm-list").innerHTML = list.length ? list.map(function (r) {
      var due = r.nextFollowUp && r.nextFollowUp <= t && r.status !== "won" && r.status !== "not interested";
      return '<div class="crm-row" data-id="' + esc(r.id) + '" tabindex="0" role="button"><div class="t">' + esc(r.name || r.email || r.handle) +
        ' <span class="crm-b lt-' + esc(r.leadType) + '">' + esc(r.leadType === "vip" ? "VIP" : r.leadType) + '</span><span class="crm-b st">' + esc(r.status) + '</span><span class="crm-b cat">' + esc(r.category) + "</span>" +
        (due ? '<span class="crm-b due">follow up ' + esc(r.nextFollowUp) + "</span>" : "") + "</div>" +
        '<div class="m">' + [r.handle, r.email, r.website].filter(Boolean).map(esc).join(" · ") + "</div>" +
        '<div class="m">' + [r.offer ? "Offer: " + esc(r.offer) : "", r.lastContact ? "Last: " + esc(r.lastContact) : "", r.nextFollowUp && !due ? "Next: " + esc(r.nextFollowUp) : "", r.source ? "Source: " + esc(srcKey(r.source)) + (String(r.source).indexOf(";") > 0 ? " +" : "") : ""].filter(Boolean).join(" · ") + "</div>" +
        (r.notes ? '<div class="n">' + esc(r.notes) + "</div>" : "") + "</div>";
    }).join("") : '<p class="muted">No contacts match.</p>';
  }
  function open(r) {
    editing = r || null;
    var f = $("crm-form");
    ["name", "handle", "email", "website", "source", "lastContact", "nextFollowUp", "offer", "notes"].forEach(function (k) { f.elements[k].value = r ? r[k] || "" : ""; });
    f.elements.category.value = r ? r.category : "lead";
    f.elements.status.value = r ? r.status : "new";
    f.elements.leadType.value = r ? r.leadType : "cold";
    $("crm-dlg-title").textContent = r ? "Edit contact" : "Add contact";
    $("crm-del").hidden = !r;
    $("crm-msg").textContent = "";
    $("crm-dlg").showModal();
  }
  function save(e) {
    e.preventDefault();
    var f = $("crm-form"), c = {};
    ["name", "handle", "email", "website", "source", "category", "status", "leadType", "lastContact", "nextFollowUp", "offer", "notes"].forEach(function (k) { c[k] = f.elements[k].value; });
    $("crm-save").disabled = true;
    api(editing ? "/" + encodeURIComponent(editing.id) : "", "POST", { contact: c }).then(function (o) {
      $("crm-save").disabled = false;
      if (!o.r.ok) { $("crm-msg").textContent = o.d.error || "Could not save."; return; }
      $("crm-dlg").close(); load();
    });
  }
  function del() {
    if (!editing || !confirm('Delete "' + (editing.name || editing.email) + '"? This cannot be undone.')) return;
    api("/" + encodeURIComponent(editing.id), "DELETE").then(function (o) {
      if (!o.r.ok) { $("crm-msg").textContent = o.d.error || "Could not delete."; return; }
      $("crm-dlg").close(); load();
    });
  }
  function init() {
    if (!$("view-crm")) return;
    opts($("crm-f-status"), STATUSES, '<option value="">All statuses</option>');
    opts($("crm-f-category"), CATS, '<option value="">All categories</option>');
    opts($("crm-f-lead"), LTS, '<option value="">All lead types</option>');
    var f = $("crm-form"); opts(f.elements.status, STATUSES); opts(f.elements.category, CATS); opts(f.elements.leadType, LTS);
    ["crm-q", "crm-f-status", "crm-f-category", "crm-f-lead", "crm-f-source", "crm-sort"].forEach(function (id) { $(id).addEventListener(id === "crm-q" ? "input" : "change", render); });
    $("crm-add").addEventListener("click", function () { open(null); });
    $("crm-cancel").addEventListener("click", function () { $("crm-dlg").close(); });
    $("crm-del").addEventListener("click", del);
    f.addEventListener("submit", save);
    $("crm-pipe").addEventListener("click", function (e) { var b = e.target.closest("[data-ps]"); if (!b) return; var s = b.getAttribute("data-ps"); pipeStatus = pipeStatus === s ? "" : s; $("crm-f-status").value = ""; render(); });
    $("crm-pipe-lt").addEventListener("click", function (e) { var b = e.target.closest("[data-pl]"); if (!b) return; var s = b.getAttribute("data-pl"); pipeLead = pipeLead === s ? "" : s; $("crm-f-lead").value = ""; render(); });
    $("crm-list").addEventListener("click", function (e) { var el = e.target.closest(".crm-row"); if (!el) return; var id = el.getAttribute("data-id"); open(rows.filter(function (r) { return r.id === id; })[0]); });
    $("crm-list").addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.classList.contains("crm-row")) e.target.click(); });
  }
  window.duCrmLoad = load;
  init();
})();
