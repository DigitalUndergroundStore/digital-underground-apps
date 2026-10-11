#!/usr/bin/env python3
"""Build pantry-week/app.bin from pw-v322/jhagho (AES-GCM, same params as unlock.js).

Requires env PANTRY_WEEK_PACK_CODE (any valid buyer code that decrypts the current bin).
Photos are not bundled — hosted copies live under pantry-week/photos/.
"""
from __future__ import annotations

import base64
import json
import os
import re
import sys
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "pw-v322" / "jhagho"
OUT = ROOT / "pantry-week" / "app.bin"
SALT_B64 = "Ty1H5kMWo1b0pfQScZKZSQ=="
ITER = 250000
AAD = b"pantry-week"

ASSET_RE = re.compile(
    r'<script\s+src="([^"]+\.js)"\s+defer\s*></script>|<link\s+rel="stylesheet"\s+href="([^"]+\.css)"\s*/>'
)


def norm_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def derive_key(code: str) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=base64.b64decode(SALT_B64),
        iterations=ITER,
        backend=default_backend(),
    )
    return kdf.derive(norm_code(code).encode())


def pack_html(path: Path) -> tuple[str, str]:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"<!--ZIP-ONLY-->.*?<!--/ZIP-ONLY-->", "", text, flags=re.S)

    def repl(m: re.Match) -> str:
        src = m.group(1) or m.group(2)
        file_path = (path.parent / src).resolve()
        key = str(file_path.relative_to(SRC.resolve())).replace("\\", "/")
        return f"<!--SF_ASSET:{key}-->"

    text = ASSET_RE.sub(repl, text)
    page_key = str(path.relative_to(SRC)).replace("\\", "/")
    return page_key, text


def collect_bundle() -> dict:
    pages: dict[str, str] = {}
    asset_keys: set[str] = set()
    for page in [SRC / "index.html", SRC / "print" / "week.html"]:
        key, html = pack_html(page)
        pages[key] = html
        for m in re.finditer(r"<!--SF_ASSET:([^>]+)-->", html):
            asset_keys.add(m.group(1))
    assets: dict[str, str] = {}
    for ak in sorted(asset_keys):
        fp = SRC / ak
        if not fp.is_file():
            raise FileNotFoundError(fp)
        assets[ak] = fp.read_text(encoding="utf-8")
    return {"pages": pages, "assets": assets}


def encrypt(bundle: dict, code: str) -> bytes:
    key = derive_key(code)
    iv = os.urandom(12)
    aes = AESGCM(key)
    pt = json.dumps(bundle, separators=(",", ":")).encode("utf-8")
    ct = aes.encrypt(iv, pt, AAD)
    return iv + ct


def main() -> int:
    code = os.environ.get("PANTRY_WEEK_PACK_CODE", "").strip()
    if not code:
        print("Set PANTRY_WEEK_PACK_CODE to a valid buyer code.", file=sys.stderr)
        return 2
    if not SRC.is_dir():
        print(f"Missing source tree: {SRC}", file=sys.stderr)
        return 1
    bundle = collect_bundle()
    OUT.write_bytes(encrypt(bundle, code))
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
