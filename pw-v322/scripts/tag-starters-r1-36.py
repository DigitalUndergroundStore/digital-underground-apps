#!/usr/bin/env python3
"""Add cost/difficulty tags to r1–r36 if missing."""
import json
import re
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "jhagho" / "js" / "recipes.js"
text = path.read_text(encoding="utf-8")
m = re.search(r"var PW_STARTERS = (\[.*\]);", text, re.S)
if not m:
    raise SystemExit("parse fail")
recipes = json.loads(m.group(1))
for r in recipes:
    tags = list(dict.fromkeys(r.get("tags") or []))
    mins = r.get("minutes") or 30
    if not any(t in tags for t in ("easy", "medium", "hard")):
        tags.append("easy" if mins <= 22 else "medium" if mins <= 32 else "hard")
    if not any(t in tags for t in ("budget", "moderate", "splurge")):
        tags.append("moderate")
    r["tags"] = tags
new_body = "var PW_STARTERS = " + json.dumps(recipes, indent=2, ensure_ascii=False) + ";"
path.write_text(text[: m.start(1) - len("var PW_STARTERS = ")] + new_body + text[m.end(1) + 1 :], encoding="utf-8")
print("Tagged", len(recipes), "starters")
