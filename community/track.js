/* Developer Marketplace analytics: batched, cheap. Impressions once per listing per
   browser session; detail views and outbound clicks counted exactly. One beacon per flush. */
(function () {
  var q = { i: [], v: [], c: [] };
  var timer = null;
  var seen = {};
  try { seen = JSON.parse(sessionStorage.getItem("du_seen") || "{}"); } catch (_) {}
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
      try { sessionStorage.setItem("du_seen", JSON.stringify(seen)); } catch (_) {}
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
