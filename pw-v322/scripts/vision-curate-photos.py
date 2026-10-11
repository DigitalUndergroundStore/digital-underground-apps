#!/usr/bin/env python3
"""Multi-source recipe photo curation with CLIP vision gate and type fallbacks.

Sources: Openverse (incl. Wikimedia/Flickr/Unsplash where indexed), Wikimedia Commons API.

Writes:
  scripts/photo-verification-log.jsonl
  scripts/photos-meta.json
  jhagho/photos/r{id}.webp
  pantry-week/photos/r{id}.webp
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
JH = ROOT / "jhagho" / "photos"
HOSTED = (ROOT.parent / "pantry-week" / "photos").resolve()
LOG = SCRIPTS / "photo-verification-log.jsonl"
META = SCRIPTS / "photos-meta.json"
GENERICS = json.loads((SCRIPTS / "generic-fallbacks.json").read_text(encoding="utf-8"))
CACHE = ROOT / "work" / "openverse-cache.json"
UA = "PantryWeekPhotoCurator/3.3.1 (https://digitalundergroundstore.com)"

_spec = importlib.util.spec_from_file_location("lar", SCRIPTS / "load-all-recipes.py")
lar = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(lar)

_CLIP = None


def clip_model():
    global _CLIP
    if _CLIP is None:
        import open_clip
        import torch

        model, _, preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="openai"
        )
        tokenizer = open_clip.get_tokenizer("ViT-B-32")
        model.eval()
        _CLIP = (model, preprocess, tokenizer, torch)
    return _CLIP


BAD_TITLE = re.compile(
    r"(botanical|illustration|engraving|etching|lithograph|djvu|\.pdf|cookbook|"
    r"diagram|map\b|logo\b|icon\b|plate\s+[IVX]+|breeding|species|varieties of|"
    r"garden bean|hen\b|rooster|coop\b|farm field|"
    r"building|facade|storefront|street view|architecture|vase\b|sculpture|"
    r"menu\b|beer can|alehouse|aluminium foil|plastic container|takeaway box|"
    r"horse|rider|equestrian|cavalry|portrait|selfie|wedding|"
    r"person|people|man |woman |child|holding|selling|"
    r"raw meat|butcher|slaughter|live animal|uncooked|ingredients only|"
    r"grocery|supermarket|packaging only|nutrition facts|seed catalog)",
    re.I,
)

STOP = {
    "and", "the", "with", "for", "pan", "sheet", "skillet", "bowl", "bowls",
    "easy", "quick", "simple", "classic", "homemade", "style", "baked", "night",
    "weeknight", "dinner", "lunch", "breakfast", "canadian", "comfort",
}


def tokens(s: str) -> set[str]:
    return {w for w in re.sub(r"[^a-z0-9\s]", " ", s.lower()).split() if len(w) > 2 and w not in STOP}


def dish_type(name: str) -> str:
    n = name.lower()
    if "fish" in n and "chip" in n:
        return "fish_chips"
    if "shepherd" in n or "cottage pie" in n:
        return "meat_pie"
    if "taco" in n or "quesadilla" in n or "burrito" in n:
        return "tacos"
    if "pita" in n or "wrap" in n:
        return "pita_wrap"
    if "soup" in n or "stew" in n or "chili" in n or "chowder" in n:
        return "soup"
    if "ziti" in n or "lasagna" in n or "lasagne" in n:
        return "baked_pasta"
    if "casserole" in n or ("bake" in n and ("tray" in n or "pan" in n)):
        return "baked_pasta"
    if "grain" in n and "lunch" in n:
        return "grain_bowl"
    if "bowl" in n or "grain" in n or "donburi" in n:
        return "grain_bowl"
    if "salad" in n:
        return "salad"
    if "curry" in n or "tikka" in n or "masala" in n:
        return "curry"
    if "stir" in n or "fried rice" in n or "noodle" in n:
        return "stir_fry"
    if "pasta" in n or "spaghetti" in n or "penne" in n or "gnocchi" in n:
        return "pasta"
    if "oat" in n or "pancake" in n or "waffle" in n or "frittata" in n or "scramble" in n:
        return "breakfast"
    if "bbq" in n or "barbecue" in n or "ribs" in n or "brisket" in n:
        return "bbq"
    if "cake" in n or "cookie" in n or "brownie" in n or "dessert" in n or "compote" in n:
        return "dessert"
    if "sandwich" in n or "burger" in n:
        return "sandwich"
    if "rice" in n:
        return "rice"
    return "default"


def color_heuristic(path: Path) -> tuple[bool, str]:
    try:
        im = Image.open(path).convert("RGB")
    except Exception as err:
        return False, f"unreadable: {err}"
    w, h = im.size
    if w < 280 or h < 200:
        return False, "too small"
    stat = ImageStat.Stat(im)
    r, g, b = stat.mean
    spread = max(r, g, b) - min(r, g, b)
    if spread < 16:
        return False, "near grayscale (illustration or engraving)"
    px = im.resize((160, 120))
    hist = px.convert("L").histogram()
    total = sum(hist)
    dark = sum(hist[:25]) / total
    light = sum(hist[230:]) / total
    if dark + light > 0.84 and spread < 38:
        return False, "high-contrast B&W illustration"
    return True, f"color photo {w}×{h}"


def clip_vision_yes(path: Path, dish: str) -> tuple[bool, str]:
    ok, reason = color_heuristic(path)
    if not ok:
        return False, reason

    model, preprocess, tokenizer, torch = clip_model()
    im = preprocess(Image.open(path).convert("RGB")).unsqueeze(0)
    dtype = dish_type(dish)
    type_label = dtype.replace("_", " ")
    pos = [
        f"appetizing photo of cooked plated {dish}",
        f"a bowl or plate of {dish} ready to eat",
        f"restaurant serving of {type_label} food",
    ]
    neg = [
        "botanical illustration vintage seed catalog",
        "building architecture exterior not food",
        "people portrait scene not food",
        "canned soup or beer cans on grocery shelf",
        "restaurant menu paper with text",
        "vase sculpture decorative object",
        "horse rider vintage engraving",
        "plastic takeaway containers meal prep",
        "raw uncooked ingredients only",
    ]
    texts = pos + neg
    toks = tokenizer(texts)
    with torch.no_grad():
        ie = model.encode_image(im)
        te = model.encode_text(toks)
        ie /= ie.norm(dim=-1, keepdim=True)
        te /= te.norm(dim=-1, keepdim=True)
        sims = (ie @ te.T).squeeze(0).tolist()
    p_scores = sims[: len(pos)]
    n_scores = sims[len(pos) :]
    pmax = max(p_scores)
    nmax = max(n_scores)
    people = n_scores[2]
    if people > pmax - 0.01:
        return False, "looks like people not plated food"
    if pmax <= nmax + 0.02 or pmax < 0.21:
        worst = neg[n_scores.index(nmax)]
        return False, f"failed vision gate vs '{worst[:40]}' (p={pmax:.2f}, n={nmax:.2f})"
    best = pos[p_scores.index(pmax)]
    return True, f"yes — {best[:70]}"


def load_cache() -> dict:
    if CACHE.is_file():
        return json.loads(CACHE.read_text(encoding="utf-8"))
    return {}


def save_cache(c: dict) -> None:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(c), encoding="utf-8")


def openverse_search(query: str, page_size: int = 18) -> list[dict]:
    cache = load_cache()
    key = query.lower().strip()
    if key in cache:
        return cache[key]
    params = urllib.parse.urlencode(
        {
            "q": query,
            "page_size": page_size,
            "license_type": "commercial,modification",
        }
    )
    url = "https://api.openverse.org/v1/images/?" + params
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    results = data.get("results") or []
    cache[key] = results
    save_cache(cache)
    return results


def commons_search(query: str, limit: int = 12) -> list[str]:
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": limit,
        }
    )
    url = "https://commons.wikimedia.org/w/api.php?" + q
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    out = []
    for page in data.get("query", {}).get("pages", {}).values():
        t = page.get("title", "")
        if t.startswith("File:"):
            out.append(t)
    return out


def commons_thumb(title: str) -> dict | None:
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata|mime",
            "iiurlwidth": 960,
        }
    )
    url = "https://commons.wikimedia.org/w/api.php?" + q
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    page = next(iter(data.get("query", {}).get("pages", {}).values()), {})
    if page.get("missing"):
        return None
    info = (page.get("imageinfo") or [{}])[0]
    if not str(info.get("mime", "")).startswith("image/"):
        return None
    meta = info.get("extmetadata") or {}
    return {
        "url": info.get("thumburl") or info.get("url"),
        "title": title,
        "source": "Wikimedia Commons",
        "license": (meta.get("LicenseShortName") or {}).get("value", ""),
    }


def score_title(recipe_name: str, title: str) -> float:
    if BAD_TITLE.search(title):
        return -999.0
    rt = tokens(recipe_name)
    ht = tokens(title)
    if not rt:
        return 0.0
    overlap = len(rt & ht)
    s = overlap * 5.0
    if overlap >= max(1, len(rt) - 1):
        s += 4.0
    tl = title.lower()
    if any(w in tl for w in ("food", "dish", "plate", "bowl", "meal", "served", "cuisine")):
        s += 2.0
    if "plated" in tl or "on a plate" in tl or "served" in tl:
        s += 2.0
    return s


def as_text(v) -> str:
    if isinstance(v, list):
        return " ".join(as_text(x) for x in v)
    return str(v or "")


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    ref = "https://openverse.org/"
    if "wikimedia" in url:
        ref = "https://commons.wikimedia.org/"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": ref})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    if len(data) < 6000:
        raise ValueError("download too small")
    dest.write_bytes(data)


def to_webp(src: Path, dest: Path, width: int = 800) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    if w > width:
        im = im.resize((width, int(h * width / w)), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=82, method=6)


def collect_candidates(recipe: dict) -> list[dict]:
    name = recipe["name"]
    dt = dish_type(name)
    type_q = dt.replace("_", " ")
    queries = [
        f"{name} food plated",
        f"{name} dish cooked",
        f"{type_q} food plate",
        name,
    ]
    cands: list[dict] = []
    seen: set[str] = set()

    for q in queries:
        try:
            for hit in openverse_search(q):
                url = hit.get("url")
                title = as_text(hit.get("title")) + " " + as_text(hit.get("tags"))
                if not url or url in seen:
                    continue
                sc = score_title(name, title)
                if sc < 1:
                    continue
                seen.add(url)
                cands.append(
                    {
                        "url": url,
                        "title": title[:200],
                        "source": hit.get("source") or "Openverse",
                        "license": hit.get("license") or "",
                        "score": sc,
                    }
                )
        except Exception:
            time.sleep(0.35)
        time.sleep(0.12)

    for q in queries[:3]:
        try:
            for ft in commons_search(f"{q} food", limit=10):
                if BAD_TITLE.search(ft):
                    continue
                sc = score_title(name, ft)
                if sc < 0:
                    continue
                info = commons_thumb(ft)
                if not info or not info.get("url"):
                    continue
                url = info["url"]
                if url in seen:
                    continue
                seen.add(url)
                cands.append(
                    {
                        "url": url,
                        "title": ft,
                        "source": "Wikimedia Commons",
                        "license": info.get("license", ""),
                        "score": sc + 1.5,
                    }
                )
        except Exception:
            time.sleep(0.35)
        time.sleep(0.1)

    cands.sort(key=lambda x: -x["score"])
    return cands[:14]


def apply_generic(dtype: str) -> dict:
    g = GENERICS.get(dtype) or GENERICS["default"]
    return {
        "url": g["url"],
        "title": g["title"],
        "source": g["source"],
        "license": g.get("license", ""),
        "score": 0,
        "generic": True,
        "description": g.get("description", "type-generic food photo"),
    }


def write_outputs(rid: str, name: str, chosen: dict, used_generic: bool, vision_yes: bool, desc: str) -> None:
    file_rel = f"photos/{rid}.webp"
    log_line = {
        "id": rid,
        "recipe": name,
        "file": file_rel,
        "source": chosen["source"],
        "license": chosen.get("license", ""),
        "title": chosen.get("title", "")[:180],
        "vision_yes": vision_yes,
        "generic_fallback": used_generic,
        "description": desc,
    }
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(log_line, ensure_ascii=False) + "\n")


def install_photo(rid: str, chosen: dict, tmp: Path) -> None:
    src = tmp / f"{rid}.src"
    download(chosen["url"], src)
    to_webp(src, JH / f"{rid}.webp")
    to_webp(src, HOSTED / f"{rid}.webp")


def pick_for_recipe(recipe: dict, tmp: Path, force: bool) -> tuple[dict, bool, bool, str]:
    rid = recipe["id"]
    name = recipe["name"]
    dtype = dish_type(name)
    existing = JH / f"{rid}.webp"
    if existing.is_file() and not force:
        ok, desc = clip_vision_yes(existing, name)
        if ok:
            return (
                {
                    "url": "",
                    "title": "(kept existing)",
                    "source": "existing",
                    "license": "",
                },
                False,
                True,
                desc,
            )

    for cand in collect_candidates(recipe):
        src = tmp / f"{rid}.src"
        try:
            download(cand["url"], src)
            ok, desc = clip_vision_yes(src, name)
            if ok:
                return cand, False, True, desc
        except Exception:
            time.sleep(0.15)

    g = apply_generic(dtype)
    return g, True, True, g["description"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="re-pick even if current passes gate")
    parser.add_argument("--audit-only", action="store_true", help="only write log from current files")
    args = parser.parse_args()

    recipes = lar.load_all_recipes()
    tmp = ROOT / "work" / "photo-pick"
    tmp.mkdir(parents=True, exist_ok=True)

    if not args.audit_only:
        LOG.write_text("", encoding="utf-8")
    elif not LOG.is_file():
        LOG.write_text("", encoding="utf-8")

    meta: dict = {}
    if META.is_file():
        try:
            meta = json.loads(META.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            meta = {}

    generic_count = 0
    done_ids: set[str] = set()
    if args.audit_only and LOG.is_file():
        for line in LOG.read_text(encoding="utf-8").splitlines():
            if line.strip():
                done_ids.add(json.loads(line)["id"])

    for i, recipe in enumerate(recipes):
        rid = recipe["id"]
        name = recipe["name"]
        dtype = dish_type(name)
        if args.audit_only and rid in done_ids:
            continue

        print(f"[{i+1}/{len(recipes)}] {rid} {name}", flush=True)

        if args.audit_only:
            path = JH / f"{rid}.webp"
            ok, desc = clip_vision_yes(path, name) if path.is_file() else (False, "missing file")
            write_outputs(rid, name, {"source": "audit", "license": "", "title": ""}, False, ok, desc)
            continue

        chosen, used_generic, vision_yes, desc = pick_for_recipe(recipe, tmp, args.force)
        if used_generic:
            generic_count += 1
        if chosen.get("url"):
            install_photo(rid, chosen, tmp)
        elif not (JH / f"{rid}.webp").is_file():
            g = apply_generic(dtype)
            install_photo(rid, g, tmp)
            used_generic = True
            generic_count += 1

        meta[rid] = {
            "recipe": name,
            "file": f"photos/{rid}.webp",
            "source": chosen["source"],
            "source_url": chosen.get("url", ""),
            "license": chosen.get("license", ""),
            "title": chosen.get("title", ""),
            "dish_type": dtype,
            "generic_fallback": used_generic,
        }
        write_outputs(rid, name, chosen, used_generic, vision_yes, desc)
        time.sleep(0.08)

    META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("wrote", LOG, flush=True)
    print("generic fallbacks:", generic_count, "of", len(recipes), flush=True)


if __name__ == "__main__":
    main()
