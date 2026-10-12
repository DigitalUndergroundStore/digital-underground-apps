import assert from "node:assert/strict";
import test from "node:test";
import {
  WIKI_API,
  cardsFromApi,
  classifyPage,
  cookbookTitleFromUrl,
  cookbookUrl,
  createRateLimiter,
  minutesFromWikitext,
  parseCookbookPage,
  safeThumb,
  sanitizeQuery,
  searchParams,
  servingsFromWikitext,
} from "./cookbook.js";
import { handleRecipeSearch } from "../api/recipe-search.js";
import { handleRecipeWikibooks } from "../api/recipe-wikibooks.js";

const SHAKSHUKA = `__NOTOC__
{{Cookbook recipe
| yield = 4 servings
| time = 35 minutes
| difficulty = Easy
}}
'''Shakshuka''' is eggs poached in tomato sauce.

== Ingredients ==
* 3 tablespoons olive oil
* 1 large onion, diced
* 4 eggs

== Procedure ==
# Heat the oil and cook the onion.
# Crack in the eggs and cover until set.
`;

const COOKIES = `{{recipesummary
| Servings = 10
| Time = Prep: 20 minutes<br>Cooking: 12 minutes<br>Total: 32 minutes
| Image = [[Image:Chocolate chip cookies.jpg|300px]]
}}
{{recipe}}
==Ingredients==
* 2 sticks butter, softened
* 2 cups chocolate chips
==Procedure==
# Heat the oven.
# Drop the dough by tablespoons.
`;

const LASAGNE = `{{cookdp}} | [[Cookbook:Cuisine of Italy|Cuisine of Italy]]
There are multiple recipes for lasagne:
* [[Cookbook:Lasagne I|Lasagne I]]
* [[Cookbook:Spinach and Ricotta Lasagna|Spinach lasagna]]
`;

const TIKKA_LEAD = `{{recipesummary
| servings = 4
| time = 1 hour
}}
{{recipe}}
This is a curry.
`;

test("sanitizeQuery strips search operators and markup", () => {
  assert.equal(sanitizeQuery("  shakshuka  "), "shakshuka");
  assert.equal(sanitizeQuery("pie incategory:Recipes deepcategory:Foo"), "pie");
  assert.equal(sanitizeQuery("{{chicken}} <soup>"), "chicken soup");
  assert.equal(sanitizeQuery("a".repeat(120)).length <= 80, true);
  assert.equal(sanitizeQuery("a"), "a");
});

test("cookbook URLs stay on the Cookbook namespace", () => {
  assert.equal(
    cookbookTitleFromUrl("https://en.wikibooks.org/wiki/Cookbook:Shakshuka"),
    "Cookbook:Shakshuka"
  );
  assert.equal(
    cookbookTitleFromUrl("https://en.wikibooks.org/wiki/Cookbook:Ph%E1%BB%9F_G%C3%A0"),
    "Cookbook:Phở Gà"
  );
  assert.equal(cookbookTitleFromUrl("https://en.wikipedia.org/wiki/Cookbook:Shakshuka"), null);
  assert.equal(cookbookTitleFromUrl("http://en.wikibooks.org/wiki/Cookbook:Shakshuka"), null);
  assert.equal(cookbookTitleFromUrl("https://user:pass@en.wikibooks.org/wiki/Cookbook:Shakshuka"), null);
  assert.equal(cookbookTitleFromUrl("https://en.wikibooks.org/wiki/Main_Page"), null);
  assert.equal(cookbookTitleFromUrl("https://169.254.169.254/latest/meta-data"), null);
  assert.match(cookbookUrl("Cookbook:Chicken Soup I"), /^https:\/\/en\.wikibooks\.org\/wiki\/Cookbook:/);
});

test("minutes and servings come from the summary, preferring total", () => {
  assert.equal(minutesFromWikitext(SHAKSHUKA), 35);
  assert.equal(minutesFromWikitext(COOKIES), 32);
  assert.equal(minutesFromWikitext(TIKKA_LEAD), 60);
  assert.equal(servingsFromWikitext(SHAKSHUKA), 4);
  assert.equal(servingsFromWikitext(COOKIES), 10);
  assert.equal(servingsFromWikitext("no time here"), null);
});

test("parseCookbookPage builds a schema.org Recipe and lists variants", () => {
  const recipePage = parseCookbookPage({
    title: "Cookbook:Shakshuka",
    canonicalurl: "https://en.wikibooks.org/wiki/Cookbook:Shakshuka",
    revisions: [{ content: SHAKSHUKA }],
  });
  assert.equal(recipePage.kind, "recipe");
  assert.equal(recipePage.recipe["@type"], "Recipe");
  assert.equal(recipePage.recipe.name, "Shakshuka");
  assert.equal(recipePage.recipe.totalTime, "PT35M");
  assert.equal(recipePage.recipe.recipeYield, "4");
  assert.deepEqual(recipePage.recipe.recipeIngredient[0], "3 tablespoons olive oil");
  assert.equal(recipePage.recipe.recipeInstructions[0].text, "Heat the oil and cook the onion.");

  const cookies = parseCookbookPage({
    title: "Cookbook:Chocolate Chip Cookies I",
    revisions: [{ slots: { main: { content: COOKIES } } }],
  });
  assert.equal(cookies.recipe.totalTime, "PT32M");
  assert.match(cookies.recipe.image, /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);

  const list = parseCookbookPage({
    title: "Cookbook:Lasagne",
    revisions: [{ content: LASAGNE }],
  });
  assert.equal(list.kind, "list");
  assert.equal(list.results.length, 2);
  assert.equal(list.results[0].source, "Wikibooks Cookbook");
  assert.match(list.results[0].url, /Cookbook:Lasagne_I$/);

  assert.equal(classifyPage("Cookbook:Cuisine of Italy", ""), "skip");
  assert.equal(classifyPage("Cookbook:Spaghetti", "{{Ingredient summary}}\n{{Ingredient}}"), "skip");
});

