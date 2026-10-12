#!/usr/bin/env python3
"""Shared Pantry Week app.bin encrypt/decrypt (AES-GCM + PBKDF2)."""
from __future__ import annotations

import base64
import json
import re
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

AAD = b"pantry-week"
ITERATIONS = 250_000


def parse_secret(path: Path) -> tuple[str, str]:
    code = salt = ""
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("CODE="):
            code = line.split("=", 1)[1].strip()
        elif line.startswith("SALT="):
            salt = line.split("=", 1)[1].strip()
    if not code or not salt:
        raise SystemExit(f"missing CODE or SALT in {path}")
    return code, salt


def norm_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def derive_key(code: str, salt_b64: str) -> bytes:
    salt = base64.b64decode(salt_b64)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=ITERATIONS,
        backend=default_backend(),
    )
    return kdf.derive(norm_code(code).encode("utf-8"))


def decrypt_bin(bin_path: Path, key: bytes) -> dict:
    data = bin_path.read_bytes()
    iv, ct = data[:12], data[12:]
    aes = AESGCM(key)
    pt = aes.decrypt(iv, ct, AAD)
    return json.loads(pt.decode("utf-8"))


def encrypt_bundle(bundle: dict, key: bytes) -> bytes:
    import os

    iv = os.urandom(12)
    pt = json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    aes = AESGCM(key)
    ct = aes.encrypt(iv, pt, AAD)
    return iv + ct
