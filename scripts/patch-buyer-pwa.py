#!/usr/bin/env python3
"""Patch buyer apps: PWA manifests, unlock URL codes, install UI, /get/ landings, delivery docs."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://digitalundergroundstore.com"

# slug -> display name (unlock.js apps)
UNLOCK_APPS = {
    "pantry-week": "Pantry Week",
    "session-forge": "Session Forge",
    "focus-gate": "Focus Gate",
    "offer-desk": "Offer Desk",
    "rate-wire": "Rate Wire",
    "scope-lock": "Scope Lock",
    "invoice-desk": "Invoice Desk",
    "streak-kit": "Streak Kit",
    "reply-forge": "Reply Forge",
    "box-and-go": "Box & Go",
    "packlane": "Packlane",
    "due-desk": "Due Desk",
    "exam-desk": "Exam Desk",
    "hook-bank": "Hook Bank",
    "promo-lane": "Promo Lane",
    "launch-ledger": "Launch Ledger",
}

EXTRA_APPS = {
    "planetview": "PlanetView Live",
    "cork": "Cork",
}

GUMROAD_HINT = {
    "pantry-week": "jhagho",
    "session-forge": "wcvgxo",
    "focus-gate": "tckoc",
    "offer-desk": "bhrrtz",
    "rate-wire": "ppnorh",
    "scope-lock": "omzql",
    "invoice-desk": "nvmvyx",
    "streak-kit": "idasqr",
    "reply-forge": "nlwvb",
    "box-and-go": "hfyam",
    "packlane": "lchlou",
    "due-desk": "gfbgve",
    "exam-desk": "zpqpto",
    "hook-bank": "vusus",
    "promo-lane": "mlrnfq",
    "launch-ledger": "iacbv",
    "planetview": "oxnfvy",
    "cork": "fjmmi",
}

IOS_SVG = """<svg viewBox="0 0 240 80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="12" width="224" height="56" rx="10" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/>
  <text x="120" y="34" text-anchor="middle" font-size="11" fill="currentColor">Safari toolbar</text>
  <rect x="150" y="42" width="52" height="18" rx="4" fill="currentColor" opacity=".35"/>
  <text x="176" y="55" text-anchor="middle" font-size="9" fill="currentColor">Share</text>
