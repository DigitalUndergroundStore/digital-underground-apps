/* Storefront analytics: one anonymous beacon per page visit (pageview + product clicks + whether the visitor left the site from this page), sent when the page is hidden. */
(function () {
  if (location.hostname !== "digitalundergroundstore.com") return;
  if (navigator.webdriver || /bot|crawl|spider/i.test(navigator.userAgent)) return;
  /* Cookieless: nothing is stored in the browser. A visit "starts" when the referrer is not this site. */
  var ref = "", fwd = null;
  try {
    var qs = new URLSearchParams(location.search);
    if (qs.has("via")) { fwd = qs.get("via").slice(0, 60); qs.delete("via"); history.replaceState(null, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash); }
  } catch (_) {}
  try { var r = document.referrer ? new URL(document.referrer) : null; ref = r && r.host !== location.host ? r.hostname.replace(/^www\./, "") : r ? "internal" : "direct"; } catch (_) { ref = "direct"; }
  if (fwd !== null && (ref === "internal" || ref === "direct")) ref = fwd === location.hostname.replace(/^www\./, "") ? "internal" : fwd; // arrived via the / redirect
  var first = ref !== "internal";
  var data = { v: 4, pv: 1, s: first ? 1 : 0, m: matchMedia("(max-width: 767px)").matches ? 1 : 0, path: location.pathname, ref: ref, clicks: [] };
  /* Exit tracking: if the page is hidden without the visitor opening another page on this site, the visit ended here.
     ox = they clicked out to a product/other site first. If they come back and open another page, a small fix beacon undoes the exit. */
  var navd = false, outd = false, exSent = false, exOx = 0, fixSent = false;
  function send() {
    if (!data.pv && !data.clicks.length && !data.fx) return;
    if (data.pv) { data.ex = navd ? 0 : 1; data.ox = outd ? 1 : 0; exSent = data.ex === 1; exOx = data.ox; }
    var body = JSON.stringify(data);
    data = { v: 4, pv: 0, s: 0, m: data.m, path: data.path, ref: data.ref, clicks: [] };
    try { if (navigator.sendBeacon && navigator.sendBeacon("/api/store-track", new Blob([body], { type: "application/json" }))) return; } catch (_) {}
    fetch("/api/store-track", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(function () {});
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var u; try { u = new URL(a.href); } catch (_) { return; }
    if (u.host === location.host) {
      if (u.pathname === location.pathname || a.target === "_blank") return;
      navd = true;
      if (exSent && !fixSent) { fixSent = true; data.fx = 1; data.s = first ? 1 : 0; data.ox = exOx; send(); }
      return;
    }
    outd = true;
    var card = a.closest(".card, .pc, .sticky-buy"), dt = !card && a.closest(".dt"), name = card ? card.querySelector("strong") : dt ? dt.querySelector("h1") : null;
    var label = (name ? name.textContent : a.textContent || u.hostname).replace(/\s+/g, " ").trim().slice(0, 50);
    data.clicks.push(label + " · " + u.hostname.replace(/^www\./, ""));
    if (data.clicks.length >= 10) send();
  }, true);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send(); });
  addEventListener("pagehide", send);
})();
