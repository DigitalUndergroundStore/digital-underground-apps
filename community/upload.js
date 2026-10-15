/* Shared upload helpers for the Developer Marketplace (dashboard + submit). */
(function () {
  var MAX_VIDEO = 50 * 1024 * 1024, MAX_IMG = 700 * 1024;
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
  /** Downscale an image file to a data URL under ~700 KB (JPEG/WebP). */
  function image(file) {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return Promise.reject(new Error("Image must be JPEG, PNG, WebP or GIF."));
    if (file.size > 20 * 1024 * 1024) return Promise.reject(new Error("Image is too large (max 20 MB before resizing)."));
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var sizes = [1200, 1000, 800, 640], qs = [0.86, 0.78, 0.7], c = document.createElement("canvas"), ctx = c.getContext("2d");
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
  window.duUpload = { video: video, cancel: cancel, image: image, mb: mb };
})();
