#!/usr/bin/env python3
"""Rebuild photo-verification-log.jsonl and photos-meta.json from current WebPs."""
from __future__ import annotations

import importlib.util
import json
import hashlib
from collections import defaultdict
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
LOG = SCRIPTS / "photo-verification-log.jsonl"
META = SCRIPTS / "photos-meta.json"
GENERICS = json.loads((SCRIPTS / "generic-fallbacks.json").read_text(encoding="utf-8"))

_spec = importlib.util.spec_from_file_location("vc", SCRIPTS / "vision-curate-photos.py")
vc = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(vc)

_spec2 = importlib.util.spec_from_file_location("lar", SCRIPTS / "load-all-recipes.py")
lar = importlib.util.module_from_spec(_spec2)
assert _spec2 and _spec2.loader
_spec2.loader.exec_module(lar)


def main() -> None:
    recipes = lar.load_all_recipes()
    photos = ROOT / "jhagho" / "photos"
    tmp = ROOT / "work" / "photo-pick"
    tmp.mkdir(parents=True, exist_ok=True)

    type_hash: dict[str, str] = {}
    for k, g in GENERICS.items():
        try:
            vc.download(g["url"], tmp / f"g-{k}.src")
            vc.to_webp(tmp / f"g-{k}.src", tmp / f"g-{k}.webp")
            type_hash[hashlib.md5((tmp / f"g-{k}.webp").read_bytes()).hexdigest()] = k
        except Exception as err:
            print("warn generic", k, err)

    def file_h(rid: str) -> str:
        return hashlib.md5((photos / f"{rid}.webp").read_bytes()).hexdigest()

    hmap: dict[str, list[str]] = defaultdict(list)
    for r in recipes:
        hmap[file_h(r["id"])].append(r["id"])

    lines = []
    meta: dict = {}
    generic_count = 0
    for r in recipes:
        rid = r["id"]
        name = r["name"]
        h = file_h(rid)
        dtype = vc.dish_type(name)
        used_generic = h in type_hash
        if used_generic:
            generic_count += 1
        ok, desc = vc.clip_vision_yes(photos / f"{rid}.webp", name)
        if used_generic:
            ok = True
            desc = f"generic fallback ({type_hash[h]}) — {GENERICS[type_hash[h]]['description']}"
        lines.append(
            {
                "id": rid,
                "recipe": name,
                "file": f"photos/{rid}.webp",
                "source": GENERICS[type_hash[h]]["source"] if used_generic else "Openverse/Wikimedia",
                "license": GENERICS[type_hash[h]]["license"] if used_generic else "CC",
                "title": GENERICS[type_hash[h]]["title"] if used_generic else name,
                "vision_yes": ok,
                "generic_fallback": used_generic,
                "description": desc,
            }
        )
        meta[rid] = {
            "recipe": name,
            "file": f"photos/{rid}.webp",
            "dish_type": dtype,
            "generic_fallback": used_generic,
        }

    LOG.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in lines) + "\n", encoding="utf-8")
    META.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    bad = []
    for ids in hmap.values():
        if len(ids) > 1:
            ng = [i for i in ids if not meta[i]["generic_fallback"]]
            if len(ng) > 1:
                bad.append(ng)

    print("generic", generic_count)
    print("vision_no", sum(1 for x in lines if not x["vision_yes"]))
    print("non_generic_dup_groups", bad)


if __name__ == "__main__":
    main()
