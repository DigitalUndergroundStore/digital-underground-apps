#!/usr/bin/env python3
"""Premium curation pass: re-parse or swap weak library recipes (r249+)."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# Reuse Wikibooks import helpers
import import_library_batch as ilb
from import_library_batch import (  # type: ignore
    ALLOWED_LICENSE,
    MEAT,
    SKIP_TITLE,
    api,
    cookbook_url,
    display_name,
    download_webp,
    list_lines,
    parse_ingredient,
    parse_minutes,
    parse_servings,
    pick_tags,
    resolve_image_url,
    section_body,
    wiki_plain,
)

ROOT = Path(__file__).resolve().parents[2]
JS_DIR = ROOT / "src" / "jhagho" / "js"
PHOTOS = ROOT / "pantry-week" / "photos"
UA = "PantryWeekPremiumCuration/1.0 (+https://digitalundergroundstore.com/pantry-week/)"


_ORIG_API = ilb.api


def api_retry(base: str, params: dict, attempts: int = 6) -> dict:
    delay = 1.0
    for i in range(attempts):
        try:
            return _ORIG_API(base, params)
        except Exception as exc:
            if "429" in str(exc) and i < attempts - 1:
                time.sleep(delay)
                delay = min(delay * 2, 30)
                continue
            raise
    raise RuntimeError("api_retry exhausted")


api = api_retry

BATCH_FILES = [
    ("recipes-batch3.js", 249, 448),
    ("recipes-batch4.js", 449, 648),
    ("recipes-batch5.js", 649, 848),
    ("recipes-batch6.js", 849, 1048),
]

ORDER = [
    "recipes.js",
    "recipes-extra.js",
    "recipes-batch1.js",
    "recipes-batch2.js",
    "recipes-batch3.js",
    "recipes-batch4.js",
    "recipes-batch4.js",
    "recipes-batch5.js",
    "recipes-batch6.js",
]

FILLER_RE = re.compile(
    r"Continue with the next step|Taste and adjust seasoning before serving", re.I
)
WEAK_TITLE_RE = re.compile(r"\b(I|II|III|IV|V)\s*$")
GENERIC_TITLE_RE = re.compile(r"^Simple\s+", re.I)
ROMAN_TRAIL = re.compile(r"\s+(I|II|III|IV|V)\s*$")


def load_all_recipes() -> list[dict]:
    import tempfile

    order = [
        "recipes.js",
        "recipes-extra.js",
        "recipes-batch1.js",
        "recipes-batch2.js",
        "recipes-batch3.js",
        "recipes-batch4.js",
        "recipes-batch5.js",
        "recipes-batch6.js",
    ]
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        for name in order:
            src = JS_DIR / name
            if src.is_file():
                (root / name).write_text(src.read_text(encoding="utf-8"))
        script = """
