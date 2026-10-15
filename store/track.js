/* Storefront analytics: one anonymous beacon per page visit (pageview + product clicks), sent when the page is hidden. */
(function () {
  if (location.hostname !== "digitalundergroundstore.com") return;
  if (navigator.webdriver || /bot|crawl|spider/i.test(navigator.userAgent)) return;
  var first = false;
  try { first = !sessionStorage.getItem("du_store_s"); sessionStorage.setItem("du_store_s", "1"); } catch (_) {}
  var ref = "";
  try { var r = document.referrer ? new URL(document.referrer) : null; ref = r && r.host !== location.host ? r.hostname.replace(/^www\./, "") : r ? "internal" : "direct"; } catch (_) { ref = "direct"; }
  var data = { pv: 1, s: first ? 1 : 0, m: matchMedia("(max-width: 767px)").matches ? 1 : 0, path: location.pathname, ref: ref, clicks: [] };
  function send() {
    if (!data.pv && !data.clicks.length) return;
    var body = JSON.stringify(data);
    data = { pv: 0, s: 0, m: data.m, path: data.path, ref: data.ref, clicks: [] };
    try { if (navigator.sendBeacon && navigator.sendBeacon("/api/store-track", new Blob([body], { type: "application/json" }))) return; } catch (_) {}
    fetch("/api/store-track", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(function () {});
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var u; try { u = new URL(a.href); } catch (_) { return; }
    if (u.host === location.host) return;
    var card = a.closest(".card"), name = card && card.querySelector("strong");
    var label = (name ? name.textContent : a.textContent || u.hostname).replace(/\s+/g, " ").trim().slice(0, 50);
    data.clicks.push(label + " · " + u.hostname.replace(/^www\./, ""));
    if (data.clicks.length >= 10) send();
  }, true);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send(); });
  addEventListener("pagehide", send);
})();
