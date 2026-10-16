/* Pantry Week (hosted): unlocks the encrypted app with the buyer's code, then shows the page.
   The tool itself is only in app.bin (AES-GCM). Without the code that file is unreadable. */
(function () {
  "use strict";
  var CFG = { salt: "Ty1H5kMWo1b0pfQScZKZSQ==", iter: 250000, build: "202610161817-pw3144" };
  var LS = "du_pantry_week_key_v1";
  var me = document.currentScript, PAGE = me.getAttribute("data-page"), ROOT = me.getAttribute("data-root") || "";
  var $ = function (id) { return document.getElementById(id); };
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function b64(u) { var s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function norm(c) { return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  var CK = "dupw";
  function setCookie(v) { try { document.cookie = CK + "=" + (v === null ? "" : encodeURIComponent(v)) + "; path=/pantry-week/; max-age=" + (v === null ? 0 : 315360000) + "; SameSite=Lax; Secure"; } catch (e) {} }
  function getCookie() { try { var m = document.cookie.match(/(?:^|; )dupw=([^;]+)/); return m ? decodeURIComponent(m[1]) : null; } catch (e) { return null; } }
  function idb(mode, v) {
    return new Promise(function (res) {
      try {
        var r = indexedDB.open("du_pantry_week", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("k"); };
        r.onsuccess = function () {
          try {
            var tx = r.result.transaction("k", mode === "get" ? "readonly" : "readwrite"), os = tx.objectStore("k");
            if (mode === "get") { var g = os.get(LS); g.onsuccess = function () { res(g.result || null); }; g.onerror = function () { res(null); }; }
            else { if (v === null) os.delete(LS); else os.put(v, LS); tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); }; }
          } catch (e) { res(null); }
        };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function store(k, v) {
    try { if (v === null) { localStorage.removeItem(LS); sessionStorage.removeItem(LS); } else { try { localStorage.setItem(LS, v); } catch (e) { sessionStorage.setItem(LS, v); } } } catch (e) {}
    setCookie(v); idb("set", v);
    if (v !== null) { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {} }
  }
  function storedSync() { try { return localStorage.getItem(LS) || sessionStorage.getItem(LS) || getCookie(); } catch (e) { return getCookie(); } }
  function status(t) { $("du-status").textContent = t; }
  function showForm(msg, bad) { status("Enter your buyer code to open your copy."); $("du-form").className = "on"; var m = $("du-msg"); m.textContent = msg || ""; m.className = bad ? "bad" : ""; }
  if (!window.crypto || !crypto.subtle) { status("This browser can't open Pantry Week. Please use Safari (iPhone/iPad) or Chrome (Android), and make sure the address starts with https://."); return; }
  function derive(code) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(norm(code)), "PBKDF2", false, ["deriveBits"]).then(function (base) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", salt: unb64(CFG.salt), iterations: CFG.iter, hash: "SHA-256" }, base, 256);
    }).then(function (bits) { return new Uint8Array(bits); });
  }
  var binP = null;
  function getBin() {
    if (!binP) binP = fetch(ROOT + "app.bin?v=" + CFG.build).then(function (r) { if (!r.ok) throw new Error("net " + r.status); return r.arrayBuffer(); }).then(function (b) { return new Uint8Array(b); });
    return binP;
  }
  function open(raw) {
    return getBin().then(function (bin) {
      return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]).then(function (k) {
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: bin.slice(0, 12), additionalData: new TextEncoder().encode("pantry-week") }, k, bin.slice(12));
      });
    }).then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
  }
  function render(bundle) {
    var html = bundle.pages[PAGE] || bundle.pages["index.html"];
    html = html.replace(/<!--SF_ASSET:([^>]+?)-->/g, function (m, p) {
      var t = bundle.assets[p] || "";
      return /\.css$/.test(p) ? "<style>" + t + "</style>" : "<script>" + t + "<\/script>";
    });
    var pwa = "<link rel=\"stylesheet\" href=\"/assets/buyer/pwa-install.css\"><script src=\"/assets/buyer/pwa-install.js\" data-app-slug=\"pantry-week\" data-app-name=\"Pantry Week\" defer><\/script>";
    var duVer = "<script>window.__DU_APP_VERSION__=\"" + CFG.build + "\";window.__DU_BUILD_ID__=\"" + CFG.build + "\";<\/script><link rel=\"stylesheet\" href=\"/assets/buyer/pwa-update.css\"><script src=\"/assets/buyer/pwa-update.js\" data-sw-url=\"" + ROOT + "sw.js\" data-app-version=\"" + CFG.build + "\" data-app-label=\"Pantry Week\" defer><\/script>";
    // No du-about-version.js here: Pantry Week shows its version in More > Settings, and the script added a stray "Version …" line above the tab bar.
    html = html.replace("</body>", pwa + duVer + "\n</body>");
    document.open(); document.write(html); document.close();
  }
  function netFail() { status("Couldn't load Pantry Week. Connect to the internet once to open it; after that it also works offline."); }
  function takeCodeFromUrl() {
    var fromHash = (location.hash.match(/(?:^#|[?&])code=([^&]+)/) || [])[1];
    var fromSearch = null;
    try { fromSearch = new URLSearchParams(location.search).get("code"); } catch (e) {}
    if (fromHash || fromSearch) {
      try {
        var clean = location.pathname;
        history.replaceState(null, "", clean);
      } catch (e) {}
    }
    return fromHash || fromSearch;
  }
  var hash = takeCodeFromUrl();
  function tryCode(code, fromLink) {
    status("Unlocking…");
    return derive(decodeURIComponent(code)).then(function (raw) {
      return open(raw).then(function (bundle) { store(LS, b64(raw)); render(bundle); });
    }).catch(function (e) {
      if (/net/.test(String(e && e.message))) { netFail(); return; }
      showForm(fromLink ? "That link's code didn't work. Type the code from your PDF below." : "That code didn't work. Check it against your PDF (letters and numbers; dashes are optional).", true);
    });
  }
  $("du-form").addEventListener("submit", function (ev) {
    ev.preventDefault(); var c = $("du-code").value; if (norm(c).length < 8) { showForm("Type the full code, e.g. PW-XXXX-XXXX-XXXX.", true); return; }
    $("du-go").disabled = true; tryCode(c, false).then(function () { var g = $("du-go"); if (g) g.disabled = false; });
  });
  function openSaved(saved) {
    open(unb64(saved)).then(function (b) { store(LS, saved); render(b); }).catch(function (e) {
      if (/net/.test(String(e && e.message))) { netFail(); return; }
      store(LS, null); showForm("Open your Pantry Week link from your Gumroad receipt to unlock again.");
    });
  }
  if (hash) tryCode(hash, true);
  else {
    var saved = storedSync();
    if (saved) openSaved(saved);
    else idb("get").then(function (v) { if (v) openSaved(v); else { getBin().catch(function () {}); showForm(""); } });
  }
  window.addEventListener("hashchange", function () { if (/code=/.test(location.hash)) location.reload(); });
})();
