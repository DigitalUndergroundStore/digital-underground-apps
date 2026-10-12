#!/usr/bin/env python3
"""Extract src/jhagho from an encrypted app.bin."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from _pw_crypto import decrypt_bin, derive_key, parse_secret  # noqa: E402

ASSET_MAP = {
    "jhagho/index.html": "index.html",
    "jhagho/css/pantry.css": "css/pantry.css",
    "jhagho/print/week.html": "print/week.html",
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("app_bin")
    ap.add_argument("--secret", required=True)
    ap.add_argument("--out", type=Path, default=ROOT / "src" / "jhagho")
    args = ap.parse_args()
    code, salt = parse_secret(Path(args.secret))
    key = derive_key(code, salt)
    bundle = decrypt_bin(Path(args.app_bin), key)
    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    for page, html in (bundle.get("pages") or {}).items():
        rel = page if page.startswith("jhagho/") else f"jhagho/{page}"
        path = out.parent / rel.replace("jhagho/", "")
        if path.name == "index.html" and "jhagho" in page:
            path = out / "index.html"
        elif "print/" in page:
            path = out / "print" / Path(page).name
        else:
            path = out / Path(page).name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8")
    assets = bundle.get("assets") or {}
    for key_name, text in assets.items():
        rel = key_name.replace("jhagho/", "")
        if not rel.startswith("js/") and not rel.endswith(".css"):
            continue
        path = out / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    print("wrote", out, "assets", len(assets))


if __name__ == "__main__":
    main()
