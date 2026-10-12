(function () {
  "use strict";

  var DISMISS_KEY = "du.planetview.install.dismissed";
  var LEGACY_HINT = "planetview.install-hint";
  var DISMISS_DAYS = 14;

  function standalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  }

  function dismissedRecently() {
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      var t = parseInt(raw, 10);
      if (!t) return true;
      return Date.now() - t < DISMISS_DAYS * 86400000;
    } catch (e) {
      return false;
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (e) {}
    hide();
  }

  /** In-app bundle banner reads this key; hosted shell owns install UX. */
  function suppressLegacyBanner() {
    try {
      localStorage.setItem(LEGACY_HINT, "1");
    } catch (e) {}
  }

  var root;
  var installBtn;
  var deferred = null;

  function hide() {
    if (root) root.hidden = true;
  }

  function show() {
    if (root) root.hidden = false;
  }

  function mount() {
    if (standalone() || dismissedRecently()) return;

    suppressLegacyBanner();

    root = document.createElement("aside");
    root.id = "du-pv-install";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-labelledby", "du-pv-install-title");
    root.hidden = true;

    var ios = isIOS();
    var title = ios ? "Add to Home Screen" : "Install PlanetView";
    var body = ios
      ? "On iPhone and iPad, use Safari’s Share menu to add PlanetView Live to your home screen."
      : "One tap adds PlanetView Live for fullscreen launch and offline globe assets.";

    root.innerHTML =
      "<h2 id=\"du-pv-install-title\">" +
      title +
      "</h2>" +
      "<p class=\"du-pv-body\">" +
      body +
      "</p>" +
      (ios
        ? "<div class=\"du-pv-ios\"><strong>iPhone / iPad</strong><ol><li>Tap <strong>Share</strong> in Safari.</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li></ol></div>"
        : "") +
      "<div class=\"du-pv-actions\">" +
      (ios
        ? ""
        : "<button type=\"button\" class=\"du-pv-primary\" id=\"du-pv-install-btn\">Install PlanetView</button>") +
      "<button type=\"button\" class=\"du-pv-ghost\" id=\"du-pv-dismiss\">Not now</button>" +
      "</div>";

    document.body.appendChild(root);
    document.getElementById("du-pv-dismiss").addEventListener("click", dismiss);
    watchLegacyBanner();

    if (ios) {
      show();
      return;
    }

    installBtn = document.getElementById("du-pv-install-btn");
    installBtn.disabled = true;

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferred = e;
      installBtn.disabled = false;
      show();
    });

    window.addEventListener("appinstalled", function () {
      deferred = null;
      hide();
    });

    installBtn.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () {
        deferred = null;
      });
    });
  }

  function watchLegacyBanner() {
    function legacyCard(el) {
      var t = (el.textContent || "").replace(/\s+/g, " ");
      return (
        t.indexOf("Add to Home Screen") !== -1 &&
        t.indexOf("On Android, open the browser menu") !== -1
      );
    }
    function sweep(root) {
      if (!root || !root.querySelectorAll) return;
      var all = root.querySelectorAll("div, aside, section");
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === "du-pv-install") continue;
        if (legacyCard(all[i])) all[i].setAttribute("hidden", "");
      }
    }
    var obs = new MutationObserver(function () {
      sweep(document.body);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    sweep(document.body);
  }

  suppressLegacyBanner();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
