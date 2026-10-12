import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

async function load(rel) {
  return import(pathToFileURL(path.join(dir, rel)).href);
}

const search = await load("../_lib/cookbook-search.js");
const wiki = await load("../_lib/wiki-recipe.js");
const wm = await load("../_lib/wikimedia-api.js");
let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

check("strips the word recipe", search.sanitizeDishQuery("pork chops onion mustard recipe") === "pork chops onion mustard");
check("rejects an empty query", search.sanitizeDishQuery("   recipe  ") === "");
const pages = [
  {
    title: "Cookbook:Pork Chops Cacciatore",
    fullurl: "https://en.wikibooks.org/wiki/Cookbook:Pork_Chops_Cacciatore",
    extract: "A weeknight pork chop. About 45 minutes.",
    thumbnail: { source: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a.jpg" }
  },
  { title: "Not a cookbook", fullurl: "https://example.com/nope", extract: "secret recipe body should not leak" },
  { title: "Cookbook:Pork", missing: true }
];
const shaped = search.shapeCookbookPages(pages);
check("one cookbook hit", shaped.length === 1);
check("title without the namespace", shaped[0].title === "Pork Chops Cacciatore");
check("minutes from the intro", shaped[0].minutes === 45);
check("source and license", shaped[0].source === "Wikibooks" && shaped[0].license === "CC BY-SA");
check("extract is not returned", shaped[0].extract == null);
check("search url stays on wikibooks", search.wikibooksSearchUrl("pork chops").startsWith("https://en.wikibooks.org/w/api.php"));

const title = wiki.cookbookTitleFromUrl("https://en.wikibooks.org/wiki/Cookbook:Pork_Chops_Cacciatore");
check("cookbook title", title === "Cookbook:Pork Chops Cacciatore");
check("other hosts are not cookbook pages", wiki.cookbookTitleFromUrl("https://example.com/wiki/Cookbook:Pork") === "");
const sample = `{{Recipe summary
| Category = Pork recipes
| Time = 45 minutes
| Servings = 4
}}

{{recipe}}

==Ingredients==
*6 [[Cookbook:Each|ea]]. boneless [[Cookbook:Pork|pork chops]]
*1 medium [[Cookbook:Onion|onion]], peeled
*15 [[Cookbook:Milliliter|ml]] [[Cookbook:Olive Oil|olive oil]]

==Procedure==
# Slice onion into half-rings.
# Brown the pork chops on both sides.
`;
const recipe = wiki.wikiToSchema(title, sample, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a.jpg");
check("schema name", recipe && recipe.name === "Pork Chops Cacciatore");
check("ingredients parsed", recipe.recipeIngredient.length === 3 && /pork chops/.test(recipe.recipeIngredient[0]));
check("steps parsed", recipe.recipeInstructions.length === 2);
check("time and yield", recipe.totalTime === "PT45M" && recipe.recipeYield === "4");
check("image kept", recipe.image.indexOf("https://") === 0);
check("page without a recipe is skipped", wiki.wikiToSchema("Cookbook:Pork", "==Notes==\nJust a category page.") == null);

check("allowlist: Wikibooks API", wm.isAllowedWikimediaApiUrl("https://en.wikibooks.org/w/api.php?action=query"));
check("allowlist: rejects http", !wm.isAllowedWikimediaApiUrl("http://en.wikibooks.org/w/api.php"));
check("allowlist: rejects lookalike host", !wm.isAllowedWikimediaApiUrl("https://en.wikibooks.org.evil.com/w/api.php"));
check("allowlist: rejects userinfo/port", !wm.isAllowedWikimediaApiUrl("https://x@en.wikibooks.org/w/api.php") && !wm.isAllowedWikimediaApiUrl("https://en.wikibooks.org:8443/w/api.php"));
check("allowlist: rejects metadata IP", !wm.isAllowedWikimediaApiUrl("https://169.254.169.254/w/api.php"));
check("allowlist: rejects non-API path", !wm.isAllowedWikimediaApiUrl("https://en.wikibooks.org/wiki/Cookbook:Lasagna"));
check("search URL is allowlisted", wm.isAllowedWikimediaApiUrl(search.wikibooksSearchUrl("x&host=evil.com")));
check("thumbnail: only https upload.wikimedia.org", wm.safeWikimediaImage("https://upload.wikimedia.org/a.jpg") && !wm.safeWikimediaImage("http://169.254.169.254/x.jpg"));
check("title: other host rejected", wiki.cookbookTitleFromUrl("https://evil.com/wiki/Cookbook:Lasagna") === "");
if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("function checks passed");
