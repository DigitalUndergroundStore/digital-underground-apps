/**
 * Loads Cloudflare Turnstile when /api/community/turnstile-config returns a site key (TURNSTILE_SITE_KEY env var).
 */
(function () {
  var slot = document.getElementById("turnstile-slot");
  if (!slot) return;

  fetch("/api/community/turnstile-config", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; })
    .then(function (cfg) {
      if (!cfg || !cfg.siteKey) return;
      slot.hidden = false;
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = function () {
        if (!window.turnstile) return;
        window.turnstile.render(slot, {
          sitekey: cfg.siteKey,
          callback: function (token) {
            window.__duTurnstileToken = token;
          },
          "expired-callback": function () {
            window.__duTurnstileToken = null;
          }
        });
        window.__duTurnstileReset = function () {
          window.__duTurnstileToken = null;
          try {
            window.turnstile.reset(slot);
          } catch (e) {}
        };
      };
      document.head.appendChild(s);
    });
})();
