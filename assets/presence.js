/* DU live presence beacon: anonymous random id in localStorage, heartbeat while the tab is visible. No cookies, no personal data. */
(function () {
  try {
    if (navigator.webdriver || /bot|crawl|spider|headless/i.test(navigator.userAgent)) return;
    var K = "du_presence_sid", sid = localStorage.getItem(K);
    if (!sid || !/^[a-z0-9]{12,32}$/.test(sid)) {
      var a = new Uint8Array(10); crypto.getRandomValues(a);
      sid = Array.prototype.map.call(a, function (b) { return (b % 36).toString(36); }).join("") + Date.now().toString(36).slice(-4);
      localStorage.setItem(K, sid);
    }
    var s = document.currentScript, p = location.pathname;
    var app = (s && s.getAttribute("data-app")) || (p.split("/")[1] || "home");
    function beat() {
      if (document.visibilityState !== "visible") return;
      var body = JSON.stringify({ appId: app, path: p.slice(0, 80), sessionId: sid });
      try { fetch("/api/presence", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(function () {}); } catch (_) {}
    }
    beat();
    setInterval(beat, 45000);
    document.addEventListener("visibilitychange", beat);
  } catch (_) {}
})();
