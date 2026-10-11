#!/usr/bin/env python3
"""Wire pwa-update + du-about-version into all hosted unlock.js and gate pages."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUGS = [
    "box-and-go", "due-desk", "exam-desk", "focus-gate", "hook-bank", "invoice-desk",
    "launch-ledger", "offer-desk", "packlane", "pantry-week", "promo-lane", "rate-wire",
    "reply-forge", "scope-lock", "session-forge", "streak-kit",
]
NAMES = {
    "pantry-week": "Pantry Week", "session-forge": "Session Forge", "focus-gate": "Focus Gate",
    "offer-desk": "Offer Desk", "rate-wire": "Rate Wire", "scope-lock": "Scope Lock",
    "invoice-desk": "Invoice Desk", "streak-kit": "Streak Kit", "reply-forge": "Reply Forge",
    "box-and-go": "Box & Go", "packlane": "Packlane", "due-desk": "Due Desk",
    "exam-desk": "Exam Desk", "hook-bank": "Hook Bank", "promo-lane": "Promo Lane",
    "launch-ledger": "Launch Ledger",
}


def patch_unlock(slug: str) -> None:
    path = ROOT / slug / "unlock.js"
    text = path.read_text(encoding="utf-8")
    m = re.search(r'build:\s*"([^"]+)"', text)
    if not m:
        return
    version = m.group(1)
    label = NAMES.get(slug, slug)
    if "pwa-update.js" in text and "duVer" in text:
        return
    du = (
        f'    var duVer = "<script>window.__DU_APP_VERSION__=\\"{version}\\";<\\/script>'
        f'<link rel=\\"stylesheet\\" href=\\"/assets/buyer/pwa-update.css\\">'
        f'<script src=\\"/assets/buyer/pwa-update.js\\" data-sw-url=\\"" + ROOT + "sw.js\\" '
        f'data-app-version=\\"{version}\\" data-app-label=\\"{label}\\" defer><\\/script>";\\n'
        f'    var duAbout = "<script src=\\"/assets/buyer/du-about-version.js\\" defer><\\/script>";\\n'
    )
    if "var duVer" not in text:
        text = text.replace('    var pwa = "<link rel=\\"stylesheet\\"', du + '    var pwa = "<link rel=\\"stylesheet\\"', 1)
    text = re.sub(
        r'html = html\.replace\("</body>", pwa \+ sw',
        'html = html.replace("</body>", pwa + duVer + duAbout + sw',
        text,
    )
    text = re.sub(
        r'html = html\.replace\("</body>", pwa \+ duVer \+ skin \+ "<script src=\\"/assets/buyer/du-about-version.js\\" defer><\\/script>" \+ sw',
        'html = html.replace("</body>", pwa + duVer + skin + duAbout + sw',
        text,
    )
    path.write_text(text, encoding="utf-8")


def patch_index(slug: str) -> None:
    path = ROOT / slug / "index.html"
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    m = re.search(r'unlock\.js\?v=([^"]+)"', text)
    version = m.group(1) if m else ""
    label = NAMES.get(slug, slug)
    block = (
        f'  <script>window.__DU_APP_VERSION__="{version}";</script>\n'
        f'  <link rel="stylesheet" href="/assets/buyer/pwa-update.css" />\n'
        f'  <script src="/assets/buyer/pwa-update.js" data-sw-url="./sw.js" '
        f'data-app-version="{version}" data-app-label="{label}" defer></script>\n'
    )
    if "pwa-update.js" not in text:
        text = text.replace(
            '  <script>if("serviceWorker" in navigator)',
            block + '  <script>if("serviceWorker" in navigator)',
            1,
        )
    # avoid double SW registration
    text = text.replace(
        '  <script>if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(function(){});</script>\n',
        "",
    )
    path.write_text(text, encoding="utf-8")


def main() -> None:
    for slug in SLUGS:
        patch_unlock(slug)
        patch_index(slug)
        print("patched", slug)


if __name__ == "__main__":
    main()
