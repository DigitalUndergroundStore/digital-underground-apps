/* Developer Marketplace analytics: batched, cheap. Impressions once per listing per
   page view (kept in memory only: no cookies or browser storage); detail views and outbound clicks counted exactly. One beacon per flush. */
(function () {
  var q = { i: [], v: [], c: [] };
  var timer = null;
  var seen = {};
  function flush() {
    timer = null;
    if (!q.i.length && !q.v.length && !q.c.length) return;
    var body = JSON.stringify(q);
    q = { i: [], v: [], c: [] };
    var ok = false;
    try { ok = navigator.sendBeacon && navigator.sendBeacon("/api/community/track", new Blob([body], { type: "application/json" })); } catch (_) {}
    if (!ok) fetch("/api/community/track", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(function () {});
  }
  function later(ms) { if (!timer) timer = setTimeout(flush, ms); }
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var id = en.target.getAttribute("data-track-id");
      io.unobserve(en.target);
      if (!id || seen[id]) return;
      seen[id] = 1;
      q.i.push(id); later(4000);
    });
  }, { threshold: 0.5 }) : null;
  window.duTrack = {
    observe: function (el, id) { if (!io || !id) return; el.setAttribute("data-track-id", id); io.observe(el); },
    view: function (id) { q.v.push(id); later(1500); }
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-out]");
    if (!a) return;
    q.c.push(a.getAttribute("data-out")); flush();
  }, true);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);
})();

/* Creators directory only. Homepage, drawer, and footer already link Maker Pro.
   This page still had only the dismissible Founding chip. /makers/ already loads
   this file. Shop pages do not, and this does not add a store card. */
(function () {
  if (window.__duMakerProCreators) return;
  window.__duMakerProCreators = 1;
  function mount() {
    var path = location.pathname.replace(/\/index\.html$/, "");
    if (path.length > 1 && path.charAt(path.length - 1) === "/") path = path.slice(0, -1);
    if (path !== "/makers") return;
    var hero = document.querySelector(".mk-dir-hero");
    if (!hero || hero.querySelector(".mp-reach-cta, a[href='/store/p/maker-pro/'], a[href=\"/store/p/maker-pro/\"]")) return;
    if (!document.getElementById("mp-reach-css")) {
      var css = document.createElement("style");
      css.id = "mp-reach-css";
      css.textContent = ".mp-reach-note{margin:14px 0 0;max-width:42rem;font-size:15px;line-height:1.45;color:var(--z300,#a8acb5)}.mp-reach-cta{margin:12px 0 0}.mp-reach-cta a{display:inline-flex;align-items:center;gap:8px;color:#d6d4ff;border:1px solid rgba(154,151,232,.4);padding:12px 20px;border-radius:12px;font-weight:600;line-height:1.2;text-decoration:none}.mp-reach-cta a:hover{border-color:#9a97e8;color:#fff}.mp-reach-cta a:focus-visible{outline:2px solid #9a97e8;outline-offset:3px}";
      document.head.appendChild(css);
    }
    if (!document.getElementById("mpChip")) {
      var note = document.createElement("p");
      note.className = "mp-reach-note";
      note.textContent = "Listing stays free. Pro is reach.";
      hero.appendChild(note);
    }
    var wrap = document.createElement("p");
    wrap.className = "mp-reach-cta";
    var link = document.createElement("a");
    link.href = "/store/p/maker-pro/";
    link.appendChild(document.createTextNode("Maker Pro — subscription for reach "));
    var arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "\u2192";
    link.appendChild(arrow);
    wrap.appendChild(link);
    hero.appendChild(wrap);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
