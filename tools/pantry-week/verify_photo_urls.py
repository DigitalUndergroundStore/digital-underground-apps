#!/usr/bin/env python3
"""Ensure every library recipe has a photo file and optional live HTTP 200."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JS = ROOT / "src" / "jhagho" / "js"
PHOTOS = ROOT / "pantry-week" / "photos"
ORDER = [
    "recipes.js",
    "recipes-extra.js",
    "recipes-batch1.js",
    "recipes-batch2.js",
    "recipes-batch3.js",
    "recipes-batch4.js",
    "recipes-batch5.js",
    "recipes-batch6.js",
]


def load_recipes() -> list[dict]:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        for name in ORDER:
            p = JS / name
            if p.is_file():
                (root / name).write_text(p.read_text(encoding="utf-8"))
        script = """
const fs=require('fs'); const vm=require('vm'); const path=require('path');
const order=%s.filter(f=>fs.existsSync(path.join(%s,f)));
const ctx={window:{},PW_STARTERS:[]}; ctx.window=ctx; vm.createContext(ctx);
for (const f of order) vm.runInContext(fs.readFileSync(path.join(%s,f),'utf8'), ctx);
process.stdout.write(JSON.stringify(ctx.PW_STARTERS));
""" % (
            json.dumps(ORDER),
            json.dumps(str(root)),
            json.dumps(str(root)),
        )
        out = subprocess.check_output(["node", "-e", script], text=True)
    return json.loads(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--live-base", default="", help="e.g. https://digitalundergroundstore.com/pantry-week/")
    ap.add_argument("--min-id", type=int, default=1)
    args = ap.parse_args()
    recipes = load_recipes()
    errors = []
    for r in recipes:
        rid = r.get("id", "")
        if not str(rid).startswith("r"):
            continue
        n = int(str(rid)[1:])
        if n < args.min_id:
            continue
        path = PHOTOS / f"{rid}.webp"
        if not path.is_file():
            errors.append(f"missing file {path}")
            continue
        if args.live_base:
            url = args.live_base.rstrip("/") + f"/photos/{rid}.webp"
            req = urllib.request.Request(url, headers={"User-Agent": "PantryWeekPhotoVerify/1.0"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    if resp.status != 200:
                        errors.append(f"{rid} HTTP {resp.status}")
            except Exception as exc:
                errors.append(f"{rid} {exc}")
    if errors:
        print("\n".join(errors[:40]))
        print(f"... {len(errors)} errors")
        sys.exit(1)
    print(f"ok {len(recipes)} recipes, photos from r{args.min_id} checked")


if __name__ == "__main__":
    main()
