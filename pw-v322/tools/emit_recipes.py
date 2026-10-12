#!/usr/bin/env python3
"""Write recipes.js, recipes-extra.js, recipes-batch1.js, recipes-batch2.js."""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
JS = ROOT / "jhagho" / "js"
BATCHES = [
    ROOT / "tools" / "adapted" / "r001-r062.json",
    ROOT / "tools" / "adapted" / "r063-r124.json",
    ROOT / "tools" / "adapted" / "r125-r186.json",
    ROOT / "tools" / "adapted" / "r187-r248.json",
]


def dump(recipes):
    return json.dumps(recipes, indent=2, ensure_ascii=False)


def main() -> None:
    recipes = []
    for path in BATCHES:
        recipes.extend(json.loads(path.read_text()))
    by_id = {r["id"]: r for r in recipes}
    ordered = [by_id[f"r{n}"] for n in range(1, 249)]
    groups = [
        (JS / "recipes.js", ordered[:36],
         "/* Pantry Week v3.5 — starter recipes r1–r36, rebuilt from open-licence sources */\n\"use strict\";\n\nvar PW_STARTERS = ",
         ";\n"),
        (JS / "recipes-extra.js", ordered[36:126],
         "/* Pantry Week — expanded library r37–r126, rebuilt from open-licence sources */\n\"use strict\";\n(function () {\n  if (typeof PW_STARTERS === 'undefined') return;\n  var extra = ",
         ";\n  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);\n})();\n"),
        (JS / "recipes-batch1.js", ordered[126:200],
         "/* Pantry Week — batch 1 library r127–r200, rebuilt from open-licence sources */\n\"use strict\";\n(function () {\n  if (typeof PW_STARTERS === 'undefined') return;\n  var extra = ",
         ";\n  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);\n})();\n"),
        (JS / "recipes-batch2.js", ordered[200:],
         "/* Pantry Week — batch 2 library r201–r248, rebuilt from open-licence sources */\n\"use strict\";\n(function () {\n  if (typeof PW_STARTERS === 'undefined') return;\n  var extra = ",
         ";\n  for (var i = 0; i < extra.length; i++) PW_STARTERS.push(extra[i]);\n})();\n"),
    ]
    for path, group, head, tail in groups:
        path.write_text(head + dump(group) + tail)
        print(path.name, len(group))


if __name__ == "__main__":
    main()
