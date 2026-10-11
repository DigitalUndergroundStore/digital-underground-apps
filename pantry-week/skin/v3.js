(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("pw-skin-v3");

  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&display=swap";
  document.head.appendChild(link);

  var PHOTOS = {
    chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80&auto=format&fit=crop",
    lemon: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80&auto=format&fit=crop",
    scramble: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80&auto=format&fit=crop",
    salmon: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80&auto=format&fit=crop",
    pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80&auto=format&fit=crop",
    salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80&auto=format&fit=crop",
    soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80&auto=format&fit=crop",
    default: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80&auto=format&fit=crop",
  };

  function photoFor(title) {
    var t = (title || "").toLowerCase();
    if (t.indexOf("chicken") >= 0 || t.indexOf("lemon") >= 0) return PHOTOS.lemon;
    if (t.indexOf("scramble") >= 0 || t.indexOf("egg") >= 0) return PHOTOS.scramble;
    if (t.indexOf("salmon") >= 0 || t.indexOf("fish") >= 0) return PHOTOS.salmon;
    if (t.indexOf("pasta") >= 0 || t.indexOf("noodle") >= 0) return PHOTOS.pasta;
    if (t.indexOf("salad") >= 0 || t.indexOf("bowl") >= 0) return PHOTOS.salad;
    if (t.indexOf("soup") >= 0 || t.indexOf("stew") >= 0) return PHOTOS.soup;
    if (t.indexOf("chicken") >= 0) return PHOTOS.chicken;
    return PHOTOS.default;
  }

  function enhanceCards() {
    var cards = document.querySelectorAll("article, [class*='recipe'], [data-meal], [class*='meal']");
    cards.forEach(function (card) {
      if (card.querySelector(".pw-food-hero")) return;
      var titleEl = card.querySelector("h2, h3, [class*='title']");
      if (!titleEl) return;
      var title = titleEl.textContent.trim();
      if (title.length < 3 || title.length > 80) return;
      card.classList.add("pw-food-card");
      var hero = document.createElement("div");
      hero.className = "pw-food-hero";
      hero.style.backgroundImage = "url(" + photoFor(title) + ")";
      hero.setAttribute("aria-hidden", "true");
      card.insertBefore(hero, card.firstChild);
    });
  }

  function injectVersion() {
    var v = window.__DU_APP_VERSION__;
    if (!v) return;
    var more = document.querySelector("nav button:last-child, nav a:last-child");
    if (more && !document.getElementById("pw-version-line")) {
      var p = document.createElement("p");
      p.id = "pw-version-line";
      p.style.cssText = "text-align:center;font-size:11px;color:var(--pw-muted);margin:8px 0 0";
      p.textContent = "Pantry Week " + v;
      more.parentElement && more.parentElement.appendChild(p);
    }
  }

  function run() {
    enhanceCards();
    injectVersion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();
