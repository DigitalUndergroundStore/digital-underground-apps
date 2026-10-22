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
    // One shared site footer on every page (replaces the page's own footer).
    var X = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-7.5 8.6L23.3 22h-6.9l-5.4-7-6.2 7H1.7l8-9.2L1.2 2h7l4.9 6.4zm-1.2 18h1.9L7.4 3.9H5.4z"/></svg>';
    var col = function (h, items) { return '<div class="duf-col"><h3>' + h + "</h3><ul>" + items.map(function (i) { return "<li>" + (i[0] === "share" ? '<button type="button" data-duf-share>Share this page</button>' : '<a href="' + i[0] + '">' + i[1] + "</a>") + "</li>"; }).join("") + "</ul></div>"; };
    var fhtml = '<div class="duf-in"><div class="duf-brand"><a href="/" class="duf-logo" aria-label="Digital Underground home"><img src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="260" height="47"></a>' +
      '<p class="duf-tag">A free developer marketplace and store for independent makers. Zero cut, your checkout.</p>' +
      '<form class="duf-nl" novalidate><label for="dufEmail">Get new projects and updates by email</label><div class="duf-row"><input id="dufEmail" type="email" name="email" placeholder="you@example.com" autocomplete="email" required><button type="submit">Subscribe</button></div>' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" class="duf-hp" aria-hidden="true">' +
      '<label class="duf-ck"><input type="checkbox" name="consent"> Yes, email me new apps, updates and occasional offers from Digital Underground. I can unsubscribe at any time.</label>' +
      '<p class="duf-msg" role="status" aria-live="polite"></p><p class="duf-priv">We only use your email for this list, never sell it, and every email has an unsubscribe link. <a href="/privacy/">Privacy policy</a>.</p></form>' +
      '<div class="duf-social"><a href="https://x.com/DigitalUG_Store" rel="noopener" target="_blank" aria-label="Digital Underground on X">' + X + "</a></div></div>" +
      '<div class="duf-cols">' + col("Marketplace", [["/#projects", "Browse"], ["/league/", "League"], ["/community/submit/", "List your project"], ["/makers/", "Creators"]]) +
      col("Resources", [["/blog/", "Blog"], ["/#faq", "FAQ"], ["/community/api/", "Developer API"], ["share"]]) +
      col("Company", [["/store/", "Store"], ["/privacy/", "Privacy"], ["/terms/", "Terms"], ["mailto:digitalunderground.store@proton.me", "Contact"]]) + "</div></div>" +
      '<div class="duf-bar"><p>© ' + new Date().getFullYear() + ' Digital Underground · Ontario, Canada</p><p class="duf-legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="mailto:digitalunderground.store@proton.me">Contact</a></p></div>';
    var old = [].filter.call(document.querySelectorAll("footer"), function (f) { return !f.closest(".dun") && !f.closest("article") && !f.closest(".duf"); });
    var foot = document.createElement("footer"); foot.className = "duf"; foot.innerHTML = fhtml;
    var keep = [];
    old.forEach(function (f) { [].forEach.call(f.querySelectorAll("p,small,div"), function (el) { if (!el.querySelector("p,div") && /\bCC[ -]|licen|credit|courtesy/i.test(el.textContent)) keep.push(el.innerHTML); }); });
    if (keep.length) { var cr = document.createElement("p"); cr.className = "duf-credit"; cr.innerHTML = keep.join(" · "); foot.querySelector(".duf-bar").appendChild(cr); }
    if (old.length) { old[old.length - 1].replaceWith(foot); old.slice(0, -1).forEach(function (f) { f.remove(); }); }
    else document.body.appendChild(foot);
    foot.querySelector("[data-duf-share]").addEventListener("click", share);
    var nl = foot.querySelector(".duf-nl"), msg = nl.querySelector(".duf-msg");
    nl.addEventListener("submit", function (e) {
      e.preventDefault(); var em = nl.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em)) { msg.textContent = "Please enter a valid email address."; return; }
      if (!nl.consent.checked) { msg.textContent = "Please tick the box to agree to receive emails."; return; }
      var btn = nl.querySelector("button"); btn.disabled = true; msg.textContent = "Subscribing…";
      fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em, consent: true, website: nl.website.value, source: "footer:" + location.pathname }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) { if (x.ok) { nl.classList.add("done"); msg.textContent = "You're subscribed. Thanks! You can unsubscribe any time from any email."; } else { msg.textContent = (x.d && x.d.error) || "Something went wrong. Please try again."; btn.disabled = false; } })
        .catch(function () { msg.textContent = "Network error. Please try again."; btn.disabled = false; });
    });
    // Account: Sign in, or the signed-in maker's name with a dropdown.
    var acct = document.getElementById("dunAcct");
    if (acct) fetch("/api/nav", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (n) {
      if (!n || !n.creator) { if (n && n.isOwner) acct.insertAdjacentHTML("afterbegin", '<a class="dun-signin" href="/owner/" data-owner-link>Owner</a>'); return; }
      var nm = n.creator.name || "My account";
      acct.innerHTML = '<button type="button" class="dun-user" aria-haspopup="true" aria-expanded="false" aria-controls="dunPop"><span class="av" aria-hidden="true"></span><span class="nm"></span></button><div class="dun-pop" id="dunPop" role="menu"></div>';
      ub = acct.querySelector(".dun-user"); pop = acct.querySelector(".dun-pop");
      ub.querySelector(".av").textContent = nm.charAt(0).toUpperCase(); ub.querySelector(".nm").textContent = nm; ub.setAttribute("aria-label", "Account menu for " + nm);
      pop.innerHTML = (n.isOwner ? '<a role="menuitem" href="/owner/" data-owner-link>Owner</a>' : '') + '<a role="menuitem" href="/community/dashboard/">Dashboard</a><button type="button" role="menuitem" data-signout>Log out</button>';
      ub.addEventListener("click", function (e) { e.stopPropagation(); var o = pop.classList.toggle("open"); ub.setAttribute("aria-expanded", o ? "true" : "false"); if (d) close(d, b); });
      pop.querySelector("[data-signout]").addEventListener("click", function () { fetch("/api/community/creator?action=signout", { method: "POST", credentials: "same-origin" }).finally(function () { location.reload(); }); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
