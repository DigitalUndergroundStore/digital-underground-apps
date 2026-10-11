(function () {
  "use strict";
  var script = document.currentScript;
  var slug = (script && script.getAttribute("data-app-slug")) || "";
  var appName = (script && script.getAttribute("data-app-name")) || "App";
  var standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (standalone) return;

  var bannerWrap = document.getElementById("du-install");
  var bannerBtn = document.getElementById("du-install-btn");
  var headerBtn = document.getElementById("du-install-header");
  var iosHint = document.getElementById("du-ios-hint");
  var desktop = window.matchMedia("(min-width: 901px)").matches;
  var installBtn = desktop && headerBtn ? headerBtn : bannerBtn;
  var installWrap = desktop ? headerBtn : bannerWrap;

  if (!installBtn) return;

  if (bannerWrap && desktop) bannerWrap.hidden = true;
  if (headerBtn && !desktop) headerBtn.hidden = true;
  if (installWrap && installWrap.hasAttribute("hidden")) installWrap.hidden = false;

  var deferred = null;

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  }

  function appUrl() {
    return "https://digitalundergroundstore.com/" + slug + "/";
  }

  function hideInstallUi() {
    if (bannerWrap) bannerWrap.hidden = true;
    if (headerBtn) headerBtn.hidden = true;
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    installBtn.textContent = desktop ? "Install app" : "Install " + appName;
    installBtn.disabled = false;
  });

  window.addEventListener("appinstalled", hideInstallUi);

  function onInstallClick() {
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
  }

  if (bannerBtn) bannerBtn.addEventListener("click", onInstallClick);
  if (headerBtn) headerBtn.addEventListener("click", onInstallClick);

  if (isIOS()) {
    installBtn.textContent = desktop ? "Add to Home Screen" : "Add to Home Screen";
  } else if (desktop) {
    installBtn.textContent = "Install app";
  } else {
    installBtn.textContent = "Install " + appName;
  }
})();
