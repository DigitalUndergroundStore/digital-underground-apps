window.__DU_APP_VERSION__ = "planetview-v15-3d";
(function () {
  var s = document.createElement("script");
  s.src = "/assets/buyer/pwa-update.js";
  s.defer = true;
  s.setAttribute("data-sw-url", "./sw.js");
  s.setAttribute("data-app-version", "planetview-v15-3d");
  s.setAttribute("data-app-label", "PlanetView Live");
  document.head.appendChild(s);
  var l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "/assets/buyer/pwa-update.css";
  document.head.appendChild(l);
})();
