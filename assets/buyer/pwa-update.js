(function () {
  "use strict";
  var script = document.currentScript;
  var version = (script && script.getAttribute("data-app-version")) || "";
  var label = (script && script.getAttribute("data-app-label")) || "App";

  if (!("serviceWorker" in navigator)) return;

  var toast = document.createElement("div");
  toast.className = "du-update-toast";
  toast.setAttribute("role", "status");
  toast.innerHTML =
    "<strong>Update available</strong><span>Tap to refresh " +
    label +
    (version ? " (" + version + ")" : "") +
    "</span>";
  document.addEventListener(
    "DOMContentLoaded",
    function () {
      document.body.appendChild(toast);
    },
    { once: true }
  );
  if (document.body) document.body.appendChild(toast);

  var refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  function showToast(reg) {
    toast.classList.add("on");
    toast.onclick = function () {
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      else reg.update().then(function () {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      });
    };
  }

  var swUrl = script.getAttribute("data-sw-url") || "./sw.js";
  navigator.serviceWorker.register(swUrl).then(function (reg) {
    if (reg.waiting && navigator.serviceWorker.controller) showToast(reg);
    reg.addEventListener("updatefound", function () {
      var worker = reg.installing;
      if (!worker) return;
      worker.addEventListener("statechange", function () {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showToast(reg);
        }
      });
    });
    setInterval(function () {
      reg.update().catch(function () {});
    }, 60 * 60 * 1000);
  }).catch(function () {});
})();
