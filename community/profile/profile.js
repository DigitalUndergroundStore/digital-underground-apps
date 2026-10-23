/* Account profile editor: avatar (resized in the browser to 256px WEBP) + display name. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function say(t, ok) { var m = $("msg"); m.hidden = !t; m.textContent = t || ""; m.className = "au-alert" + (ok ? " ok" : ""); }
  function render(d) {
    $("pf-main").hidden = false; /* only shown once we know they are logged in */
    var av = $("av"); av.innerHTML = ""; av.className = "pf-av";
    if (d.avatar) { var i = new Image(); i.alt = ""; i.src = d.avatar; av.appendChild(i); if (/\.svg$/.test(d.avatar)) av.className = "pf-av mark"; }
    else av.textContent = (d.name || "C").charAt(0).toUpperCase();
    $("b-rm").hidden = !d.custom;
    if (document.activeElement !== $("nm")) $("nm").value = d.name || "";
  }
  function api(method, body, type) {
    return fetch("/api/account/profile", { method: method, credentials: "same-origin", headers: type ? { "content-type": type } : {}, body: body })
      .then(function (r) { if (r.status === 401) { location.href = "/login/?next=" + encodeURIComponent("/community/profile/"); throw 0; } return r.json(); });
  }
  function resize(file) {
    return new Promise(function (ok, bad) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas"); c.width = c.height = 256;
        c.getContext("2d").drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : bad(); }, "image/webp", 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); bad(); };
      img.src = url;
    });
  }
  $("b-up").addEventListener("click", function () { $("file").click(); });
  $("file").addEventListener("change", function () {
    var f = this.files[0]; this.value = "";
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return say("Use a PNG, JPG or WEBP image.");
    if (f.size > 2 * 1024 * 1024) return say("That image is over 2 MB. Pick a smaller one.");
    say("Uploading…", true);
    resize(f).then(function (b) { return api("PUT", b, b.type || "image/webp"); })
      .then(function (d) { if (!d.ok) return say(d.error); render(d); say("Picture updated.", true); })
      .catch(function (e) { if (e !== 0) say("Couldn't read that image. Try another one."); });
  });
  $("b-rm").addEventListener("click", function () {
    api("DELETE").then(function (d) { if (!d.ok) return say(d.error); render(d); say("Picture removed.", true); }).catch(function () {});
  });
  $("f-name").addEventListener("submit", function (e) {
    e.preventDefault();
    api("POST", JSON.stringify({ name: $("nm").value }), "application/json").then(function (d) { if (!d.ok) return say(d.error); render(d); say("Name saved.", true); }).catch(function () {});
  });
  api("GET").then(render).catch(function (e) { if (e !== 0) { $("pf-main").hidden = false; say("Couldn't load your profile. Refresh to try again."); } });
})();
