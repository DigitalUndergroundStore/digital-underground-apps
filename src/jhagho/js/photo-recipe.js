/* Add from photo: lazy-load Tesseract.js only when a picture is chosen. */
"use strict";

(function () {
  var CACHE = "pantry-week-ocr-v1";
  var SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  var WORKER_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js";
  var CORE_URL = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1";
  var LANG_URL = "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int";
  var OFFLINE = "Add from photo needs the text reader downloaded once. Connect to the internet, then it works offline.";
  var loading = null;

  function browserOnline() {
    try { return navigator.onLine !== false; } catch (err) { return true; }
  }

  function cleanOcrText(raw) {
    return String(raw || "")
      .replace(/\r/g, "")
      .replace(/[|]/g, "I")
      .replace(/[“”]/g, "\"")
      .replace(/[‘’]/g, "'")
      .replace(/[•·▪◦]/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/(\d)\s*\/\s*(\d)/g, "$1/$2")
      .trim();
  }

  function photoGate(online, cached) {
    if (cached || online) return { ok: true };
    return { ok: false, message: OFFLINE };
  }

  function assetsCached() {
    if (!window.caches) return Promise.resolve(false);
    return caches.open(CACHE).then(function (cache) {
      return cache.match(SCRIPT_URL).then(function (hit) { return !!hit; });
    }).catch(function () { return false; });
  }

  function rememberAssets() {
    if (!window.caches || !browserOnline()) return Promise.resolve();
    var urls = [SCRIPT_URL, WORKER_URL, LANG_URL + "/eng.traineddata.gz"];
    return caches.open(CACHE).then(function (cache) {
      return Promise.all(urls.map(function (url) {
        return cache.match(url).then(function (hit) {
          if (hit) return null;
          return fetch(url).then(function (res) {
            if (res && res.ok) return cache.put(url, res);
            return null;
          }).catch(function () { return null; });
        });
      }));
    }).catch(function () {});
  }

  function appendScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("script")); };
      document.head.appendChild(script);
    });
  }

  function loadScript() {
    if (window.Tesseract && window.Tesseract.createWorker) return Promise.resolve();
    if (loading) return loading;
    var job = assetsCached().then(function (cached) {
      var gate = photoGate(browserOnline(), cached);
      if (!gate.ok) throw new Error(gate.message);
      if (cached && !browserOnline() && window.caches) {
        return caches.open(CACHE).then(function (cache) { return cache.match(SCRIPT_URL); }).then(function (hit) {
          if (!hit) throw new Error(OFFLINE);
          return hit.blob().then(function (blob) { return appendScript(URL.createObjectURL(blob)); });
        });
      }
      return appendScript(SCRIPT_URL);
    }).then(function () {
      rememberAssets();
    }).catch(function (err) {
      if (loading === job) loading = null;
      if (err && err.message === "script") {
        throw new Error(browserOnline() ? "Couldn't download the text reader. Check your connection and try again." : OFFLINE);
      }
      throw err;
    });
    loading = job;
    return job;
  }

  function prepareCanvas(file) {
    return createImageBitmap(file).then(function (bmp) {
      var maxEdge = 1800;
      var scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
      var w = Math.max(1, Math.round(bmp.width * scale));
      var h = Math.max(1, Math.round(bmp.height * scale));
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      return canvas;
    });
  }

  function statusText(message) {
    if (!message || !message.status) return "";
    if (message.status === "recognizing text") {
      return "Reading the photo… " + Math.round((message.progress || 0) * 100) + "%";
    }
    if (/loading|initializing/i.test(message.status)) return "Getting the text reader ready…";
    return "Reading the photo…";
  }

  function recognize(file, onStatus) {
    if (!file) return Promise.reject(new Error("Choose a photo first."));
    if (onStatus) onStatus("Getting the text reader ready…");
    return loadScript().then(function () {
      if (!window.Tesseract || !Tesseract.createWorker) {
        throw new Error(browserOnline() ? "Couldn't start the text reader." : OFFLINE);
      }
      return prepareCanvas(file);
    }).then(function (canvas) {
      return Tesseract.createWorker("eng", 1, {
        workerPath: WORKER_URL,
        corePath: CORE_URL,
        langPath: LANG_URL,
        logger: function (message) {
          var text = statusText(message);
          if (text && onStatus) onStatus(text);
        }
      }).then(function (worker) {
        return worker.recognize(canvas).then(function (out) {
          return worker.terminate().catch(function () {}).then(function () { return out; });
        }).catch(function (err) {
          return worker.terminate().catch(function () {}).then(function () { throw err; });
        });
      });
    }).then(function (out) {
      var text = out && out.data && out.data.text ? out.data.text : "";
      text = cleanOcrText(text);
      if (!text) throw new Error("Couldn't read text in that photo. Try a brighter, closer picture, or paste the recipe.");
      return text;
    }).catch(function (err) {
      if (err && err.message && /fetch|network|worker|failed to load/i.test(err.message) && !browserOnline()) {
        throw new Error(OFFLINE);
      }
      throw err;
    });
  }

  window.PW_PHOTO_OCR = {
    OFFLINE: OFFLINE,
    cleanOcrText: cleanOcrText,
    photoGate: photoGate,
    recognize: recognize,
    assetsCached: assetsCached
  };
})();
