/* Developer Marketplace (Wolf layout). Cards are server-rendered by scripts/build-community-ssr.py; this script merges in live API listings, filters, and adds Wolf's effects. */
(function () {
  "use strict";
  var CAT_LABELS = { apps: "Apps", "ai-tools": "AI tools", games: "Games", books: "Books", templates: "Templates", other: "Other" };
  var GRADS = [["#7c3aed","#4f46e5"],["#2563eb","#06b6d4"],["#059669","#14b8a6"],["#c026d3","#ec4899"],["#f97316","#ef4444"],["#0284c7","#1d4ed8"]];
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var BLOCK_EMAIL = /[^\s@<>"]+@gmail\.com/gi;
  var all = [], cat = "all", firstPaint = true, swapT;
  var grid = document.getElementById("grid"), empty = document.getElementById("empty"), qInput = document.getElementById("q"), count = document.getElementById("count");

  function esc(s) { return String(s == null ? "" : s).replace(BLOCK_EMAIL, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function normalize(row) {
    if (/^cm_kerzy_/.test(row.id) || /kerzy/i.test(row.makerName || "")) { row.makerName = "Kerzy Labs"; row.curated = false; }
    if (row.id === "cm_kerzy_neonbastion" || /neon bastion/i.test(row.name || "")) row.stage = "In development / testing";
    return row;
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function media(row) {
    var v = row.video, poster = row.imageUrl || (v && v.poster) || "", name = esc(row.name);
    if (v && v.kind === "file" && v.src)
      return '<div class="media"><video class="card-vid" muted loop playsinline preload="none"' + (poster ? ' poster="' + esc(poster) + '"' : "") + ' src="' + esc(v.src) + (poster ? "" : "#t=0.1") + '" aria-label="' + name + ' preview video"></video></div>';
    if (poster)
      return '<div class="media"><img src="' + esc(poster) + '" alt="' + name + ' cover image" width="640" height="360" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'grad\');this.remove()"></div>';
    var g = GRADS[hash(row.id || row.name || "") % GRADS.length];
    return '<div class="media grad" style="background:linear-gradient(135deg,' + g[0] + "," + g[1] + ')"><span aria-hidden="true">' + esc((row.name || "?").slice(0, 2)) + "</span></div>";
  }
  // Maker page slug: API sends makerSlug; static seed rows fall back to the seeded maker pages.
  function makerSlug(row) {
    if (row.makerSlug && /^[a-z0-9-]{1,48}$/.test(row.makerSlug)) return row.makerSlug;
    if (/^cm_kerzy_/.test(row.id || "")) return "kerzy-labs";
    if (/^digital\s*underground$/i.test(row.makerName || "")) return "digital-underground";
    return /^wolfitway$/i.test(row.makerName || "") ? "wolfitway" : "";
  }
  function makerHTML(row) { var s = makerSlug(row); return s ? '<a href="/makers/' + s + '/">' + esc(row.makerName) + "</a>" : esc(row.makerName); }
  function cardHTML(row) {
    var href = "/community/p/?id=" + encodeURIComponent(row.id), name = esc(row.name);
    var stage = row.stage && row.stage !== "Released" ? row.stage : "";
    var badge = stage ? '<span class="badge stage">' + esc(stage) + "</span>" : row.curated ? '<span class="badge" title="Curated by Digital Underground">★ Featured pick</span>' : "";
    if (row.isNew) badge = '<span class="badge new" style="background:#16a34a;color:#fff">New</span>' + badge;
    if (row.statusLabel) badge = '<span class="badges">' + badge + '<span class="badge label">' + esc(String(row.statusLabel).slice(0, 24)) + "</span></span>";
    var x = row.xHandle ? ' · <a href="https://x.com/' + esc(row.xHandle) + '" target="_blank" rel="noopener" aria-label="@' + esc(row.xHandle) + ' on X (opens in a new tab)">@' + esc(row.xHandle) + "</a>" : "";
    return '<article class="card-inner" aria-labelledby="t-' + esc(row.id) + '">' + media(row) +
      '<div class="body"><div class="top"><div class="tt"><h3 id="t-' + esc(row.id) + '"><a href="' + href + '">' + name + '</a></h3><p class="maker">' + makerHTML(row) + x + "</p></div>" + badge + "</div>" +
      '<p class="desc">' + esc(row.pitchShort) + "</p>" +
      '<div class="foot-row"><span class="price">' + esc(row.priceLabel || "See site") + '</span><div class="acts">' +
      (row.contactable ? '<a class="pill pill-o" href="' + href + '#contact" aria-label="Contact the developer of ' + name + '">Contact</a>' : "") +
      (row.comingSoon ? '<span class="pill pill-o" aria-disabled="true">Coming soon</span>' : row.buyUrl ? '<a class="pill pill-v" data-out="' + esc(row.id) + '" href="' + esc(row.buyUrl) + '" target="_blank" rel="noopener" aria-label="Buy ' + name + ' on Gumroad (opens in a new tab)">Buy</a>' : "") +
      '<a class="pill ' + (row.buyUrl ? "pill-o" : "pill-v") + '" data-out="' + esc(row.id) + '" href="' + esc(row.visitUrl || row.projectUrl) + '" target="_blank" rel="noopener" aria-label="Visit ' + name + ' (opens in a new tab)">Visit</a></div></div></div></article>';
  }
  function tilt(li) {
    if (li._tilt) return; li._tilt = 1;
    li.addEventListener("animationend", function (e) { if (e.animationName === "reveal") li.classList.remove("reveal"); });
    if (!fine || reduced) return;
    li.addEventListener("mousemove", function (e) {
      var r = li.getBoundingClientRect(), cx = r.width / 2, cy = r.height / 2;
      li.style.transform = "perspective(800px) rotateX(" + ((e.clientY - r.top - cy) / cy) * -8 + "deg) rotateY(" + ((e.clientX - r.left - cx) / cx) * 8 + "deg) scale(1.02)";
    });
    li.addEventListener("mouseleave", function () { li.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale(1)"; });
  }
  function makeCard(row, i) {
    var li = document.createElement("li");
    li.className = "card" + (reduced ? "" : " reveal");
    li.setAttribute("data-id", row.id); li.setAttribute("data-globe-ignore", "");
    if (!reduced) li.style.animationDelay = i * 0.06 + "s";
    li.innerHTML = cardHTML(row);
    return li;
  }
  // Default order: Wolf Sniff 1st, Releviq 2nd, Wolfscent Video 4th, other Wolfitway listings spread evenly through the rest.
  // Mirrored in scripts/build-community-ssr.py (arrange()).
  function arrange(list) {
    var isW = function (r) { return /^wolfitway$/i.test(r.makerName || ""); };
    var wolf = list.filter(isW), rest = list.filter(function (r) { return !isW(r); });
    if (!wolf.length) return list;
    var pick = function (re) { for (var i = 0; i < wolf.length; i++) if (re.test(wolf[i].name || "")) return wolf.splice(i, 1)[0]; return null; };
    var first = pick(/wolf sniff/i), second = pick(/wolfscent/i);
    var ri = -1; for (var i = 0; i < rest.length; i++) if (/^releviq$/i.test(rest[i].name || "")) { ri = i; break; }
    var rel = ri >= 0 ? rest.splice(ri, 1)[0] : null;
    var out = [first, rel, rest.shift(), second].filter(Boolean);
    var tail = rest.slice(), n = wolf.length, slots = tail.length + n, base = out.length;
    var pos = []; for (var k = 1; k <= n; k++) pos.push(Math.round(slots * k / (n + 1)) - 1);
    for (var j = 0, w = 0, t = 0; j < slots; j++) out.push(w < n && j === pos[w] ? wolf[w++] : (t < tail.length ? tail[t++] : wolf[w++]));
    return out.filter(Boolean);
  }
  function filtered() {
    var q = (qInput.value || "").trim().toLowerCase();
    return all.filter(function (row) {
      if (cat !== "all" && row.category !== cat) return false;
      if (!q) return true;
      return [row.name, row.makerName, row.pitchShort, CAT_LABELS[row.category] || row.category, (row.tags || []).join(" ")].join(" ").toLowerCase().indexOf(q) >= 0;
    });
  }
  function announce(n) {
    var q = (qInput.value || "").trim();
    count.textContent = n + (n === 1 ? " project" : " projects") + (q || cat !== "all" ? " match" + (n === 1 ? "es" : "") + " your filters" : "");
  }
  function paint() {
    var items = filtered(), existing = {};
    if (firstPaint) Array.prototype.forEach.call(grid.children, function (li) { existing[li.getAttribute("data-id")] = li; });
    var frag = document.createDocumentFragment();
    items.forEach(function (row, i) {
      var li = existing[row.id];
      if (li) {
        // keep the server-rendered image node (no re-download / LCP reset); refresh the text, badges and links from live data
        delete existing[row.id];
        var t = document.createElement("div"); t.innerHTML = cardHTML(row);
        var nb = t.querySelector(".body"), ob = li.querySelector(".body");
        if (nb && ob) ob.replaceWith(nb);
      } else li = makeCard(row, i);
      tilt(li); frag.appendChild(li);
      if (window.duTrack) duTrack.observe(li, row.id);
    });
    grid.innerHTML = ""; grid.appendChild(frag);
    firstPaint = false;
    empty.hidden = !!items.length;
    announce(items.length);
  }
  function render() {
    if (firstPaint || reduced || !grid.children.length) return paint();
    clearTimeout(swapT);
    Array.prototype.forEach.call(grid.children, function (c) { c.style.transform = ""; c.classList.remove("reveal"); c.classList.add("out"); });
    swapT = setTimeout(paint, 200);
  }
  Array.prototype.forEach.call(grid.children, tilt);
  document.getElementById("cats").addEventListener("change", function (e) { cat = e.target.value || "all"; render(); });
  var qT; qInput.addEventListener("input", function () { clearTimeout(qT); qT = setTimeout(render, 150); });

  Promise.all([
    fetch("/community/listings.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("/api/community/listings").then(function (r) { return r.ok ? r.json() : { listings: [] }; }).catch(function () { return { listings: [] }; }),
    fetch("/community/pinned.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
  ]).then(function (parts) {
    var pinned = Array.isArray(parts[2]) ? parts[2] : [];
    var byId = {};
    (Array.isArray(parts[0]) ? parts[0] : []).concat(parts[1] && Array.isArray(parts[1].listings) ? parts[1].listings : []).forEach(function (row) { if (row && row.id) byId[row.id] = row; });
    all = Object.keys(byId).filter(function (k) { return k !== 'cm_kerzy_easytracker' && !byId[k].hidden; }).map(function (k) { return normalize(byId[k]); });
    var api = parts[1] || {};
    if (api.ordered) { var pos = {}; api.listings.forEach(function (r, i) { if (r && r.id) pos[r.id] = i; }); all.sort(function (a, b) { return (a.id in pos ? pos[a.id] : 1e9) - (b.id in pos ? pos[b.id] : 1e9); }); }
    else all.sort(function (a, b) {
      var pa = pinned.indexOf(a.id), pb = pinned.indexOf(b.id);
      if (pa !== pb) return (pa < 0 ? 1e9 : pa) - (pb < 0 ? 1e9 : pb);
      if (!!a.curated !== !!b.curated) return a.curated ? 1 : -1;
      return (a.name || "").localeCompare(b.name || "");
    });
    if (!api.ordered) all = arrange(all);
    if (all.length) render();
  });

  // Spotlight (Wolf's strength; desktop pointer only)
  if (fine && !reduced) {
    var sp = document.getElementById("spotlight"), raf = 0, mx = 0, my = 0;
    document.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(function () { raf = 0; sp.style.setProperty("--x", mx + "px"); sp.style.setProperty("--y", my + "px"); }); }, { passive: true });
  }

  // FAQ: real buttons with aria-expanded / aria-controls
  Array.prototype.forEach.call(document.querySelectorAll(".faq-q"), function (b) {
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", String(!open));
      document.getElementById(b.getAttribute("aria-controls")).hidden = open;
    });
  });

  // Mobile menu: aria-expanded, focus trap, Esc, focus return
  var menu = document.getElementById("mobile-menu"), overlay = document.getElementById("overlay"), btn = document.getElementById("menu-btn"), closeB = document.getElementById("close-menu");
  function focusables() { return Array.prototype.filter.call(menu.querySelectorAll("a[href],button:not([disabled])"), function (el) { return el.offsetParent !== null; }); }
  function openMenu() { menu.hidden = false; requestAnimationFrame(function () { menu.classList.add("open"); }); overlay.hidden = false; document.body.style.overflow = "hidden"; btn.setAttribute("aria-expanded", "true"); setTimeout(function () { closeB.focus(); }, 30); }
  function closeMenu(ret) {
    menu.classList.remove("open"); overlay.hidden = true; document.body.style.overflow = ""; btn.setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!menu.classList.contains("open")) menu.hidden = true; }, reduced ? 0 : 360);
    if (ret !== false) btn.focus();
  }
  btn.addEventListener("click", openMenu);
  closeB.addEventListener("click", function () { closeMenu(); });
  overlay.addEventListener("click", function () { closeMenu(); });
  menu.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
    if (e.key !== "Tab") return;
    var f = focusables(); if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  matchMedia("(min-width: 768px)").addEventListener("change", function (m) { if (m.matches && btn.getAttribute("aria-expanded") === "true") closeMenu(false); });
  document.getElementById("share-market-m").addEventListener("click", function () { closeMenu(false); document.getElementById("share-market").click(); });
})();
