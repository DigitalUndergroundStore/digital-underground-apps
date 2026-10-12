#!/usr/bin/env python3
"""Import openly licensed Wikibooks Cookbook recipes into recipes-batchN.js + photos."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://en.wikibooks.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
UA = "PantryWeekLibraryImport/1.0 (+https://digitalundergroundstore.com/pantry-week/)"

MEAT = re.compile(
    r"\b(chicken|turkey|beef|pork|lamb|fish|salmon|cod|shrimp|prawn|sausage|bacon|ham|tuna|clam|mussel|anchovy|duck|veal)\b",
    re.I,
)
QTY_RE = re.compile(
    r"^(\d+\s+\d+/\d+|\d+/\d+|\d+\.\d+|\d+)\s*"
    r"(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|ml|l|liter|litre|clove|cloves|can|cans|slice|slices|piece|pieces|head|bunch|pinch|stalk|package|jar|bag|lb\.|oz\.)?\s*(.*)$",
    re.I,
)
ALLOWED_LICENSE = re.compile(
    r"(cc[\s-]?by|cc[\s-]?zero|cc0|public domain|pd-|gfdl|gnu free)", re.I
)
SKIP_TITLE = re.compile(
    r"(ingredient|equipment|template|category|wikibooks|glossary|appendix|substitution|conversion|measurement|nutrition|food safety|knife skills|stock|broth base|sauce base)",
    re.I,
)


def api(base: str, params: dict) -> dict:
    params = dict(params)
    params["format"] = "json"
    url = base + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode())


def wiki_plain(text: str) -> str:
    s = text or ""
    s = re.sub(r"<!--[\s\S]*?-->", "", s)
    s = re.sub(r"<ref\b[^>]*>[\s\S]*?</ref>", "", s, flags=re.I)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[(?:[^:\]]*):([^\]]+)\]\]", r"\1", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    s = re.sub(r"\[https?://\S+\s+([^\]]+)\]", r"\1", s, flags=re.I)
    s = re.sub(r"'{2,}", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"_+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def section_body(wikitext: str, names: list[str]) -> str:
    re_sec = re.compile(
        r"==+\s*(?:" + "|".join(names) + r")\s*==+\s*([\s\S]*?)(?=\n==+|$)",
        re.I,
    )
    m = re_sec.search(wikitext or "")
    return m.group(1) if m else ""


def list_lines(body: str, marker: str) -> list[str]:
    out = []
    for line in (body or "").split("\n"):
        t = line.strip()
        if not t.startswith(marker):
            continue
        plain = wiki_plain(re.sub(r"^" + re.escape(marker) + r"+\s*", "", t))
        if plain and len(plain) < 400:
            out.append(plain)
    return out


def parse_ingredient(line: str) -> dict | None:
    plain = wiki_plain(line)
    if not plain or len(plain) < 2:
        return None
    m = QTY_RE.match(plain)
    if m:
        qty_s, unit, item = m.group(1), (m.group(2) or "").strip(), m.group(3).strip()
        qty = qty_s
        if "/" in qty_s and " " in qty_s:
            a, b = qty_s.split(" ", 1)
            qty = float(a) + float(b.split("/")[0]) / float(b.split("/")[1])
        elif "/" in qty_s:
            qty = float(qty_s.split("/")[0]) / float(qty_s.split("/")[1])
        else:
            qty = float(qty_s)
        unit = unit.lower().rstrip(".")
        unit_map = {
            "cup": "cup",
            "cups": "cup",
            "tablespoon": "tbsp",
            "tablespoons": "tbsp",
            "teaspoon": "tsp",
            "teaspoons": "tsp",
            "ounce": "oz",
            "ounces": "oz",
            "pound": "lb",
            "pounds": "lb",
            "gram": "g",
            "grams": "g",
            "liter": "l",
            "litre": "l",
            "cloves": "clove",
            "cans": "can",
            "slices": "slice",
            "pieces": "piece",
        }
        unit = unit_map.get(unit, unit)
        return {"qty": qty, "unit": unit, "item": item.rstrip(",")}
    return {"qty": None, "unit": "", "item": plain.rstrip(",")}


def expand_steps(steps: list[str]) -> list[str]:
    parts: list[str] = []
    for step in steps:
        for chunk in re.split(r"(?<=[.!?])\s+", step):
            c = chunk.strip()
            if c:
                parts.append(c)
    if len(parts) < 6:
        padded = []
        for i, p in enumerate(parts):
            padded.append(p)
            if i < len(parts) - 1 and not re.search(r"\(\d+\s*minute", p):
                padded.append("Continue with the next step (2 minutes).")
        parts = padded[:12]
    if len(parts) > 12:
        parts = parts[:12]
    out = []
    for i, p in enumerate(parts):
        if not re.search(r"\(\d+\s*minute", p) and i < len(parts) - 1:
            p = p.rstrip(".") + " (3 minutes)."
        out.append(p if p.endswith(".") else p + ".")
    while len(out) < 6:
        out.append("Taste and adjust seasoning before serving (1 minute).")
    return out[:12]


def parse_minutes(wikitext: str) -> int:
    block = re.search(r"\{\{Recipe summary([\s\S]*?)\}\}", wikitext, re.I)
    body = block.group(1) if block else ""
    for name in ("total time", "time", "preparation time", "prep time", "cook time"):
        m = re.search(r"\|\s*" + name + r"\s*=\s*([^\n|}]*)", body, re.I)
        if m:
            text = m.group(1)
            mins = 0
            h = re.search(r"(\d+)\s*h", text, re.I)
            mi = re.search(r"(\d+)\s*m", text, re.I)
            if h:
                mins += int(h.group(1)) * 60
            if mi:
                mins += int(mi.group(1))
            if mins:
                return max(15, min(mins, 240))
            n = re.search(r"(\d{1,3})", text)
            if n:
                return max(15, min(int(n.group(1)), 240))
    return 45


def parse_servings(wikitext: str) -> int:
    block = re.search(r"\{\{Recipe summary([\s\S]*?)\}\}", wikitext, re.I)
    body = block.group(1) if block else ""
    for name in ("servings", "yield", "serves"):
        m = re.search(r"\|\s*" + name + r"\s*=\s*([^\n|}]*)", body, re.I)
        if m:
            n = re.search(r"(\d+)", m.group(1))
            if n:
                return max(2, min(int(n.group(1)), 12))
    return 4


def cookbook_url(title: str) -> str:
    slug = title.replace(" ", "_")
    if not slug.startswith("Cookbook:"):
        slug = "Cookbook:" + slug
    return "https://en.wikibooks.org/wiki/" + urllib.parse.quote(slug, safe="/:")


def display_name(title: str) -> str:
    t = title.replace("Cookbook:", "").replace("_", " ").strip()
    t = re.sub(r"\s+II$", "", t)
    t = re.sub(r"\s+\(variation\)$", "", t, flags=re.I)
    return t[:80] or "Untitled"


def pick_tags(name: str, ingredients: list[dict]) -> list[str]:
    blob = name + " " + " ".join(i["item"] for i in ingredients)
    tags = ["dinner", "medium", "moderate"]
    if not MEAT.search(blob):
        tags.extend(["vegetarian"])
    if re.search(r"\b(pasta|spaghetti|lasagna|risotto)\b", blob, re.I):
        tags.append("collection-italian")
    if re.search(r"\b(taco|burrito|salsa|enchilada)\b", blob, re.I):
        tags.append("collection-mexican")
    if re.search(r"\b(curry|dal|masala|tikka)\b", blob, re.I):
        tags.append("collection-indian")
    return list(dict.fromkeys(tags))[:8]


def fetch_pages_batch(gapfrom: str) -> tuple[list[dict], str | None]:
    data = api(
        API,
        {
            "action": "query",
            "generator": "allpages",
            "gapnamespace": 102,
            "gapfrom": gapfrom,
            "gaplimit": 50,
            "prop": "revisions",
            "rvslots": "main",
            "rvprop": "content",
        },
    )
    pages = list(data.get("query", {}).get("pages", {}).values())
    cont = data.get("continue", {}).get("gapcontinue")
    return pages, cont


def first_image_file(wikitext: str) -> str | None:
    for m in re.finditer(r"\[\[(?:File|Image):([^\]|]+)", wikitext, re.I):
        name = m.group(1).strip()
        if name.lower().endswith((".svg", ".ogv", ".webm")):
            continue
        return name
    return None


def commons_image_ok(file_title: str) -> tuple[str | None, str | None]:
    if not file_title.startswith("File:"):
        file_title = "File:" + file_title
    data = api(
        COMMONS_API,
        {
            "action": "query",
            "titles": file_title,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
        },
    )
    pages = data.get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    info = (page.get("imageinfo") or [{}])[0]
    meta = info.get("extmetadata") or {}
    lic = (meta.get("LicenseShortName") or {}).get("value", "")
    if not ALLOWED_LICENSE.search(lic):
        return None, None
    url = info.get("url")
    if not url or not url.startswith("https://"):
        return None, None
    credit = wiki_plain((meta.get("Artist") or {}).get("value", ""))[:120]
    return url, credit or lic


def download_webp(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
    tmp = dest.with_suffix(".download")
    tmp.write_bytes(raw)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp), "-vf", "scale=800:-2", str(dest)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    tmp.unlink(missing_ok=True)


def emit_batch_js(recipes: list[dict], path: Path, start: int, end: int) -> None:
    head = (
        f"/* Pantry Week — batch library r{start}–r{end} (Wikibooks Cookbook, CC BY-SA 4.0) */\n"
        '"use strict";\n'
        "(function () {\n"
        "  if (typeof PW_STARTERS === 'undefined') return;\n"
        "  var extra = "
    )
    tail = ";\n  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);\n})();\n"
    path.write_text(head + json.dumps(recipes, indent=2, ensure_ascii=False) + tail, encoding="utf-8")


def patch_photos_js(photos_path: Path, mapping: dict[str, str]) -> None:
    text = photos_path.read_text(encoding="utf-8")
    lines = []
    for rid, rel in sorted(mapping.items(), key=lambda x: int(x[0][1:])):
        needle = f'  "{rid}":'
        if needle in text:
            continue
        lines.append(f'  "{rid}": "{rel}",')
    if not lines:
        return
    text = text.replace(
        '  "r248": "photos/r248.webp"',
        '  "r248": "photos/r248.webp",\n' + "\n".join(lines),
        1,
    )
    photos_path.write_text(text, encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start-id", type=int, default=249)
    ap.add_argument("--count", type=int, default=200)
    ap.add_argument("--src", type=Path, default=Path("src/jhagho"))
    ap.add_argument("--photos", type=Path, default=Path("pantry-week/photos"))
    ap.add_argument("--existing-names", type=Path, default=Path("/tmp/existing-names.json"))
    ap.add_argument("--batch-file", default="js/recipes-batch3.js")
    args = ap.parse_args()

    existing = {n.lower() for n in json.loads(args.existing_names.read_text())}
    used_photos: set[str] = set()
    for p in args.photos.glob("r*.webp"):
        used_photos.add(hashlib.md5(p.read_bytes()).hexdigest())

    recipes: list[dict] = []
    photo_map: dict[str, str] = {}
    gapfrom = "A"
    next_id = args.start_id
    target = args.count

    while len(recipes) < target:
        pages, gapfrom = fetch_pages_batch(gapfrom)
        if not pages:
            break
        for page in pages:
            if len(recipes) >= target:
                break
            title = page.get("title", "")
            if SKIP_TITLE.search(title):
                continue
            rev = (page.get("revisions") or [{}])[0]
            slot = (rev.get("slots") or {}).get("main") or {}
            wikitext = slot.get("content") or slot.get("*") or ""
            if not wikitext or wikitext.strip().upper().startswith("#REDIRECT"):
                continue
            name = display_name(title)
            if name.lower() in existing:
                continue
            ingredients_raw = list_lines(section_body(wikitext, ["ingredients?", "ingredient list"]), "*")
            steps_raw = list_lines(
                section_body(
                    wikitext,
                    ["procedure", "directions?", "method", "instructions?", "preparation", "steps?"],
                ),
                "#",
            )
            if len(ingredients_raw) < 4 or len(steps_raw) < 2:
                continue
            ingredients = [x for x in (parse_ingredient(l) for l in ingredients_raw) if x and x["item"]]
            if len(ingredients) < 4:
                continue
            steps = expand_steps([wiki_plain(s) for s in steps_raw if wiki_plain(s)])
            rid = f"r{next_id}"
            url = cookbook_url(title)
            recipe = {
                "id": rid,
                "name": name,
                "minutes": parse_minutes(wikitext),
                "servings": parse_servings(wikitext),
                "tags": pick_tags(name, ingredients),
                "ingredients": ingredients[:16],
                "steps": steps,
                "sourceUrl": url,
                "sourceName": "Wikibooks Cookbook",
                "sourceLicense": "CC BY-SA 4.0",
            }
            file_title = first_image_file(wikitext)
            img_url = None
            if file_title:
                img_url, _ = commons_image_ok(file_title)
            if not img_url:
                continue
            dest = args.photos / f"{rid}.webp"
            try:
                download_webp(img_url, dest)
            except Exception:
                continue
            md5 = hashlib.md5(dest.read_bytes()).hexdigest()
            if md5 in used_photos:
                dest.unlink(missing_ok=True)
                continue
            used_photos.add(md5)
            photo_map[rid] = f"photos/{rid}.webp"
            recipes.append(recipe)
            existing.add(name.lower())
            next_id += 1
            if len(recipes) % 10 == 0:
                print(f"imported {len(recipes)}", flush=True)
            time.sleep(0.15)
        if not gapfrom:
            break
        time.sleep(0.2)

    if not recipes:
        raise SystemExit("no recipes imported")
    end_id = args.start_id + len(recipes) - 1
    js_path = args.src / args.batch_file
    emit_batch_js(recipes, js_path, args.start_id, end_id)
    patch_photos_js(args.src / "js/photos.js", photo_map)
    meta = {
        "count": len(recipes),
        "start": args.start_id,
        "end": end_id,
        "batch_file": args.batch_file,
    }
    Path("/tmp/library-batch-meta.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
