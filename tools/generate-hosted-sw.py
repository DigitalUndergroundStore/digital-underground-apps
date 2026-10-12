#!/usr/bin/env python3
"""Regenerate hosted buyer app service workers with update-safe caching."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = (ROOT / "assets/buyer/sw-hosted-template.js").read_text(encoding="utf-8")

APPS = [
    "box-and-go",
    "due-desk",
    "exam-desk",
    "focus-gate",
    "hook-bank",
    "invoice-desk",
    "launch-ledger",
    "offer-desk",
    "packlane",
    "pantry-week",
    "promo-lane",
    "rate-wire",
    "reply-forge",
    "scope-lock",
    "session-forge",
    "streak-kit",
]


def extract_build(unlock_path: Path) -> str:
    text = unlock_path.read_text(encoding="utf-8")
    m = re.search(r'build:\s*"([^"]+)"', text)
    if not m:
        raise SystemExit(f"no build id in {unlock_path}")
    return m.group(1)


def extract_files(sw_path: Path, build: str) -> list[str]:
    text = sw_path.read_text(encoding="utf-8")
    m = re.search(r"var FILES = (\[[^\]]+\]);", text, re.DOTALL)
    if not m:
        raise SystemExit(f"no FILES in {sw_path}")
    files = json.loads(m.group(1).replace("'", '"'))
    out = []
    for f in files:
        if f.startswith("unlock.js"):
            out.append(f"unlock.js?v={build}")
        elif f.startswith("app.bin"):
            out.append(f"app.bin?v={build}")
        else:
            out.append(f)
    extras = ["version.json"]
    for e in extras:
        if (ROOT / sw_path.parent.name / e).is_file() and e not in out:
            out.append(e)
    return out


def write_sw(slug: str, version: str, files: list[str]) -> None:
    extra = ["version.json"]
    merged = list(dict.fromkeys(files + [f for f in extra if f not in files]))
    body = (
        TEMPLATE.replace("__SLUG__", slug)
        .replace("__VERSION__", version)
        .replace("__FILES_JSON__", json.dumps(merged, indent=1))
    )
    header = f"/* {slug} offline shell — version {version}. Regenerate: python3 tools/generate-hosted-sw.py */\n"
    (ROOT / slug / "sw.js").write_text(header + body, encoding="utf-8")
    (ROOT / slug / "version.json").write_text(
        json.dumps({"slug": slug, "version": version}, indent=2) + "\n",
        encoding="utf-8",
    )


def patch_unlock_updates(slug: str, version: str) -> None:
    path = ROOT / slug / "unlock.js"
    text = path.read_text(encoding="utf-8")
    inj = (
        f'    var duVer = "<script>window.__DU_APP_VERSION__=\\"{version}\\"><\\/script>'
        f'<link rel=\\"stylesheet\\" href=\\"/assets/buyer/pwa-update.css\\">'
        f'<script src=\\"/assets/buyer/pwa-update.js\\" data-sw-url=\\"{"" if slug else ""}'
    )
    # fix sw url for subpages handled via ROOT in existing sw register
    sw_url = '" + ROOT + "sw.js"'
    inj = (
        f'    var duVer = "<script>window.__DU_APP_VERSION__=\\"{version}\\"><\\/script>'
        f'<link rel=\\"stylesheet\\" href=\\"/assets/buyer/pwa-update.css\\">'
        f'<script src=\\"/assets/buyer/pwa-update.js\\" data-sw-url=\\"" + ROOT + "sw.js\\" '
        f'data-app-version=\\"{version}\\" data-app-label=\\"{slug}\\" defer><\\/script>";\\n'
    )
    if "pwa-update.js" not in text:
        text = text.replace(
            '    var pwa = "<link rel=\\"stylesheet\\"',
            inj + '    var pwa = "<link rel=\\"stylesheet\\"',
            1,
        )
        text = text.replace(
            'html = html.replace("</body>", pwa + sw + "\\n</body>");',
            'html = html.replace("</body>", pwa + duVer + sw + "\\n</body>");',
        )
    if "du-about-version.js" not in text:
        text = text.replace(
            'html = html.replace("</body>", pwa + duVer + sw + "\\n</body>");',
            'html = html.replace("</body>", pwa + duVer + "<script src=\\"/assets/buyer/du-about-version.js\\" defer><\\/script>" + sw + "\\n</body>");',
        )
    path.write_text(text, encoding="utf-8")


def patch_gate_index(slug: str, version: str, name: str) -> None:
    path = ROOT / slug / "index.html"
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    block = (
        f'  <script>window.__DU_APP_VERSION__="{version}";</script>\n'
        f'  <link rel="stylesheet" href="/assets/buyer/pwa-update.css" />\n'
        f'  <script src="/assets/buyer/pwa-update.js" data-sw-url="./sw.js" '
        f'data-app-version="{version}" data-app-label="{name}" defer></script>\n'
    )
    if "pwa-update.js" not in text:
        text = text.replace(
            '  <script>if("serviceWorker" in navigator)',
            block + '  <script>if("serviceWorker" in navigator)',
            1,
        )
    path.write_text(text, encoding="utf-8")


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


def main() -> None:
    for slug in APPS:
        app = ROOT / slug
        unlock = app / "unlock.js"
        sw = app / "sw.js"
        if not unlock.is_file() or not sw.is_file():
            continue
        version = extract_build(unlock)
        files = extract_files(sw, version)
        write_sw(slug, version, files)
        patch_unlock_updates(slug, version)
        patch_gate_index(slug, version, NAMES.get(slug, slug))
        print("ok", slug, version)


if __name__ == "__main__":
    main()
