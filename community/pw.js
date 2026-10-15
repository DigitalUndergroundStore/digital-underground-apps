/* Password field helpers: eye toggle on input[data-pw], live confirm check on input[data-confirm]. */
(function () {
  var EYE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.5 10.5 0 0 1 12 19C5 19 1 12 1 12a19.8 19.8 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.7 9.7 0 0 1 12 4c7 0 11 8 11 8a19.9 19.9 0 0 1-3.17 4.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
  function addToggle(input) {
    if (input.dataset.pwReady) return;
    input.dataset.pwReady = "1";
    var wrap = document.createElement("span");
    wrap.className = "pw-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-eye";
    btn.setAttribute("aria-label", "Show password");
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = EYE;
    // Prevent the input losing focus (and the iOS keyboard closing) on tap.
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", show ? "true" : "false");
      btn.innerHTML = show ? EYE_OFF : EYE;
    });
    wrap.appendChild(btn);
  }
  function setupConfirm(confirm) {
    if (confirm.dataset.cfReady) return;
    confirm.dataset.cfReady = "1";
    var form = confirm.form;
    var main = form.querySelector('[name="' + confirm.getAttribute("data-confirm") + '"]');
    var msg = document.createElement("p");
    msg.className = "field-hint pw-mismatch";
    msg.setAttribute("role", "alert");
    msg.textContent = "Passwords don't match";
    msg.hidden = true;
    var label = confirm.closest("label") || confirm.parentNode;
    label.parentNode.insertBefore(msg, label.nextSibling);
    function check(live) {
      var active = !main.disabled && !(main.closest("label") && main.closest("label").hidden);
      var bad = active && confirm.value !== "" && confirm.value !== main.value;
      msg.hidden = !(bad || (!live && active && confirm.value !== main.value));
      confirm.setCustomValidity(active && confirm.value !== main.value ? "Passwords don't match" : "");
      return !active || confirm.value === main.value;
    }
    confirm.addEventListener("input", function () { check(true); });
    main.addEventListener("input", function () { check(true); });
    form.addEventListener("submit", function (e) {
      if (!check(false)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        confirm.focus();
      }
    }, true);
    form.addEventListener("reset", function () { setTimeout(function () { msg.hidden = true; confirm.setCustomValidity(""); }, 0); });
  }
  function init() {
    document.querySelectorAll("input[data-pw]").forEach(addToggle);
    document.querySelectorAll("input[data-confirm]").forEach(setupConfirm);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
