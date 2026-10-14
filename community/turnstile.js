/**
 * Loads Cloudflare Turnstile when /community/turnstile-config.json exposes a site key.
 */
(function () {
  var slot = document.getElementById("turnstile-slot");
  if (!slot) return;

  fetch("/community/turnstile-config.json", { cache: "no-store" })
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
