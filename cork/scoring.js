/* Cork scoring for 501 / 301 / 701.
   A visit is the total of up to three darts.
   Impossible totals are rejected and do not change the leg.
   Double out: exact 0 counts only when some finish ends on a double or bull.
   If the total could be a double finish, the scorer is trusted.
   A separate Bust action covers "hit the number, but not on a double". */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CorkScoring = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var FACES = (function () {
    var list = [];
    var i;
    for (i = 1; i <= 20; i++) {
      list.push(i, i * 2, i * 3);
    }
    list.push(25, 50);
    var seen = {};
    var unique = [];
    for (i = 0; i < list.length; i++) {
      if (!seen[list[i]]) {
        seen[list[i]] = true;
        unique.push(list[i]);
      }
    }
    unique.sort(function (a, b) { return a - b; });
    return unique;
  })();

  var FACE = {};
  var DOUBLES = [];
  (function () {
    var i;
    for (i = 0; i < FACES.length; i++) FACE[FACES[i]] = true;
    for (i = 1; i <= 20; i++) DOUBLES.push(i * 2);
    DOUBLES.push(50);
  })();

  var WITH_MISS = [0].concat(FACES);

  var POSSIBLE = (function () {
    var can = [];
    var a, b, c, s;
    for (a = 0; a <= 180; a++) can[a] = false;
    for (a = 0; a < WITH_MISS.length; a++) {
      for (b = 0; b < WITH_MISS.length; b++) {
        for (c = 0; c < WITH_MISS.length; c++) {
          s = WITH_MISS[a] + WITH_MISS[b] + WITH_MISS[c];
          if (s <= 180) can[s] = true;
        }
      }
    }
    return can;
  })();

  var IMPOSSIBLE = [];
  (function () {
    var n;
    for (n = 0; n <= 180; n++) if (!POSSIBLE[n]) IMPOSSIBLE.push(n);
  })();

  /* Minimum darts to finish on a double. 0 means it cannot be done. */
  var CHECKOUT_MIN = (function () {
    var min = [];
    var i, j, k, s, a, b, d;
    for (i = 0; i <= 180; i++) min[i] = 0;
    for (i = 0; i < DOUBLES.length; i++) min[DOUBLES[i]] = 1;
    for (i = 0; i < FACES.length; i++) {
      a = FACES[i];
      for (j = 0; j < DOUBLES.length; j++) {
        s = a + DOUBLES[j];
        if (s <= 180 && (min[s] === 0 || min[s] > 2)) min[s] = 2;
      }
    }
    for (i = 0; i < FACES.length; i++) {
      a = FACES[i];
      for (j = 0; j < FACES.length; j++) {
        b = FACES[j];
        for (k = 0; k < DOUBLES.length; k++) {
          d = DOUBLES[k];
          s = a + b + d;
          if (s <= 180 && min[s] === 0) min[s] = 3;
        }
      }
    }
    return min;
  })();

  function straightMin(score) {
    var i, j, a, b;
    if (!possibleVisit(score) || score < 1) return 0;
    if (FACE[score]) return 1;
    for (i = 0; i < FACES.length; i++) {
      a = FACES[i];
      b = score - a;
      if (b > 0 && FACE[b]) return 2;
    }
    return 3;
  }

  function possibleVisit(n) {
    return n === (n | 0) && n >= 0 && n <= 180 && POSSIBLE[n] === true;
  }

  function minDarts(score, doubleOut) {
    if (!possibleVisit(score) || score < 1) return 0;
    if (doubleOut) return CHECKOUT_MIN[score] || 0;
    return straightMin(score);
  }

  function canFinish(score, doubleOut) {
    return minDarts(score, doubleOut) > 0;
  }

  function isFinishable(remaining, doubleOut) {
    return canFinish(remaining, doubleOut);
  }

  function classify(remaining, score, doubleOut) {
    var next;
    if (!possibleVisit(score)) {
      return { ok: false, reason: "impossible", message: "No way to score " + score };
    }
    next = remaining - score;
    if (next < 0) return { ok: true, type: "bust", reason: "over" };
    if (doubleOut && next === 1) return { ok: true, type: "bust", reason: "leave1" };
    if (next === 0) {
      if (!canFinish(score, doubleOut)) return { ok: true, type: "bust", reason: "nofinish" };
      return { ok: true, type: "checkout", minDarts: minDarts(score, doubleOut) };
    }
    return { ok: true, type: "score", next: next };
  }

  function clone(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function cleanName(n) {
    return String(n == null ? "" : n).replace(/\s+/g, " ").trim().slice(0, 18);
  }

  function nonNegInt(n) {
    n = n | 0;
    if (n < 0) return 0;
    if (n > 10000000) return 10000000;
    return n;
  }

  function sanitizeTyped(t) {
    t = String(t == null ? "" : t);
    if (!/^\d{1,3}$/.test(t)) return "";
    var n = parseInt(t, 10);
    if (n > 180) return "";
    return String(n);
  }

  function emptySeat(start) {
    return {
      remaining: start,
      visits: [],
      points: 0,
      darts: 0,
      legDarts: 0,
      legs: 0,
      last: null,
      hundreds: 0,
      oneEighties: 0,
      high: 0,
      bestLeg: null,
      legDartHistory: [],
      coAttempts: 0,
      coHits: 0
    };
  }

  function isVisit(v) {
    return v && typeof v === "object" && (v.score === (v.score | 0));
  }

  function normalizeSeat(o, start) {
    var seat = emptySeat(start);
    var rem, i, hist;
    o = o || {};
    rem = Number(o.remaining);
    if (rem === rem && rem >= 0 && rem <= start && (rem === (rem | 0))) seat.remaining = rem;
    seat.visits = [];
    if (Object.prototype.toString.call(o.visits) === "[object Array]") {
      for (i = 0; i < o.visits.length && seat.visits.length < 60; i++) {
        if (isVisit(o.visits[i])) {
          seat.visits.push({
            score: nonNegInt(o.visits[i].score),
            left: nonNegInt(o.visits[i].left),
            bust: !!o.visits[i].bust,
            checkout: !!o.visits[i].checkout,
            darts: o.visits[i].darts == null ? 3 : nonNegInt(o.visits[i].darts) || 3
          });
        }
      }
    }
    seat.points = nonNegInt(o.points);
    seat.darts = nonNegInt(o.darts);
    seat.legDarts = nonNegInt(o.legDarts);
    seat.legs = nonNegInt(o.legs);
    seat.hundreds = nonNegInt(o.hundreds);
    seat.oneEighties = nonNegInt(o.oneEighties);
    seat.high = nonNegInt(o.high);
    seat.coAttempts = nonNegInt(o.coAttempts);
    seat.coHits = nonNegInt(o.coHits);
    seat.last = (o.last === 0 || (o.last && o.last === (o.last | 0))) ? nonNegInt(o.last) : null;
    hist = [];
    if (Object.prototype.toString.call(o.legDartHistory) === "[object Array]") {
      for (i = 0; i < o.legDartHistory.length && hist.length < 40; i++) {
        if (o.legDartHistory[i] === (o.legDartHistory[i] | 0) && o.legDartHistory[i] > 0) hist.push(o.legDartHistory[i]);
      }
    }
    seat.legDartHistory = hist;
    if (hist.length) {
      seat.bestLeg = hist[0];
      for (i = 1; i < hist.length; i++) if (hist[i] < seat.bestLeg) seat.bestLeg = hist[i];
    } else if (o.bestLeg === (o.bestLeg | 0) && o.bestLeg > 0) {
      seat.bestLeg = o.bestLeg;
    }
    return seat;
  }

  function allowedStart(n) {
    return n === 301 || n === 501 || n === 701 ? n : 501;
  }

  function allowedFirstTo(n) {
    if (n === 0) return 0;
    if (n === 1 || n === 2 || n === 3 || n === 5) return n;
    return 3;
  }

  function fresh(o) {
    var start, names;
    o = o || {};
    start = allowedStart(o.start);
    names = o.names || ["", ""];
    return {
      v: 3,
      start: start,
      doubleOut: o.doubleOut !== false,
      firstTo: allowedFirstTo(o.firstTo),
      leg: 1,
      starter: o.starter === 1 ? 1 : 0,
      turn: o.starter === 1 ? 1 : 0,
      names: [cleanName(names[0]), cleanName(names[1])],
      seats: [emptySeat(start), emptySeat(start)],
      typed: "",
      over: false,
      matchOver: false
    };
  }

  function healFlags(state) {
    var a = state.seats[0].remaining === 0;
    var b = state.seats[1].remaining === 0;
    if (a || b) state.over = true;
    else state.over = false;
    if (state.firstTo > 0 && (state.seats[0].legs >= state.firstTo || state.seats[1].legs >= state.firstTo)) {
      state.matchOver = true;
      state.over = true;
    } else {
      state.matchOver = false;
    }
    return state;
  }

  function normalize(s) {
    var state;
    if (!s || !s.seats || s.seats.length !== 2) return null;
    state = fresh({
      start: s.start,
      doubleOut: s.doubleOut,
      firstTo: typeof s.firstTo === "number" ? s.firstTo : 3,
      names: s.names,
      starter: s.starter === 1 ? 1 : 0
    });
    state.leg = Math.max(1, parseInt(s.leg, 10) || 1);
    state.turn = s.turn === 1 ? 1 : 0;
    state.starter = s.starter === 1 ? 1 : 0;
    state.typed = sanitizeTyped(s.typed);
    state.seats = [normalizeSeat(s.seats[0], state.start), normalizeSeat(s.seats[1], state.start)];
    return healFlags(state);
  }

  function migrate(old) {
    var state, i, o, seat;
    if (!old || !old.seats || old.seats.length !== 2) return null;
    state = fresh({
      start: old.start,
      doubleOut: old.doubleOut,
      names: old.names,
      firstTo: 0,
      starter: 0
    });
    state.leg = Math.max(1, parseInt(old.leg, 10) || 1);
    state.turn = old.turn === 1 ? 1 : 0;
    state.typed = sanitizeTyped(old.typed);
    for (i = 0; i < 2; i++) {
      o = old.seats[i] || {};
      seat = normalizeSeat({
        remaining: o.remaining,
        visits: o.visits,
        points: o.points,
        darts: o.darts,
        legs: o.legs,
        last: o.last
      }, state.start);
      state.seats[i] = seat;
    }
    return healFlags(state);
  }

  function noteScore(seat, score) {
    if (score >= 100) seat.hundreds += 1;
    if (score === 180) seat.oneEighties += 1;
    if (score > seat.high) seat.high = score;
    seat.last = score;
  }

  function recordAttempt(seat, remaining, doubleOut) {
    if (isFinishable(remaining, doubleOut)) seat.coAttempts += 1;
  }

  function apply(state, score, opts) {
    var preview, next, seat, darts, minD, remaining;
    opts = opts || {};
    if (!state || state.over || state.matchOver) return { error: "over", message: "This leg is already over." };
    if (score !== (score | 0)) return { error: "impossible", message: "No way to score that." };
    preview = classify(state.seats[state.turn].remaining, score, state.doubleOut);
    if (!preview.ok) return { error: preview.reason, message: preview.message };
    next = clone(state);
    seat = next.seats[next.turn];
    remaining = seat.remaining;
    if (preview.type === "bust") {
      recordAttempt(seat, remaining, next.doubleOut);
      seat.visits.unshift({ score: 0, left: seat.remaining, bust: true, checkout: false, darts: 3 });
      if (seat.visits.length > 60) seat.visits.pop();
      seat.darts += 3;
      seat.legDarts += 3;
      seat.last = 0;
      next.turn = 1 - next.turn;
      next.typed = "";
      return { state: next, event: "bust", reason: preview.reason };
    }
    if (preview.type === "checkout") {
      minD = preview.minDarts;
      darts = opts.darts == null ? minD : (opts.darts | 0);
      if (darts < minD) darts = minD;
      if (darts > 3) darts = 3;
      recordAttempt(seat, remaining, next.doubleOut);
      seat.coHits += 1;
      seat.visits.unshift({ score: score, left: 0, bust: false, checkout: true, darts: darts });
      seat.remaining = 0;
      seat.points += score;
      seat.darts += darts;
      seat.legDarts += darts;
      noteScore(seat, score);
      seat.legs += 1;
      seat.legDartHistory.push(seat.legDarts);
      seat.bestLeg = seat.legDartHistory[0];
      var h;
      for (h = 1; h < seat.legDartHistory.length; h++) {
        if (seat.legDartHistory[h] < seat.bestLeg) seat.bestLeg = seat.legDartHistory[h];
      }
      next.over = true;
      next.typed = "";
      if (next.firstTo > 0 && seat.legs >= next.firstTo) {
        next.matchOver = true;
        return { state: next, event: "match", darts: darts };
      }
      return { state: next, event: "checkout", darts: darts };
    }
    seat.visits.unshift({ score: score, left: preview.next, bust: false, checkout: false, darts: 3 });
    if (seat.visits.length > 60) seat.visits.pop();
    seat.remaining = preview.next;
    seat.points += score;
    seat.darts += 3;
    seat.legDarts += 3;
    noteScore(seat, score);
    recordAttempt(seat, remaining, next.doubleOut);
    next.turn = 1 - next.turn;
    next.typed = "";
    return { state: next, event: "score" };
  }

  function forceBust(state) {
    var next, seat, remaining;
    if (!state || state.over || state.matchOver) return { error: "over", message: "This leg is already over." };
    next = clone(state);
    seat = next.seats[next.turn];
    remaining = seat.remaining;
    recordAttempt(seat, remaining, next.doubleOut);
    seat.visits.unshift({ score: 0, left: seat.remaining, bust: true, checkout: false, darts: 3 });
    if (seat.visits.length > 60) seat.visits.pop();
    seat.darts += 3;
    seat.legDarts += 3;
    seat.last = 0;
    next.turn = 1 - next.turn;
    next.typed = "";
    return { state: next, event: "bust", reason: "manual" };
  }

  function setCheckoutDarts(state, darts) {
    var next, i, seat, visit, minD, delta, h;
    if (!state || !state.over) return { error: "notover" };
    i = state.seats[0].remaining === 0 ? 0 : (state.seats[1].remaining === 0 ? 1 : -1);
    if (i < 0) return { error: "nocheckout" };
    visit = state.seats[i].visits[0];
    if (!visit || !visit.checkout) return { error: "nocheckout" };
    minD = minDarts(visit.score, state.doubleOut);
    darts = darts | 0;
    if (darts < minD || darts > 3) return { error: "darts" };
    next = clone(state);
    seat = next.seats[i];
    visit = seat.visits[0];
    delta = darts - visit.darts;
    visit.darts = darts;
    seat.darts += delta;
    seat.legDarts += delta;
    if (seat.legDartHistory.length) seat.legDartHistory[seat.legDartHistory.length - 1] = seat.legDarts;
    if (seat.legDartHistory.length) {
      seat.bestLeg = seat.legDartHistory[0];
      for (h = 1; h < seat.legDartHistory.length; h++) {
        if (seat.legDartHistory[h] < seat.bestLeg) seat.bestLeg = seat.legDartHistory[h];
      }
    }
    return { state: next };
  }

  function nextLeg(state) {
    var next, i, seat;
    if (!state || !state.over || state.matchOver) return { error: "notready", message: "Finish the leg before starting another." };
    next = clone(state);
    next.leg += 1;
    next.starter = 1 - (state.starter === 1 ? 1 : 0);
    next.turn = next.starter;
    next.over = false;
    next.matchOver = false;
    next.typed = "";
    for (i = 0; i < 2; i++) {
      seat = next.seats[i];
      seat.remaining = next.start;
      seat.visits = [];
      seat.last = null;
      seat.legDarts = 0;
    }
    return { state: next, event: "leg" };
  }

  function average(seat) {
    if (!seat || !seat.darts) return null;
    return seat.points / seat.darts * 3;
  }

  function winnerIndex(state) {
    if (!state || !state.over) return -1;
    if (state.seats[0].remaining === 0) return 0;
    if (state.seats[1].remaining === 0) return 1;
    return -1;
  }

  return {
    FACES: FACES,
    IMPOSSIBLE: IMPOSSIBLE,
    CHECKOUT_MIN: CHECKOUT_MIN,
    possibleVisit: possibleVisit,
    minDarts: minDarts,
    canFinish: canFinish,
    isFinishable: isFinishable,
    classify: classify,
    preview: classify,
    fresh: fresh,
    normalize: normalize,
    migrate: migrate,
    apply: apply,
    forceBust: forceBust,
    setCheckoutDarts: setCheckoutDarts,
    nextLeg: nextLeg,
    average: average,
    winnerIndex: winnerIndex,
    cleanName: cleanName,
    clone: clone
  };
});
