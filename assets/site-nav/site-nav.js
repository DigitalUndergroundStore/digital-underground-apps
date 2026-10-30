/* Shared DU header. One top-right control: the account icon opens the site menu
   (former hamburger links plus account / sign-in, under that logo).
   Safe to include more than once: it only initialises once. */
(function () {
  if (window.__duNav) return; window.__duNav = 1;
  var MARK = "/assets/logo/du-mark.svg";
  function init() {
    var drawer = document.getElementById("dunDrawer");
    var acct = document.getElementById("dunAcct");
    document.querySelectorAll("header.dun .dun-menu").forEach(function (el) { el.remove(); });
    var whoName = "";
    var btn = null;

    function markCurrent() {
      var path = location.pathname;
      document.querySelectorAll(".dun a[href]").forEach(function (a) {
        var h = a.getAttribute("href"); if (!h || h.charAt(0) !== "/") return;
        if (h === path || (h !== "/" && path.indexOf(h) === 0 && h.length > 1)) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    }
    function menuLabel(open) {
      var what = whoName ? "menu and account for " + whoName : "menu and account";
      return (open ? "Close " : "Open ") + what;
    }
    function setOpen(open) {
      if (!drawer || !btn) return;
      drawer.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", menuLabel(open));
    }
    function ensureDrawerSlot() {
      if (!drawer) return null;
      var slot = document.getElementById("dunDrawerAcct");
      if (!slot) {
        slot = document.createElement("div");
        slot.className = "dun-drawer-acct";
        slot.id = "dunDrawerAcct";
        slot.setAttribute("role", "group");
        slot.setAttribute("aria-label", "Account");
        drawer.insertBefore(slot, drawer.firstChild);
      }
      return slot;
    }
    function ensureButton() {
      if (!acct) return null;
      var existing = acct.querySelector("#dunAcctBtn");
      if (existing) return existing;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "dun-acct-btn";
      b.id = "dunAcctBtn";
      b.innerHTML = '<img src="' + MARK + '" alt="" width="26" height="26">';
      acct.querySelectorAll(".dun-signin, [data-owner-link], .dun-pop, .dun-user").forEach(function (n) { n.remove(); });
      acct.appendChild(b);
      return b;
    }
    function avatarInto(node, creator, label) {
      node.textContent = "";
      node.classList.remove("has-img", "mark");
      if (creator && creator.avatar && /^\/(?!\/)/.test(creator.avatar)) {
        var im = document.createElement("img");
        im.src = creator.avatar;
        im.alt = "";
        node.appendChild(im);
        node.classList.add("has-img");
        if (/\.svg$/.test(creator.avatar)) node.classList.add("mark");
        return;
      }
      if (!creator) {
        var mark = document.createElement("img");
        mark.src = MARK;
        mark.alt = "";
        node.appendChild(mark);
        node.classList.add("has-img", "mark");
        return;
      }
      node.textContent = (label || "A").charAt(0).toUpperCase();
    }
    function paint(n) {
      var slot = ensureDrawerSlot();
      var creator = n && n.creator;
      whoName = creator ? (creator.name || "My account") : "";
      if (btn) {
        btn.textContent = "";
        if (creator) {
          btn.className = "dun-user dun-acct-btn";
          var av = document.createElement("span");
          av.className = "av";
          av.setAttribute("aria-hidden", "true");
          avatarInto(av, creator, whoName);
          var nm = document.createElement("span");
          nm.className = "nm";
          nm.setAttribute("aria-hidden", "true");
          nm.textContent = whoName;
          btn.appendChild(av);
          btn.appendChild(nm);
        } else {
          btn.className = "dun-acct-btn";
          var icon = document.createElement("img");
          icon.src = MARK;
          icon.alt = "";
          icon.width = 26;
          icon.height = 26;
          btn.appendChild(icon);
        }
        btn.setAttribute("aria-label", menuLabel(drawer && drawer.classList.contains("open")));
      }
      if (!slot) return;
      slot.textContent = "";
      var who = document.createElement("div");
      who.className = "dun-drawer-who";
      var face = document.createElement("span");
      face.className = "av";
      face.setAttribute("aria-hidden", "true");
      avatarInto(face, creator, whoName || "Account");
      var caption = document.createElement("span");
      caption.className = "nm";
      caption.textContent = whoName || "Account";
      who.appendChild(face);
      who.appendChild(caption);
      slot.appendChild(who);
      function addLink(href, text) {
        var a = document.createElement("a");
        a.href = href;
        a.textContent = text;
        slot.appendChild(a);
      }
      if (n && n.isOwner) addLink("/owner/", "Owner");
      if (creator) {
        addLink("/community/dashboard/", "Dashboard");
        addLink("/community/profile/", "Edit profile");
        var so = document.createElement("button");
        so.type = "button";
        so.setAttribute("data-signout", "");
        so.textContent = "Sign out";
        so.addEventListener("click", function () {
          fetch("/api/community/creator?action=signout", { method: "POST", credentials: "same-origin" }).finally(function () { location.reload(); });
        });
        slot.appendChild(so);
      } else {
        addLink("/community/dashboard/", "Sign in");
      }
      markCurrent();
    }

    btn = ensureButton();
    if (btn) {
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-controls", "dunDrawer");
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", menuLabel(false));
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!(drawer && drawer.classList.contains("open")));
      });
    }
    paint(null);
    if (acct) fetch("/api/nav", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (n) {
      if (!n) return;
      if (!n.creator && !n.isOwner) return;
      paint(n);
    });
    document.addEventListener("click", function (e) {
      if (!drawer || !drawer.classList.contains("open")) return;
      if (drawer.contains(e.target) || (btn && btn.contains(e.target))) return;
      setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !drawer || !drawer.classList.contains("open")) return;
      setOpen(false);
      if (btn) btn.focus();
    });

    var SHARE_IMG = "/store/share-marketplace-v1.jpg", shareFile = null;
    var SHARE_TXT = "Built an app, guide, template or AI tool? List it free on Digital Underground: $0 to list, 0% commission, your own checkout. Makers keep 100% of every sale.";
    try { if (navigator.canShare && window.File && window.fetch) fetch(SHARE_IMG).then(function (r) { return r.blob(); }).then(function (b) { var f = new File([b], "digital-underground-marketplace.jpg", { type: "image/jpeg" }); if (navigator.canShare({ files: [f] })) shareFile = f; }).catch(function () {}); } catch (e) {}
    function toast(m) { var x = document.createElement("div"); x.className = "dun-x"; x.setAttribute("role", "status"); x.textContent = m; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 2200); }
    // Copy = plain text only (blurb + URL on two lines). Never an image-only clipboard.
    function copyText(txt) {
      function legacy() { try { var ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); ta.remove(); return ok ? Promise.resolve() : Promise.reject(); } catch (e) { return Promise.reject(e); } }
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).catch(function () {
        if (window.ClipboardItem && navigator.clipboard.write) return navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([txt], { type: "text/plain" }) })]).catch(legacy);
        return legacy();
      });
      return legacy();
    }
    function share() {
      var u = location.href.split("#")[0], t = "List your app free on Digital Underground", txt = SHARE_TXT + "\n" + u;
      // Always put blurb + link on the clipboard first, so "Copy" anywhere yields text.
      var copied = copyText(txt);
      if (navigator.share) {
        var payload = { title: t, text: SHARE_TXT, url: u };
        if (shareFile) { var df = { title: t, text: txt, files: [shareFile] }; try { if (navigator.canShare(df)) payload = df; } catch (e) {} }
        return navigator.share(payload).catch(function (err) { if (payload.files && err && err.name !== "AbortError") navigator.share({ title: t, text: SHARE_TXT, url: u }).catch(function () {}); });
      }
      copied.then(function () { toast("Copied: blurb + link, ready to paste"); }, function () { toast("Couldn't copy, link: " + u); });
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
      var sub = nl.querySelector("button"); sub.disabled = true; msg.textContent = "Subscribing…";
      fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em, consent: true, website: nl.website.value, source: "footer:" + location.pathname }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) { if (x.ok) { nl.classList.add("done"); msg.textContent = "You're subscribed. Thanks! "; if (x.d && typeof x.d.gift === "string" && /^https:\/\/kerzy\.gumroad\.com\//.test(x.d.gift)) { var dl = document.createElement("a"); dl.href = x.d.gift; dl.target = "_blank"; dl.rel = "noopener"; dl.textContent = "Claim PlanetView Live free on Gumroad (CA$0 with the code; your license key comes by email)"; msg.appendChild(dl); msg.appendChild(document.createTextNode(", then ")); var pl = document.createElement("a"); pl.href = "/planetview/"; pl.textContent = "open PlanetView and paste the key"; msg.appendChild(pl); msg.appendChild(document.createTextNode(". Free for a limited time. You can unsubscribe any time from any email.")); } } else { msg.textContent = (x.d && x.d.error) || "Something went wrong. Please try again."; sub.disabled = false; } })
        .catch(function () { msg.textContent = "Network error. Please try again."; sub.disabled = false; });
    });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
/* Maker Guide helper (site-wide) */
(function(){ if (document.querySelector('script[src^="/assets/maker-guide/"]')) return; var s=document.createElement("script"); s.src="/assets/maker-guide/maker-guide.js?v=20261030nofab"; s.defer=true; document.head.appendChild(s); })();
/* Permanent Maker League trophies (hall of fame) */
(function(){ if (document.querySelector('script[src^="/assets/league/trophies"]')) return; var s=document.createElement("script"); s.src="/assets/league/trophies.js?v=5"; s.defer=true; document.head.appendChild(s); })();
