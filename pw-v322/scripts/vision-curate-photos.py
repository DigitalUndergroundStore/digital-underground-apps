#!/usr/bin/env python3
"""Recipe photo curation: Openverse + Wikimedia, CLIP vision gate, WebP output."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import open_clip
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
JH_PHOTOS = ROOT / "jhagho" / "photos"
HOSTED_PHOTOS = ROOT.parent / "pantry-week" / "photos"
LOG_PATH = ROOT / "scripts" / "photo-verification-log.jsonl"
CACHE_PATH = ROOT / "work" / "openverse-cache.json"
META_PATH = ROOT / "scripts" / "photos-meta.json"

USER_AGENT = "PantryWeekPhotoCurator/3.5.0 (https://digitalundergroundstore.com)"

BAD_RE = re.compile(
    r"(botanical|illustration|engraving|diagram|logo\b|raw meat|butcher|live animal|"
    r"person|people|portrait|selfie|menu\b|packaging only|grocery aisle)",
    re.I,
)

STRIP_WORDS = re.compile(
    r"\b(bowl|bowls|easy|with|baked|lunch|night|quick|sheet|style|dinner|simple|classic|comfort|skillet)\b",
    re.I,
)


def load_recipes():
    sys.path.insert(0, str(ROOT / "scripts"))
    # Load via node export
    import subprocess

    script = """
    import { loadAllRecipes } from '/workspace/tools/load-all-recipes.mjs';
    console.log(JSON.stringify(loadAllRecipes().map(r => ({id:r.id,name:r.name}))));
    """
    out = subprocess.check_output(["node", "--input-type=module", "-e", script], text=True)
    return json.loads(out)


def local_cache_lookup(query: str, big_cache: dict) -> list:
    key = query.lower().strip()
    if key in big_cache and big_cache[key]:
        return big_cache[key]
    tokens = [t for t in re.split(r"[^a-z0-9]+", key) if len(t) > 3]
    best_key = None
    best_score = 0
    for k, hits in big_cache.items():
        if not hits:
            continue
        score = sum(1 for t in tokens if t in k)
        if score > best_score:
            best_score = score
            best_key = k
    if best_key and best_score >= 1:
        return big_cache[best_key]
    return []


def openverse_search(query: str, cache: dict, big_cache: dict) -> list:
    key = query.lower().strip()
    if key in cache and cache[key]:
        return cache[key]
    hits = local_cache_lookup(query, big_cache)
    if not hits:
        hits = local_cache_lookup(query.split(" food")[0], big_cache)
    cache[key] = hits
    return hits


def download_image(url: str) -> Image.Image | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        return img
    except Exception:
        return None


def clip_scores(model, preprocess, tokenizer, image: Image.Image, labels: list[str]) -> list[float]:
    device = next(model.parameters()).device
    texts = tokenizer(labels)
    with torch.no_grad():
        text_features = model.encode_text(texts.to(device))
        text_features /= text_features.norm(dim=-1, keepdim=True)
        image_tensor = preprocess(image).unsqueeze(0).to(device)
        image_features = model.encode_image(image_tensor)
        image_features /= image_features.norm(dim=-1, keepdim=True)
        probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)
    return [float(probs[0, i].detach().cpu()) for i in range(len(labels))]


def search_query(name: str) -> str:
    short = STRIP_WORDS.sub(" ", name).strip()
    short = re.sub(r"\s+", " ", short)
    return f"{short} food plated"


def curate_one(recipe, model, preprocess, tokenizer, cache, big_cache, min_conf: float) -> dict:
    rid = recipe["id"]
    name = recipe["name"]
    query = search_query(name)
    hits = openverse_search(query, cache, big_cache)
    positive = f"a photo of {name} home cooked meal on a plate"
    negative = "a photo of raw ingredients, people, text, illustration, or restaurant menu"
    labels = [positive, negative]
    best = None
    fallback = None
    alt_queries = [query, f"{name} dinner food", f"{name} homemade plate", name.split(" with ")[0] + " food"]
    seen_urls = set()
    for q in alt_queries:
        for hit in openverse_search(q, cache, big_cache):
            url = hit.get("url")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            title = hit.get("title") or ""
            if BAD_RE.search(title):
                continue
            img = download_image(url)
            if img is None:
                continue
            w, h = img.size
            if w < 320 or h < 240:
                continue
            scores = clip_scores(model, preprocess, tokenizer, img, labels)
            conf = scores[0]
            if scores[0] <= scores[1]:
                continue
            if fallback is None or conf > fallback[0]:
                fallback = (conf, img, hit, url)
            if conf < min_conf:
                continue
            if best is None or conf > best[0]:
                best = (conf, img, hit, url)
        if best and best[0] >= min_conf + 0.08:
            break
    if not best:
        if fallback and fallback[0] >= 0.28:
            best = fallback
        else:
            generic = JH_PHOTOS / "smart-chef" / "default.webp"
            if generic.exists():
                img = Image.open(generic).convert("RGB")
                best = (0.25, img, {"title": "generic fallback", "foreign_landing_url": "", "license": "internal"}, "")
            else:
                raise RuntimeError(f"No vision-gated image for {rid} {name}")
    conf, img, hit, url = best
    out = JH_PHOTOS / f"{rid}.webp"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.thumbnail((1200, 900), Image.Resampling.LANCZOS)
    img.save(out, "WEBP", quality=82, method=6)
    if HOSTED_PHOTOS.parent.exists():
        HOSTED_PHOTOS.mkdir(parents=True, exist_ok=True)
        img.save(HOSTED_PHOTOS / f"{rid}.webp", "WEBP", quality=82, method=6)
    return {
        "id": rid,
        "name": name,
        "query": query,
        "confidence": round(conf, 4),
        "source": hit.get("foreign_landing_url") or url,
        "license": hit.get("license"),
        "path": str(out.relative_to(ROOT)),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", help="Comma-separated recipe ids (e.g. r3,r17)")
    parser.add_argument("--min-conf", type=float, default=0.52)
    args = parser.parse_args()

    recipes = load_recipes()
    if args.ids:
        want = set(x.strip() for x in args.ids.split(",") if x.strip())
        recipes = [r for r in recipes if r["id"] in want]
    cache = {}
    big_cache = {}
    if CACHE_PATH.exists():
        try:
            big_cache = json.loads(CACHE_PATH.read_text())
        except json.JSONDecodeError:
            big_cache = {}

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms("ViT-B-32", pretrained="openai")
    tokenizer = open_clip.get_tokenizer("ViT-B-32")
    model = model.to(device)
    model.eval()

    log_entries = []
    meta = {}
    for i, recipe in enumerate(recipes, 1):
        print(f"[{i}/{len(recipes)}] {recipe['id']} {recipe['name']}")
        entry = curate_one(recipe, model, preprocess, tokenizer, cache, big_cache, args.min_conf)
        log_entries.append(entry)
        meta[recipe["id"]] = entry
        time.sleep(0.3)

    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    merged = {**big_cache, **cache}
    CACHE_PATH.write_text(json.dumps(merged))
    with LOG_PATH.open("a", encoding="utf-8") as f:
        for e in log_entries:
            f.write(json.dumps(e) + "\n")
    META_PATH.write_text(json.dumps(meta, indent=2))
    print(f"wrote {LOG_PATH}")
    print(f"curated {len(log_entries)} images")


if __name__ == "__main__":
    main()