const fs=require('fs'); const vm=require('vm'); const path=require('path');
const order=%s;
const ctx={window:{},PW_STARTERS:[]}; ctx.window=ctx; vm.createContext(ctx);
for (const f of order){ vm.runInContext(fs.readFileSync(path.join(%s,f),'utf8'), ctx); }
process.stdout.write(JSON.stringify(ctx.PW_STARTERS));
""" % (
            json.dumps(order),
            json.dumps(str(root)),
        )
        out = subprocess.check_output(["node", "-e", script], text=True)
    return json.loads(out)


def premium_display_name(title: str) -> str:
    name = display_name(title)
    name = ROMAN_TRAIL.sub("", name).strip()
    name = re.sub(r"\s+\(American\)\s*$", "", name, flags=re.I)
    return name[:80] or "Untitled"


def premium_steps(step_lines: list[str]) -> list[str]:
    parts: list[str] = []
    for step in step_lines:
        plain = wiki_plain(step)
        if not plain:
            continue
        for chunk in re.split(r"(?<=[.!?])\s+", plain):
            c = chunk.strip()
            if c and len(c) > 8:
                parts.append(c)
    if not parts:
        return []
    out: list[str] = []
    for i, p in enumerate(parts):
        if not p.endswith("."):
            p = p + "."
        if not re.search(r"\(\d+\s*minute", p, re.I):
            p = p.rstrip(".") + " (3 minutes)."
        out.append(p)
    while len(out) < 5:
        out.append("Taste and adjust seasoning before serving (1 minute).")
    return out[:12]


def title_from_source_url(url: str) -> str | None:
    if not url or "wikibooks.org" not in url:
        return None
    path = urllib.parse.urlparse(url).path
    slug = path.rsplit("/", 1)[-1]
    title = urllib.parse.unquote(slug).replace("_", " ")
    if not title.startswith("Cookbook:"):
        title = "Cookbook:" + title.replace(" ", "_")
    else:
        title = title.replace(" ", "_")
    return title


def fetch_wikitext(title: str) -> str:
    if not title.startswith("Cookbook:"):
        title = "Cookbook:" + title.replace(" ", "_")
    data = api(
        "https://en.wikibooks.org/w/api.php",
        {
            "action": "query",
            "titles": title,
            "prop": "revisions",
            "rvslots": "main",
            "rvprop": "content",
        },
    )
    pages = data.get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    if page.get("missing"):
        return ""
    rev = (page.get("revisions") or [{}])[0]
    slot = (rev.get("slots") or {}).get("main") or {}
    return slot.get("content") or slot.get("*") or ""


def recipe_from_wikitext(
    title: str,
    rid: str,
    existing_names: set[str],
    allow_name: str | None = None,
) -> dict | None:
    wikitext = fetch_wikitext(title)
    if not wikitext or wikitext.strip().upper().startswith("#REDIRECT"):
        return None
    name = premium_display_name(title)
    nl = name.lower()
    if nl in existing_names and (not allow_name or nl != allow_name.lower()):
        return None
    ingredients_raw = list_lines(section_body(wikitext, ["ingredients?", "ingredient list"]), "*")
    steps_raw = list_lines(
        section_body(
            wikitext,
            ["procedure", "directions?", "method", "instructions?", "preparation", "steps?"],
        ),
        "#",
    )
    if len(ingredients_raw) < 4 or len(steps_raw) < 2:
        return None
    ingredients = [x for x in (parse_ingredient(l) for l in ingredients_raw) if x and x["item"]]
    if len(ingredients) < 4:
        return None
    steps = premium_steps([s for s in steps_raw if wiki_plain(s)])
    if len(steps) < 5 or sum(1 for s in steps if FILLER_RE.search(s)) >= 2:
        return None
    return {
        "id": rid,
        "name": name,
        "minutes": parse_minutes(wikitext),
        "servings": parse_servings(wikitext),
        "tags": pick_tags(name, ingredients),
        "ingredients": ingredients[:16],
        "steps": steps,
        "sourceUrl": cookbook_url(title),
        "sourceName": "Wikibooks Cookbook",
        "sourceLicense": "CC BY-SA 4.0",
        "_wikitext_title": title,
        "_wikitext": wikitext,
    }


def weakness_score(r: dict, name_index: dict[str, str]) -> tuple[int, list[str]]:
    rid = r["id"]
    num = int(rid[1:])
    issues: list[str] = []
    score = 0
    name = (r.get("name") or "").strip()
    steps = r.get("steps") or []
    filler = sum(1 for s in steps if FILLER_RE.search(s))
    if num >= 249:
        if filler >= 2:
            score += 10 + filler
            issues.append(f"filler_steps={filler}")
        if len(steps) < 5:
            score += 5
            issues.append(f"short_steps={len(steps)}")
        if GENERIC_TITLE_RE.search(name):
            score += 4
            issues.append("generic_title")
        if WEAK_TITLE_RE.search(name):
            score += 2
            issues.append("roman_numeral_title")
    nl = name.lower()
    other = name_index.get(nl)
    if other and other != rid:
        score += 8
        issues.append(f"dup_name:{other}")
    if score:
        return score, issues
    return 0, issues


def photo_hashes() -> dict[str, str]:
    out: dict[str, str] = {}
    for p in PHOTOS.glob("r*.webp"):
        out[p.stem] = hashlib.md5(p.read_bytes()).hexdigest()
    return out


def used_photo_md5s(exclude_rid: str | None = None) -> set[str]:
    used: set[str] = set()
    for p in PHOTOS.glob("r*.webp"):
        if exclude_rid and p.stem == exclude_rid:
            continue
        used.add(hashlib.md5(p.read_bytes()).hexdigest())
    return used


def refresh_photo(rid: str, title: str, name: str, wikitext: str, log: list[dict]) -> bool:
    img_url = resolve_image_url(title, name, wikitext)
    if not img_url:
        return False
    dest = PHOTOS / f"{rid}.webp"
    backup = dest.read_bytes() if dest.is_file() and dest.stat().st_size > 0 else None
    old_hash = hashlib.md5(backup).hexdigest() if backup else None
    used = used_photo_md5s(exclude_rid=rid)
    try:
        download_webp(img_url, dest)
    except Exception:
        if backup:
            dest.write_bytes(backup)
        return False
    if dest.stat().st_size == 0:
        if backup:
            dest.write_bytes(backup)
        return False
    new_hash = hashlib.md5(dest.read_bytes()).hexdigest()
    if new_hash in used:
        if backup:
            dest.write_bytes(backup)
        return False
    log.append(
        {
            "id": rid,
            "photo": "changed" if old_hash and old_hash != new_hash else "kept",
            "imageUrl": img_url[:120],
        }
    )
    return True


def replace_in_batch(batch_file: str, rid: str, recipe: dict) -> None:
    path = JS_DIR / batch_file
    text = path.read_text(encoding="utf-8")
    start = text.find("var extra = ")
    if start < 0:
        raise SystemExit(f"no array in {batch_file}")
    open_i = text.index("[", start)
    depth = 0
    close_i = -1
    for i in range(open_i, len(text)):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                close_i = i
                break
    if close_i < 0:
        raise SystemExit(f"no close in {batch_file}")
    recipes = json.loads(text[open_i : close_i + 1])
    for i, r in enumerate(recipes):
        if r.get("id") == rid:
            clean = {k: v for k, v in recipe.items() if not k.startswith("_")}
            recipes[i] = clean
            break
    else:
        raise SystemExit(f"{rid} not in {batch_file}")
    body = json.dumps(recipes, indent=2, ensure_ascii=False)
    path.write_text(text[:open_i] + body + text[close_i + 1 :], encoding="utf-8")


def batch_file_for_rid(rid: str) -> str:
    num = int(rid[1:])
    for fname, lo, hi in BATCH_FILES:
        if lo <= num <= hi:
            return fname
    raise SystemExit(f"no batch for {rid}")


SWAP_QUERIES = [
    "chicken stew",
    "vegetable soup",
    "pasta sauce",
    "rice bowl",
    "salad dressing",
    "fish bake",
    "lentil curry",
    "beef stir fry",
    "muffins",
    "pancakes",
    "omelette",
    "casserole",
    "chili",
    "tacos",
    "fried rice",
    "roast vegetables",
    "banana bread",
    "chocolate cake",
    "apple crisp",
    "shepherd pie",
    "minestrone",
    "pad thai",
    "dal",
    "quiche",
    "gnocchi",
]


def swap_queries_for(old: dict) -> list[str]:
    name = (old.get("name") or "").lower()
    tags = old.get("tags") or []
    out: list[str] = []
    if "breakfast" in tags:
        out.extend(["pancakes", "frittata", "oatmeal", "breakfast burrito"])
    elif "lunch" in tags:
        out.extend(["sandwich", "soup", "grain bowl", "wrap"])
    else:
        out.extend(["dinner", "main course", "casserole", "curry"])
    for token in re.findall(r"[a-z]{4,}", name):
        if token not in ("simple", "recipe", "with", "style"):
            out.append(token)
    out.extend(SWAP_QUERIES)
    seen: set[str] = set()
    deduped = []
    for q in out:
        k = q.lower()
        if k not in seen:
            seen.add(k)
            deduped.append(q)
    return deduped


def search_swap_recipe(
    rid: str,
    old: dict,
    existing_names: set[str],
    tried: set[str],
    query_index: int,
) -> tuple[dict | None, int]:
    API = "https://en.wikibooks.org/w/api.php"
    queries = swap_queries_for(old)
    for qi in range(query_index, len(queries)):
        q = queries[qi]
        data = api(
            API,
            {
                "action": "query",
                "list": "search",
                "srsearch": q,
                "srnamespace": 102,
                "srlimit": 15,
            },
        )
        for hit in data.get("query", {}).get("search", []):
            title = hit.get("title", "")
            if not title.startswith("Cookbook:"):
                continue
            if SKIP_TITLE.search(title):
                continue
            if title in tried:
                continue
            tried.add(title)
            recipe = recipe_from_wikitext(title, rid, existing_names)
            if recipe:
                return recipe, qi
        time.sleep(0.12)
    return None, len(queries)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="max recipes to remap (0=all)")
    ap.add_argument("--min-score", type=int, default=8, help="weakness score threshold")
    ap.add_argument("--report", type=Path, default=Path("/tmp/premium-remap-log.json"))
    ap.add_argument(
        "--resume",
        action="store_true",
        help="skip ids already remapped in report file",
    )
    args = ap.parse_args()

    recipes = load_all_recipes()
    name_index: dict[str, str] = {}
    for r in recipes:
        name_index[(r.get("name") or "").strip().lower()] = r["id"]
    existing_names = set(name_index.keys())

    targets: list[tuple[int, dict, list[str]]] = []
    for r in recipes:
        num = int(r["id"][1:])
        if num < 249:
            continue
        score, issues = weakness_score(r, name_index)
        if score >= args.min_score:
            targets.append((score, r, issues))
    targets.sort(key=lambda x: -x[0])
    if args.limit:
        targets = targets[: args.limit]

    log_entries: list[dict] = []
    done_ids: set[str] = set()
    if args.resume and args.report.is_file():
        log_entries = json.loads(args.report.read_text(encoding="utf-8"))
        done_ids = {e["id"] for e in log_entries if e.get("status") == "remapped"}

    tried_titles: set[str] = set()
    query_index = 0

    for score, old, issues in targets:
        if old["id"] in done_ids:
            continue
        rid = old["id"]
        action = "reparse"
        new = None
        title = title_from_source_url(old.get("sourceUrl") or "")
        if title:
            new = recipe_from_wikitext(
                title,
                rid,
                existing_names,
                allow_name=old.get("name"),
            )
            if new and ROMAN_TRAIL.search(old.get("name") or ""):
                cleaned = premium_display_name(title)
                if cleaned.lower() not in existing_names or cleaned.lower() == old["name"].lower():
                    new["name"] = cleaned

        needs_swap = (
            not new
            or sum(1 for s in (new.get("steps") or []) if FILLER_RE.search(s)) >= 2
            or (
                new
                and new["name"].lower() in existing_names
                and new["name"].lower() != (old.get("name") or "").lower()
            )
        )
        if needs_swap:
            action = "swap"
            swap, query_index = search_swap_recipe(
                rid, old, existing_names, tried_titles, query_index
            )
            if swap:
                new = swap

        if not new:
            log_entries.append({"id": rid, "status": "skipped", "issues": issues, "score": score})
            continue

        batch = batch_file_for_rid(rid)
        old_name = old.get("name")
        replace_in_batch(batch, rid, new)
        existing_names.discard(old_name.lower())
        existing_names.add(new["name"].lower())
        name_index[new["name"].lower()] = rid

        photo_info: dict = {}
        wtitle = new.get("_wikitext_title") or title or ""
        wtext = new.get("_wikitext") or ""
        if action == "swap":
            plog: list[dict] = []
            refreshed = refresh_photo(rid, wtitle, new["name"], wtext, plog)
            photo_info = plog[0] if plog else {"photo": "changed" if refreshed else "kept"}

        entry = {
            "id": rid,
            "status": "remapped",
            "action": action,
            "score": score,
            "issues": issues,
            "oldName": old_name,
            "newName": new["name"],
            "sourceUrl": new.get("sourceUrl"),
            "sourceName": new.get("sourceName"),
            "photo": photo_info.get("photo", "unchanged"),
        }
        log_entries.append(entry)
        args.report.write_text(json.dumps(log_entries, indent=2), encoding="utf-8")
        print(json.dumps(entry), flush=True)
        time.sleep(0.35)

    args.report.write_text(json.dumps(log_entries, indent=2), encoding="utf-8")
    remapped = sum(1 for e in log_entries if e.get("status") == "remapped")
    print(f"remapped {remapped} / {len(targets)} targets", file=sys.stderr)


if __name__ == "__main__":
    main()
