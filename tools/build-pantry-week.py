#!/usr/bin/env python3
"""Bundle src/jhagho into pantry-week/app.bin (AES-GCM, same format as unlock.js)."""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import secrets
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ASSET_RE = re.compile(r"<!--SF_ASSET:([^>]+?)-->")


def read_secret(path: Path) -> tuple[str, bytes]:
    text = path.read_text()
    code_m = re.search(r"CODE\s*[:=]\s*(\S+)", text, re.I)
    salt_m = re.search(r"SALT\s*[:=]\s*(\S+)", text, re.I)
    if not code_m or not salt_m:
        raise SystemExit(f"secret file must contain CODE= and SALT=: {path}")
    code = re.sub(r"[^A-Z0-9]", "", code_m.group(1).upper())
    salt = base64.b64decode(salt_m.group(1))
    return code, salt


def derive_key(code: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=250_000)
    return kdf.derive(code.encode())


def collect_assets(html: str, root: Path) -> dict[str, str]:
    assets: dict[str, str] = {}
    for match in ASSET_RE.finditer(html):
        rel = match.group(1).strip()
        if rel in assets:
            continue
        path = root / rel
        if not path.is_file():
            raise SystemExit(f"missing asset {rel} under {root}")
        assets[rel] = path.read_text(encoding="utf-8")
    return assets


def build_bundle(src: Path) -> dict:
    pages = {
        "index.html": (src / "index.html").read_text(encoding="utf-8"),
        "print/week.html": (src / "print" / "week.html").read_text(encoding="utf-8"),
    }
    assets: dict[str, str] = {}
    for html in pages.values():
        assets.update(collect_assets(html, src))
    return {"pages": pages, "assets": assets}


def encrypt(bundle: dict, code: str, salt: bytes) -> bytes:
    key = derive_key(code, salt)
    iv = secrets.token_bytes(12)
    pt = json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ct = AESGCM(key).encrypt(iv, pt, b"pantry-week")
    return iv + ct


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, required=True, help="jhagho source root (index.html + js/)")
    ap.add_argument("--secret", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True, help="output dir (gets pantry-week/app.bin)")
    args = ap.parse_args()
    code, salt = read_secret(args.secret)
    bundle = build_bundle(args.src)
    blob = encrypt(bundle, code, salt)
    out_dir = args.out / "pantry-week"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "app.bin").write_bytes(blob)
    print(f"wrote {out_dir / 'app.bin'} ({len(blob)} bytes)")
    print(f"assets {len(bundle['assets'])}")


if __name__ == "__main__":
    main()
