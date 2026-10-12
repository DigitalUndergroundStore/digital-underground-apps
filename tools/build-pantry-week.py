#!/usr/bin/env python3
"""Bundle src/jhagho into encrypted pantry-week/app.bin."""
from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _pw_crypto import encrypt_bundle, derive_key, parse_secret

ROOT = Path(__file__).resolve().parents[1]
ASSET_RE = re.compile(r"<!--SF_ASSET:([^>]+?)-->")


def collect_assets(index_html: str) -> list[str]:
    return ASSET_RE.findall(index_html)


def build_bundle(src_root: Path) -> dict:
    jh = src_root / "jhagho"
    index = (jh / "index.html").read_text(encoding="utf-8")
    assets = {}
    for rel in collect_assets(index):
        path = jh / rel
        if not path.is_file():
            raise SystemExit(f"missing asset {path}")
        assets[rel] = path.read_text(encoding="utf-8")
    pages = {
        "index.html": index,
        "print/week.html": (jh / "print" / "week.html").read_text(encoding="utf-8"),
    }
    return {"pages": pages, "assets": assets}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, default=ROOT / "src")
    ap.add_argument("--secret", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    code, salt = parse_secret(args.secret)
    key = derive_key(code, salt)
    bundle = build_bundle(args.src)
    out_dir = args.out / "pantry-week"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "app.bin").write_bytes(encrypt_bundle(bundle, key))
    print("wrote", out_dir / "app.bin", "bytes", (out_dir / "app.bin").stat().st_size)


if __name__ == "__main__":
    main()
