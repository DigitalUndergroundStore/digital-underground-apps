#!/usr/bin/env python3
"""Decrypt-check a Pantry Week app.bin (local path or https URL)."""
from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from _pw_crypto import decrypt_bin, derive_key, parse_secret  # noqa: E402


def load_bin(arg: str) -> bytes:
    if arg.startswith("http://") or arg.startswith("https://"):
        with urllib.request.urlopen(arg, timeout=120) as r:
            return r.read()
    return Path(arg).read_bytes()


def count_recipes(bundle: dict) -> int:
    assets = bundle.get("assets") or {}
    n = 0
    for name, text in assets.items():
        if not name.endswith("recipes.js") and "recipes-" not in name:
            continue
        n += len(re.findall(r'"id"\s*:\s*"r\d+"', text))
    return n


def main() -> None:
    if len(sys.argv) < 5:
        print(
            "usage: decrypt-check.py <app.bin|url> <unlock.js> <secret.txt> <expected-semver>",
            file=sys.stderr,
        )
        raise SystemExit(2)
    bin_arg, unlock_path, secret_path, expected = sys.argv[1:5]
    code, secret_salt = parse_secret(Path(secret_path))
    unlock = Path(unlock_path).read_text(encoding="utf-8")
    m_salt = re.search(r'salt:\s*"([^"]+)"', unlock)
    m_build = re.search(r'build:\s*"([^"]+)"', unlock)
    if not m_salt:
        raise SystemExit("no salt in unlock.js")
    unlock_salt = m_salt.group(1)
    key = derive_key(code, secret_salt)
    raw = load_bin(bin_arg)
    tmp = Path("/tmp/_pw_check.bin")
    tmp.write_bytes(raw)
    bundle = decrypt_bin(tmp, key)
    recipes = count_recipes(bundle)
    ver_m = re.search(r'VERSION:\s*"([^"]+)"', "\n".join(bundle.get("assets", {}).values()))
    version = ver_m.group(1) if ver_m else "?"
    ok_ver = version == expected
    print(f"version: {version} (expected {expected}: {ok_ver})")
    print(f"recipe ids (approx): {recipes}")
    print(f"salt matches secret: {unlock_salt == secret_salt}")
    if m_build:
        print(f"unlock build id: {m_build.group(1)}")
    if not ok_ver:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