test("search cards drop non-recipes and keep thumbs on Wikimedia hosts", () => {
  const cards = cardsFromApi({
    query: {
      pages: [
        {
          index: 2,
          title: "Cookbook:Cuisine of Italy",
          canonicalurl: "https://en.wikibooks.org/wiki/Cookbook:Cuisine_of_Italy",
          revisions: [{ content: "overview" }],
        },
        {
          index: 1,
          title: "Cookbook:Shakshuka",
          canonicalurl: "http://en.wikibooks.org/wiki/Cookbook:Shakshuka",
          thumbnail: { source: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a.jpg/320px-a.jpg" },
          revisions: [{ content: TIKKA_LEAD }],
        },
      ],
    },
  });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, "Shakshuka");
  assert.equal(cards[0].url.startsWith("https://"), true);
  assert.equal(cards[0].minutes, 60);
  assert.equal(cards[0].license, "CC BY-SA 4.0");
  assert.equal(safeThumb("http://upload.wikimedia.org/a.jpg"), "");
  assert.equal(safeThumb("https://evil.example/a.jpg"), "");
});

test("search params only target the Wikibooks API", () => {
  const params = searchParams("chicken soup", 10, true);
  const url = new URL(WIKI_API + "?" + params.toString());
  assert.equal(url.hostname, "en.wikibooks.org");
  assert.equal(url.pathname, "/w/api.php");
  assert.match(url.searchParams.get("gsrsearch"), /chicken soup deepcategory:Recipes/);
  assert.equal(url.searchParams.get("gsrnamespace"), "102");
  assert.equal(url.searchParams.get("gsroffset"), "10");
  assert.equal(searchParams("x", 0, true), null);
});

test("rate limiter eventually refuses", () => {
  const check = createRateLimiter(2, 60_000);
  assert.equal(check("1.2.3.4"), true);
  assert.equal(check("1.2.3.4"), true);
  assert.equal(check("1.2.3.4"), false);
  assert.equal(check("5.6.7.8"), true);
});

function post(url, body, ip) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip || "203.0.113.9",
    },
    body: JSON.stringify(body),
  });
}

test("recipe-search validates input and maps a fixture payload", async () => {
  const bad = await handleRecipeSearch(post("https://digitalundergroundstore.com/api/recipe-search", { query: "a" }), async () => {
    throw new Error("should not fetch");
  });
  assert.equal(bad.status, 400);

  const wrong = await handleRecipeSearch(new Request("https://example.com/api/recipe-search", { method: "GET" }), async () => {
    throw new Error("should not fetch");
  });
  assert.equal(wrong.status, 405);

  const payload = {
    query: {
      pages: [
        {
          index: 1,
          title: "Cookbook:Shakshuka",
          canonicalurl: "https://en.wikibooks.org/wiki/Cookbook:Shakshuka",
          revisions: [{ content: SHAKSHUKA }],
          thumbnail: { source: "//upload.wikimedia.org/wikipedia/commons/thumb/a/a.jpg/320px-a.jpg" },
        },
      ],
    },
    continue: { gsroffset: 10 },
  };
  const ok = await handleRecipeSearch(
    post("https://digitalundergroundstore.com/api/recipe-search", { query: "shakshuka" }, "203.0.113.10"),
    async (url) => {
      assert.equal(new URL(url).hostname, "en.wikibooks.org");
      return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  );
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.results[0].title, "Shakshuka");
  assert.equal(body.results[0].minutes, 35);
  assert.match(body.results[0].image, /^https:\/\/upload\.wikimedia\.org\//);
  assert.equal(body.nextOffset, 10);
  assert.equal(body.results[0].recipeIngredient, undefined);
});

test("recipe-wikibooks rejects other hosts and returns one recipe", async () => {
  const denied = await handleRecipeWikibooks(
    post("https://digitalundergroundstore.com/api/recipe-wikibooks", { url: "https://example.com/recipe" }, "203.0.113.11"),
    async () => {
      throw new Error("should not fetch");
    }
  );
  assert.equal(denied.status, 400);

  const ok = await handleRecipeWikibooks(
    post(
      "https://digitalundergroundstore.com/api/recipe-wikibooks",
      { url: "https://en.wikibooks.org/wiki/Cookbook:Shakshuka" },
      "203.0.113.12"
    ),
    async (url) => {
      const parsed = new URL(url);
      assert.equal(parsed.hostname, "en.wikibooks.org");
      assert.equal(parsed.searchParams.get("titles"), "Cookbook:Shakshuka");
      return new Response(JSON.stringify({
        query: {
          pages: [{
            title: "Cookbook:Shakshuka",
            canonicalurl: "https://en.wikibooks.org/wiki/Cookbook:Shakshuka",
            revisions: [{ content: SHAKSHUKA }],
          }],
        },
      }), { status: 200 });
    }
  );
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.recipe.name, "Shakshuka");
  assert.equal(body.license, "CC BY-SA 4.0");
  assert.equal(body.recipe.wikitext, undefined);

  const list = await handleRecipeWikibooks(
    post(
      "https://digitalundergroundstore.com/api/recipe-wikibooks",
      { url: "https://en.wikibooks.org/wiki/Cookbook:Lasagne" },
      "203.0.113.13"
    ),
    async () => new Response(JSON.stringify({
      query: { pages: [{ title: "Cookbook:Lasagne", revisions: [{ content: LASAGNE }] }] },
    }), { status: 200 })
  );
  const listed = await list.json();
  assert.equal(listed.disambiguation, true);
  assert.equal(listed.results.length, 2);
});
