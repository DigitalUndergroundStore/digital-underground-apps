/* "Write it with your AI": builds a copyable prompt from what the creator typed, then parses the AI's answer
   back into the form. Runs entirely in the browser (no server AI). Never submits the form. */
(function () {
  var LIM = { name: 120, pitchShort: 280, descriptionLong: 4000, tags: 160 };
  var CSS = '.aih{margin:0 0 16px;border:1px solid rgba(167,139,250,.35);border-radius:16px;background:linear-gradient(135deg,rgba(124,58,237,.14),rgba(37,99,235,.10));}' +
    '.aih>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;min-height:52px;padding:0 14px;font-weight:700;font-size:15px;color:#fff}' +
    '.aih>summary::-webkit-details-marker{display:none}.aih>summary .aih-ic{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#7c3aed,#2563eb);flex:none}' +
    '.aih>summary .aih-ic svg{width:17px;height:17px}.aih>summary .aih-sub{font-weight:500;font-size:12.5px;color:rgba(200,192,218,.9);display:block}' +
    '.aih>summary .aih-chev{margin-left:auto;transition:transform .2s}.aih[open]>summary .aih-chev{transform:rotate(180deg)}' +
    '.aih-body{padding:0 14px 14px;display:grid;gap:10px}.aih-step{font-size:13px;font-weight:700;color:#bfe8ff;margin:6px 0 0;letter-spacing:.02em}' +
    '.aih textarea{width:100%;box-sizing:border-box;min-height:120px;resize:vertical;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(6,4,14,.6);color:#f5f3ff;padding:10px 12px;font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}' +
    '.aih textarea:focus{outline:2px solid rgba(191,232,255,.7);outline-offset:1px}' +
    '.aih-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.aih-btn{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font:700 14px/1 inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px}' +
    '.aih-btn.pri{background:linear-gradient(110deg,#7c3aed,#2563eb);border-color:rgba(255,255,255,.28)}.aih-btn:focus-visible{outline:2px solid #bfe8ff;outline-offset:2px}' +
    '.aih-msg{font-size:13px;color:rgba(200,192,218,.95);min-height:1em}.aih-msg.ok{color:#86efac}.aih-msg.err{color:#fca5a5}' +
    '.aih-tip{border-top:1px solid rgba(255,255,255,.1);padding-top:8px}.aih-tip>summary{cursor:pointer;font-size:13px;font-weight:650;color:#bfe8ff;min-height:36px;display:flex;align-items:center}' +
    '.aih-tip p{margin:4px 0 0;font-size:13px;color:rgba(200,192,218,.95);line-height:1.5}' +
    '@media (max-width:480px){.aih-row .aih-btn{flex:1;justify-content:center}}';

  function val(form, n) { var el = form.elements[n]; return el && el.value ? String(el.value).trim() : ""; }
  function prompt(form) {
    var name = val(form, "name"), url = val(form, "projectUrl"), pitch = val(form, "pitchShort"), desc = val(form, "descriptionLong"), tags = val(form, "tags");
    var cat = form.elements.category && form.elements.category.selectedOptions && form.elements.category.selectedOptions[0] ? form.elements.category.selectedOptions[0].text : "";
    var price = val(form, "priceLabel");
    var known = [
      "Product name: " + (name || "(not set yet; suggest one)"),
      url ? "Product link: " + url : "",
      cat ? "Category: " + cat : "",
      price ? "Price: " + price : "",
      pitch ? "My current tagline: " + pitch : "",
      desc ? "My notes / current description: " + desc : "",
      tags ? "My tags: " + tags : "",
    ].filter(Boolean).join("\n");
    return "You are helping me write a listing for my product on the Digital Underground Developer Marketplace (digitalundergroundstore.com/community/).\n\n" +
      known + "\n\n" +
      "If a product link is given and you can open it, use it; otherwise use only the details above. Do not invent features, prices, reviews, or claims.\n" +
      "Write in clear, friendly, specific English. No hype words like \"revolutionary\" or \"game-changing\", no emojis, no hashtags.\n\n" +
      "Reply with ONLY this JSON object and nothing else (no markdown, no code fences):\n" +
      '{"title": "...", "tagline": "...", "description": "...", "tags": ["...", "..."]}\n\n' +
      "Rules:\n" +
      "- title: the product name, max " + LIM.name + " characters.\n" +
      "- tagline: one sentence saying what it does and who it is for, max " + LIM.pitchShort + " characters.\n" +
      "- description: 2-4 short paragraphs (separate with \\n\\n): what it is, key features, who it helps, how to get it. Max 1500 characters.\n" +
      "- tags: 3-6 lowercase keywords, 1-2 words each.";
  }
  function cut(s, n) { s = String(s || "").replace(/\r/g, "").trim(); if (s.length <= n) return s; var c = s.slice(0, n - 1); var sp = c.lastIndexOf(" "); return (sp > n * 0.8 ? c.slice(0, sp) : c).replace(/[\s,;:.-]+$/, "") + "…"; }
  function parse(text) {
    var t = String(text || "").replace(/^\uFEFF/, "").replace(/```(?:json)?/gi, "").trim();
    t = t.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
    var out = null, a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) {
      var j = t.slice(a, b + 1);
      try { out = JSON.parse(j); } catch (_) {
        try { out = JSON.parse(j.replace(/,\s*([}\]])/g, "$1").replace(/\n/g, "\\n").replace(/\\n\s*"/g, '"').replace(/{\\n/g, "{").replace(/\\n}/g, "}").replace(/\\n\s*\\n/g, "\\n\\n")); } catch (_) { out = null; }
      }
    }
    if (!out) {
      // Labeled lines: Title: ... / Tagline: ... / Description: ... (multi-line) / Tags: ...
      out = {}; var key = null, map = { title: "title", name: "title", "product name": "title", tagline: "tagline", "short description": "tagline", pitch: "tagline", description: "description", "long description": "description", tags: "tags", keywords: "tags" };
      t.split("\n").forEach(function (line) {
        var m = /^\s*[*#>\-\s]*\**\s*(title|name|product name|tagline|short description|pitch|description|long description|tags|keywords)\s*\**\s*[:\uFF1A]\s*(.*)$/i.exec(line);
        if (m) { key = map[m[1].toLowerCase()]; out[key] = m[2].replace(/^\s*\*+\s*/, "").replace(/\s*\*+\s*$/, "").trim(); }
        else if (key === "description") out.description += (out.description ? "\n" : "") + line;
        else if (key && line.trim() && !out[key]) out[key] = line.trim();
      });
    }
    var get = function () { for (var i = 0; i < arguments.length; i++) { var k = arguments[i]; if (out[k] != null && out[k] !== "") return out[k]; } return ""; };
    var tags = get("tags", "keywords");
    if (typeof tags === "string") tags = tags.split(/[,;\n#]+/);
    tags = (Array.isArray(tags) ? tags : []).map(function (x) { return String(x).replace(/^#/, "").trim().toLowerCase(); }).filter(Boolean);
    var seen = {}; tags = tags.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; }).slice(0, 6);
    var tagStr = ""; tags.forEach(function (x) { var n = tagStr ? tagStr + ", " + x : x; if (n.length <= LIM.tags) tagStr = n; });
    var res = {
      name: cut(get("title", "name", "productName"), LIM.name),
      pitchShort: cut(get("tagline", "pitch", "shortDescription", "summary"), LIM.pitchShort),
      descriptionLong: cut(String(get("description", "longDescription", "body")).replace(/\\n/g, "\n").replace(/\n{3,}/g, "\n\n"), LIM.descriptionLong),
      tags: tagStr,
    };
    return res;
  }
  function setField(form, n, v) {
    var el = form.elements[n]; if (!el || !v) return false;
    el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function copyText(s) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(s);
    return new Promise(function (res, rej) {
      var i = document.createElement("textarea"); i.value = s; i.style.position = "fixed"; i.style.opacity = "0"; document.body.appendChild(i); i.select();
      try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); } i.remove();
    });
  }
  function mount(form, before) {
    if (!form || form.querySelector(".aih")) return;
    if (!document.getElementById("aih-css")) { var st = document.createElement("style"); st.id = "aih-css"; st.textContent = CSS; document.head.appendChild(st); }
    var d = document.createElement("details"); d.className = "aih";
    d.innerHTML =
      '<summary><span class="aih-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.5L12 15l-1.8-4.5L5.5 9l4.7-1.4L12 3zM18 14l.9 2.2 2.1.8-2.1.8L18 20l-.9-2.2-2.1-.8 2.1-.8L18 14z" fill="#fff"/></svg></span>' +
      '<span>Write it with your AI<span class="aih-sub">ChatGPT, Gemini, Claude, Grok: copy, paste, fill</span></span>' +
      '<svg class="aih-chev" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary>' +
      '<div class="aih-body">' +
      '<p class="aih-step">1 · Copy this prompt into any AI</p>' +
      '<textarea class="aih-prompt" readonly aria-label="Prompt for your AI"></textarea>' +
      '<div class="aih-row"><button type="button" class="aih-btn pri aih-copy">Copy prompt</button><button type="button" class="aih-btn aih-refresh">Update from my fields</button></div>' +
      '<p class="aih-step">2 · Paste the AI\'s answer</p>' +
      '<textarea class="aih-paste" placeholder="Paste the AI result here (JSON or Title:/Tagline:/Description:/Tags: lines)" aria-label="Paste AI result"></textarea>' +
      '<div class="aih-row"><button type="button" class="aih-btn pri aih-fill">Fill form</button><span class="aih-msg" role="status" aria-live="polite"></span></div>' +
      '<details class="aih-tip"><summary>Tip: make your cover image or promo video with AI</summary><p>Use an image or video AI tool (for example ChatGPT, Gemini, Grok Imagine, Runway or Canva) to make a clean cover image or a 10–30s promo clip. Then add it with the media buttons below. Keep text on images large and readable. Everything you submit goes through the usual screening and review.</p></details>' +
      "</div>";
    (before && before.parentNode === form ? form.insertBefore(d, before) : form.insertBefore(d, form.firstChild));
    var pr = d.querySelector(".aih-prompt"), msg = d.querySelector(".aih-msg");
    function refresh() { pr.value = prompt(form); }
    d.addEventListener("toggle", function () { if (d.open) refresh(); });
    d.querySelector(".aih-refresh").addEventListener("click", refresh);
    d.querySelector(".aih-copy").addEventListener("click", function () {
      refresh();
      copyText(pr.value).then(function () { msg.className = "aih-msg ok"; msg.textContent = "Prompt copied. Paste it into your AI."; },
        function () { pr.focus(); pr.select(); msg.className = "aih-msg"; msg.textContent = "Select the text and copy it."; });
    });
    d.querySelector(".aih-fill").addEventListener("click", function () {
      var raw = d.querySelector(".aih-paste").value;
      if (!raw.trim()) { msg.className = "aih-msg err"; msg.textContent = "Paste the AI's answer first."; return; }
      var r = parse(raw), n = 0;
      ["name", "pitchShort", "descriptionLong", "tags"].forEach(function (k) { if (setField(form, k, r[k])) n++; });
      if (!n) { msg.className = "aih-msg err"; msg.textContent = "Couldn't read that. Ask your AI to reply with only the JSON."; return; }
      msg.className = "aih-msg ok"; msg.textContent = "Filled " + n + " field" + (n > 1 ? "s" : "") + ". Review, then save.";
    });
  }
  window.duAiHelper = { mount: mount, parse: parse, prompt: prompt };
})();
