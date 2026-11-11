/* Permanent Builder Battle / Maker League trophies. Hall of fame stays forever. */
(function () {
  if (window.__duLeagueTrophies) return; window.__duLeagueTrophies = 1;
  var BADGE = "/assets/badges/maker-league-week1.png?v=3";
  var SRCSET = "/assets/badges/maker-league-week1.png?v=3 1x, /assets/badges/maker-league-week1@2x.png?v=3 2x, /assets/badges/maker-league-week1@3x.png?v=3 3x";
  var HALL = [
    { id: "cm_mvfnl9qp_80652919", makerSlug: "media-renamer-pro", week: "2026-10-19", label: "Week 1",
      title: "Builder Battle Week 1 Winner",
      kicker: "Builder Battle", headline: "Week 1 Winner" }
  ];
  var byId = {}, bySlug = {};
  HALL.forEach(function (t) { byId[t.id] = t; if (t.makerSlug) bySlug[t.makerSlug] = t; });

  function css() {
    if (document.querySelector('link[href^="/assets/league/trophies.css"]')) return;
    var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/assets/league/trophies.css?v=5"; document.head.appendChild(l);
  }
  function medal(t, cls) {
    return '<a class="ml-trophy ' + cls + '" href="/league/" title="' + t.title + '" aria-label="' + t.title + '"><img src="' + BADGE + '" srcset="' + SRCSET + '" sizes="56px" alt="' + t.title + '" width="120" height="120" decoding="async"></a>';
  }
  function dirMedal(t) {
    return '<span class="ml-trophy ml-trophy--dir" title="' + t.title + '" aria-label="' + t.title + '"><img src="' + BADGE + '" srcset="' + SRCSET + '" sizes="44px" alt="" width="120" height="120" decoding="async"></span>';
  }
  function banner(t) {
    return '<a class="ml-trophy-banner" href="/league/" aria-label="' + t.title + '">' +
      '<img class="ml-trophy-banner__cup" src="' + BADGE + '" srcset="' + SRCSET + '" sizes="56px" alt="" width="120" height="120" decoding="async">' +
      '<span class="ml-trophy-banner__text">' +
        '<span class="ml-trophy-banner__kicker">' + (t.kicker || "Builder Battle") + '</span>' +
        '<span class="ml-trophy-banner__title">' + (t.headline || "Week 1 Winner") + '</span>' +
      '</span></a>';
  }

  function onCards() {
    document.querySelectorAll("[data-id]").forEach(function (el) {
      var id = el.getAttribute("data-id"); var t = byId[id]; if (!t || el.querySelector(".ml-trophy")) return;
      var media = el.querySelector(".card-media, .media"); if (!media) return;
      var st = window.getComputedStyle(media); if (st.position === "static") media.style.position = "relative";
      media.insertAdjacentHTML("beforeend", medal(t, "ml-trophy--corner"));
    });
  }

  function onProduct() {
    if (!/\/community\/p\/?$/.test(location.pathname)) return;
    var id = new URLSearchParams(location.search).get("id"); var t = byId[id]; if (!t) return;
    var cover = document.querySelector(".dt-cover, .dt-media");
    if (!cover) {
      var medias = document.querySelectorAll("main .media, .media");
      if (medias.length) cover = medias[0];
    }
    if (cover && !cover.querySelector(".ml-trophy")) {
      var st = window.getComputedStyle(cover); if (st.position === "static") cover.style.position = "relative";
      cover.insertAdjacentHTML("beforeend", medal(t, "ml-trophy--corner"));
    }
    if (document.querySelector(".dt-head .ml-trophy-banner, .ml-trophy-banner")) return;
    var h1 = document.querySelector(".dt-head h1");
    if (h1) {
      var maker = h1.parentElement && h1.parentElement.querySelector(".dt-maker");
      (maker || h1).insertAdjacentHTML("afterend", banner(t));
    } else {
      var head = document.querySelector(".dt-head");
      if (head) head.insertAdjacentHTML("beforeend", banner(t));
    }
  }

  function onMaker() {
    var m = location.pathname.match(/^\/makers\/([^/]+)\/?$/); if (!m) return;
    var t = bySlug[m[1]]; if (!t) return;
    document.querySelectorAll(".ml-trophy--hero, .mk-trophy-wrap, .mk-tt .ml-trophy--inline").forEach(function (n) { n.remove(); });
    var bs = document.querySelectorAll(".mk-tt .ml-trophy-banner");
    for (var i = 1; i < bs.length; i++) bs[i].remove();
    if (bs.length) { onCards(); return; }
    var tt = document.querySelector(".mk-tt");
    var h1 = document.querySelector(".mk-tt h1");
    if (tt) tt.insertAdjacentHTML("beforeend", banner(t));
    else if (h1) h1.insertAdjacentHTML("afterend", banner(t));
    onCards();
  }

  function onDirectory() {
    if (!/^\/makers\/?$/.test(location.pathname)) return;
    document.querySelectorAll("#mgrid .mk-card a.mk-card-a").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var m = href.match(/\/makers\/([^/]+)\/?$/); if (!m) return;
      var t = bySlug[m[1]]; if (!t || a.querySelector(".ml-trophy--dir")) return;
      var st = window.getComputedStyle(a); if (st.position === "static") a.style.position = "relative";
      a.insertAdjacentHTML("beforeend", dirMedal(t));
    });
  }

  /* Idempotent + loop-safe: the observer is paused while we write, coalesced to one pass per frame,
     and stops after 15s. (Old version removed + re-inserted the banner on every mutation -> infinite loop / frozen tab.) */
  var mo = null, busy = false, queued = false;
  function run() {
    if (busy) return; busy = true;
    if (mo) mo.disconnect();
    try { css(); onCards(); onProduct(); onMaker(); onDirectory(); } catch (e) {}
    if (mo) { mo.takeRecords(); mo.observe(document.body || document.documentElement, { childList: true, subtree: true }); }
    busy = false;
  }
  function schedule() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(function () { queued = false; run(); }); }
  if (window.MutationObserver) mo = new MutationObserver(schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  setTimeout(run, 800); setTimeout(run, 2200);
  setTimeout(function () { if (mo) { mo.disconnect(); mo = null; } }, 15000);
})();