</svg>"""

INSTALL_BLOCK = """
  <div id="du-install" class="du-install" hidden>
    <button type="button" id="du-install-btn" class="du-install-btn">Install app</button>
    <div id="du-ios-hint" class="du-ios-hint" hidden>
      <strong>iPhone / iPad</strong>
      <ol>
        <li>Tap <strong>Share</strong> in Safari (square with arrow).</li>
        <li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
      </ol>
      {ios_svg}
    </div>
  </div>"""

HELP_TEXT = """      <p><strong>Fastest setup:</strong> open your personal link from Gumroad (it includes your code), tap <strong>Install app</strong>, and you are done. Works offline after the first open.</p>
      <p>Or enter your buyer code below. Get help: <a href="{base}/get/{slug}/">Install guide</a></p>
      <p>Store: <a href="{base}/store/">digitalundergroundstore.com</a></p>"""


def patch_manifest(slug: str, name: str, app_dir: Path) -> None:
    for fname in ("manifest.webmanifest", "manifest.json"):
        path = app_dir / fname
        if not path.is_file():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        data["name"] = data.get("name") or name
        data["short_name"] = data.get("short_name") or name[:12]
        data["id"] = f"/{slug}/"
        data["start_url"] = f"/{slug}/index.html"
        data["scope"] = f"/{slug}/"
        data["display"] = "standalone"
        if "description" not in data:
            data["description"] = f"{name} — Digital Underground"
        icons = data.get("icons") or []
        has192 = any(i.get("sizes") == "192x192" for i in icons)
        has512 = any(i.get("sizes") == "512x512" for i in icons)
        if not has192 or not has512:
            icons.extend(
                [
                    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                ]
            )
        if not any(i.get("purpose") == "maskable" for i in icons):
            icons.append(
                {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
            )
        data["icons"] = icons
        path.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
        return


def patch_unlock_js(slug: str, app_dir: Path) -> None:
    path = app_dir / "unlock.js"
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    old_hash = """  var hash = (location.hash.match(/(?:^#|&)code=([^&]+)/) || [])[1];
  if (hash) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }"""
    new_hash = """  function takeCodeFromUrl() {
    var fromHash = (location.hash.match(/(?:^#|[?&])code=([^&]+)/) || [])[1];
    var fromSearch = null;
    try { fromSearch = new URLSearchParams(location.search).get("code"); } catch (e) {}
    if (fromHash || fromSearch) {
      try {
        var clean = location.pathname;
        history.replaceState(null, "", clean);
      } catch (e) {}
    }
    return fromHash || fromSearch;
  }
  var hash = takeCodeFromUrl();"""
    if old_hash in text:
        text = text.replace(old_hash, new_hash)
    name_esc = UNLOCK_APPS.get(slug, slug).replace("\\", "\\\\").replace('"', '\\"')
    inject = (
        f'    var pwa = "<link rel=\\"stylesheet\\" href=\\"/assets/buyer/pwa-install.css\\">'
        f'<script src=\\"/assets/buyer/pwa-install.js\\" data-app-slug=\\"{slug}\\" '
        f'data-app-name=\\"{name_esc}\\" defer><\\/script>";\n'
    )
    if "pwa-install.js" not in text:
        text = text.replace(
            '    var sw = "<script>if(\'serviceWorker\'',
            inject + '    var sw = "<script>if(\'serviceWorker\'',
        )
    path.write_text(text, encoding="utf-8")


def patch_index_html(slug: str, name: str, app_dir: Path) -> None:
    path = app_dir / "index.html"
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    if "pwa-install.js" not in text:
        block = INSTALL_BLOCK.replace("{ios_svg}", IOS_SVG)
        text = text.replace("  </form>\n  <noscript>", block + "\n  <noscript>", 1)
        text = text.replace(
            "</main>",
            '  <link rel="stylesheet" href="/assets/buyer/pwa-install.css" />\n'
            f'  <script src="/assets/buyer/pwa-install.js" data-app-slug="{slug}" data-app-name="{name}" defer></script>\n'
            '  <script>if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").catch(function(){});}</script>\n'
            "</main>",
            1,
        )
    help = HELP_TEXT.format(base=BASE, slug=slug)
    text = re.sub(
        r'<div class="du-help">.*?</div>\s*</form>',
        f'<div class="du-help">\n{help}\n    </div>\n  </form>',
        text,
        count=1,
        flags=re.DOTALL,
    )
    if 'id="du-ios-hint"' in text:
        text = text.replace('id="du-ios-hint" class="du-ios-hint" hidden', 'id="du-ios-hint" class="du-ios-hint"')
    path.write_text(text, encoding="utf-8")


def write_get_page(slug: str, name: str) -> None:
    gum = GUMROAD_HINT.get(slug, "")
    zip_line = (
        f'<p class="alt"><a href="https://kerzy.gumroad.com/l/{gum}">Download ZIP for PC</a> from your Gumroad library (optional).</p>'
        if gum
        else '<p class="alt">Desktop ZIP: open your Gumroad receipt and use <strong>Download</strong> there.</p>'
    )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Get {name}</title>
<meta name="theme-color" content="#07060f">
<link rel="stylesheet" href="/assets/buyer/pwa-install.css">
<style>
body{{margin:0;background:#07060f;color:#f5f3ff;font:16px/1.5 system-ui,sans-serif}}
main{{max-width:440px;margin:0 auto;padding:32px 20px 48px}}
h1{{font-size:1.6rem;margin:0 0 8px}}
.lead{{color:#c8c0da;margin:0 0 20px}}
.open{{display:inline-flex;align-items:center;justify-content:center;min-height:52px;width:100%;margin-top:12px;border-radius:999px;background:linear-gradient(105deg,#6d28d9,#1e3a8a);color:#fff;font-weight:700;text-decoration:none}}
.alt{{margin-top:22px;font-size:.92rem;color:#a8a0c0}}
.alt a{{color:#bfe8ff}}
code{{font-size:.9em;background:rgba(255,255,255,.08);padding:2px 6px;border-radius:6px}}
</style>
</head>
<body>
<main>
  <h1>{name}</h1>
  <p class="lead">One link. Tap Install. Works on phone, tablet, or computer.</p>
  <div id="du-install">
    <button type="button" id="du-install-btn" class="du-install-btn">Install {name}</button>
    <div id="du-ios-hint" class="du-ios-hint">
      <strong>iPhone / iPad</strong>
      <ol><li>Open the app link below in Safari.</li><li>Share → Add to Home Screen.</li></ol>
      {IOS_SVG}
    </div>
  </div>
  <a class="open" id="open-app" href="{BASE}/{slug}/">Open {name}</a>
  {zip_line}
  <p class="alt">Your unlock link looks like: <code>{BASE}/{slug}/#code=YOUR-CODE</code></p>
</main>
<script>
(function(){{
  var q=new URLSearchParams(location.search);
  var code=q.get("code");
  var app="{BASE}/{slug}/";
  if(code) app+="#code="+encodeURIComponent(code);
  document.getElementById("open-app").href=app;
}})();
</script>
<script src="/assets/buyer/pwa-install.js" data-app-slug="{slug}" data-app-name="{name}" defer></script>
<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("/{slug}/sw.js").catch(function(){{}});</script>
</body>
</html>
"""
    out = ROOT / "get" / slug / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")


def write_delivery_doc(slug: str, name: str) -> None:
    gum = GUMROAD_HINT.get(slug, "")
    body = f"""# {name} — Gumroad delivery text

Paste this into your Gumroad product page (description or post-purchase email). Replace `YOUR-CODE-HERE` with the buyer's real code from Gumroad.

---

## Your {name} link (phone, tablet, or computer)

**Tap this link on the device where you want the app:**

{BASE}/{slug}/#code=YOUR-CODE-HERE

**Or use the install helper page:**

{BASE}/get/{slug}/

### Steps (30 seconds)

1. Open the link above in **Chrome** (Android) or **Safari** (iPhone).
2. Tap **Install {name}** (or Share → **Add to Home Screen** on iPhone).
3. Open the app from your home screen. Your code is saved — you won't need to type it again.

**Fallback:** If the link doesn't work, open {BASE}/{slug}/ and type your code: `YOUR-CODE-HERE`

**PC ZIP (optional):** Download the ZIP from your Gumroad library: https://kerzy.gumroad.com/l/{gum}

All links use **digitalundergroundstore.com** (not github.io).

Store: {BASE}/store/
"""
    out = ROOT / "docs" / "gumroad-delivery" / f"{slug}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(body, encoding="utf-8")


def patch_sw_manifest_ref(slug: str, app_dir: Path) -> None:
    sw = app_dir / "sw.js"
    if not sw.is_file():
        return
    text = sw.read_text(encoding="utf-8")
    if "manifest.webmanifest" not in text and (app_dir / "manifest.webmanifest").is_file():
        text = text.replace('var FILES = [', 'var FILES = ["manifest.webmanifest", ', 1)


def main() -> None:
    for slug, name in UNLOCK_APPS.items():
        app_dir = ROOT / slug
        if not app_dir.is_dir():
            print("skip missing", slug)
            continue
        patch_manifest(slug, name, app_dir)
        patch_unlock_js(slug, app_dir)
        patch_index_html(slug, name, app_dir)
        patch_sw_manifest_ref(slug, app_dir)
        write_get_page(slug, name)
        write_delivery_doc(slug, name)
        print("patched", slug)

    for slug, name in EXTRA_APPS.items():
        app_dir = ROOT / slug
        if app_dir.is_dir():
            patch_manifest(slug, name, app_dir)
            write_get_page(slug, name)
            write_delivery_doc(slug, name)
            print("extra", slug)

    # robots allow /get/
    robots = ROOT / "robots.txt"
    if robots.is_file() and "Allow: /get/" not in robots.read_text():
        robots.write_text(
            robots.read_text().replace("Allow: /p/\n", "Allow: /p/\nAllow: /get/\n"),
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
