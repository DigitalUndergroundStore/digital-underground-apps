/* Hosted build: semantic version. PWA install/update scripts are injected by unlock.js once. */
"use strict";
(function () {
  var SEMVER = "3.11.6";
  window.__DU_APP_SEMVER__ = window.__DU_APP_SEMVER__ || SEMVER;
  if (!window.__DU_APP_VERSION__ || /^\d{12}-/.test(String(window.__DU_APP_VERSION__ || ""))) {
    window.__DU_APP_VERSION__ = window.__DU_APP_SEMVER__;
  }
  if (!window.PW_PHOTO_BASE && /digitalundergroundstore\.com/i.test(String(location.hostname || ""))) {
    var path = String(location.pathname || "/");
    if (!/\/$/.test(path)) {
      var slash = path.lastIndexOf("/");
      var leaf = slash >= 0 ? path.slice(slash + 1) : path;
      path = leaf.indexOf(".") >= 0 ? path.slice(0, slash + 1) : path + "/";
    }
    window.PW_PHOTO_BASE = path;
  }
})();
