/* Preferred double-out routes. Each one is checked by test/scoring.test.js:
   the darts add up, and the last dart is a double or the bull.
   50 is the bull, one dart. Bogey numbers have no route. */
(function (root, factory) {
  var scoring = (typeof module === "object" && module.exports) ? require("./scoring.js") : root.CorkScoring;
  var api = factory(scoring);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CorkCheckouts = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Scoring) {
  "use strict";

  var RAW = [
    "170:T20 T20 Bull", "167:T20 T19 Bull", "164:T20 T18 Bull", "161:T20 T17 Bull",
    "160:T20 T20 D20", "158:T20 T20 D19", "157:T20 T19 D20", "156:T20 T20 D18",
    "155:T20 T19 D19", "154:T20 T18 D20", "153:T20 T19 D18", "152:T20 T20 D16",
    "151:T20 T17 D20", "150:T20 T18 D18", "149:T20 T19 D16", "148:T20 T16 D20",
    "147:T20 T17 D18", "146:T20 T18 D16", "145:T20 T15 D20", "144:T20 T20 D12",
    "143:T20 T17 D16", "142:T20 T14 D20", "141:T20 T19 D12", "140:T20 T20 D10",
    "139:T20 T13 D20", "138:T20 T18 D12", "137:T20 T19 D10", "136:T20 T20 D8",
    "135:T20 T17 D12", "134:T20 T14 D16", "133:T20 T19 D8", "132:T20 T16 D12",
    "131:T20 T13 D16", "130:T20 T18 D8", "129:T19 T16 D12", "128:T18 T14 D16",
    "127:T20 T17 D8", "126:T19 T19 D6", "125:T20 T15 D10", "124:T20 T16 D8",
    "123:T20 T13 D12", "122:T20 T14 D10", "121:T20 T15 D8",
    "120:T20 20 D20", "119:T20 19 D20", "118:T20 18 D20", "117:T20 17 D20",
    "116:T20 16 D20", "115:T20 15 D20", "114:T20 14 D20", "113:T20 13 D20",
    "112:T20 12 D20", "111:T20 11 D20", "110:T20 10 D20", "109:T20 9 D20",
    "108:T20 8 D20", "107:T19 10 D20", "106:T20 6 D20", "105:T20 5 D20",
    "104:T20 4 D20", "103:T19 6 D20", "102:T20 10 D16", "101:T17 10 D20",
    "100:T20 D20", "99:T19 10 D16", "98:T20 D19", "97:T19 D20", "96:T20 D18",
    "95:T19 D19", "94:T18 D20", "93:T19 D18", "92:T20 D16", "91:T17 D20",
    "90:T18 D18", "89:T19 D16", "88:T20 D14", "87:T17 D18", "86:T18 D16",
    "85:T15 D20", "84:T20 D12", "83:T17 D16", "82:T14 D20", "81:T19 D12",
    "80:T20 D10", "79:T19 D11", "78:T18 D12", "77:T19 D10", "76:T20 D8",
    "75:T17 D12", "74:T14 D16", "73:T19 D8", "72:T16 D12", "71:T13 D16",
    "70:T18 D8", "69:T19 D6", "68:T20 D4", "67:T17 D8", "66:T10 D18",
    "65:T19 D4", "64:T16 D8", "63:T13 D12", "62:T10 D16", "61:T15 D8",
    "60:20 D20", "59:19 D20", "58:18 D20", "57:17 D20", "56:16 D20",
    "55:15 D20", "54:14 D20", "53:13 D20", "52:12 D20", "51:11 D20",
    "50:Bull", "49:9 D20", "48:8 D20", "47:7 D20", "46:6 D20", "45:5 D20",
    "44:4 D20", "43:3 D20", "42:10 D16", "41:9 D16",
    "40:D20", "39:7 D16", "38:D19", "37:5 D16", "36:D18", "35:3 D16",
    "34:D17", "33:1 D16", "32:D16", "31:15 D8", "30:D15", "29:13 D8",
    "28:D14", "27:11 D8", "26:D13", "25:9 D8", "24:D12", "23:7 D8",
    "22:D11", "21:5 D8", "20:D10", "19:3 D8", "18:D9", "17:9 D4",
    "16:D8", "15:7 D4", "14:D7", "13:5 D4", "12:D6", "11:3 D4",
    "10:D5", "9:1 D4", "8:D4", "7:3 D2", "6:D3", "5:1 D2", "4:D2",
    "3:1 D1", "2:D1"
  ];

  var BOGEYS = { 159: true, 162: true, 163: true, 165: true, 166: true, 168: true, 169: true };

  function tokenValue(tok) {
    var m, n, v;
    if (tok === "Bull") return 50;
    m = /^([TDS])(\d{1,2})$/.exec(tok);
    if (m) {
      n = parseInt(m[2], 10);
      if (n < 1 || n > 20) return NaN;
      if (m[1] === "T") return n * 3;
      if (m[1] === "D") return n * 2;
      return n;
    }
    if (/^\d{1,2}$/.test(tok)) {
      v = parseInt(tok, 10);
      if ((v >= 1 && v <= 20) || v === 25) return v;
    }
    return NaN;
  }

  var ROUTES = {};
  (function () {
    var i, parts, score, darts;
    for (i = 0; i < RAW.length; i++) {
      parts = RAW[i].split(":");
      score = parseInt(parts[0], 10);
      darts = parts[1].split(" ");
      ROUTES[score] = darts;
    }
  })();

  function route(score, doubleOut) {
    var darts = ROUTES[score];
    if (!darts) return null;
    if (doubleOut && (score < 2 || score > 170 || BOGEYS[score])) return null;
    return darts.slice();
  }

  function hint(remaining, doubleOut) {
    var darts, need;
    if (remaining !== (remaining | 0) || remaining <= 0) return null;
    if (doubleOut) {
      if (remaining > 180) return null;
      if (remaining > 170) return { kind: "none", route: null, text: "No finish this visit" };
      darts = ROUTES[remaining];
      if (!darts || BOGEYS[remaining]) {
        need = remaining - 32;
        if (need > 0 && Scoring.possibleVisit(need)) {
          return { kind: "bogey", route: null, text: "No finish · score " + need + " to leave 32" };
        }
        return { kind: "bogey", route: null, text: "No finish on a double" };
      }
      return { kind: "out", route: darts.slice(), text: darts.join(" · ") };
    }
    if (remaining > 180 || !Scoring.possibleVisit(remaining)) {
      if (remaining > 180) return null;
      return { kind: "none", route: null, text: "Can't finish this visit" };
    }
    darts = ROUTES[remaining];
    if (darts) return { kind: "out", route: darts.slice(), text: darts.join(" · ") };
    return { kind: "out", route: null, text: "Score " + remaining };
  }

  return {
    BOGEYS: BOGEYS,
    ROUTES: ROUTES,
    tokenValue: tokenValue,
    route: route,
    hint: hint
  };
});
