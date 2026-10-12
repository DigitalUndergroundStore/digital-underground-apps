#!/usr/bin/env python3
"""Decrypt hosted app.bin and print version + recipe count (for CI / shipping checks)."""
from __future__ import annotations

import argparse
import base64
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.request import urlopen

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def read_secret(path: Path) -> tuple[str, bytes, str]:
    text = path.read_text()
    code_m = re.search(r"CODE\s*[:=]\s*(\S+)", text, re.I)
    salt_m = re.search(r"SALT\s*[:=]\s*(\S+)", text, re.I)
    if not code_m or not salt_m:
        raise SystemExit("secret needs CODE= and SALT=")
    code = re.sub(r"[^A-Z0-9]", "", code_m.group(1).upper())
    salt_b64 = salt_m.group(1)
    return code, base64.b64decode(salt_b64), salt_b64


def salt_from_unlock(unlock_path: Path) -> str:
    text = unlock_path.read_text()
    m = re.search(r'salt:\s*"([^"]+)"', text)
    if not m:
        raise SystemExit("unlock.js salt not found")
    return m.group(1)


def derive_key(code: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=250_000)
    return kdf.derive(code.encode())


def load_bin(path_or_url: str) -> bytes:
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        with urlopen(path_or_url, timeout=60) as resp:
            return resp.read()
    return Path(path_or_url).read_bytes()


def recipe_count(assets: dict) -> int:
    js_files = []
    for name in sorted(assets):
        if not name.startswith("js/recipes"):
            continue
        if not name.endswith(".js"):
            continue
        js_files.append(name)
    order = [
        "js/recipes.js",
        "js/recipes-extra.js",
        "js/recipes-batch1.js",
        "js/recipes-batch2.js",
        "js/recipes-batch3.js",
        "js/recipes-batch4.js",
        "js/recipes-batch5.js",
    ]
    paths = [n for n in order if n in assets]
    paths += sorted(set(js_files) - set(paths))
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        js_dir = root / "js"
        js_dir.mkdir()
        for name in paths:
            (js_dir / Path(name).name).write_text(assets[name], encoding="utf-8")
        script = """
const fs=require('fs'); const vm=require('vm'); const path=require('path');
const ORDER=%s.map(f=>path.join(%s, path.basename(f)));
const ctx={window:{},PW_STARTERS:[],PW_V1_ORIGINALS:[]}; ctx.window=ctx; vm.createContext(ctx);
for (const f of ORDER) vm.runInContext(fs.readFileSync(f,'utf8'), ctx);
const r=ctx.window.PW_STARTERS||[];
console.log(JSON.stringify({count:r.length, max:r.length?r[r.length-1].id:null}));
""" % (json.dumps(paths), json.dumps(str(js_dir)))
        out = subprocess.check_output(["node", "-e", script], text=True)
    return json.loads(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("app_bin")
    ap.add_argument("unlock_js")
    ap.add_argument("secret")
    ap.add_argument("expected_semver", nargs="?", default="")
    args = ap.parse_args()
    code, salt, salt_b64 = read_secret(Path(args.secret))
    unlock_salt = salt_from_unlock(Path(args.unlock_js))
    print("salt matches secret:", unlock_salt == salt_b64)
    key = derive_key(code, salt)
    raw = load_bin(args.app_bin)
    bundle = json.loads(AESGCM(key).decrypt(raw[:12], raw[12:], b"pantry-week"))
    hosted = bundle["assets"].get("js/hosted.js", "")
    semver_m = re.search(r'SEMVER\s*=\s*"([^"]+)"', hosted)
    pantry_m = re.search(r'VERSION:\s*"([^"]+)"', bundle["assets"].get("js/pantry.js", ""))
    semver = semver_m.group(1) if semver_m else "?"
    pantry_ver = pantry_m.group(1) if pantry_m else "?"
    stats = recipe_count(bundle["assets"])
    print("semver", semver, "pantry.js", pantry_ver)
    if args.expected_semver:
        print("expected semver match:", semver == args.expected_semver)
    print("recipe count", stats["count"], "max id", stats["max"])
    if stats["count"] < 248:
        sys.exit(2)


if __name__ == "__main__":
    main()
