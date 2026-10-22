/* Shared DU header v2: menu toggle (all sizes), account (Sign in / maker dropdown), aria-current, Share, standard footer links.
   Safe to include more than once: it only initialises once. */
(function () {
  if (window.__duNav) return; window.__duNav = 1;
  function init() {
    var b = document.getElementById("dunMenu"), d = document.getElementById("dunDrawer");
    var path = location.pathname;
    document.querySelectorAll(".dun a[href], .dun-foot a[href]").forEach(function (a) {
      var h = a.getAttribute("href"); if (h.charAt(0) !== "/") return;
      if (h === path || (h !== "/" && path.indexOf(h) === 0 && h.length > 1)) a.setAttribute("aria-current", "page");
    });
    function close(m, btn) { m.classList.remove("open"); if (btn) { btn.setAttribute("aria-expanded", "false"); if (btn === b) btn.setAttribute("aria-label", "Open menu"); } }
    if (b && d) b.addEventListener("click", function (e) {
      e.stopPropagation(); var o = d.classList.toggle("open");
      b.setAttribute("aria-expanded", o ? "true" : "false"); b.setAttribute("aria-label", o ? "Close menu" : "Open menu");
      if (pop) close(pop, ub);
    });
    var pop = null, ub = null;
    document.addEventListener("click", function (e) {
      if (d && d.classList.contains("open") && !d.contains(e.target)) close(d, b);
      if (pop && pop.classList.contains("open") && !pop.contains(e.target) && e.target !== ub) close(pop, ub);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (d && d.classList.contains("open")) { close(d, b); b.focus(); }
      if (pop && pop.classList.contains("open")) { close(pop, ub); ub.focus(); }
    });
    function share() {
      var u = location.href.split("#")[0], t = document.title;
      if (navigator.share) return navigator.share({ title: t, url: u }).catch(function () {});
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { var x = document.createElement("div"); x.className = "dun-x"; x.setAttribute("role", "status"); x.textContent = "Link copied"; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 1800); });
    }
    document.querySelectorAll("[data-dun-share]").forEach(function (x) { x.addEventListener("click", share); });
    // Standard footer links on every page.
    var want = [["/store/", "Store"], ["/", "Marketplace"], ["/makers/", "Creators"], ["/league/", "League"], ["/blog/", "Blog"]];
    var foot = document.querySelector("footer:not(.dun)") ;
    var row = document.createElement("p"); row.className = "dun-foot-links";
    var have = foot ? [].map.call(foot.querySelectorAll("a[href]"), function (a) { return a.getAttribute("href"); }) : [];
    var missing = want.filter(function (w) { return have.indexOf(w[0]) < 0; });
    function add(el, items) { items.forEach(function (w, i) { if (el.childNodes.length) el.appendChild(document.createTextNode(" · ")); var a = document.createElement("a"); a.href = w[0]; a.textContent = w[1]; el.appendChild(a); });
      el.appendChild(document.createTextNode(" · ")); var s = document.createElement("button"); s.type = "button"; s.textContent = "Share"; s.addEventListener("click", share); el.appendChild(s); }
    if (!foot) { var f = document.createElement("footer"); f.className = "dun-foot"; add(row, want); f.appendChild(row); document.body.appendChild(f); }
    else { row.style.cssText = "margin:.5rem 0 0;white-space:normal"; row.className += " dun-foot"; row.style.padding = "0"; add(row, missing); foot.appendChild(row); }
    // Account: Sign in, or the signed-in maker's name with a dropdown.
    var acct = document.getElementById("dunAcct");
    if (acct) fetch("/api/nav", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (n) {
      if (!n || !n.creator) { if (n && n.owner) acct.insertAdjacentHTML("afterbegin", '<a class="dun-signin" href="/owner/" data-owner-link>Owner</a>'); return; }
      var nm = n.creator.name || "My account";
      acct.innerHTML = '<button type="button" class="dun-user" aria-haspopup="true" aria-expanded="false" aria-controls="dunPop"><span class="av" aria-hidden="true"></span><span class="nm"></span></button><div class="dun-pop" id="dunPop" role="menu"></div>';
      ub = acct.querySelector(".dun-user"); pop = acct.querySelector(".dun-pop");
      ub.querySelector(".av").textContent = nm.charAt(0).toUpperCase(); ub.querySelector(".nm").textContent = nm; ub.setAttribute("aria-label", "Account menu for " + nm);
      pop.innerHTML = '<a role="menuitem" href="/community/dashboard/">Dashboard</a><button type="button" role="menuitem" data-signout>Log out</button>';
      ub.addEventListener("click", function (e) { e.stopPropagation(); var o = pop.classList.toggle("open"); ub.setAttribute("aria-expanded", o ? "true" : "false"); if (d) close(d, b); });
      pop.querySelector("[data-signout]").addEventListener("click", function () { fetch("/api/community/creator?action=signout", { method: "POST", credentials: "same-origin" }).finally(function () { location.reload(); }); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
