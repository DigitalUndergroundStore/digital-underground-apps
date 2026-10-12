#!/usr/bin/env python3
"""Fetch Wikibooks cookbook wikitext for the source map and parse ingredients."""
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
MAP = pathlib.Path(__file__).resolve().parent / "source-map.json"
RAW = ROOT / "sources" / "wikitext"
PARSED = ROOT / "sources" / "parsed.json"
API = "https://en.wikibooks.org/w/api.php"
UA = "PantryWeekRecipeBot/1.0 (recipe attribution; CC BY-SA adaptation)"


def strip_templates(text: str) -> str:
    out = []
    depth = 0
    i = 0
    while i < len(text):
        if text.startswith("{{", i):
            depth += 1
            i += 2
            continue
        if text.startswith("}}", i) and depth:
            depth -= 1
            i += 2
            continue
        if depth == 0:
            out.append(text[i])
        i += 1
    return "".join(out)


def wiki_to_plain(text: str) -> str:
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = strip_templates(text)
    text = re.sub(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[https?://[^\s\]]+\s+([^\]]+)\]", r"\1", text)
    text = re.sub(r"\[https?://[^\]]+\]", "", text)
    text = text.replace("'''", "").replace("''", "")
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text


def sections(text: str) -> dict:
    matches = list(re.finditer(r"(?m)^==(?!=)\s*([^=]+?)\s*==(?!=)\s*$", text))
    found = {}
    for i, match in enumerate(matches):
        name = match.group(1).strip().lower()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        found[name] = text[match.end():end]
    return found


def lines_of(body: str) -> list:
    rows = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("{|") or line.startswith("|-") or line.startswith("|") or line.startswith("!"):
            continue
        if re.match(r"^=+", line):
            continue
        line = re.sub(r"^[#*]+\s*", "", line)
        line = re.sub(r"^\d+[.)]\s*", "", line)
        line = line.strip(" -")
        line = re.sub(r"\s+", " ", line)
        if not line or line.lower().startswith("category:"):
            continue
        if re.search(r"\b(thumb|px)\b", line) and len(line) < 80:
            continue
        rows.append(line)
    return rows


def parse_page(title: str, wikitext: str) -> dict:
    plain = wiki_to_plain(wikitext)
    secs = sections("\n" + plain)
    ing_key = next((k for k in secs if "ingredient" in k), None)
    proc_key = next((k for k in secs if k in ("procedure", "directions", "method", "instructions", "preparation") or "procedure" in k or "direction" in k), None)
    ingredients = lines_of(secs[ing_key]) if ing_key else []
    procedure = lines_of(secs[proc_key]) if proc_key else []
    return {
        "title": title,
        "ingredients": ingredients,
        "procedure": procedure,
        "ingredientHeading": ing_key,
        "procedureHeading": proc_key,
    }


def fetch_batch(titles: list) -> dict:
    query = urllib.parse.urlencode({
        "action": "query",
        "format": "json",
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "redirects": "1",
        "titles": "|".join(titles),
    })
    req = urllib.request.Request(API + "?" + query, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    pages = data.get("query", {}).get("pages", {})
    out = {}
    for page in pages.values():
        title = page.get("title")
        revs = page.get("revisions") or []
        if not title or not revs:
            continue
        slot = (revs[0].get("slots") or {}).get("main") or {}
        content = slot.get("content") or slot.get("*") or revs[0].get("*") or ""
        out[title] = content
    # redirects: map from original
    for redir in data.get("query", {}).get("redirects", []) or []:
        if redir.get("to") in out and redir.get("from"):
            out[redir["from"]] = out[redir["to"]]
    return out


def main() -> None:
    mapping = json.loads(MAP.read_text())
    titles = []
    for row in mapping.values():
        for page in row.get("pages") or []:
            if page not in titles:
                titles.append(page)
    RAW.mkdir(parents=True, exist_ok=True)
    parsed = {}
    if PARSED.exists():
        parsed = json.loads(PARSED.read_text())
    pending = []
    for title in titles:
        safe = title.replace("/", "_")
        path = RAW / (safe + ".wiki")
        if path.exists() and path.stat().st_size > 40 and title in parsed:
            continue
        pending.append(title)
    print(f"titles={len(titles)} pending={len(pending)}")
    for i in range(0, len(pending), 12):
        batch = pending[i:i + 12]
        got = fetch_batch(batch)
        print(f"batch {i//12+1} requested={len(batch)} got={len(got)}")
        for title in batch:
            text = got.get(title, "")
            safe = title.replace("/", "_")
            (RAW / (safe + ".wiki")).write_text(text)
            if not text:
                print("  EMPTY", title)
                continue
            parsed[title] = parse_page(title, text)
            item = parsed[title]
            print(f"  {title}: ing={len(item['ingredients'])} steps={len(item['procedure'])}")
        PARSED.write_text(json.dumps(parsed, indent=2, ensure_ascii=False) + "\n")
        time.sleep(1.0)
    missing = [t for t in titles if t not in parsed or not parsed[t]["ingredients"]]
    print("missing_or_no_ingredients", len(missing))
    for t in missing:
        print(" ", t)


if __name__ == "__main__":
    main()
