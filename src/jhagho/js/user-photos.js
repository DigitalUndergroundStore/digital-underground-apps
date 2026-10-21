/* Pantry Week: your own recipe photos. Resized on-device (canvas, ~800px), stored in
   IndexedDB per recipe id. Never uploaded. window.PW_USER_PHOTOS */
"use strict";
(function () {
  var DB = "pantry_week_photos", STORE = "photos", MAX = 800;
  var urls = {}; /* id -> object URL */
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("This browser cannot store photos.")); return; }
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(STORE, mode), s = t.objectStore(STORE), out;
        out = fn(s);
        t.oncomplete = function () { resolve(out && "result" in out ? out.result : undefined); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }
  function setUrl(id, blob) {
    if (urls[id]) URL.revokeObjectURL(urls[id]);
    if (blob) urls[id] = URL.createObjectURL(blob); else delete urls[id];
  }
  function loadAll() {
    return db().then(function (d) {
      return new Promise(function (resolve) {
        var s = d.transaction(STORE, "readonly").objectStore(STORE);
        var req = s.openCursor();
        req.onsuccess = function () {
          var c = req.result;
          if (c) { setUrl(String(c.key), c.value); c.continue(); } else resolve(Object.keys(urls).length);
        };
        req.onerror = function () { resolve(0); };
      });
    }).catch(function () { return 0; });
  }
  function canvasBlob(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) {
        if (b && b.type === "image/webp") { resolve(b); return; }
        canvas.toBlob(function (j) { resolve(j); }, "image/jpeg", 0.82);
      }, "image/webp", 0.8);
    });
  }
  function resize(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, MAX / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        canvasBlob(c).then(resolve, reject);
      };
      img.onerror = function () { URL.revokeObjectURL(u); reject(new Error("That file is not a photo this browser can read.")); };
      img.src = u;
    });
  }
  function save(id, file) {
    return resize(file).then(function (blob) {
      return tx("readwrite", function (s) { s.put(blob, String(id)); }).then(function () { setUrl(String(id), blob); return blob; });
    });
  }
  function saveBlob(id, blob) {
    return tx("readwrite", function (s) { s.put(blob, String(id)); }).then(function () { setUrl(String(id), blob); });
  }
  function remove(id) {
    return tx("readwrite", function (s) { s.delete(String(id)); }).then(function () { setUrl(String(id), null); });
  }
  function toDataUrl(blob) {
    return new Promise(function (resolve) { var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.readAsDataURL(blob); });
  }
  /* Backup helpers: { id: dataURL } */
  function exportAll() {
    return db().then(function (d) {
      return new Promise(function (resolve) {
        var out = {}, pending = [], req = d.transaction(STORE, "readonly").objectStore(STORE).openCursor();
        req.onsuccess = function () {
          var c = req.result;
          if (c) { var k = String(c.key); pending.push(toDataUrl(c.value).then(function (v) { out[k] = v; })); c.continue(); }
          else Promise.all(pending).then(function () { resolve(out); });
        };
        req.onerror = function () { resolve({}); };
      });
    }).catch(function () { return {}; });
  }
  function importAll(map) {
    var ids = Object.keys(map || {});
    return Promise.all(ids.map(function (id) {
      var v = map[id];
      if (typeof v !== "string" || v.indexOf("data:image/") !== 0) return null;
      return fetch(v).then(function (r) { return r.blob(); }).then(function (b) { return saveBlob(id, b); });
    })).then(function () { return ids.length; });
  }
  window.PW_USER_PHOTOS = {
    ready: loadAll(),
    urlFor: function (id) { return urls[String(id)] || ""; },
    has: function (id) { return !!urls[String(id)]; },
    save: save, remove: remove, exportAll: exportAll, importAll: importAll
  };
})();
