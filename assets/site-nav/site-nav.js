/* Shared DU header v3 (+ static shared footer): menu toggle (all sizes), account (Sign in / maker dropdown), aria-current, Share, standard footer links.
   Safe to include more than once: it only initialises once. */
(function () {
  if (window.__duNav) return; window.__duNav = 1;
  function init() {
    var b = document.getElementById("dunMenu"), d = document.getElementById("dunDrawer");
    var path = location.pathname;
    document.querySelectorAll(".dun a[href]").forEach(function (a) {
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
    // The one shared site footer is static HTML (<!--du-site-foot--> block, stamped by scripts/apply-site-nav.py); wire it up here.
    var foot = document.querySelector("footer.duf");
    if (foot) {
    var yr = foot.querySelector(".duf-year"); if (yr) yr.textContent = new Date().getFullYear();
    var fs = foot.querySelector("[data-duf-share]"); if (fs) fs.addEventListener("click", share);
    var nl = foot.querySelector(".duf-nl"), msg = nl.querySelector(".duf-msg");
    nl.addEventListener("submit", function (e) {
      e.preventDefault(); var em = nl.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em)) { msg.textContent = "Please enter a valid email address."; return; }
      if (!nl.consent.checked) { msg.textContent = "Please tick the box to agree to receive emails."; return; }
      var btn = nl.querySelector("button"); btn.disabled = true; msg.textContent = "Subscribing…";
      fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em, consent: true, website: nl.website.value, source: "footer:" + location.pathname }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) { if (x.ok) { nl.classList.add("done"); msg.textContent = "You're subscribed. Thanks! "; if (x.d && typeof x.d.gift === "string" && /^https:\/\/kerzy\.gumroad\.com\//.test(x.d.gift)) { var dl = document.createElement("a"); dl.href = x.d.gift; dl.target = "_blank"; dl.rel = "noopener"; dl.textContent = "Claim PlanetView Live free on Gumroad (CA$0 with the code; your license key comes by email)"; msg.appendChild(dl); msg.appendChild(document.createTextNode(", then ")); var pl = document.createElement("a"); pl.href = "/planetview/"; pl.textContent = "open PlanetView and paste the key"; msg.appendChild(pl); msg.appendChild(document.createTextNode(". Free for a limited time. You can unsubscribe any time from any email.")); } } else { msg.textContent = (x.d && x.d.error) || "Something went wrong. Please try again."; btn.disabled = false; } })
        .catch(function () { msg.textContent = "Network error. Please try again."; btn.disabled = false; });
    });
    }
    // Account: Sign in, or the signed-in maker's name with a dropdown.
    var acct = document.getElementById("dunAcct");
    if (acct) fetch("/api/nav", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (n) {
      if (!n || !n.creator) { if (n && n.isOwner) acct.insertAdjacentHTML("afterbegin", '<a class="dun-signin" href="/owner/" data-owner-link>Owner</a>'); return; }
      var nm = n.creator.name || "My account";
      acct.innerHTML = '<button type="button" class="dun-user" aria-haspopup="true" aria-expanded="false" aria-controls="dunPop"><span class="av" aria-hidden="true"></span><span class="nm"></span></button><div class="dun-pop" id="dunPop" role="menu"></div>';
      ub = acct.querySelector(".dun-user"); pop = acct.querySelector(".dun-pop");
      var avEl = ub.querySelector(".av");
      if (n.creator.avatar && /^\/(?!\/)/.test(n.creator.avatar)) { var im = new Image(); im.src = n.creator.avatar; im.alt = ""; avEl.appendChild(im); avEl.classList.add("has-img"); if (/\.svg$/.test(n.creator.avatar)) avEl.classList.add("mark"); }
      else avEl.textContent = nm.charAt(0).toUpperCase(); ub.querySelector(".nm").textContent = nm; ub.setAttribute("aria-label", "Account menu for " + nm);
      pop.innerHTML = (n.isOwner ? '<a role="menuitem" href="/owner/" data-owner-link>Owner</a>' : '') + '<a role="menuitem" href="/community/dashboard/">Dashboard</a><a role="menuitem" href="/community/profile/">Edit profile</a><button type="button" role="menuitem" data-signout>Sign out</button>';
      ub.addEventListener("click", function (e) { e.stopPropagation(); var o = pop.classList.toggle("open"); ub.setAttribute("aria-expanded", o ? "true" : "false"); if (d) close(d, b); });
      pop.querySelector("[data-signout]").addEventListener("click", function () { fetch("/api/community/creator?action=signout", { method: "POST", credentials: "same-origin" }).finally(function () { location.reload(); }); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
