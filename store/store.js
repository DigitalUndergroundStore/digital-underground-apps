/* Storefront filters. All product cards are in the HTML; this only shows a page of matches. */
(function () {
  var PER_PAGE = 9;
  var CATS = {
    all: "All products",
    featured: "Featured",
    freelance: "Freelance",
    focus: "Focus & life",
    ai: "AI tools",
    apps: "Apps",
    bundles: "Bundles",
    books: "Books & stories",
    free: "Free downloads"
  };
  var grid = document.getElementById("product-grid");
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
  var empty = document.getElementById("empty-state");
  var countEl = document.getElementById("results-count");
  var titleEl = document.getElementById("section-title");
  var metaEl = document.getElementById("section-meta");
  var pag = document.getElementById("pagination");
  var search = document.getElementById("search");
  var activeCat = "all";
  var activePrice = "all";
  var searchQuery = "";
  var currentPage = 1;

  function catFromHash() {
    var h = (location.hash || "").replace(/^#/, "");
    return Object.prototype.hasOwnProperty.call(CATS, h) && h !== "all" ? h : null;
  }

  function matches(card) {
    var cats = (card.getAttribute("data-cats") || "").split(/\s+/);
    var catOk = activeCat === "all" || cats.indexOf(activeCat) !== -1;
    var isFree = card.getAttribute("data-free") === "1";
    var priceOk = activePrice === "all" || (activePrice === "free" ? isFree : !isFree);
    var q = searchQuery;
    var searchOk = !q || (card.getAttribute("data-search") || "").indexOf(q) !== -1;
    return catOk && priceOk && searchOk;
  }

  function renderPagination(totalPages) {
    pag.innerHTML = "";
    if (totalPages <= 1) return;
    var info = document.createElement("div");
    info.className = "page-info";
    info.textContent = "Page " + currentPage + " of " + totalPages;
    pag.appendChild(info);
    function addBtn(label, page, opts) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "page-btn" + (opts.active ? " active" : "") + (opts.gap ? " page-gap" : "");
      b.textContent = label;
      if (opts.gap) b.tabIndex = -1;
      if (opts.disabled) b.disabled = true;
      if (opts.current) b.setAttribute("aria-current", "page");
      if (!opts.gap && !opts.disabled) {
        b.addEventListener("click", function () {
          currentPage = page;
          render(false);
          var cat = document.getElementById("catalog");
          if (cat) cat.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      pag.appendChild(b);
    }
    addBtn("←", Math.max(1, currentPage - 1), { disabled: currentPage === 1 });
    var pages = [];
    var windowSize = 2;
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - windowSize && i <= currentPage + windowSize)) pages.push(i);
      else if (pages[pages.length - 1] !== "…") pages.push("…");
    }
    pages.forEach(function (p) {
      if (p === "…") addBtn("…", 0, { gap: true });
      else addBtn(String(p), p, { active: p === currentPage, current: p === currentPage });
    });
    addBtn("→", Math.min(totalPages, currentPage + 1), { disabled: currentPage === totalPages });
  }

  function render(keepPage) {
    if (!keepPage) currentPage = currentPage || 1;
    var list = cards.filter(matches);
    var total = list.length;
    var totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * PER_PAGE;
    var visible = {};
    list.slice(start, start + PER_PAGE).forEach(function (card) { visible[card.getAttribute("data-page")] = true; });
    cards.forEach(function (card) {
      var show = !!visible[card.getAttribute("data-page")] && list.indexOf(card) !== -1;
      card.classList.toggle("is-hidden", !show);
    });
    grid.classList.remove("is-pending");
    titleEl.textContent = CATS[activeCat] || "Products";
    metaEl.textContent = total === 0 ? "" : total + " item" + (total === 1 ? "" : "s");
    countEl.textContent = total === 0 ? "No results" : "Showing " + (start + 1) + "–" + Math.min(start + PER_PAGE, total) + " of " + total;
    empty.hidden = total !== 0;
    document.querySelectorAll("[data-note]").forEach(function (el) {
      el.hidden = el.getAttribute("data-note") !== activeCat;
    });
    renderPagination(totalPages);
  }

  function setCat(cat, fromHash) {
    activeCat = CATS[cat] ? cat : "all";
    currentPage = 1;
    document.querySelectorAll(".cat-btn[data-cat]").forEach(function (b) {
      var on = b.getAttribute("data-cat") === activeCat;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (!fromHash) {
      var next = activeCat === "all" ? location.pathname + location.search : "#" + activeCat;
      history.replaceState(null, "", next);
    }
    render(true);
  }

  document.querySelectorAll(".cat-btn[data-cat]").forEach(function (btn) {
    btn.addEventListener("click", function () { setCat(btn.getAttribute("data-cat"), false); });
  });
  document.querySelectorAll(".pill[data-price]").forEach(function (pill) {
    pill.addEventListener("click", function () {
      document.querySelectorAll(".pill[data-price]").forEach(function (p) { p.classList.remove("active"); });
      pill.classList.add("active");
      activePrice = pill.getAttribute("data-price");
      currentPage = 1;
      render(true);
    });
  });
  var searchTimer;
  if (search) {
    search.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchQuery = (search.value || "").toLowerCase().trim();
        currentPage = 1;
        render(true);
      }, 180);
    });
  }
  window.addEventListener("hashchange", function () {
    var hashed = catFromHash();
    if (hashed) setCat(hashed, true);
  });

  var mobileBar = document.querySelector(".mobile-bar");
  var catalog = document.getElementById("catalog");
  if (mobileBar && catalog && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (window.innerWidth > 639) return;
        mobileBar.style.display = entry.isIntersecting ? "none" : "block";
      });
    }, { threshold: 0.08 });
    io.observe(catalog);
  }

  function pinCatBar() {
    var header = document.querySelector("header.dun");
    var bar = document.querySelector(".cat-bar");
    if (!header || !bar) return;
    bar.style.top = Math.round(header.getBoundingClientRect().height) + "px";
  }
  pinCatBar();
  window.addEventListener("resize", pinCatBar);

  var initial = catFromHash();
  if (initial) setCat(initial, true);
  else render(true);
})();
