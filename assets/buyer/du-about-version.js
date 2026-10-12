(function () {
  "use strict";
  var v = window.__DU_APP_VERSION__;
  if (!v) return;

  function row() {
    var el = document.createElement("p");
    el.className = "du-app-version";
    el.setAttribute("data-du-version", v);
    el.style.cssText =
      "margin:12px 0 0;font-size:12px;opacity:.65;font-family:system-ui,sans-serif";
    el.textContent = "Version " + v;
    return el;
  }

  function tryInject() {
    var targets = document.querySelectorAll("[data-du-settings], [data-settings], #settings, .settings");
    var r = row();
    if (targets.length) {
      targets[targets.length - 1].appendChild(r);
      return true;
    }
    return false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (!tryInject()) document.body.appendChild(row());
    });
  } else if (!tryInject()) {
    document.body.appendChild(row());
  }
})();
