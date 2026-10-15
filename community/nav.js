/* Shows the Owner Dashboard link only when /api/nav confirms the owner (server-side cookie check). */
(function () {
  function add(d) {
    if (!d || d.owner !== true || document.querySelector("[data-owner-link]")) return;
    var site = document.querySelector('nav[aria-label="Site"]');
    if (site) {
      var a = document.createElement("a"); a.href = "/owner/"; a.textContent = "Owner Dashboard"; a.setAttribute("data-owner-link", "");
      a.className = "owner-link"; a.style.cssText = "border-color:rgba(250,204,21,.55);color:#fde68a";
      var cta = site.querySelector(".cta-wrap"); site.insertBefore(a, cta || null);
    }
    var tb = document.querySelector(".topbar-in .avatar-btn");
    if (tb) {
      var b = document.createElement("a"); b.href = "/owner/"; b.className = "tb-link owner-link"; b.textContent = "Owner Dashboard"; b.setAttribute("data-owner-link", "");
      b.style.cssText = "display:inline-flex;color:#fde68a"; tb.parentNode.insertBefore(b, tb);
      var menu = document.getElementById("menu");
      if (menu) { var m = document.createElement("a"); m.setAttribute("role", "menuitem"); m.href = "/owner/"; m.textContent = "Owner Dashboard"; m.style.color = "#fde68a"; var so = document.getElementById("signout"); menu.insertBefore(m, so); }
    }
    var chips = document.getElementById("store-sections");
    if (chips && !site) { var c = document.createElement("a"); c.href = "/owner/"; c.textContent = "Owner Dashboard"; c.setAttribute("data-owner-link", ""); c.style.color = "#fde68a"; chips.appendChild(c); }
  }
  function check() { fetch("/api/nav", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(add).catch(function () {}); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check); else check();
  window.duNavRecheck = check;
})();
