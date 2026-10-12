(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wideQ = window.matchMedia("(min-width: 720px)");

  function activeVideo(stage) {
    return wideQ.matches
      ? stage.querySelector(".share-promo--sq")
      : stage.querySelector(".share-promo--port");
  }

  function arm(v) {
    if (!v || v.getAttribute("src")) return;
    var src = v.getAttribute("data-src");
    if (!src) return;
    v.src = src;
    v.load();
  }

  function play(v) {
    if (!v || reduce) return;
    arm(v);
    var start = function () {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (v.readyState >= 2) start();
    else v.addEventListener("canplay", start, { once: true });
  }

  function pauseInactive(stage) {
    stage.querySelectorAll(".share-promo").forEach(function (v) {
      if (v !== activeVideo(stage)) v.pause();
    });
  }

  document.querySelectorAll("[data-share-promo]").forEach(function (stage) {
    var btn = stage.querySelector(".share-promo-sound");
    function syncSoundUi(on) {
      if (!btn) return;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Sound on" : "Sound off");
    }
    syncSoundUi(false);

    function playActive() {
      pauseInactive(stage);
      play(activeVideo(stage));
    }

    if ("IntersectionObserver" in window) {
      var watch = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) playActive();
            else stage.querySelectorAll(".share-promo").forEach(function (v) {
              v.pause();
            });
          });
        },
        { threshold: 0.35 }
      );
      watch.observe(stage);
    } else {
      playActive();
    }

    if (wideQ.addEventListener) {
      wideQ.addEventListener("change", function () {
        stage.querySelectorAll(".share-promo").forEach(function (v) {
          v.removeAttribute("src");
        });
        playActive();
      });
    }

    if (btn) {
      btn.addEventListener("click", function () {
        var v = activeVideo(stage);
        if (!v) return;
        arm(v);
        var enable = v.muted;
        v.muted = !enable;
        syncSoundUi(enable);
        if (enable) play(v);
      });
    }
  });
})();
