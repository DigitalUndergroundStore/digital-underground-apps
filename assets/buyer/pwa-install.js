(function () {
  "use strict";
  var script = document.currentScript;
  var slug = (script && script.getAttribute("data-app-slug")) || "";
  var appName = (script && script.getAttribute("data-app-name")) || "App";
  var standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (standalone) return;

  var btnWrap = document.getElementById("du-install");
  var btn = document.getElementById("du-install-btn");
  var iosHint = document.getElementById("du-ios-hint");
  if (!btnWrap || !btn) return;

  if (btnWrap.hasAttribute("hidden")) btnWrap.hidden = false;
  var deferred = null;

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  }

  function appUrl() {
    var base = "https://digitalundergroundstore.com/" + slug + "/";
    return base;
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    btn.textContent = "Install " + appName;
    btn.disabled = false;
  });

  btn.addEventListener("click", function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; });
      return;
    }
    if (isIOS()) {
      if (iosHint) iosHint.classList.add("on");
      return;
    }
    window.location.href = appUrl();
  });

  if (isIOS()) {
    btn.textContent = "Add to Home Screen";
  } else {
    btn.textContent = "Install " + appName;
  }
})();
