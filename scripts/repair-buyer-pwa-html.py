#!/usr/bin/env python3
"""Repair index.html structure and unlock.js PWA inject after patch-buyer-pwa."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://digitalundergroundstore.com"
NAMES = {
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
HELP = """    <div class="du-help">
      <p><strong>Fastest setup:</strong> open your personal link from Gumroad (it includes your code), tap <strong>Install app</strong>, and you are done. Works offline after the first open.</p>
      <p>Or enter your buyer code below. Install guide: <a href="{base}/get/{slug}/">{base}/get/{slug}/</a></p>
      <p>Store: <a href="{base}/store/">digitalundergroundstore.com</a></p>
    </div>"""

INSTALL_SNIP = """  <div id="du-install" class="du-install" hidden>
    <button type="button" id="du-install-btn" class="du-install-btn">Install app</button>
    <div id="du-ios-hint" class="du-ios-hint">
      <strong>iPhone / iPad</strong>
      <ol>
        <li>Tap <strong>Share</strong> in Safari.</li>
        <li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
      </ol>
    </div>
  </div>"""

TAIL = """
  <noscript><p>This app needs JavaScript turned on.</p></noscript>
  <link rel="stylesheet" href="/assets/buyer/pwa-install.css" />
  <script src="/assets/buyer/pwa-install.js" data-app-slug="{slug}" data-app-name="{name}" defer></script>
  <script>if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(function(){{}});</script>
</main>
<script src="unlock.js"""


def repair_index(slug: str, path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if "unlock.js" not in text:
        return
    m = re.search(r'<script src="unlock\.js[^"]*"', text)
    unlock_tag = m.group(0) + text[m.end() : text.find("></script>", m.end()) + 10] if m else ""
    # rebuild gate body from h1 through unlock script
    gate_start = text.find('<main id="du-gate">')
    if gate_start < 0:
        return
    head = text[: gate_start + len('<main id="du-gate">')]
    unlock_line = text[text.find('<script src="unlock.js'): text.find("</html>")]
    name = NAMES.get(slug, slug)
    body = f"""
  <div class="du-logo" aria-hidden="true"></div>
  <h1>{name}</h1>
  <p id="du-status">Opening…</p>
  <form id="du-form" autocomplete="off">
    <label for="du-code">Buyer code</label>
    <input id="du-code" name="code" placeholder="Your buyer code" autocapitalize="characters" autocorrect="off" spellcheck="false" inputmode="text" />
    <button id="du-go" type="submit">Unlock</button>
    <div id="du-msg" role="status" aria-live="polite"></div>
{HELP.format(base=BASE, slug=slug)}
  </form>
{INSTALL_SNIP}
{TAIL.format(slug=slug, name=name)}
{unlock_line[unlock_line.find("data-page"):] if "data-page" in unlock_line else unlock_line}
"""
    # preserve original unlock script tag with version
    um = re.search(r'<script src="unlock\.js[^<]+</script>', text)
    if um:
        body = f"""
  <div class="du-logo" aria-hidden="true"></div>
  <h1>{name}</h1>
  <p id="du-status">Opening…</p>
  <form id="du-form" autocomplete="off">
    <label for="du-code">Buyer code</label>
    <input id="du-code" name="code" placeholder="Your buyer code" autocapitalize="characters" autocorrect="off" spellcheck="false" inputmode="text" />
    <button id="du-go" type="submit">Unlock</button>
    <div id="du-msg" role="status" aria-live="polite"></div>
{HELP.format(base=BASE, slug=slug)}
  </form>
{INSTALL_SNIP}
  <noscript><p>This app needs JavaScript turned on.</p></noscript>
  <link rel="stylesheet" href="/assets/buyer/pwa-install.css" />
  <script src="/assets/buyer/pwa-install.js" data-app-slug="{slug}" data-app-name="{name}" defer></script>
  <script>if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(function(){{}});</script>
</main>
{um.group(0)}
</body>
</html>
"""
    path.write_text(head + body, encoding="utf-8")


def repair_unlock(slug: str, path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    name_esc = NAMES.get(slug, slug).replace("\\", "\\\\").replace('"', '\\"')
    pwa_line = (
        f'    var pwa = "<link rel=\\"stylesheet\\" href=\\"/assets/buyer/pwa-install.css\\">'
        f'<script src=\\"/assets/buyer/pwa-install.js\\" data-app-slug=\\"{slug}\\" '
        f'data-app-name=\\"{name_esc}\\" defer><\\/script>";\n'
    )
    if "var pwa =" in text:
        text = re.sub(r"    var pwa = .*?\n", pwa_line, text, count=1)
    else:
        text = text.replace(
            '    var sw = "<script>if(\'serviceWorker\'',
            pwa_line + '    var sw = "<script>if(\'serviceWorker\'',
            1,
        )
    text = text.replace(
        'html = html.replace("</body>", sw + "\\n</body>");',
        'html = html.replace("</body>", pwa + sw + "\\n</body>");',
    )
    path.write_text(text, encoding="utf-8")


def main() -> None:
    for slug in NAMES:
        d = ROOT / slug
        if (d / "index.html").is_file():
            repair_index(slug, d / "index.html")
        if (d / "unlock.js").is_file():
            repair_unlock(slug, d / "unlock.js")
        print("repaired", slug)


if __name__ == "__main__":
    main()
