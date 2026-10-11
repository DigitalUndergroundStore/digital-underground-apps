(function () {
  "use strict";
  var semver = window.__DU_APP_SEMVER__ || window.__DU_APP_VERSION__;
  var build = window.__DU_BUILD_ID__;
  if (!semver && build) return;
  if (semver && /^\d{12}-/.test(String(semver)) && window.__DU_APP_SEMVER__) {
    semver = window.__DU_APP_SEMVER__;
  } else if (semver && /^\d{12}-/.test(String(semver))) {
    build = build || semver;
    semver = window.__DU_APP_SEMVER__ || null;
  }
  if (!semver) return;

  function row() {
    var el = document.createElement("p");
    el.className = "du-app-version";
    el.setAttribute("data-du-version", semver);
    el.style.cssText =
      "margin:12px 0 0;font-size:12px;opacity:.65;font-family:system-ui,sans-serif";
    el.textContent = "Version " + semver;
    if (build) {
      var sub = document.createElement("span");
      sub.style.display = "block";
      sub.style.fontSize = "11px";
      sub.style.opacity = "0.85";
      sub.textContent = "Build " + build;
      el.appendChild(sub);
    }
    return el;
  }

  function tryInject() {
    var targets = document.querySelectorAll(
      "[data-settings], #settings, .settings, [aria-label*='Settings' i], footer, .about"
    );
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
