/* Find more recipes: Wikimedia Cookbook search (titles and links only) plus browser deep links. */
"use strict";

(function () {
  var OFFLINE = "Find more needs internet";

  var SITES = [
    {
      id: "web",
      name: "DuckDuckGo",
      host: "duckduckgo.com",
      blurb: "Web search for this dish",
      url: function (q) { return "https://duckduckgo.com/?q=" + encodeURIComponent(q + " recipe"); }
    },
    {
      id: "bbc",
      name: "BBC Good Food",
      host: "bbcgoodfood.com",
      blurb: "Search their recipes",
      url: function (q) { return "https://www.bbcgoodfood.com/search?q=" + encodeURIComponent(q); }
    },
    {
      id: "allrecipes",
      name: "Allrecipes",
      host: "allrecipes.com",
      blurb: "Search their recipes",
      url: function (q) { return "https://www.allrecipes.com/search?q=" + encodeURIComponent(q); }
    },
    {
      id: "serious",
      name: "Serious Eats",
      host: "seriouseats.com",
      blurb: "Search their recipes",
      url: function (q) { return "https://www.seriouseats.com/search?q=" + encodeURIComponent(q); }
    },
    {
      id: "budget",
      name: "Budget Bytes",
      host: "budgetbytes.com",
      blurb: "Search their recipes",
      url: function (q) { return "https://www.budgetbytes.com/?s=" + encodeURIComponent(q); }
    },
    {
      id: "recipetin",
      name: "RecipeTin Eats",
      host: "recipetineats.com",
      blurb: "Search their recipes",
      url: function (q) { return "https://www.recipetineats.com/?s=" + encodeURIComponent(q); }
    },
    {
      id: "minimalist",
      name: "Minimalist Baker",
      host: "minimalistbaker.com",
      blurb: "Search their recipes",
      url: function (q) { return "https://minimalistbaker.com/?s=" + encodeURIComponent(q); }
    },
    {
      id: "kingarthur",
      name: "King Arthur Baking",
      host: "kingarthurbaking.com",
      blurb: "Search their recipes",
      url: function (q) { return "https://www.kingarthurbaking.com/search?q=" + encodeURIComponent(q); }
    }
  ];

  function cleanQuery(query) {
    var q = String(query || "").replace(/\s+/g, " ").trim();
    if (q.length > 120) q = q.slice(0, 120).trim();
    return q;
  }

  function browseLinks(query) {
    var q = cleanQuery(query);
    if (!q) return [];
    return SITES.map(function (site) {
      return {
        id: site.id,
        name: site.name,
        host: site.host,
        blurb: site.blurb,
        url: site.url(q)
      };
    });
  }

  function apiPath(path) {
    var host = "";
    var proto = "";
    try {
      host = String(location.hostname || "");
      proto = String(location.protocol || "");
    } catch (err) { /* no location */ }
    if (/^https?:$/i.test(proto) && (/digitalundergroundstore\.com/i.test(host) || /\.digital-underground\.pages\.dev$/i.test(host) || host === "localhost" || host === "127.0.0.1")) {
      return path;
    }
    return "https://digitalundergroundstore.com" + path;
  }

  function search(query, options) {
    options = options || {};
    var q = cleanQuery(query);
    if (!q) return Promise.reject(new Error("Type a dish to search."));
    return fetch(apiPath("/api/recipe-search"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: q }),
      signal: options.signal
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) {
          var err = new Error(body && body.error ? body.error : "Recipe search is unavailable right now.");
          err.results = body && body.results ? body.results : [];
          throw err;
        }
        return body || { results: [] };
      });
    });
  }

  function browserOnline() {
    try {
      return navigator.onLine !== false;
    } catch (err) {
      return true;
    }
  }

  window.PW_FIND = {
    OFFLINE: OFFLINE,
    sites: SITES,
    cleanQuery: cleanQuery,
    browseLinks: browseLinks,
    search: search,
    apiPath: apiPath,
    browserOnline: browserOnline
  };
})();
