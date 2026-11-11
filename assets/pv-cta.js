/* Builder-facing PlanetView lead magnet (Nov 2 2026). Same /api/subscribe list + gift as the footer form.
   Renders into any <div data-pv-cta></div>. Source tag: builder-cta:<path>. */
(function () {
  function init() {
    document.querySelectorAll("[data-pv-cta]").forEach(function (box) {
      if (box.dataset.ready) return; box.dataset.ready = "1";
      box.innerHTML = '<section class="pvc" aria-labelledby="pvcH" style="max-width:760px;margin:28px auto;padding:18px 20px;border:1px solid rgba(139,122,255,.45);border-radius:16px;background:rgba(20,18,42,.75);color:#e8e6ff;display:flex;gap:16px;align-items:center;flex-wrap:wrap">' +
        '<a href="/free-planetview/" style="flex:none"><img src="/assets/gift/planetview-cover.webp?v=hd1" alt="PlanetView Live cover" width="160" height="90" loading="lazy" decoding="async" style="border-radius:10px;display:block"></a>' +
        '<form novalidate style="flex:1;min-width:240px;margin:0"><h2 id="pvcH" style="font-size:1.05rem;margin:0 0 4px">Building something? Get the maker list (and PlanetView free)</h2>' +
        '<p style="margin:0 0 10px;font-size:.9rem;opacity:.8">A short email when Maker League opens and when new builder tools ship. Plus <a href="/free-planetview/">PlanetView Live</a> (3D Earth &amp; flight sim, beta) free. No spam, unsubscribe anytime.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><label for="pvcEmail" style="position:absolute;left:-9999px">Your email</label><input id="pvcEmail" type="email" name="email" placeholder="you@example.com" autocomplete="email" required style="flex:1;min-width:180px;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:#0d0b1e;color:#fff">' +
        '<button type="submit" style="padding:9px 16px;border-radius:10px;border:0;background:#7c5cff;color:#fff;font-weight:700;cursor:pointer">Join free</button></div>' +
        '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
        '<label style="display:block;margin-top:8px;font-size:.8rem;opacity:.75"><input type="checkbox" name="consent"> Yes, email me Digital Underground maker updates and occasional offers. <a href="/privacy/">Privacy</a>.</label>' +
        '<p class="pvc-msg" role="status" aria-live="polite" style="margin:6px 0 0;font-size:.85rem"></p></form></section>';
      var f = box.querySelector("form"), msg = box.querySelector(".pvc-msg");
      f.addEventListener("submit", function (e) {
        e.preventDefault(); var em = f.email.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em)) { msg.textContent = "Please enter a valid email address."; return; }
        if (!f.consent.checked) { msg.textContent = "Please tick the box to agree to receive emails."; return; }
        var b = f.querySelector("button"); b.disabled = true; msg.textContent = "Subscribing…";
        fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em, consent: true, website: f.website.value, source: "builder-cta:" + location.pathname }) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (x) {
            if (!x.ok) { msg.textContent = (x.d && x.d.error) || "Something went wrong. Please try again."; b.disabled = false; return; }
            msg.textContent = "You're in. Thanks! ";
            if (x.d && typeof x.d.gift === "string" && /^https:\/\/kerzy\.gumroad\.com\//.test(x.d.gift)) { var a = document.createElement("a"); a.href = x.d.gift; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Claim PlanetView Live free on Gumroad"; msg.appendChild(a); }
          }).catch(function () { msg.textContent = "Network error. Please try again."; b.disabled = false; });
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
