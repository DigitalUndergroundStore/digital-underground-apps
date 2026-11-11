/* Share-button clicks → POST /api/track/share. Does not call preventDefault,
   so the existing OS share sheet / copy-link fallback still runs.
   Loaded on listing pages directly, and injected into League / homepage HTML. */
(function () {
  if (window.__duShareWatch) return;
  window.__duShareWatch = 1;

  var SURFACES = { listing: 1, league: 1, featured: 1, nav: 1, other: 1 };

  function surfaceFor(el) {
    if (!el || !el.closest) return "";
    var marked = el.closest("[data-du-share]");
    if (marked) {
      var named = String(marked.getAttribute("data-du-share") || "").toLowerCase();
      return SURFACES[named] ? named : "other";
    }
    if (el.closest("[data-dun-share], [data-duf-share]")) return "nav";
    if (el.closest("[data-lg-share]")) return "league";
    if (el.closest("#share") && location.pathname.indexOf("/community/p") === 0) return "listing";
    var badgeBtn = el.closest("button");
    if (badgeBtn && badgeBtn.closest(".motw-badge")) return "featured";
    var shareBtn = el.closest("button.share-btn");
    if (!shareBtn) return "";
    if (shareBtn.closest("#ftrRow, .ftr")) return "featured";
    if (shareBtn.hasAttribute("data-share")) return "league";
    return "";
  }

  function from(el, name) {
    var node = el.closest("[data-share], [data-name], [data-du-share]");
    if (!node) return "";
    return node.getAttribute(name) || "";
  }

  function send(el, surface) {
    var id = from(el, "data-share");
    if (!id && (surface === "listing" || (surface === "featured" && el.closest(".motw-badge"))) && window.__DU_LID) id = String(window.__DU_LID);
    if (!id && surface === "listing") {
      try { id = new URLSearchParams(location.search).get("id") || ""; } catch (e) {}
    }
    var title = from(el, "data-name");
    if (!title && (surface === "listing" || (surface === "featured" && el.closest(".motw-badge")))) {
      var h = document.querySelector("h1");
      title = h ? h.textContent : "";
    }
    if (!title && surface === "league" && el.closest("[data-lg-share]")) title = "Maker League";
    var payload = {
      t: Date.now(),
      surface: surface,
      path: location.pathname || "/",
      id: id,
      title: title
    };
    var body = "";
    try { body = JSON.stringify(payload); } catch (e) { return; }
    var ok = false;
    try {
      ok = navigator.sendBeacon && navigator.sendBeacon("/api/track/share", new Blob([body], { type: "application/json" }));
    } catch (e) {}
    if (!ok) {
      fetch("/api/track/share", {
        method: "POST",
        body: body,
        keepalive: true,
        headers: { "Content-Type": "application/json" }
      }).catch(function () {});
    }
  }

  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("button, a");
    if (!el) return;
    var surface = surfaceFor(el);
    if (!surface) return;
    send(el, surface);
  }, true);
})();
