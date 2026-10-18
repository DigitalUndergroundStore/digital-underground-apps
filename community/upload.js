/* Shared upload helpers for the Developer Marketplace (dashboard + submit). */
(function () {
  var MAX_VIDEO = 50 * 1024 * 1024, MAX_IMG = 190 * 1000;
  function jsonReq(method, url, body) {
    return fetch(url, { method: method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || !d.ok) throw new Error(d.error || "Upload failed."); return d; }); });
  }
  function putPart(url, blob, onProg, state) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest(); state.xhr = x;
      x.open("PUT", url); x.withCredentials = true;
      x.setRequestHeader("Content-Type", "application/octet-stream");
      x.upload.onprogress = function (e) { if (e.lengthComputable) onProg(e.loaded); };
      x.onload = function () { var d = {}; try { d = JSON.parse(x.responseText); } catch (_) {} if (x.status >= 200 && x.status < 300 && d.ok) res(); else rej(new Error(d.error || "Upload failed (" + x.status + ").")); };
      x.onerror = function () { rej(new Error("Network error. Check your connection and try again.")); };
      x.onabort = function () { var e = new Error("Upload canceled."); e.canceled = true; rej(e); };
      x.send(blob);
    });
  }
  /** Upload a video file to a listing the signed-in creator owns. Returns { listing }. */
  function video(listingId, file, onProgress, state) {
    state = state || {};
    var type = (file.type || "").toLowerCase();
    if (!type) type = /\.webm$/i.test(file.name) ? "video/webm" : /\.mp4$/i.test(file.name) ? "video/mp4" : "";
    if (type === "video/quicktime") return Promise.reject(new Error("That's a .mov file. Export it as MP4 (on iPhone: Settings › Camera › Formats › Most Compatible) and try again."));
    if (type !== "video/mp4" && type !== "video/webm") return Promise.reject(new Error("Video must be an MP4 or WebM file."));
    if (file.size > MAX_VIDEO) return Promise.reject(new Error("Video is " + (file.size / 1048576).toFixed(0) + " MB. The limit is 50 MB."));
    onProgress && onProgress(0);
    return jsonReq("POST", "/api/community/video?action=init", { id: listingId, size: file.size, type: type }).then(function (init) {
      var n = 0, done = 0;
      function next() {
        if (state.canceled) { var e = new Error("Upload canceled."); e.canceled = true; throw e; }
        if (n >= init.parts) return;
        var start = n * init.chunk, part = file.slice(start, Math.min(file.size, start + init.chunk));
        return putPart("/api/community/video?v=" + encodeURIComponent(init.vid) + "&n=" + n, part, function (l) { onProgress && onProgress((done + l) / file.size); }, state)
          .then(function () { done += part.size; n++; onProgress && onProgress(done / file.size); return next(); });
      }
      return Promise.resolve(next()).then(function () { return jsonReq("POST", "/api/community/video?action=finish", { vid: init.vid }); });
    });
  }
  function cancel(state) { state.canceled = true; if (state.xhr) state.xhr.abort(); }
  /** Downscale an image file to a data URL under ~190 KB (JPEG/WebP). */
  function image(file) {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return Promise.reject(new Error("Image must be JPEG, PNG, WebP or GIF."));
    if (file.size > 20 * 1024 * 1024) return Promise.reject(new Error("Image is too large (max 20 MB before resizing)."));
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var sizes = [1200, 1000, 800, 640, 480], qs = [0.82, 0.72, 0.62], c = document.createElement("canvas"), ctx = c.getContext("2d");
        var webp = document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0;
        var mime = webp ? "image/webp" : "image/jpeg";
        for (var i = 0; i < sizes.length; i++) {
          var s = Math.min(1, sizes[i] / Math.max(img.naturalWidth, img.naturalHeight));
          c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
          ctx.fillStyle = "#0d0a1a"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
          for (var j = 0; j < qs.length; j++) { var d = c.toDataURL(mime, qs[j]); if (d.length * 0.75 < MAX_IMG) return res(d); }
        }
        rej(new Error("Couldn't shrink that image enough. Try a smaller one."));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("Couldn't read that image.")); };
      img.src = url;
    });
  }
  function mb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  /* ---- Cover frame: grab a frame from a video (File or same-origin URL) as a WebP/JPEG data URL ---- */
  function fmtT(t) { t = Math.max(0, t || 0); var m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1); }
  function grab(v) {
    var W = v.videoWidth, H = v.videoHeight; if (!W || !H) throw new Error("Video not ready.");
    var sizes = [1280, 960, 720, 540], q = [0.8, 0.68, 0.56], d, c = document.createElement("canvas");
    for (var k = 0; k < sizes.length; k++) {
      var sc = Math.min(1, sizes[k] / Math.max(W, H));
      c.width = Math.round(W * sc); c.height = Math.round(H * sc);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      for (var i = 0; i < q.length; i++) {
        d = c.toDataURL("image/webp", q[i]);
        if (d.indexOf("data:image/webp") !== 0) d = c.toDataURL("image/jpeg", q[i]);
        if (d.length * 0.75 < MAX_IMG) return d;
      }
    }
    return d;
  }
  function seek(v, t) {
    return new Promise(function (res) {
      var done = false, fin = function () { if (!done) { done = true; v.removeEventListener("seeked", fin); res(); } };
      v.addEventListener("seeked", fin); v.currentTime = Math.min(Math.max(0, t), Math.max(0, (v.duration || 1) - 0.05));
      setTimeout(fin, 2500);
    });
  }
  function ready(v) {
    return new Promise(function (res, rej) {
      if (v.readyState >= 2) return res();
      var to = setTimeout(function () { rej(new Error("Couldn't load the video preview.")); }, 20000);
      v.addEventListener("loadeddata", function () { clearTimeout(to); res(); }, { once: true });
      v.addEventListener("error", function () { clearTimeout(to); rej(new Error("Couldn't load the video preview.")); }, { once: true });
      // iOS only decodes frames after a play() in a user-initiated flow
      var p = v.play && v.play(); if (p && p.then) p.then(function () { v.pause(); }, function () {});
    });
  }
  /** Mounts a scrubber in `root`. opts: { src | file, start (s), onUse(dataUrl, t) -> Promise, onCancel } */
  function cover(root, opts) {
    var url = opts.file ? URL.createObjectURL(opts.file) : opts.src;
    root.innerHTML =
      '<div class="cv-stage"><video muted playsinline preload="auto" crossorigin="anonymous"></video><span class="cv-time">0:00.0</span></div>' +
      '<input type="range" class="cv-range" min="0" max="1" step="0.01" value="0" aria-label="Cover frame position">' +
      '<div class="cv-row"><span class="cv-hint">Drag to pick the frame shown before your video plays.</span>' +
      '<span class="cv-btns"><button type="button" class="btn btn-sm cv-cancel">Cancel</button><button type="button" class="btn btn-sm btn-primary cv-use">Use this frame</button></span></div>';
    root.hidden = false;
    var v = root.querySelector("video"), r = root.querySelector(".cv-range"), tl = root.querySelector(".cv-time"), use = root.querySelector(".cv-use");
    var raf = 0, closed = false;
    v.src = url;
    use.disabled = true;
    var p = ready(v).then(function () {
      r.max = String(Math.max(0.1, (v.duration || 1) - 0.05));
      r.step = String(Math.max(0.01, (v.duration || 1) / 400));
      var t0 = Math.min(opts.start != null ? opts.start : 1, +r.max);
      r.value = String(t0); tl.textContent = fmtT(t0);
      return seek(v, t0);
    }).then(function () { use.disabled = false; });
    r.addEventListener("input", function () {
      tl.textContent = fmtT(+r.value);
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; v.currentTime = +r.value; });
    });
    function close() { if (closed) return; closed = true; root.hidden = true; root.innerHTML = ""; if (opts.file) URL.revokeObjectURL(url); }
    root.querySelector(".cv-cancel").addEventListener("click", function () { close(); opts.onCancel && opts.onCancel(); });
    use.addEventListener("click", function () {
      use.disabled = true; use.textContent = "Saving…";
      seek(v, +r.value).then(function () { return opts.onUse(grab(v), +r.value); })
        .then(function () { close(); }, function () { use.disabled = false; use.textContent = "Use this frame"; });
    });
    return { ready: p, close: close };
  }
  /** Headless default: frame at `t` seconds from a File/URL. */
  function frameAt(src, t) {
    var url = src instanceof Blob ? URL.createObjectURL(src) : src, v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto"; v.crossOrigin = "anonymous"; v.src = url;
    return ready(v).then(function () { return seek(v, Math.min(t, (v.duration || 2) - 0.05)); }).then(function () { var d = grab(v); if (src instanceof Blob) URL.revokeObjectURL(url); return d; });
  }
  window.duUpload = { video: video, cancel: cancel, image: image, mb: mb, cover: cover, frameAt: frameAt };
})();
