/* Hosted build: semantic version. PWA install/update scripts are injected by unlock.js once. */
"use strict";
(function () {
  var SEMVER = "3.4.3";
  window.__DU_APP_SEMVER__ = window.__DU_APP_SEMVER__ || SEMVER;
  if (!window.__DU_APP_VERSION__ || /^\d{12}-/.test(String(window.__DU_APP_VERSION__ || ""))) {
    window.__DU_APP_VERSION__ = window.__DU_APP_SEMVER__;
  }
  if (!window.PW_PHOTO_BASE && /digitalundergroundstore\.com/i.test(String(location.hostname || ""))) {
    var root = location.pathname.replace(/\/[^/]*$/, "/");
    if (!/\/$/.test(root)) root += "/";
    window.PW_PHOTO_BASE = root;
  }
})();
