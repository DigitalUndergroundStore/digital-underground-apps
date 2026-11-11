#!/usr/bin/env python3
"""Temporary helper for the Store-only junk cleanup release exception.
Called only while release.sh has the @junk-cleanup exception applied."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

EXTRAS = {
    "humanity-x-off-the-ground",
    "humanity-x-into-the-stars",
    "humanity-x-books-1-2",
    "maker-pro",
    "networking-distribution",
}

# These 7 junk slugs had /tools/ pages in the production snapshot but no
# /store/p/ tree (worktree-only store pages, never published). Still redirect
# and still delete their /tools/ pages. Do not require a store/p deletion.
ALLOW_ABSENT_STORE = {
    "chia-seed-cup-batch-cost-calculator",
    "chick-brooder-build-cost-calculator",
    "chicken-coop-build-cost-calculator",
    "chicken-coop-heater-cost-calculator",
    "chicken-dust-bath-build-cost-calculator",
    "chicken-satay-skewer-batch-cost-calculator",
    "chili-batch-calculator",
}


def load_slugs(path: Path) -> list[str]:
    slugs = [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")]
    if len(slugs) != 1153:
        raise SystemExit(f"REFUSED: slug list has {len(slugs)} entries, expected 1153")
    if len(set(slugs)) != 1153:
        raise SystemExit("REFUSED: slug list has duplicates")
    return slugs


def keep_slugs(root: Path) -> set[str]:
    keep = set(EXTRAS)
    cat = root / "scripts/store/catalog.json"
    if not cat.exists():
        # ROOT may be implied; also try adjacent known path
        cat = Path("/workspace/du-good/scripts/store/catalog.json")
    data = json.loads(cat.read_text(encoding="utf-8"))
    for p in data.get("products", []):
        page = p.get("page") or ""
        if "/store/p/" in page:
            keep.add(page.strip("/").split("/")[-1])
        href = p.get("href") or p.get("tools") or ""
        # also keep catalog tool slugs if present
        if "/tools/" in str(href):
            keep.add(str(href).strip("/").split("/")[-1])
    return keep


def file_map(root: Path) -> dict[str, str]:
    out = {}
    if not root.exists():
        return out
    for p in root.rglob("*"):
        if p.is_file():
            rel = p.relative_to(root).as_posix()
            out[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out


def apply(tree: Path, slugfile: Path) -> None:
    slugs = load_slugs(slugfile)
    # tree is staged public tree; catalog lives in worktree ROOT
    root = Path("/workspace/du-good")
    keep = keep_slugs(root)
    overlap = sorted(set(slugs) & keep)
    if overlap:
        raise SystemExit("REFUSED: cleanup list includes keep slugs: " + ",".join(overlap[:20]))
    missing_store = []
    missing_tools = []
    for s in slugs:
        sp = tree / "store" / "p" / s
        tp = tree / "tools" / s
        if not (sp / "index.html").is_file():
            if s not in ALLOW_ABSENT_STORE:
                missing_store.append(s)
        if not (tp / "index.html").is_file():
            missing_tools.append(s)
    if missing_store or missing_tools:
        raise SystemExit(
            f"REFUSED: missing before delete store={len(missing_store)} tools={len(missing_tools)}"
        )
    n_store = 0
    for s in slugs:
        sp = tree / "store" / "p" / s
        if sp.exists():
            shutil.rmtree(sp)
            n_store += 1
        shutil.rmtree(tree / "tools" / s)
    print(f"junk-cleanup applied: removed {n_store} store/p and 1153 tools dirs from {tree}", file=sys.stderr)


def assert_store(base_store: Path, staged_store: Path, slugfile: Path) -> None:
    slugs = set(load_slugs(slugfile))
    base = file_map(base_store)
    staged = file_map(staged_store)
    added = sorted(set(staged) - set(base))
    removed = sorted(set(base) - set(staged))
    modified = sorted(p for p in (set(base) & set(staged)) if base[p] != staged[p])
    if added:
        raise SystemExit("REFUSED: store/ gained files: " + ", ".join(added[:10]))
    if modified:
        raise SystemExit("REFUSED: store/ files changed: " + ", ".join(modified[:10]))
    bad = []
    for rel in removed:
        # expect store/p/<slug>/...
        parts = rel.split("/")
        if len(parts) < 2 or parts[0] != "p" or parts[1] not in slugs:
            bad.append(rel)
    if bad:
        raise SystemExit("REFUSED: store/ removals outside junk slug set: " + ", ".join(bad[:10]))
    # every listed slug that existed under baseline must be fully gone
    still = [s for s in slugs if any(p.startswith(f"p/{s}/") or p == f"p/{s}" for p in staged)]
    if still:
        raise SystemExit("REFUSED: junk slugs still present in staged store: " + ",".join(still[:10]))
    gone = [s for s in slugs if any(p.startswith(f"p/{s}/") or p == f"p/{s}" for p in base)]
    expected = 1153 - len(ALLOW_ABSENT_STORE)
    if len(gone) != expected:
        raise SystemExit(f"REFUSED: known-good did not contain the expected {expected} junk store/p dirs (found {len(gone)})")
    unexpected_absent = sorted(ALLOW_ABSENT_STORE & set(gone))
    if unexpected_absent:
        raise SystemExit("REFUSED: allow-absent slugs unexpectedly present in known-good store: " + ",".join(unexpected_absent))
    print(f"junk-cleanup store assert ok: removed {len(removed)} files under {len(gone)} slugs, no other store diffs")


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        raise SystemExit("usage: apply TREE SLUGFILE | assert-store BASE_STORE STAGED_STORE SLUGFILE")
    cmd = argv[1]
    if cmd == "apply":
        apply(Path(argv[2]), Path(argv[3]))
    elif cmd == "assert-store":
        assert_store(Path(argv[2]), Path(argv[3]), Path(argv[4]))
    else:
        raise SystemExit(f"unknown command {cmd}")


if __name__ == "__main__":
    main(sys.argv)
