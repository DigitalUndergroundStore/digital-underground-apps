#!/usr/bin/env python3
"""Temporary: staged store may differ from known-good only under p/maker-pro/."""
import hashlib, os, sys
from pathlib import Path

def fmap(root):
    out = {}
    root = Path(root)
    for dp, dns, fns in os.walk(root):
        for n in fns:
            p = Path(dp) / n
            rel = p.relative_to(root).as_posix()
            out[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out

def main():
    if len(sys.argv) != 3:
        sys.exit("usage: assert-store KNOWN_GOOD_STORE STAGED_STORE")
    base, staged = fmap(sys.argv[1]), fmap(sys.argv[2])
    added = set(staged) - set(base)
    removed = set(base) - set(staged)
    modified = {p for p in set(base) & set(staged) if base[p] != staged[p]}
    bad = [p for p in sorted(added | removed | modified) if not p.startswith("p/maker-pro/")]
    if bad:
        sys.stderr.write("REFUSED store diffs outside maker-pro: " + ", ".join(bad[:20]) + "\n")
        sys.exit(1)
    print(
        "maker-pro store exception ok: %s added, %s removed, %s modified under p/maker-pro/"
        % (len(added), len(removed), len(modified))
    )

if __name__ == "__main__":
    main()
