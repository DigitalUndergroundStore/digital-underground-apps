/* Maker Guide v1: lightweight FAQ helper (no LLM). Bottom-right FAB + panel with quick chips + deep links. */
(function () {
  if (window.__duMakerGuide) return; window.__duMakerGuide = 1;
  var IMG = "/assets/mascot/";
  var QA = [
    { k: "list", q: "List my project free", a: "Listing is free. Add your app, tool or product with a title, link and a few screenshots, and it goes live on the store after a quick check.", l: [["List free", "/community/submit/"]] },
    { k: "fee", q: "0% commission?", a: "Yes. We take 0% commission. Buyers pay you directly through your own checkout link, so you keep 100% of every sale.", l: [["How it works", "/how-it-works/"]] },
    { k: "page", q: "Customize my public page", a: "Open your dashboard, then go to Profile to set your name, avatar, bio, links and featured projects. That's what shows on your public maker page.", l: [["Edit my profile", "/community/dashboard/#profile"]] },
    { k: "shop", q: "Shop the store", a: "Browse apps, tools, templates and calculators from indie makers. Many are free, and every listing links straight to the maker.", l: [["Open the store", "/store/"]] },
    { k: "how", q: "How it works", a: "1) List your project free. 2) Customize your public page. 3) Share it, and buyers find you in the store. No commission, no gatekeeping.", l: [["Read the full guide", "/how-it-works/"]] },
    { k: "league", q: "Maker League", a: "The Maker League is a friendly ranking for makers. Listings, updates and real engagement earn points, and top makers get spotlighted on the homepage.", l: [["See the League", "/league/"], ["List free to join", "/community/submit/"]] }
  ];
  var css = ".mg-fab{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:calc(8px + env(safe-area-inset-bottom));z-index:61;width:60px;height:60px;border-radius:50%;border:1px solid rgba(154,151,232,.6);background:#1b1e27;box-shadow:0 8px 24px rgba(0,0,0,.45);cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;transition:transform .2s ease}" +
    ".mg-fab:hover{transform:translateY(-2px)}.mg-fab img{width:50px;height:50px;object-fit:contain}.mg-fab:focus-visible{outline:2px solid #9a97e8;outline-offset:3px}" +
    "@media(max-width:760px){.mg-fab{width:52px;height:52px}.mg-fab img{width:44px;height:44px}}" +
    ".mg-panel{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(76px + env(safe-area-inset-bottom));z-index:62;width:min(340px,calc(100vw - 32px));max-height:min(520px,calc(100vh - 120px));overflow:auto;background:#151821;color:#e8e9f0;border:1px solid rgba(154,151,232,.45);border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.55);font:14px/1.45 ui-sans-serif,system-ui,sans-serif;display:none}" +
    ".mg-panel.open{display:block}.mg-hd{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}.mg-hd img{width:40px;height:40px;object-fit:contain}.mg-hd b{display:block;font-size:15px}.mg-hd small{color:#9ca0b3}.mg-x{margin-left:auto;background:none;border:0;color:#9ca0b3;font-size:22px;cursor:pointer;line-height:1}" +
    ".mg-bd{padding:12px 14px}.mg-msg{background:#1f2330;border-radius:12px;padding:10px 12px;margin-bottom:10px}.mg-links a{display:inline-block;margin:6px 8px 0 0;padding:7px 12px;border-radius:999px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:13px}" +
    ".mg-chips{display:flex;flex-wrap:wrap;gap:6px}.mg-chips button{background:transparent;color:#c9c7f5;border:1px solid rgba(154,151,232,.5);border-radius:999px;padding:6px 10px;font:600 12.5px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer}.mg-chips button:hover,.mg-chips button[aria-pressed=true]{background:rgba(79,70,229,.25)}" +
    "@media(prefers-reduced-motion:reduce){.mg-fab{transition:none}}";
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function init() {
    var st = el("style"); st.textContent = css; document.head.appendChild(st);
    var fab = el("button", "mg-fab", '<img src="' + IMG + 'maker-guide-idle.webp" alt="" width="50" height="50">');
    fab.type = "button"; fab.setAttribute("aria-label", "Open Maker Guide help"); fab.setAttribute("aria-expanded", "false"); fab.setAttribute("aria-controls", "mg-panel");
    var p = el("div", "mg-panel"); p.id = "mg-panel"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Maker Guide");
    p.innerHTML = '<div class="mg-hd"><img src="' + IMG + 'maker-guide-pointing.webp" alt=""><div><b>Maker Guide</b><small>Quick answers, no sign-up</small></div><button class="mg-x" type="button" aria-label="Close">&times;</button></div>' +
      '<div class="mg-bd"><div class="mg-msg" aria-live="polite"><div class="mg-a">Hi! I\'m the Maker Guide. What can I help with?</div><div class="mg-links"></div></div><div class="mg-chips"></div></div>';
    var chips = p.querySelector(".mg-chips"), a = p.querySelector(".mg-a"), ln = p.querySelector(".mg-links"), hi = p.querySelector(".mg-hd img");
    QA.forEach(function (x) {
      var b = el("button", null, esc(x.q)); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.onclick = function () {
        [].forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
        a.textContent = x.a; ln.innerHTML = x.l.map(function (l) { return '<a href="' + l[1] + '">' + esc(l[0]) + "</a>"; }).join("");
        hi.src = IMG + (x.k === "list" || x.k === "league" ? "maker-guide-celebrate.webp" : "maker-guide-pointing.webp");
        try { window.dispatchEvent(new CustomEvent("du:maker-guide", { detail: x.k })); } catch (_) {}
      };
      chips.appendChild(b);
    });
    function tog(o) { p.classList.toggle("open", o); fab.setAttribute("aria-expanded", o ? "true" : "false"); if (o) { var f = chips.querySelector("button"); f && f.focus(); } }
    fab.onclick = function () { tog(!p.classList.contains("open")); };
    p.querySelector(".mg-x").onclick = function () { tog(false); fab.focus(); };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && p.classList.contains("open")) { tog(false); fab.focus(); } });
    document.body.appendChild(p); document.body.appendChild(fab);

  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
