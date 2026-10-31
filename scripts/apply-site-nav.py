#!/usr/bin/env python3
"""Stamp the shared header and bump site-nav cache-bust queries.

Replaces every <!--du-site-nav-->…<!--/du-site-nav--> block with
scripts/partials/site-nav.html and sets site-nav.css / site-nav.js ?v=
to the same version. Safe to run more than once.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTIAL = Path(__file__).resolve().parent / "partials" / "site-nav.html"
VERSION = "36"
BLOCK = re.compile(r"<!--du-site-nav-->.*?<!--/du-site-nav-->", re.DOTALL)
ASSET = re.compile(r"(site-nav\.(?:css|js)\?v=)\d+")
SUFFIXES = {".html", ".js", ".mjs"}
SKIP = {".git", "node_modules"}


def should_visit(path: Path) -> bool:
    return not any(part in SKIP for part in path.parts)


def main() -> int:
    partial = PARTIAL.read_text(encoding="utf-8").strip()
    changed = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in SUFFIXES or not should_visit(path):
            continue
        if path.resolve() == PARTIAL.resolve():
            continue
        text = path.read_text(encoding="utf-8", errors="surrogateescape")
        new = BLOCK.sub(partial, text)
        new = ASSET.sub(rf"\g<1>{VERSION}", new)
        if new != text:
            path.write_text(new, encoding="utf-8")
            changed.append(str(path.relative_to(ROOT)))
    if changed:
        print("updated:")
        for name in changed:
            print(" ", name)
    else:
        print("no stamped pages found; partial is scripts/partials/site-nav.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
