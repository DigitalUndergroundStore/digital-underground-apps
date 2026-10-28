/* Digital Underground email signup: free PlanetView Live gift (limited time, Gumroad 100%-off code). CASL express consent (unticked box). */
(function () {
  var CONSENT = "Yes, email me new apps, updates and occasional offers from Digital Underground. I can unsubscribe at any time.";
  var css = ".du-su{max-width:640px;margin:32px auto;padding:20px;border:1px solid rgba(157,140,255,.35);border-radius:14px;background:rgba(20,18,32,.85);color:#eee;font:15px/1.5 system-ui,sans-serif;box-sizing:border-box}.du-su .du-su-row{display:flex;gap:16px;align-items:flex-start}.du-su .du-su-cover{flex:0 0 auto;width:112px;border-radius:8px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.45);border:1px solid rgba(157,140,255,.25)}.du-su .du-su-cover img{display:block;width:100%;height:auto}.du-su .du-su-body{flex:1 1 auto;min-width:0}.du-su h2{margin:0 0 6px;font-size:20px;color:#fff}.du-su p{margin:0 0 12px;color:#cfcbe0}.du-su form{display:flex;flex-wrap:wrap;gap:8px}.du-su input[type=email]{flex:1 1 220px;min-width:0;padding:11px 12px;border-radius:9px;border:1px solid #4a4466;background:#0d0b16;color:#fff;font-size:16px}.du-su button{padding:11px 18px;border:0;border-radius:9px;background:#6d4cf0;color:#fff;font-weight:600;cursor:pointer;font-size:15px}.du-su label.c{flex-basis:100%;display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#cfcbe0}.du-su label.c input{margin-top:3px}.du-su .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.du-su .m{flex-basis:100%;font-size:14px;min-height:1.2em}.du-su .m.bad{color:#f0a0a0}.du-su .m.ok{color:#9be3b5}.du-su .m a{color:#c8bcff;font-weight:600}.du-su small{display:block;margin-top:10px;color:#9a95b3;font-size:12px}.du-su small a{color:#c8bcff}.du-su .du-sh{margin-top:10px;font-size:13px;color:#9a95b3}.du-su .du-sh button{background:none;border:0;padding:0;color:#c8bcff;font-weight:600;font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.du-su .du-sh .alt{display:none;margin-left:6px}.du-su .du-sh .alt.on{display:inline}.du-su .du-sh .alt a{color:#c8bcff;margin-left:8px}@media(max-width:520px){.du-su .du-su-row{flex-direction:row}.du-su .du-su-cover{width:88px}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  function build(host) {
    var src = location.pathname;
    host.className = (host.className + " du-su").trim();
    host.innerHTML = '<div class="du-su-row">' +
      '<div class="du-su-cover"><img src="/assets/gift/planetview-cover.webp" width="225" height="127" alt="PlanetView Live cover" loading="lazy" decoding="async"></div>' +
      '<div class="du-su-body">' +
      '<h2>Get PlanetView Live free</h2><p>Join the Digital Underground list and get <em>PlanetView Live</em>, a photoreal 3D Earth, solar system and flight sim in your browser (live beta / in testing), <strong>free for a limited time with email signup</strong> (normally CA$24). Independent project, not affiliated with SpaceX or NASA. New apps and offers, a few emails a month at most.</p>' +
      '<form novalidate><label class="hp" aria-hidden="true">Company <input name="company" tabindex="-1" autocomplete="off"></label>' +
      '<input type="email" name="email" required placeholder="you@example.com" aria-label="Email address" autocomplete="email">' +
      '<button type="submit">Get PlanetView free</button>' +
      '<label class="c"><input type="checkbox" name="consent"> <span>' + CONSENT + '</span></label>' +
      '<div class="m" role="status" aria-live="polite"></div></form>' +
      '<div class="du-sh"><button type="button" class="du-sh-b">Share the free PlanetView offer ↗</button><span class="alt" role="status" aria-live="polite"></span></div>' +
      '<small>Sent by Digital Underground, Ontario, Canada. Every email has an unsubscribe link. <a href="/privacy/">Privacy</a></small>' +
      '</div></div>';
    var f = host.querySelector("form"), m = host.querySelector(".m");
    var SH_URL = "https://digitalundergroundstore.com/free-planetview/", SH_TXT = "Get PlanetView Live free for a limited time with email signup: a 3D Earth, solar system and flight sim in your browser.";
    var shb = host.querySelector(".du-sh-b"), alt = host.querySelector(".du-sh .alt");
    shb.addEventListener("click", function () {
      if (navigator.share) { navigator.share({ title: "PlanetView Live (free for a limited time)", text: SH_TXT, url: SH_URL }).catch(function () {}); return; }
      var links = ' <a target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + encodeURIComponent(SH_TXT) + '&url=' + encodeURIComponent(SH_URL) + '">X</a>' +
        '<a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(SH_URL) + '">Facebook</a>';
      var done = function (ok) { alt.innerHTML = (ok ? "Link copied." : SH_URL) + links; alt.className = "alt on"; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(SH_URL).then(function () { done(true); }, function () { done(false); }); else done(false);
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { m.className = "m bad"; m.textContent = "Please enter a valid email address."; return; }
      if (!f.consent.checked) { m.className = "m bad"; m.textContent = "Please tick the box to agree to receive emails."; return; }
      var b = f.querySelector("button"); b.disabled = true; m.className = "m"; m.textContent = "Signing you up…";
      fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, consent: true, company: f.company.value, source: src }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) {
          b.disabled = false;
          if (!x.ok || !x.d.ok) { m.className = "m bad"; m.textContent = (x.d && x.d.error) || "Something went wrong. Please try again."; return; }
          m.className = "m ok"; m.innerHTML = 'You are in. Step 1: <a target="_blank" rel="noopener" href="' + (x.d.gift || "https://kerzy.gumroad.com/l/oxnfvy?code=DUFREEPV") + '">claim PlanetView Live free on Gumroad</a> (the code takes it to CA$0; enter your email and Gumroad emails your license key). Step 2: <a href="' + (x.d.play || "/planetview/") + '">open PlanetView</a> and paste the key. Free for a limited time. Thanks for joining!';
          f.email.value = ""; f.consent.checked = false;
        }).catch(function () { b.disabled = false; m.className = "m bad"; m.textContent = "Network error. Please try again."; });
    });
  }
  function init() {
    var hosts = document.querySelectorAll("[data-du-signup]");
    if (!hosts.length) {
      var h = document.createElement("section"); h.setAttribute("data-du-signup", ""); h.setAttribute("aria-label", "Free PlanetView signup");
      var foot = document.querySelector("footer");
      if (foot && foot.parentNode) foot.parentNode.insertBefore(h, foot); else document.body.appendChild(h);
      hosts = [h];
    }
    Array.prototype.forEach.call(hosts, build);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
