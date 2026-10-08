(function () {
  "use strict";

  var GAME_KEY = "cork-game-v3";
  var UNDO_KEY = "cork-undo-v3";
  var SETTINGS_KEY = "cork-settings-v1";
  var OLD_KEY = "cork-offline-v2";

  var state = null;
  var hist = [];
  var settings = loadSettings();
  var hadSave = false;
  var draft = null;
  var lockUntil = 0;
  var pingTimer = null;
  var audioCtx = null;
  var deferredPrompt = null;

  function $(id) { return document.getElementById(id); }

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return { tableMode: !!s.tableMode, feedback: !!s.feedback, welcomed: !!s.welcomed };
    } catch (e) {
      return { tableMode: false, feedback: false, welcomed: false };
    }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }

  function loadGame() {
    var saved = readJSON(GAME_KEY);
    if (saved) return CorkScoring.normalize(saved);
    var old = readJSON(OLD_KEY);
    if (old) return CorkScoring.migrate(old);
    return null;
  }

  function loadUndo() {
    var h = readJSON(UNDO_KEY);
    if (!h || !h.length) return [];
    return h.filter(function (x) { return typeof x === "string"; }).slice(-30);
  }

  function save() {
    try { localStorage.setItem(GAME_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function saveUndo() {
    try { localStorage.setItem(UNDO_KEY, JSON.stringify(hist)); } catch (e) {}
  }

  function snap() {
    hist.push(JSON.stringify(state));
    if (hist.length > 30) hist.shift();
    saveUndo();
  }

  function label(i) {
    var n = String((state.names && state.names[i]) || "").trim();
    return n || (i === 0 ? "Left" : "Right");
  }

  function lastLabel(seat) {
    if (!seat.visits.length) return "—";
    if (seat.visits[0].bust) return "Bust";
    return String(seat.visits[0].score);
  }

  function announce(text) {
    var el = $("live");
    if (!el) return;
    el.textContent = "";
    setTimeout(function () { el.textContent = text; }, 30);
  }

  function ping(text, bad) {
    var el = $("toast");
    el.textContent = text;
    el.className = "toast disp on" + (bad ? " bad" : "");
    if (pingTimer) clearTimeout(pingTimer);
    pingTimer = setTimeout(function () { el.className = "toast disp"; }, 1200);
  }

  function buzz(kind) {
    if (!settings.feedback) return;
    try {
      if (navigator.vibrate) {
        if (kind === "bust") navigator.vibrate(90);
        else if (kind === "out") navigator.vibrate([40, 50, 40]);
        else navigator.vibrate([24, 30, 24, 30, 24]);
      }
    } catch (e) {}
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var notes = kind === "bust" ? [160] : kind === "out" ? [523, 784] : [659, 880, 988];
      var now = audioCtx.currentTime;
      notes.forEach(function (freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        var t = now + i * 0.11;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.11);
      });
    } catch (e2) {}
  }

  function paintChips(container, attr, value) {
    each(container.querySelectorAll("[" + attr + "]"), function (b) {
      var on = String(b.getAttribute(attr)) === String(value);
      b.className = "chip" + (on ? " on" : "");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function paintDraft() {
    if (!draft) return;
    paintChips($("scoreRow"), "data-s", draft.start);
    paintChips($("outRow"), "data-o", draft.doubleOut ? "1" : "0");
    paintChips($("raceRow"), "data-f", draft.firstTo);
    paintChips($("startRow"), "data-w", draft.starter);
  }

  function fillVisits(el, visits) {
    clear(el);
    if (!visits.length) {
      var empty = document.createElement("div");
      empty.className = "visit empty";
      empty.textContent = "No scores yet";
      el.appendChild(empty);
      return;
    }
    visits.slice(0, 40).forEach(function (vis) {
      var row = document.createElement("div");
      row.className = "visit";
      var tag = document.createElement("span");
      tag.textContent = vis.bust ? "Bust" : vis.checkout ? "Out" : "";
      var val = document.createElement("b");
      val.textContent = (vis.bust ? "0" : String(vis.score)) + " → " + vis.left;
      row.appendChild(tag);
      row.appendChild(val);
      el.appendChild(row);
    });
  }

  function render() {
    var i, seat, el, avg, hint, glance;
    document.body.classList.toggle("table", !!settings.tableMode);
    $("meta").textContent = metaText();
    $("undoBtn").disabled = hist.length === 0;
    for (i = 0; i < 2; i++) {
      seat = state.seats[i];
      el = $("seat" + i);
      el.className = "seat" +
        (state.turn === i && !state.over ? " on" : "") +
        (seat.remaining === 0 ? " win" : "") +
        (seat.remaining !== 0 && seat.visits[0] && seat.visits[0].bust ? " busting" : "");
      el.setAttribute("aria-current", state.turn === i && !state.over ? "true" : "false");
      $("who" + i).textContent = (i === 0 ? "Left" : "Right") + (state.turn === i && !state.over ? " · to throw" : "");
      if (document.activeElement !== $("name" + i)) $("name" + i).value = state.names[i] || "";
      $("rem" + i).textContent = String(seat.remaining);
      $("rem" + i).setAttribute("aria-label", label(i) + ", " + seat.remaining + " remaining");
      avg = CorkScoring.average(seat);
      $("avg" + i).textContent = avg == null ? "—" : avg.toFixed(1);
      $("legs" + i).textContent = String(seat.legs);
      $("t180" + i).textContent = String(seat.oneEighties);
      $("last" + i).textContent = lastLabel(seat);
      glance = $("glance" + i);
      hint = CorkCheckouts.hint(seat.remaining, state.doubleOut);
      if (seat.remaining === 0) {
        glance.textContent = state.matchOver ? "Won the match" : "Won the leg";
        glance.className = "glance out";
      } else if (state.turn === i && !state.over && hint) {
        glance.textContent = hint.text;
        glance.className = "glance " + hint.kind;
      } else {
        glance.textContent = "";
        glance.className = "glance";
      }
      fillVisits($("log" + i), seat.visits);
    }
    $("turnName").textContent = label(state.turn);
    $("typed").textContent = state.typed || "0";
    paintHint();
    paintResult();
    paintNet();
  }

  function metaText() {
    var race = state.firstTo ? "First to " + state.firstTo : "Open";
    var out = state.doubleOut ? "Double out" : "Straight out";
    return state.start + " · " + out + " · Leg " + state.leg + " · " +
      state.seats[0].legs + "–" + state.seats[1].legs + " · " + race;
  }

  function paintHint() {
    var el = $("hint");
    var h;
    if (state.over) {
      el.textContent = "";
      el.className = "hint";
      return;
    }
    h = CorkCheckouts.hint(state.seats[state.turn].remaining, state.doubleOut);
    if (!h) {
      el.textContent = "";
      el.className = "hint";
      return;
    }
    el.className = "hint " + h.kind;
    el.textContent = h.kind === "out" ? "Out  " + h.text : h.text;
  }

  function paintResult() {
    var over = !!state.over;
    var w, legs, nextStarter;
    $("entry").hidden = over;
    $("result").hidden = !over;
    if (!over) return;
    w = CorkScoring.winnerIndex(state);
    $("resultTitle").textContent = (w < 0 ? "Leg" : label(w)) + (state.matchOver ? " wins the match" : " wins the leg");
    legs = state.seats[0].legs + "–" + state.seats[1].legs;
    if (state.matchOver) {
      $("resultSub").textContent = "Legs " + legs;
      $("nextLeg").hidden = true;
    } else {
      nextStarter = state.starter === 1 ? 0 : 1;
      $("resultSub").textContent = "Legs " + legs + ". " + label(nextStarter) + " throws next.";
      $("nextLeg").hidden = false;
    }
    paintDarts();
  }

  function paintDarts() {
    var w = CorkScoring.winnerIndex(state);
    var visit, minD;
    if (w < 0) {
      $("dartsRow").hidden = true;
      $("dartsLabel").hidden = true;
      return;
    }
    visit = state.seats[w].visits[0];
    if (!visit || !visit.checkout) {
      $("dartsRow").hidden = true;
      $("dartsLabel").hidden = true;
      return;
    }
    $("dartsRow").hidden = false;
    $("dartsLabel").hidden = false;
    minD = CorkScoring.minDarts(visit.score, state.doubleOut);
    each($("dartsRow").querySelectorAll("[data-darts]"), function (b) {
      var n = parseInt(b.getAttribute("data-darts"), 10);
      var on = n === visit.darts;
      b.disabled = n < minD;
      b.className = "chip" + (on ? " on" : "");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function paintNet() {
    $("offline").hidden = navigator.onLine !== false;
  }

  function sheetOpen() {
    return !$("sheet").hidden;
  }

  function locked() {
    return Date.now() < lockUntil;
  }

  function armLock() {
    lockUntil = Date.now() + 350;
  }

  function onDigit(ch) {
    var next, n;
    if (state.over || sheetOpen()) return;
    if (ch === "C") {
      state.typed = "";
      save();
      $("typed").textContent = "0";
      return;
    }
    next = (state.typed === "0" ? "" : state.typed) + ch;
    n = parseInt(next, 10);
    if (n > 180) return;
    state.typed = String(n);
    save();
    $("typed").textContent = state.typed;
  }

  function commitResult(result, said) {
    armLock();
    snap();
    state = result.state;
    save();
    render();
    if (said) ping(said.text, said.bad);
    if (said && said.buzz) buzz(said.buzz);
  }

  function onScore(n) {
    var preview, route, darts, result, said, who;
    if (locked() || state.over || sheetOpen() || $("app").hidden) return;
    preview = CorkScoring.preview(state.seats[state.turn].remaining, n, state.doubleOut);
    if (!preview.ok) {
      ping(preview.message, true);
      announce(preview.message);
      return;
    }
    darts = null;
    if (preview.type === "checkout") {
      route = CorkCheckouts.route(n, state.doubleOut);
      darts = route ? route.length : preview.minDarts;
      if (darts < preview.minDarts) darts = preview.minDarts;
    }
    result = CorkScoring.apply(state, n, { darts: darts });
    if (result.error) {
      ping(result.message || "Can't score that", true);
      return;
    }
    who = label(state.turn);
    if (result.event === "bust") {
      said = { text: "Bust", bad: true, buzz: "bust" };
    } else if (result.event === "match") {
      said = { text: "Match", bad: false, buzz: "out" };
    } else if (result.event === "checkout") {
      said = { text: "Checkout", bad: false, buzz: "out" };
    } else if (n === 180) {
      said = { text: "180", bad: false, buzz: "180" };
    }
    commitResult(result, said);
    if (result.event === "bust") announce(who + " is bust. " + label(state.turn) + " to throw.");
    else if (result.event === "match") announce(who + " wins the match.");
    else if (result.event === "checkout") announce(who + " checks out.");
    else if (n === 180) announce("180. " + label(state.turn) + " to throw. " + state.seats[state.turn].remaining + " remaining.");
    else announce(label(state.turn) + " to throw. " + state.seats[state.turn].remaining + " remaining.");
  }

  function onBust() {
    var result, who;
    if (locked() || state.over || sheetOpen()) return;
    result = CorkScoring.forceBust(state);
    if (result.error) return;
    who = label(state.turn);
    commitResult(result, { text: "Bust", bad: true, buzz: "bust" });
    announce(who + " is bust. " + label(state.turn) + " to throw.");
  }

  function undo() {
    var prev, parsed, next;
    if (sheetOpen() || $("app").hidden) return;
    lockUntil = 0;
    prev = hist.pop();
    if (!prev) return;
    try { parsed = JSON.parse(prev); } catch (e) { return; }
    next = CorkScoring.normalize(parsed);
    if (!next) return;
    state = next;
    save();
    saveUndo();
    render();
    announce("Undone. " + label(state.turn) + " to throw. " + state.seats[state.turn].remaining + " remaining.");
  }

  function onNextLeg() {
    var result;
    if (sheetOpen()) return;
    result = CorkScoring.nextLeg(state);
    if (result.error) return;
    snap();
    state = result.state;
    save();
    render();
    announce("Leg " + state.leg + ". " + label(state.turn) + " to throw.");
  }

  function hasPlay() {
    var i, seat;
    if (state.leg > 1 || state.over) return true;
    for (i = 0; i < 2; i++) {
      seat = state.seats[i];
      if (seat.darts || seat.legs || seat.visits.length) return true;
    }
    return false;
  }

  function openSheet() {
    draft = {
      start: state.start,
      doubleOut: state.doubleOut,
      firstTo: state.firstTo,
      starter: state.starter === 1 ? 1 : 0
    };
    $("setName0").value = state.names[0] || "";
    $("setName1").value = state.names[1] || "";
    paintDraft();
    $("welcome").hidden = !!settings.welcomed;
    showPane("setup");
    $("sheet").hidden = false;
    document.body.classList.add("lock");
    $("menuBtn").setAttribute("aria-expanded", "true");
    paintToggles();
    paintLicenseLine();
    refreshInstallHints();
    renderStats();
    $("sheetTitle").focus();
  }

  function closeSheet() {
    $("sheet").hidden = true;
    document.body.classList.remove("lock");
    $("menuBtn").setAttribute("aria-expanded", "false");
    if (!hadSave) {
      hadSave = true;
      settings.welcomed = true;
      saveSettings();
      save();
    }
    $("menuBtn").focus();
  }

  function commitMatch() {
    var next;
    if (hadSave && hasPlay() && !window.confirm("Start a new match? This clears the current legs.")) return;
    next = CorkScoring.fresh({
      start: draft.start,
      doubleOut: draft.doubleOut,
      firstTo: draft.firstTo,
      starter: draft.starter,
      names: [$("setName0").value, $("setName1").value]
    });
    if (hadSave) snap();
    state = next;
    hadSave = true;
    settings.welcomed = true;
    saveSettings();
    save();
    closeSheet();
    render();
    announce("New match. " + label(state.turn) + " to throw.");
  }

  function showPane(name) {
    $("setupPane").hidden = name !== "setup";
    $("statsPane").hidden = name !== "stats";
    paintChips($("paneRow"), "data-pane", name);
    if (name === "stats") renderStats();
  }

  function statRows(seat) {
    var avg = CorkScoring.average(seat);
    var co = seat.coAttempts ? (seat.coHits + " / " + seat.coAttempts) : "—";
    return [
      ["Legs", String(seat.legs)],
      ["Average", avg == null ? "—" : avg.toFixed(1)],
      ["Darts", String(seat.darts)],
      ["This leg", String(seat.legDarts)],
      ["180s", String(seat.oneEighties)],
      ["100+", String(seat.hundreds)],
      ["Best visit", seat.high ? String(seat.high) : "—"],
      ["Best leg", seat.bestLeg ? seat.bestLeg + " darts" : "—"],
      ["Checkouts", co]
    ];
  }

  function renderStats() {
    var root = $("statsBody");
    clear(root);
    [0, 1].forEach(function (i) {
      var h = document.createElement("h3");
      var dl = document.createElement("dl");
      h.className = "disp statname";
      h.textContent = label(i);
      dl.className = "statgrid";
      statRows(state.seats[i]).forEach(function (pair) {
        var dt = document.createElement("dt");
        var dd = document.createElement("dd");
        dt.textContent = pair[0];
        dd.textContent = pair[1];
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      root.appendChild(h);
      root.appendChild(dl);
    });
  }

  function paintToggles() {
    $("tableBtn").setAttribute("aria-pressed", settings.tableMode ? "true" : "false");
    $("tableBtn").className = "chip" + (settings.tableMode ? " on" : "");
    $("soundBtn").setAttribute("aria-pressed", settings.feedback ? "true" : "false");
    $("soundBtn").className = "chip" + (settings.feedback ? " on" : "");
  }

  function paintLicenseLine() {
    var mode = CorkLicense.mode();
    if (mode === "preview") $("licenseLine").textContent = "Preview build. Buyers are asked for a key after the Gumroad product id is set.";
    else if (CorkLicense.isUnlocked()) $("licenseLine").textContent = "Unlocked on this device.";
    else $("licenseLine").textContent = "";
  }

  function refreshInstallHints() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (ios && !standalone) {
      $("iosHint").hidden = false;
      $("iosHint").textContent = "On iPhone or iPad: tap Share, then Add to Home Screen. Cork then opens like an app, with no wifi.";
    } else {
      $("iosHint").hidden = true;
    }
  }

  function bind() {
    each(document.querySelectorAll(".key[data-k]"), function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-k");
        if (k === "GO") onScore(parseInt(state.typed || "0", 10));
        else onDigit(k);
      });
    });
    each(document.querySelectorAll(".q"), function (b) {
      b.addEventListener("click", function () { onScore(parseInt(b.getAttribute("data-q"), 10)); });
    });
    $("bustBtn").addEventListener("click", onBust);
    $("clearBtn").addEventListener("click", function () { onDigit("C"); });
    $("undoBtn").addEventListener("click", undo);
    $("menuBtn").addEventListener("click", openSheet);
    $("closeSheet").addEventListener("click", closeSheet);
    $("fresh").addEventListener("click", commitMatch);
    $("nextLeg").addEventListener("click", onNextLeg);
    $("resultNew").addEventListener("click", openSheet);
    $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });
    $("scoreRow").addEventListener("click", function (e) {
      var t = e.target.closest("[data-s]");
      if (!t || !draft) return;
      draft.start = parseInt(t.getAttribute("data-s"), 10);
      paintDraft();
    });
    $("outRow").addEventListener("click", function (e) {
      var t = e.target.closest("[data-o]");
      if (!t || !draft) return;
      draft.doubleOut = t.getAttribute("data-o") === "1";
      paintDraft();
    });
    $("raceRow").addEventListener("click", function (e) {
      var t = e.target.closest("[data-f]");
      if (!t || !draft) return;
      draft.firstTo = parseInt(t.getAttribute("data-f"), 10);
      paintDraft();
    });
    $("startRow").addEventListener("click", function (e) {
      var t = e.target.closest("[data-w]");
      if (!t || !draft) return;
      draft.starter = parseInt(t.getAttribute("data-w"), 10) === 1 ? 1 : 0;
      paintDraft();
    });
    $("paneRow").addEventListener("click", function (e) {
      var t = e.target.closest("[data-pane]");
      if (!t) return;
      showPane(t.getAttribute("data-pane"));
    });
    $("tableBtn").addEventListener("click", function () {
      settings.tableMode = !settings.tableMode;
      saveSettings();
      paintToggles();
      render();
    });
    $("soundBtn").addEventListener("click", function () {
      settings.feedback = !settings.feedback;
      saveSettings();
      paintToggles();
      if (settings.feedback) buzz("out");
    });
    $("dartsRow").addEventListener("click", function (e) {
      var t = e.target.closest("[data-darts]");
      var result;
      if (!t || t.disabled) return;
      result = CorkScoring.setCheckoutDarts(state, parseInt(t.getAttribute("data-darts"), 10));
      if (result.error) return;
      state = result.state;
      save();
      render();
    });
    [0, 1].forEach(function (i) {
      $("name" + i).addEventListener("input", function () {
        state.names[i] = $("name" + i).value.slice(0, 18);
        if (document.activeElement !== $("setName" + i)) $("setName" + i).value = state.names[i];
        if (state.turn === i && !state.over) $("turnName").textContent = label(i);
        save();
      });
      $("name" + i).addEventListener("change", function () {
        state.names[i] = CorkScoring.cleanName($("name" + i).value);
        $("name" + i).value = state.names[i];
        save();
        render();
      });
      $("setName" + i).addEventListener("input", function () {
        state.names[i] = $("setName" + i).value.slice(0, 18);
        if (document.activeElement !== $("name" + i)) $("name" + i).value = state.names[i];
        save();
      });
    });
    $("sheet").addEventListener("keydown", function (e) {
      var nodes, list, first, last;
      if (e.key !== "Tab" || $("sheet").hidden) return;
      nodes = $("sheet").querySelectorAll("button, input");
      list = Array.prototype.filter.call(nodes, function (n) {
        return !n.disabled && !n.hidden && n.offsetParent !== null;
      });
      if (!list.length) return;
      first = list[0];
      last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.addEventListener("keydown", function (e) {
      var tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === "Escape") {
        if (sheetOpen()) closeSheet();
        return;
      }
      if ($("gate") && !$("gate").hidden) return;
      if (sheetOpen()) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === "u" || e.key === "U") { undo(); return; }
      if (!state || state.over) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        state.typed = state.typed.slice(0, -1);
        save();
        $("typed").textContent = state.typed || "0";
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onScore(parseInt(state.typed || "0", 10));
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        onDigit(e.key);
      }
    });
    $("gateForm").addEventListener("submit", function (e) {
      var btn = $("unlockBtn");
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = "Checking…";
      $("gateMsg").textContent = "";
      CorkLicense.unlock($("licenseKey").value).then(function (r) {
        btn.disabled = false;
        btn.textContent = "Unlock";
        if (!r.ok) {
          $("gateMsg").textContent = r.message || "That key didn't unlock Cork.";
          return;
        }
        $("licenseKey").value = "";
        showApp();
        startGame();
      });
    });
    $("installBtn").addEventListener("click", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        $("installBtn").hidden = true;
      });
    });
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      $("installBtn").hidden = false;
    });
    window.addEventListener("online", paintNet);
    window.addEventListener("offline", paintNet);
    window.addEventListener("pagehide", function () { if (state) save(); });
    window.addEventListener("storage", function (e) {
      var next;
      if (e.key !== GAME_KEY || !e.newValue || !state) return;
      try { next = CorkScoring.normalize(JSON.parse(e.newValue)); } catch (err) { return; }
      if (!next) return;
      state = next;
      hist = loadUndo();
      render();
    });
  }

  function startGame() {
    var saved = loadGame();
    if (saved) {
      state = saved;
      hist = loadUndo();
      hadSave = true;
      settings.welcomed = true;
    } else {
      state = CorkScoring.fresh({ start: 501, doubleOut: true, firstTo: 3 });
      hist = [];
      hadSave = false;
    }
    render();
    if (!hadSave) openSheet();
    else announce(label(state.turn) + " to throw. " + state.seats[state.turn].remaining + " remaining.");
  }

  function showApp() {
    $("gate").hidden = true;
    $("app").hidden = false;
    document.body.classList.remove("lock");
  }

  function showGate(message, broken) {
    $("app").hidden = true;
    $("gate").hidden = false;
    document.body.classList.add("lock");
    if (broken) {
      $("gateLoading").hidden = false;
      $("gateLoading").textContent = message;
      $("gateForm").hidden = true;
      return;
    }
    $("gateLoading").hidden = true;
    $("gateForm").hidden = false;
    $("gateMsg").textContent = message || "";
    setTimeout(function () { $("licenseKey").focus(); }, 0);
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }

  function boot() {
    var mode;
    if (!window.CorkScoring || !window.CorkCheckouts || !window.CorkLicense) {
      throw new Error("Cork scripts missing");
    }
    bind();
    paintNet();
    mode = CorkLicense.mode();
    if (mode === "broken") {
      $("warn").hidden = true;
      showGate("Cork can't find its config file, so it won't open.", true);
      return;
    }
    if (mode === "preview") {
      $("warn").hidden = true;
      showApp();
      $("preview").hidden = false;
      startGame();
      registerSW();
      return;
    }
    $("preview").hidden = true;
    if (CorkLicense.isUnlocked()) {
      $("warn").hidden = true;
      showApp();
      startGame();
      registerSW();
      CorkLicense.recheck().then(function (r) {
        if (r && r.locked) showGate(r.message || "This key no longer unlocks Cork.");
      });
      return;
    }
    $("warn").hidden = true;
    showGate("");
    registerSW();
  }

  try {
    boot();
  } catch (e) {
    if ($("warn")) {
      $("warn").hidden = false;
      $("warn").textContent = "Cork hit a problem loading. Reload the page.";
    }
  }
})();
