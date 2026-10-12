# Adapt one Pantry Week recipe from its fetched source

Write original wording. Do not paste source sentences. Do not reuse any run of 8 or more words from that page's procedure lines.

Use only foods that appear in the parsed ingredient lines for the cited pages. You may choose one side of an "or". You may drop optional fillings that the dish does not need. You may not add a food the source does not list, except salt, pepper, oil, or water when the method cannot work without them — then say so in `attribution.note`.

If the source left salt, pepper, or oil unmeasured, set a real amount (`1 tsp` salt, `1/2 tsp` black pepper, `1 tbsp` oil) and mention that in the note.

Every ingredient needs `qty` (a number) and `unit` (`cup`, `tbsp`, `tsp`, `oz`, `lb`, `g`, `kg`, `ml`, `l`, `clove`, `can`, `slice`, `piece`, `fillet`, `pinch`, `dash`, `medium`, `large`, `small`, `whole`, `link`, `leaf`, `strip`, `breast`, `thigh`, `chop`, `wing`, `stalk`, `sprig`, `bunch`, `head`, `ear`, `stick`, `package`). Put prep words in the step, not in a unitless item. `4 cloves garlic, minced` becomes `{qty:4, unit:"clove", item:"garlic"}` and the step says "mince".

Scale the source to the existing recipe's servings when the source yield is far from it. Record the scale in the note.

Write 6 to 10 steps. Each step names the ingredients it uses. Together the steps use every ingredient. Order is prep, then cook. Include heat, time, and a doneness cue.

Safe internal temperatures, both scales, even if the source is vague or uses an unsafe low oven:

- poultry: 165°F (74°C)
- ground meat and meatloaf: 160°F (71°C)
- pork chops, pork tenderloin, fish, shrimp: 145°F (63°C); rest pork 3 minutes
- steak: cook to the doneness you state, then rest

If the current title names a food the chosen ingredients do not contain, rename the recipe to the source dish (drop the `Cookbook:` prefix). Keep `newName` from the source map when it is set. Do not cite a page and then cook a different dish.

`libraryRev` is `2` on every recipe.

Attribution for a sourced recipe:

```json
{
  "sourceTitle": "Cookbook:Roast Chicken",
  "sourceUrl": "https://en.wikibooks.org/wiki/Cookbook:Roast_Chicken",
  "licence": "CC BY-SA 4.0",
  "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
  "adapted": true,
  "original": false,
  "note": "What you changed.",
  "sources": [
    {
      "title": "Cookbook:Roast Chicken",
      "url": "https://en.wikibooks.org/wiki/Cookbook:Roast_Chicken",
      "licence": "CC BY-SA 4.0",
      "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
    }
  ]
}
```

Copy URLs from `tools/source-map.json`. When there are two pages, `sourceTitle` joins them with ` and `, `sourceUrl` is the first URL, and `sources` has both.

Originals (`original: true` in the map) have no page. Write a standard home version of that exact dish. Set `licence` to `original`, `adapted` false, `original` true, `sources` to `[]`, `sourceTitle` and `sourceUrl` and `licenceUrl` to `""`, and keep the map's note. Do not invent a URL.

Tags: keep meal slots (`breakfast`, `lunch`, `dinner`, `snack`, `dessert`), `canadian`, `classic`, and any `collection-*` from the old recipe when they still fit. Recompute diet tags from the ingredients you actually used:

- `vegetarian`: no meat, poultry, fish, seafood, gelatin, anchovy, fish sauce, or meat broth
- `vegan`: vegetarian, and no egg, dairy, honey, mayonnaise, or ghee
- `gluten-free`: no wheat, flour, bread, pasta, noodles, soy sauce, barley, beer, couscous, orzo, pita, tortilla, bun, or breadcrumbs. Tamari and corn tortillas are fine.
- `dairy-free`: no milk, cream, butter, cheese, yogurt, or ghee

Drop `high-protein`. Keep `budget`, `moderate`, or `splurge` when the old one still fits. `easy` only when `minutes` is 30 or less.

`minutes` is the realistic total, including a long braise and excluding an optional overnight marinade (mention the marinade in a step and in the note, and do not pretend the total is 10 minutes).

Keep `photoKey` only when the old recipe has one.

Banned step phrases: "as listed", "main ingredient", "any sides", "if the recipe calls", "protein as needed", "Serve hot" as a whole step, "vegetables or seafood".
