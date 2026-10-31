/* Digital Underground shared PWA auto-update.
   Installed apps pick up new builds silently: no reinstall, no hard refresh.
   - registers the app's sw.js (updateViaCache: none)
   - checks version.json (no-store) on load, focus, visibility, online, and every 2 min
   - on a new version: reg.update(), tells a waiting worker to SKIP_WAITING,
     and reloads once on controllerchange (loop-guarded per version). URL + #hash preserved. */
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  var script = document.currentScript;
  var attr = function (n) { return (script && script.getAttribute(n)) || ""; };
  var local = attr("data-app-version") || String(window.__DU_APP_VERSION__ || "");
  var swUrl = attr("data-sw-url") || "./sw.js";
  var versionUrl;
  try { versionUrl = new URL("version.json", new URL(swUrl, location.href)).href; } catch (e) { versionUrl = "version.json"; }
  var GUARD = "du.swReload:" + versionUrl;

  function safeToReload() {
    var a = document.activeElement;
    return !(a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA") && a.value);
  }
  var refreshing = false;
  function reloadOnce(tag) {
    if (refreshing) return;
    try {
      if (sessionStorage.getItem(GUARD) === tag) return; // already reloaded for this build
      sessionStorage.setItem(GUARD, tag);
    } catch (e) {}
    refreshing = true;
    location.reload();
  }
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController) { hadController = true; return; } // first install: nothing old to replace
    reloadOnce("cc:" + (window.__DU_LIVE_VERSION__ || Date.now()));
  });

  function activate(reg) {
    if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  navigator.serviceWorker.register(swUrl, { updateViaCache: "none" }).then(function (reg) {
    activate(reg);
    reg.addEventListener("updatefound", function () {
      var w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", function () {
        if (w.state === "installed" && navigator.serviceWorker.controller) activate(reg);
      });
    });
    var last = 0;
    function check() {
      var now = Date.now();
      if (now - last < 15000) return;
      last = now;
      reg.update().then(function () { try { if (reg.active) reg.active.postMessage({ type: "CLEAR_CACHES" }); } catch (e) {} activate(reg); }).catch(function () {});
      fetch(versionUrl, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (p) {
          if (!p || !p.version) return;
          var live = String(p.version);
          window.__DU_LIVE_VERSION__ = live;
          if (!local || live === local) return;
          // New build is live. Activate any new worker; if none shows up (same sw.js), reload anyway.
          reg.update().then(function () {
            activate(reg);
            setTimeout(function () { if (safeToReload()) reloadOnce("v:" + live); }, 800);
          }).catch(function () {});
        })
        .catch(function () {});
    }
    check();
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") check(); });
    setInterval(check, 2 * 60 * 1000);
  }).catch(function () {});
})();
