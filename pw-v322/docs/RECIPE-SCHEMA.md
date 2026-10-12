# Pantry Week recipe schema

Built-in recipes stay backward compatible. `id`, `name`, `minutes`, `servings`, `tags`, `ingredients`, `steps`, `photoKey`, and `photoUrl` keep their current meaning. New fields are optional for hand-entered recipes and required for library recipes (`r1` onward).

`normalizeRecipe()` in `js/pantry.js` keeps these fields. Unknown keys are still dropped.

## Attribution (shared with the library agent)

Every library recipe carries an `attribution` object. The library agent (recipes from `r249`) must use the same shape.

```json
{
  "sourceTitle": "Cookbook:Roast Chicken",
  "sourceUrl": "https://en.wikibooks.org/wiki/Cookbook:Roast_Chicken",
  "licence": "CC BY-SA 4.0",
  "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
  "adapted": true,
  "original": false,
  "note": "Scaled to 6 servings. Internal temperature added.",
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

| Field | Required | Meaning |
| --- | --- | --- |
| `sourceTitle` | yes, unless `original` | Title of the primary source, as published |
| `sourceUrl` | yes, unless `original` | Canonical URL of that source |
| `licence` | yes | See the allow-list below. Originals use `original` |
| `licenceUrl` | when the licence has a URL | Link to the licence deed |
| `adapted` | yes | `true` when wording, scale, doneness temperatures, or method differ from the source |
| `original` | yes | `true` only when no permissible source exists. `adapted` is then `false` |
| `note` | yes | What changed, or why no source was used |
| `sources` | yes | One entry per work. Empty array when `original` is `true` |

`sourceTitle`, `sourceUrl`, `licence`, and `licenceUrl` mirror `sources[0]`.

Allowed `licence` values:

- `CC BY-SA 4.0` (Wikibooks Cookbook)
- `CC BY 4.0` and other `CC BY` versions
- `CC0`
- `public domain` (Project Gutenberg cookbooks, USDA MyPlate Kitchen, other US government work)
- `Open Government Licence - Canada`
- `original`

Do not cite commercial sites or apps. Do not invent a URL. A recipe is sourced only when the page was fetched and the ingredients and method come from that text. Wording is rewritten; source prose is not pasted into `steps`.

The recipe screen prints **Adapted from {title}** (or **From {title}** when `adapted` is false). Each title links to `sourceUrl` and shows the licence. Originals print: **Original Pantry Week recipe — no open-licence source found.**

## Library revision

`libraryRev` is an integer on each built-in recipe. Bump it when starter text changes. On load, a saved copy of that id is replaced with the starter unless `userEdited` is true. Saving from the editor sets `userEdited` so a household edit is kept.

## Ingredients and steps

```json
{ "qty": 1.5, "unit": "lb", "item": "chicken thighs" }
```

`unit` is required. Count nouns use `medium`, `large`, `small`, `whole`, `clove`, `slice`, `link`, `leaf`, `strip`, `piece`, `fillet`, `breast`, `thigh`, `chop`, or `wing`. The shopping line shows imperial with a metric equivalent (or the reverse when the amount is already metric).

Steps are complete sentences that name the ingredients they use. A typical recipe has 6–10 steps, with temperatures in both °F and °C and a doneness cue for meat, poultry, and fish.

## Tags

Keep meal slots (`breakfast`, `lunch`, `dinner`, `snack`, `dessert`), `canadian`, `classic`, and `collection-*` labels. Diet tags (`vegetarian`, `vegan`, `gluten-free`, `dairy-free`, and later `low-carb`, `high-protein`, `kid-friendly`) are derived by rule from the ingredient list and nutrition, not copied from an old draft.

## Later enrichment fields

These are reserved and must also survive `normalizeRecipe()` once they are filled:

- `nutrition` — per serving, estimated: `kcal`, `proteinG`, `carbsG`, `fatG`, `fibreG`, `sodiumMg`, plus `basis: "estimated"` and the dataset id
- `allergens` — Canada priority allergens actually present
- `prepMinutes`, `cookMinutes` — `minutes` remains the total active-plus-cook time the planner uses
- `difficulty` — `easy`, `medium`, or `hard`
- `equipment` — string array
- `costTier` — `budget`, `moderate`, or `splurge`
- `freezerFriendly` — boolean
- `leftovers` — short string
