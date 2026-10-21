/* Hero background music: "Lost Frontier" Kevin MacLeod (incompetech.com), licensed under CC BY 4.0 http://creativecommons.org/licenses/by/4.0/ (previous track: "Solar Sail" by vitalezzz, CC0, kept at /assets/audio/solar-sail-loop.mp3 for rollback). Web Audio for a gapless loop; file loaded on first tap only. */
(function () {
  var btn = document.getElementById("hero-music");
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) return;
  var KEY = "du_store_music", SRC = "/assets/audio/lost-frontier-loop.mp3?v=1", VOL = 0.6, FADE_IN = 1.5, FADE_OUT = 0.6;
  var ctx = null, gain = null, src = null, buf = null, loading = null, on = false, hiddenPaused = false;
  btn.hidden = false;

  function setUi(state) {
    on = state;
    btn.classList.toggle("is-on", state);
    btn.setAttribute("aria-pressed", state ? "true" : "false");
    btn.setAttribute("aria-label", state ? "Mute background music" : "Play background music");
    btn.title = state ? "Mute music" : "Play music";
  }
  function save(v) { try { localStorage.setItem(KEY, v ? "on" : "off"); } catch (_) {} }
  function load() {
    if (loading) return loading;
    ctx = ctx || new AC();
    gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
    btn.classList.add("is-loading");
    loading = fetch(SRC).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); })
      .then(function (b) { buf = b; btn.classList.remove("is-loading"); return b; })
      .catch(function (e) { btn.classList.remove("is-loading"); loading = null; throw e; });
    return loading;
  }
  function ramp(to, secs) {
    var t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(to, t + secs);
  }
  function play() {
    setUi(true);
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
    load().then(function () {
      if (!on) return;
      if (ctx.state === "suspended") ctx.resume();
      if (!src) { src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(gain); src.start(); }
      ramp(VOL, FADE_IN);
    }).catch(function () { setUi(false); });
  }
  function stop() {
    setUi(false);
    if (!ctx || !gain) return;
    ramp(0, FADE_OUT);
    setTimeout(function () { if (!on && ctx.state === "running") ctx.suspend(); }, FADE_OUT * 1000 + 60);
  }
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    pendingResume = false;
    if (on) { stop(); save(false); } else { play(); save(true); }
  });

  // Remembered "on": browsers need a user gesture, so resume on the first tap/key anywhere.
  var pendingResume = false;
  try { pendingResume = localStorage.getItem(KEY) === "on"; } catch (_) {}
  if (pendingResume) {
    btn.classList.add("is-armed");
    var resume = function (e) {
      if (!pendingResume || (e.target && e.target.closest && e.target.closest("#hero-music"))) return;
      pendingResume = false; btn.classList.remove("is-armed");
      play();
      ["pointerdown", "keydown"].forEach(function (t) { removeEventListener(t, resume, true); });
    };
    ["pointerdown", "keydown"].forEach(function (t) { addEventListener(t, resume, true); });
  }

  document.addEventListener("visibilitychange", function () {
    if (!ctx || !on) return;
    if (document.hidden) { hiddenPaused = true; ctx.suspend(); }
    else if (hiddenPaused) { hiddenPaused = false; ctx.resume(); }
  });
  setUi(false);
})();
