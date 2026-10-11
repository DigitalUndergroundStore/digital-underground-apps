/* Hosted build: semantic version. PWA install/update scripts are injected by unlock.js once. */
"use strict";
(function () {
  var SEMVER = "3.3.0";
  window.__DU_APP_SEMVER__ = window.__DU_APP_SEMVER__ || SEMVER;
  if (!window.__DU_APP_VERSION__ || /^\d{12}-/.test(String(window.__DU_APP_VERSION__ || ""))) {
    window.__DU_APP_VERSION__ = window.__DU_APP_SEMVER__;
  }
})();
