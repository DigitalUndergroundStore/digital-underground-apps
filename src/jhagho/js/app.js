/* Pantry Week v3.8.0 — interface. Runs from file:// with no build. */
"use strict";

(function () {
  const PW = window.PW;
  const PW_IMPORT = window.PW_IMPORT;
  const DIET = ["breakfast", "lunch", "dinner", "vegetarian", "vegan", "gluten-free", "dairy-free"];
  let state = PW.load();
  const esc = PW.escapeHtml;
  const TAB_ORDER = ["plan", "recipes", "shop", "pantry", "more"];
  const ICON_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6 16.88 4.29z"/></svg>';
  let suppressHash = 0;
  let navDepth = 0;
  let silentHistoryPop = 0;
  let planExitPending = false;
  let planExitTimer = null;
  const TAB_EDGE_PX = 24;
  const BUYER_LS_KEY = "du_pantry_week_key_v1";
  const FILTERS = [
    ["all", "All"],
    ["breakfast", "Breakfast"],
    ["lunch", "Lunch"],
    ["dinner", "Dinner"],
    ["canadian", "Canadian"],
    ["my-creation", "My creations"],
    ["snack", "Snacks"],
    ["dessert", "Desserts"],
    ["vegetarian", "Vegetarian"],
    ["vegan", "Vegan"],
    ["gluten-free", "Gluten-free"],
    ["dairy-free", "Dairy-free"],
    ["high-protein", "High protein"],
    ["budget", "Budget"],
    ["quick", "Quick (20 min)"],
    ["easy", "Easy"],
    ["imported", "Imported"]
  ];
  const ui = {
    view: "plan",
    detailId: null,
    query: "",
    filter: "all",
    picker: null,
    assign: null,
    editor: null,
    cook: null,
    fill: null,
    importError: "",
    import: null,
    tabAnim: null,
    smartChef: { variation: 0, servings: 4, result: null, sessionHashes: [], token: 0, loading: false },
    findMore: { query: "", status: "", results: [], links: [], linkUrl: "", token: 0, busy: false },
    pantryCook: {
      key: "",
      rows: [],
      shown: 8,
      expanded: false,
      flash: null,
      flashTimer: null,
      newIds: null,
      spotlightItem: null,
      smartChefByFp: {},
      _prevIds: null
    }
  };

  const PANTRY_COOK_TOP = 25;
  const PANTRY_COOK_PAGE = 25;
  let pantryCookFlashTimer = null;

  const $ = (id) => document.getElementById(id);

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (err) {
      return false;
    }
  }

  function iconBtn(action, label, icon) {
    return `<button type="button" class="icon-btn" data-action="${action}" aria-label="${esc(label)}">${icon}</button>`;
  }

  function modalChrome(titleId, title, backLabel) {
    return `<div class="modal-head modal-head--chrome">
      ${iconBtn("nav-back", backLabel || "Back", ICON_BACK)}
      <h2 id="${titleId}" class="modal-head__title">${esc(title)}</h2>
      ${iconBtn("nav-back", "Close", ICON_CLOSE)}
    </div>`;
  }

  function sheetGrab() {
    return `<div class="sheet-grab" data-sheet-grab="1" aria-hidden="true"></div>`;
  }

  function overlayOpen() {
    return ["tip", "picker", "assign", "editor", "cook", "textDialog", "fill"].some((id) => {
      const el = $(id);
      return el && !el.hidden;
    });
  }

  function navSnapshot() {
    return {
      view: ui.view,
      detailId: ui.detailId,
      picker: ui.picker ? PW.clone(ui.picker) : null,
      assign: ui.assign ? PW.clone(ui.assign) : null,
      editor: ui.editor ? PW.clone(ui.editor) : null,
      cook: ui.cook ? PW.clone(ui.cook) : null,
      fill: !!ui.fill,
      textDialog: $("textDialog") && !$("textDialog").hidden,
      tip: $("tip") && !$("tip").hidden
    };
  }

  function navUrl() {
    let hash = ui.view || "plan";
    if (ui.view === "recipes" && ui.detailId) hash = "recipe/" + encodeURIComponent(ui.detailId);
    return location.pathname + location.search + "#" + hash;
  }

  function restoreSnapshot(snap) {
    if (!snap) {
      readHash();
      return;
    }
    ui.view = snap.view || "plan";
    ui.detailId = snap.detailId || null;
    ui.picker = snap.picker || null;
    ui.assign = snap.assign || null;
    ui.editor = snap.editor || null;
    ui.cook = snap.cook || null;
    ui.fill = snap.fill ? true : null;
    if (!snap.textDialog) {
      $("textDialog").hidden = true;
      $("textDialog").innerHTML = "";
    }
    if (!snap.tip) $("tip").hidden = true;
    if (!snap.cook) {
      $("cook").hidden = true;
      $("cook").innerHTML = "";
      releaseWakeLock();
    }
    if (!snap.picker) $("picker").hidden = true;
    if (!snap.assign) $("assign").hidden = true;
    if (!snap.editor) $("editor").hidden = true;
    if (!snap.fill) $("fill").hidden = true;
    const hash = navUrl().split("#")[1] || "plan";
    suppressHash++;
    if (location.hash.replace(/^#/, "") !== hash) location.hash = hash;
    setTimeout(() => { suppressHash--; }, 0);
  }

  function syncHistory(replace) {
    const snap = navSnapshot();
    const url = navUrl();
    suppressHash++;
    if (replace) history.replaceState({ pw: snap }, "", url);
    else {
      history.pushState({ pw: snap }, "", url);
      navDepth += 1;
    }
    setTimeout(() => { suppressHash--; }, 0);
  }

  function pushHistory() {
    syncHistory(false);
  }

  function popHistorySilently() {
    if (navDepth > 0) {
      silentHistoryPop += 1;
      history.back();
    } else {
      syncHistory(true);
    }
  }

  function navBack() {
    if (navDepth > 0) popHistorySilently();
    else handleSystemBack();
  }

  function handleSystemBack() {
    if (!$("cook").hidden && ui.cook) {
      ui.cook = null;
      $("cook").hidden = true;
      $("cook").innerHTML = "";
      releaseWakeLock();
      setInert();
      popHistorySilently();
      render();
      return;
    }
    if (!$("editor").hidden && ui.editor) {
      ui.editor = null;
      $("editor").hidden = true;
      setInert();
      popHistorySilently();
      render();
      return;
    }
    if (!$("assign").hidden && ui.assign) {
      ui.assign = null;
      $("assign").hidden = true;
      setInert();
      popHistorySilently();
      render();
      return;
    }
    if (!$("picker").hidden && ui.picker) {
      ui.picker = null;
      $("picker").hidden = true;
      setInert();
      popHistorySilently();
      render();
      return;
    }
    if (!$("textDialog").hidden) {
      $("textDialog").hidden = true;
      setInert();
      popHistorySilently();
      return;
    }
    if (!$("fill").hidden) {
      closeFill();
      return;
    }
    if (!$("tip").hidden) {
      dismissTip();
      return;
    }
    if (ui.detailId) {
      ui.detailId = null;
      popHistorySilently();
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (ui.view === "import") {
      ui.import = null;
      go("more", null);
      syncHistory(true);
      return;
    }
    if (ui.view !== "plan") {
      go("plan", null);
      syncHistory(true);
      return;
    }
    armPlanExitToast();
  }

  function planRootActive() {
    return ui.view === "plan" && !ui.detailId && !overlayOpen();
  }

  function armPlanExitToast() {
    if (!planRootActive()) return;
    planExitPending = true;
    clearTimeout(planExitTimer);
    planExitTimer = setTimeout(() => { planExitPending = false; }, 2800);
    toast("Swipe back again to exit");
  }

  function appSemver() {
    let v = window.__DU_APP_SEMVER__ || window.__DU_APP_VERSION__ || "3.2.1";
    if (/^\d{12}-/.test(String(v))) v = window.__DU_APP_SEMVER__ || "3.2.1";
    return v;
  }

  function appBuildId() {
    if (window.__DU_BUILD_ID__) return String(window.__DU_BUILD_ID__);
    const v = window.__DU_APP_VERSION__ || "";
    return /^\d{12}-/.test(String(v)) ? String(v) : "";
  }

  function cap(value) {
    const text = String(value || "");
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  let undoClear = null;

  function hideToast() {
    const el = $("toast");
    el.classList.remove("has-action");
    el.textContent = "";
    el.hidden = true;
  }

  function toast(message) {
    undoClear = null;
    const el = $("toast");
    el.classList.remove("has-action");
    el.hidden = false;
    el.textContent = message;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      if (!undoClear) hideToast();
    }, 3600);
  }

  function showUndo(message, restore) {
    const el = $("toast");
    clearTimeout(toast._t);
    undoClear = restore;
    el.hidden = false;
    el.classList.add("has-action");
    el.textContent = "";
    const span = document.createElement("span");
    span.textContent = message;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-action", "undo-clear");
    btn.textContent = "Undo";
    el.appendChild(span);
    el.appendChild(btn);
    toast._t = setTimeout(() => {
      undoClear = null;
      hideToast();
    }, 5000);
  }

  function commit(keepScroll) {
    const y = keepScroll === false ? 0 : window.scrollY;
    state = PW.normalize(state);
    PW.save(state);
    render();
    window.scrollTo(0, y);
  }

  function setInert() {
    const open = ["tip", "picker", "assign", "editor", "cook", "textDialog", "fill"].some((id) => {
      const el = $(id);
      return el && !el.hidden;
    });
    $("app").inert = open;
  }

  function barClass(recipe) {
    if (recipe.tags.indexOf("dinner") !== -1) return "dinner";
    if (recipe.tags.indexOf("lunch") !== -1) return "lunch";
    if (recipe.tags.indexOf("breakfast") !== -1) return "breakfast";
    return "other";
  }

  function timeLabel(recipe) {
    return recipe.minutes != null ? recipe.minutes + " min" : "Time varies";
  }

  function preview(recipe) {
    const text = recipe.ingredients.slice(0, 3).map((ing) => ing.item).join(", ");
    return text ? cap(text) : "";
  }

  function photoUrl(recipe) {
    if (!recipe || !window.PW_PHOTOS) return "";
    return window.PW_PHOTOS.urlFor(recipe);
  }

  function recipeBadges(recipe) {
    return PW.metaTags(recipe).map(PW.tagLabel).join(" · ");
  }

  function tabIcon(id) {
    if (window.PW_ICONS && typeof window.PW_ICONS.tab === "function") {
      return window.PW_ICONS.tab(id);
    }
    return "•";
  }

  function chips(active, action) {
    return FILTERS.map(([id, label]) => {
      const pressed = active === id ? "true" : "false";
      return `<button type="button" class="chip" data-action="${action}" data-filter="${esc(id)}" aria-pressed="${pressed}">${esc(label)}</button>`;
    }).join("");
  }

  function go(view, tabAnim) {
    ui.view = view;
    ui.detailId = null;
    if (view !== "import") ui.import = null;
    if (tabAnim) ui.tabAnim = tabAnim;
    pushHistory();
    render();
    window.scrollTo(0, 0);
    const heading = $("main") && $("main").querySelector("h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }
  }

  function writeHash() {
    syncHistory(true);
  }

  function readHash() {
    const raw = (location.hash || "#plan").replace(/^#/, "");
    if (raw.indexOf("recipe/") === 0) {
      ui.view = "recipes";
      ui.detailId = decodeURIComponent(raw.slice(7));
      return;
    }
    if (raw === "import") {
      ui.view = "import";
      ui.detailId = null;
      if (!ui.import) ui.import = { step: "home", drafts: [], error: "", csvText: "", csvMap: {}, linkUrl: "", pasteText: "" };
      return;
    }
    if (["plan", "recipes", "shop", "pantry", "more"].indexOf(raw) !== -1) {
      ui.view = raw;
      ui.detailId = null;
      if (raw !== "import") ui.import = null;
    }
  }

  function renderTabs() {
    const open = PW.buildShoppingList(state).items.filter((item) => !item.checked).length;
    const tabs = [
      ["plan", "Plan"],
      ["recipes", "Recipes"],
      ["shop", open ? "List (" + open + ")" : "List"],
      ["pantry", "Pantry"],
      ["more", "More"]
    ];
    $("tabs").innerHTML = tabs.map(([id, label]) => {
      const on = ui.view === id || (id === "recipes" && ui.view === "recipes");
      const icon = tabIcon(id);
      return `<button type="button" class="tab" data-action="nav" data-view="${id}"${on ? ' aria-current="page"' : ""}><span class="tab-icon" aria-hidden="true">${icon}</span><span class="tab-label">${esc(label)}</span></button>`;
    }).join("");
    const titles = { plan: "The week", recipes: "Recipes", shop: "Shopping list", pantry: "Pantry", more: "Your data", import: "Import recipes" };
    document.title = (ui.detailId ? "Recipe" : titles[ui.view] || "Pantry Week") + " — Pantry Week";
  }

  function warningHtml() {
    if (!PW.lastWarning) return "";
    return `<p class="banner-warn" role="alert">${esc(PW.lastWarning)}</p>`;
  }

  function mainShowsEmptyState() {
    const main = $("main");
    if (!main) return false;
    return !!main.querySelector(".empty");
  }

  function syncBackdrop() {
    const motion =
      !overlayOpen() &&
      (ui.view === "plan" || (ui.view !== "import" && ui.view !== "more" && mainShowsEmptyState()));
    document.body.classList.toggle("pw-bg-motion", motion);
  }

  const THEME_KEY = "pantry_week_theme";
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#161412" : "#f3efe8");
    const cs = document.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute("content", t);
    const btn = document.getElementById("pwThemeToggle");
    if (btn) {
      const label = t === "dark" ? "Switch to light mode" : "Switch to dark mode";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    }
  }
  function setTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme === "dark" ? "dark" : "light"); } catch (err) { /* ignore */ }
    applyTheme(theme);
    render();
  }

  function render() {
    applyTheme(currentTheme());
    renderTabs();
    const main = $("main");
    main.classList.remove("main-view--from-left", "main-view--from-right");
    if (ui.tabAnim === "left") main.classList.add("main-view--from-left");
    else if (ui.tabAnim === "right") main.classList.add("main-view--from-right");
    ui.tabAnim = null;
    if (ui.view === "recipes" && ui.detailId) main.innerHTML = warningHtml() + detailHtml();
    else if (ui.view === "recipes") main.innerHTML = warningHtml() + recipesHtml();
    else if (ui.view === "shop") main.innerHTML = warningHtml() + shopHtml();
    else if (ui.view === "pantry") main.innerHTML = warningHtml() + pantryHtml();
    else if (ui.view === "more") main.innerHTML = warningHtml() + moreHtml();
    else if (ui.view === "import") main.innerHTML = warningHtml() + importHtml();
    else main.innerHTML = warningHtml() + planHtml();
    if (ui.picker) renderPicker();
    else $("picker").hidden = true;
    if (ui.assign) renderAssign();
    else $("assign").hidden = true;
    if (ui.editor) renderEditor();
    if (ui.cook) renderCook();
    if (ui.fill) renderFill();
    else if ($("fill")) $("fill").hidden = true;
    setInert();
    syncBackdrop();
  }

  function pantryCookCacheKey() {
    const asp = state.assumeStaples || {};
    return JSON.stringify({
      pantry: (state.pantry || []).map((p) => p.item),
      flour: !!asp.flour,
      sugar: !!asp.sugar,
      butter: !!asp.butter,
      recipes: (state.recipes || []).length
    });
  }

  function invalidatePantryCookCache() {
    ui.pantryCook.key = "";
    if (window.PW_PANTRY_NORM && PW_PANTRY_NORM.invalidatePantryCaches) {
      PW_PANTRY_NORM.invalidatePantryCaches();
    }
  }

  // Library + saved recipes; unsaved Smart Chef drafts (tag "smart-chef") are not library matches.
  function cookableRecipes() {
    return state.recipes.filter((x) => !(x.tags || []).includes("smart-chef"));
  }

  function interleaveSmartChefIdeas(libraryRows) {
    const out = libraryRows.slice();
    if (!window.PW_SMART_CHEF || !state.pantry.length) return out;
    ui.pantryCook.smartChefByFp = {};
    const scRows = [];
    const variations = [0, 5];
    const existing = state.recipes.filter((x) => !(x.tags || []).includes("smart-chef"));
    variations.forEach((variation) => {
      const result = PW_SMART_CHEF.generate(state.pantry, {
        variation,
        servings: 4,
        existingRecipes: existing,
        rejectHashes: ui.smartChef.sessionHashes || []
      });
      if (result.error || !result.fingerprint) return;
      const row = PW_PANTRY_MATCH.rowFromSmartChefResult(result, state.pantry, state.assumeStaples);
      if (!row || row.matched < 1 || row.missing > 3) return;
      if (out.some((r) => String(r.name).toLowerCase() === String(row.name).toLowerCase())) return;
      if (scRows.some((r) => r.smartChefFp === row.smartChefFp)) return;
      ui.pantryCook.smartChefByFp[row.smartChefFp] = result;
      scRows.push(row);
    });
    if (!scRows.length) return out;
    // Each idea goes into its own group (Ready / Missing 1 / Missing 2-3), second place in that group.
    const rank = (r) => (r.missing === 0 ? 0 : r.missing === 1 ? 1 : 2);
    scRows.slice(0, 2).forEach((row) => {
      const t = rank(row);
      let start = out.findIndex((r) => rank(r) >= t);
      if (start === -1) start = out.length;
      let end = out.findIndex((r) => rank(r) > t);
      if (end === -1) end = out.length;
      out.splice(Math.min(start + 1, end), 0, row);
    });
    return out;
  }

  function finishPantryCookReaction() {
    const pending = ui.pantryCook._prevIds;
    if (!pending) return;
    const prevIds = pending;
    ui.pantryCook._prevIds = null;
    invalidatePantryCookCache();
    let rows = PW.suggestRecipes(cookableRecipes(), state.pantry, state.assumeStaples);
    if (ui.pantryCook.spotlightItem && PW_PANTRY_MATCH.applySpotlight) {
      rows = PW_PANTRY_MATCH.applySpotlight(
        rows,
        ui.pantryCook.spotlightItem,
        state.pantry,
        state.assumeStaples,
        (id) => PW.recipeById(state, id)
      );
    }
    rows = interleaveSmartChefIdeas(rows);
    ui.pantryCook.key = pantryCookCacheKey();
    ui.pantryCook.rows = rows;
    if (!ui.pantryCook.expanded) ui.pantryCook.shown = PANTRY_COOK_TOP;

    const libIds = rows.filter((r) => r.kind !== "smart-chef").map((r) => r.id);
    const newIds = new Set(libIds.filter((id) => !prevIds.has(id)));
    const n = newIds.size;
    if (n > 0) {
      ui.pantryCook.newIds = newIds;
      const word = n === 1 ? "match" : "matches";
      ui.pantryCook.flash = `Updated — ${n} new ${word}`;
      if (pantryCookFlashTimer) clearTimeout(pantryCookFlashTimer);
      pantryCookFlashTimer = setTimeout(() => {
        ui.pantryCook.flash = null;
        ui.pantryCook.newIds = null;
        pantryCookFlashTimer = null;
        if (ui.view === "pantry") renderPantrySuggestList();
      }, 2000);
    } else {
      ui.pantryCook.flash = "Updated";
      if (pantryCookFlashTimer) clearTimeout(pantryCookFlashTimer);
      pantryCookFlashTimer = setTimeout(() => {
        ui.pantryCook.flash = null;
        pantryCookFlashTimer = null;
        if (ui.view === "pantry") renderPantrySuggestList();
      }, 1600);
    }
  }

  function preparePantryCookReaction(itemLabel, added) {
    ensurePantryCookRows();
    ui.pantryCook._prevIds = new Set(
      (ui.pantryCook.rows || []).filter((r) => r.kind !== "smart-chef").map((r) => r.id)
    );
    ui.pantryCook.spotlightItem = added && itemLabel ? itemLabel : null;
    ui.pantryCook.expanded = false;
  }

  function ensurePantryCookRows() {
    const key = pantryCookCacheKey();
    if (ui.pantryCook.key !== key) {
      ui.pantryCook.key = key;
      let rows = PW.suggestRecipes(cookableRecipes(), state.pantry, state.assumeStaples);
      if (ui.pantryCook.spotlightItem && PW_PANTRY_MATCH.applySpotlight) {
        rows = PW_PANTRY_MATCH.applySpotlight(
          rows,
          ui.pantryCook.spotlightItem,
          state.pantry,
          state.assumeStaples,
          (id) => PW.recipeById(state, id)
        );
      }
      ui.pantryCook.rows = interleaveSmartChefIdeas(rows);
      if (!ui.pantryCook.expanded) ui.pantryCook.shown = PANTRY_COOK_TOP;
    }
    return ui.pantryCook.rows;
  }

  function pantrySuggestBadgeClass(tier) {
    if (tier === "ready") return "suggest-badge suggest-badge--ready";
    if (tier === "miss1") return "suggest-badge suggest-badge--miss1";
    return "suggest-badge suggest-badge--miss23";
  }

  function pantryChipHtml(label, kind) {
    const cls = kind === "miss" ? "pantry-chip pantry-chip--miss" : "pantry-chip pantry-chip--have";
    return `<span class="${cls}">${esc(label)}</span>`;
  }

  function pantrySuggestArticleHtml(idea) {
    const isSc = idea.kind === "smart-chef";
    const recipe = isSc ? (idea.smartChefResult && idea.smartChefResult.recipe) : PW.recipeById(state, idea.id);
    const badge = `<span class="${pantrySuggestBadgeClass(idea.tier)}">${esc(idea.badge)}</span>`;
    const scBadge = isSc ? `<span class="suggest-badge suggest-badge--chef">Smart Chef</span>` : "";
    const spotlight = idea.spotlight && idea.spotlightLabel
      ? `<p class="pantry-spotlight">Uses your ${esc(cap(idea.spotlightLabel))}</p>`
      : "";
    const used = (idea.usedPantry || []).slice(0, 6).map((l) => pantryChipHtml(l, "have")).join("");
    const missItems = (idea.missingItems || []).slice(0, 4);
    const miss = missItems.length ? missItems.map((l) => pantryChipHtml(l, "miss")).join("") : "";
    const chips = `<div class="pantry-chips">${used}${miss}</div>`;
    const isNew = ui.pantryCook.newIds && ui.pantryCook.newIds.has(idea.id);
    const newCls = isNew ? " pantry-suggest--new" : "";
    const idAttr = isSc
      ? `data-smart-chef-fp="${esc(idea.smartChefFp || "")}"`
      : `data-id="${esc(idea.id)}"`;
    const openAction = isSc ? "pantry-smart-chef-open" : "open-recipe";
    const cookAction = isSc ? "pantry-smart-chef-cook" : "cook";
    const tonightAction = isSc ? "pantry-smart-chef-plan" : "tonight";
    return `<article class="pantry-suggest${newCls}" data-pantry-suggest-id="${esc(idea.id)}">
      <div class="suggest-head">${badge}${scBadge}<h3>${esc(idea.name)}</h3></div>
      ${spotlight}
      ${chips}
      <p class="meta">${idea.matched} from pantry${idea.missing ? ` · ${idea.missing} missing` : ""}${recipe && recipe.minutes != null ? ` · ${recipe.minutes} min` : ""}</p>
      <div class="inline">
        <button type="button" class="primary" data-action="${tonightAction}" ${idAttr}>Tonight</button>
        <button type="button" data-action="${cookAction}" ${idAttr}>Cook</button>
        <button type="button" data-action="${openAction}" ${idAttr}>Open</button>
      </div>
    </article>`;
  }

  function pantrySuggestGroupLabel(tier) {
    if (tier === "ready") return "Ready to cook (have everything)";
    if (tier === "miss1") return "Missing 1";
    if (tier === "miss23") return "Missing 2–3";
    return "";
  }

  function pantrySuggestListHtml(rows, limit, expanded) {
    const cap = expanded ? rows.length : Math.min(limit, rows.length);
    const slice = rows.slice(0, cap);
    let html = "";
    let lastTier = "";
    slice.forEach((idea) => {
      if (idea.tier !== lastTier) {
        const label = pantrySuggestGroupLabel(idea.tier);
        if (label) html += `<h4 class="suggest-group">${esc(label)}</h4>`;
        lastTier = idea.tier;
      }
      html += pantrySuggestArticleHtml(idea);
    });
    const libCount = rows.filter((r) => r.kind !== "smart-chef").length;
    const total = rows.length;
    if (!expanded && total > limit) {
      html += `<button type="button" class="btn pantry-cook-more" data-action="pantry-cook-more">Show more (${total - cap} left)</button>`;
    } else if (total) {
      html += `<p class="meta pantry-suggest-end">${libCount} library match${libCount === 1 ? "" : "es"}${total > libCount ? ` · ${total - libCount} Smart Chef idea${total - libCount === 1 ? "" : "s"}` : ""}</p>`;
    }
    return html;
  }

  function loadMorePantryCook() {
    const rows = ui.pantryCook.rows || [];
    if (ui.pantryCook.expanded || ui.pantryCook.shown >= rows.length) return false;
    ui.pantryCook.shown = Math.min(rows.length, ui.pantryCook.shown + PANTRY_COOK_PAGE);
    renderPantrySuggestList();
    return true;
  }

  // Infinite scroll for "Cook from what you have": load the next page when the
  // "Show more" button nears the viewport. Passive + rAF-throttled, so no scroll jank.
  let pantryCookScrollQueued = false;
  window.addEventListener("scroll", () => {
    if (pantryCookScrollQueued || ui.view !== "pantry") return;
    pantryCookScrollQueued = true;
    requestAnimationFrame(() => {
      pantryCookScrollQueued = false;
      const more = document.querySelector("#pantrySuggestList .pantry-cook-more");
      if (more && more.getBoundingClientRect().top < window.innerHeight + 400) loadMorePantryCook();
    });
  }, { passive: true });

  function renderPantrySuggestList() {
    const list = document.getElementById("pantrySuggestList");
    if (!list) return;
    const rows = ui.pantryCook.rows || [];
    list.innerHTML = pantrySuggestListHtml(rows, ui.pantryCook.shown, ui.pantryCook.expanded);
    const flash = document.getElementById("pantryCookFlash");
    if (flash) {
      flash.textContent = ui.pantryCook.flash || "";
      flash.hidden = !ui.pantryCook.flash;
    }
  }

  function pantrySmartChefResultFromBtn(btn) {
    const fp = btn.getAttribute("data-smart-chef-fp");
    return fp && ui.pantryCook.smartChefByFp ? ui.pantryCook.smartChefByFp[fp] : null;
  }

  function openPantrySmartChef(btn) {
    const result = pantrySmartChefResultFromBtn(btn);
    if (!result) return;
    ui.smartChef.result = result;
    ui.smartChef.variation = result.variation || 0;
    openSmartChefDetail();
  }

  function tonightHtml() {
    const day = PW.todayKey();
    const slot = state.week[day].dinner;
    const recipe = PW.recipeById(state, slot.recipeId);
    const name = PW.slotLabel(state, slot);
    if (!name) {
      return `<section class="tonight">
        <p class="slot-kicker">Tonight · ${PW.DAY_LABEL[day]} dinner</p>
        <p class="lead">Nothing planned yet.</p>
        <button type="button" class="primary" data-action="open-slot" data-day="${day}" data-slot="dinner">Choose tonight's dinner</button>
      </section>`;
    }
    const cook = recipe ? `<button type="button" class="primary" data-action="cook" data-id="${esc(recipe.id)}">Cook tonight</button>` : "";
    const meta = recipe && recipe.minutes != null ? `<span class="tonight__meta">${recipe.minutes} min</span>` : "";
    const openLabel = recipe
      ? `Open ${name} recipe`
      : `Open ${name}`;
    return `<section class="tonight">
      <button type="button" class="tonight__open plain" data-action="open-plan-recipe" data-day="${day}" data-slot="dinner" aria-label="${esc(openLabel)}">
        <span class="tonight__body">
          <span class="slot-kicker">Tonight · ${PW.DAY_LABEL[day]} dinner</span>
          <span class="tonight__title">${esc(name)}</span>
          ${meta}
        </span>
        <span class="tonight__chev" aria-hidden="true">›</span>
      </button>
      <div class="toolbar tonight__toolbar">${cook}<button type="button" data-action="open-slot" data-day="${day}" data-slot="dinner">Change</button></div>
    </section>`;
  }

  function planHtml() {
    const today = PW.todayKey();
    const days = PW.DAYS.map((day) => {
      const slots = PW.SLOTS.map((slot) => slotHtml(day, slot)).join("");
      return `<article class="day${day === today ? " today" : ""}">
        <div class="day-head"><h3>${PW.DAY_LABEL[day]}</h3>${day === today ? '<span class="pill">Today</span>' : ""}</div>
        <div class="slots">${slots}</div>
      </article>`;
    }).join("");
    return `<section>
      <h2>The week</h2>
      ${tonightHtml()}
      <p class="lead">Week of ${esc(PW.weekOfLabel())}. Tap a meal to pick a recipe. Servings scale the list, and leftovers are not added twice.</p>
      <div class="toolbar">
        <button type="button" class="primary" data-action="fill">Fill a simple week</button>
        <button type="button" data-action="repeat">Repeat week</button>
        <button type="button" data-action="copy-last">Copy last week</button>
        <button type="button" data-action="clear-week">Clear week</button>
      </div>
      <div class="days">${days}</div>
    </section>`;
  }

  function slotHtml(day, slot) {
    const value = state.week[day][slot];
    const recipe = PW.recipeById(state, value.recipeId);
    const name = PW.slotLabel(state, value);
    const kicker = PW.SLOT_LABEL[slot];
    if (!name) {
      return `<div class="slot">
        <p class="slot-kicker">${kicker}</p>
        <button type="button" class="slot-empty" data-action="open-slot" data-day="${day}" data-slot="${slot}">Add ${kicker.toLowerCase()}</button>
      </div>`;
    }
    const leftover = value.leftover ? "true" : "false";
    const thumb = recipe ? photoUrl(recipe) : "";
    const openAttrs = recipe
      ? `data-action="open-plan-recipe" data-day="${esc(day)}" data-slot="${esc(slot)}"`
      : `data-action="open-slot" data-day="${esc(day)}" data-slot="${esc(slot)}"`;
    const thumbHtml = thumb
      ? `<span class="meal-card__thumb" style="background-image:url('${thumb.replace(/'/g, "%27")}')" role="img" aria-label=""></span>`
      : `<span class="meal-card__thumb meal-card__thumb--empty" aria-hidden="true"></span>`;
    const meta = `${value.servings} servings${recipe && recipe.minutes != null ? " · " + recipe.minutes + " min" : ""}`;
    const cookRow = recipe
      ? `<button type="button" data-action="cook" data-id="${esc(recipe.id)}">Cook</button>`
      : "";
    return `<div class="slot slot--meal${value.leftover ? " leftover-on" : ""}">
      <p class="slot-kicker">${kicker}${value.leftover ? " · Leftovers" : ""}</p>
      <button type="button" class="meal-card plain" ${openAttrs}>
        ${thumbHtml}
        <span class="meal-card__text">
          <span class="meal-card__name">${esc(name)}</span>
          <span class="meal-card__meta">${esc(meta)}</span>
        </span>
        <span class="meal-card__chev" aria-hidden="true">›</span>
      </button>
      <div class="slot-row">
        <button type="button" class="stepper" data-action="servings" data-day="${day}" data-slot="${slot}" data-dir="-1" aria-label="Fewer servings for ${PW.DAY_LABEL[day]} ${kicker}">−</button>
        <span class="servings">${value.servings} servings</span>
        <button type="button" class="stepper" data-action="servings" data-day="${day}" data-slot="${slot}" data-dir="1" aria-label="More servings for ${PW.DAY_LABEL[day]} ${kicker}">+</button>
      </div>
      <div class="slot-actions slot-actions--compact">
        <button type="button" class="icon-chip" data-action="leftover" data-day="${day}" data-slot="${slot}" aria-pressed="${leftover}" title="Leftovers" aria-label="Toggle leftovers for ${esc(name)}">♻</button>
        <details class="slot-menu">
          <summary class="icon-chip" aria-label="More actions for ${esc(name)}">⋯</summary>
          <div class="slot-menu__panel">
            <button type="button" data-action="again" data-day="${day}" data-slot="${slot}">Eat again tomorrow</button>
            ${cookRow}
            <button type="button" data-action="clear-slot" data-day="${day}" data-slot="${slot}">Clear meal</button>
          </div>
        </details>
      </div>
    </div>`;
  }

  function findMoreHtml() {
    const fm = ui.findMore || { query: "", status: "", results: [], links: [], linkUrl: "" };
    const offline = window.PW_FIND && !PW_FIND.browserOnline();
    const status = offline ? PW_FIND.OFFLINE : (fm.status || "");
    const results = (fm.results || []).map((hit) => {
      const thumb = hit.image
        ? `<span class="find-hit__thumb" style="background-image:url('${String(hit.image).replace(/'/g, "%27")}')"></span>`
        : `<span class="find-hit__mark" aria-hidden="true">${esc((hit.title || "?").slice(0, 1))}</span>`;
      const time = hit.minutes ? ` · ${esc(String(hit.minutes))} min` : "";
      return `<button type="button" class="find-hit" data-action="find-open" data-url="${esc(hit.url)}">
        ${thumb}
        <span class="find-hit__body">
          <span class="find-hit__title">${esc(hit.title)}</span>
          <span class="find-hit__meta">${esc(hit.source || "Source")}${time}</span>
        </span>
      </button>`;
    }).join("");
    const links = offline ? "" : (fm.links || []).map((link) => {
      return `<a class="find-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">
        <span class="find-link__mark" aria-hidden="true">${esc(link.name.slice(0, 1))}</span>
        <span class="find-link__body"><span class="find-link__name">${esc(link.name)}</span><span class="find-link__host">${esc(link.blurb)}</span></span>
        <span class="find-link__go" aria-hidden="true">↗</span>
      </a>`;
    }).join("");
    return `<section class="find-more" aria-labelledby="findMoreTitle">
      <h3 id="findMoreTitle">Find more recipes</h3>
      <p class="meta">Search the Wikimedia Cookbook, or open a recipe site and paste one link. Your saved recipes stay on this device.</p>
      <form id="findMoreForm" class="search-row" role="search">
        <div style="flex:1">
          <label class="field" for="findMoreQuery">Dish</label>
          <input id="findMoreQuery" type="search" enterkeyhint="search" value="${esc(fm.query || "")}" placeholder="chicken tikka, pork chops…" autocomplete="off" />
        </div>
        <button type="submit" class="primary">Find</button>
      </form>
      <p id="findMoreStatus" class="find-more__status" role="status">${esc(status)}</p>
      ${results ? `<div class="find-hits">${results}</div>` : ""}
      ${links ? `<p class="meta">Or open a search in your browser, then paste the recipe link.</p><div class="find-links">${links}</div>` : ""}
      <form id="findLinkForm" class="stack find-more__paste">
        <label class="field" for="findLink">Paste a recipe link</label>
        <input id="findLink" type="url" inputmode="url" placeholder="https://…" value="${esc(fm.linkUrl || "")}" />
        <button type="submit">Fetch recipe</button>
      </form>
    </section>`;
  }

  function recipesHtml() {
    return `<section>
      <h2>Recipe box</h2>
      <p class="lead">${state.recipes.length} recipes. Tap Tonight for today's dinner, or open a card to put it on another day.</p>
      <div class="search-row">
        <form role="search">
          <label class="field" for="recipeSearch">Search recipes</label>
          <input id="recipeSearch" type="search" enterkeyhint="search" value="${esc(ui.query)}" placeholder="Name, ingredient, or tag" />
        </form>
        <button type="button" class="primary" data-action="new-recipe">New recipe</button>
      </div>
      ${findMoreHtml()}
      <div class="filters" role="toolbar" aria-label="Recipe filters">${chips(ui.filter, "filter")}</div>
      <div class="recipe-grid" id="recipeList">${recipeCards()}</div>
    </section>`;
  }

  function recipeCards() {
    const list = state.recipes.filter((recipe) => PW.recipeMatches(recipe, ui.query, ui.filter));
    if (!list.length) {
      const hint = ui.filter === "all" && !ui.query.trim()
        ? ` <a href="#import" data-action="open-import">Import from another app</a> or add your own.`
        : "";
      return `<p class="empty">No recipes match. Try All,${hint || " or add your own."}</p>`;
    }
    return list.map((recipe) => {
      const badges = recipeBadges(recipe);
      const photo = photoUrl(recipe);
      return `<article class="recipe-card">
        <div class="card-photo" style="background-image:url('${photo.replace(/'/g, "%27")}')" role="img" aria-label=""></div>
        <div class="card-bar ${barClass(recipe)}"></div>
        <div class="card-body">
          <div class="card-top">
            <button type="button" class="plain card-title" data-action="open-recipe" data-id="${esc(recipe.id)}">${esc(recipe.name)}</button>
          </div>
          <p class="meta">${esc(timeLabel(recipe))} · ${recipe.servings} servings</p>
          ${badges ? `<p class="diet">${esc(badges)}</p>` : ""}
          <p class="preview">${esc(preview(recipe))}</p>
          <div class="card-actions">
            <button type="button" class="primary" data-action="tonight" data-id="${esc(recipe.id)}">Tonight</button>
            <button type="button" data-action="cook" data-id="${esc(recipe.id)}">Cook</button>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  function renderRecipeList() {
    const list = $("recipeList");
    if (list) list.innerHTML = recipeCards();
  }

  function sourceCreditHtml(recipe) {
    if (!recipe) return "";
    if (recipe.sourceUrl) {
      const license = recipe.sourceLicense ? ` (${esc(recipe.sourceLicense)})` : "";
      return `<p class="source-credit">From <a href="${esc(recipe.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(recipe.sourceName || "source")}</a>${license}</p>`;
    }
    if (recipe.sourceName) return `<p class="source-credit">${esc(recipe.sourceName)}</p>`;
    return "";
  }

  function detailHtml() {
    const recipe = PW.recipeById(state, ui.detailId);
    if (!recipe) {
      return `<section><h2>Recipe</h2><p class="empty">That recipe is not in the box.</p>${iconBtn("nav-back", "Back to recipes", ICON_BACK)}</section>`;
    }
    const diet = recipeBadges(recipe) || recipe.tags.filter((t) => t === "breakfast" || t === "lunch" || t === "dinner").map(PW.tagLabel).join(" · ");
    const ings = recipe.ingredients.map((ing) => `<li>${esc(PW.formatLine(ing.qty, ing.unit, ing.item))}</li>`).join("");
    const steps = recipe.steps.map((step) => `<li>${esc(step)}</li>`).join("");
    const hero = photoUrl(recipe);
    return `<section class="detail">
      <div class="detail-top detail-top--chrome">
        ${iconBtn("nav-back", "Back to recipes", ICON_BACK)}
        <p class="detail-top__title">${esc(recipe.name)}</p>
        <button type="button" class="text-btn" data-action="edit" data-id="${esc(recipe.id)}">Edit</button>
      </div>
      <div class="detail-hero" style="background-image:url('${hero.replace(/'/g, "%27")}')" role="img" aria-label=""></div>
      <h2>${esc(recipe.name)}</h2>
      <p class="meta">${esc(timeLabel(recipe))} · ${recipe.servings} servings${diet ? " · " + esc(diet) : ""}</p>
      ${sourceCreditHtml(recipe)}
      <div class="toolbar">
        <button type="button" class="primary" data-action="cook" data-id="${esc(recipe.id)}">Cook</button>
        <button type="button" data-action="tonight" data-id="${esc(recipe.id)}">Add to tonight</button>
        <button type="button" data-action="choose-slot" data-id="${esc(recipe.id)}">Choose a slot</button>
        <button type="button" class="danger" data-action="delete" data-id="${esc(recipe.id)}">Remove</button>
      </div>
      <h3>Ingredients</h3>
      <ul class="ing-list">${ings}</ul>
      <h3>Steps</h3>
      <ol class="step-list">${steps}</ol>
    </section>`;
  }

  function shopHtml() {
    const list = PW.buildShoppingList(state);
    const visible = state.hideChecked ? list.items.filter((item) => !item.checked) : list.items;
    const open = list.items.filter((item) => !item.checked).length;
    const done = list.items.length - open;
    let body;
    if (!list.items.length) {
      body = `<p class="empty">No groceries yet. Add meals to the week and the list will fill in.</p>`;
    } else if (!visible.length) {
      body = `<p class="empty">Everything is checked. Show checked items if you still need the list.</p>`;
    } else {
      const grouped = {};
      visible.forEach((item) => {
        grouped[item.aisle] = grouped[item.aisle] || [];
        grouped[item.aisle].push(item);
      });
      body = PW.AISLE_ORDER.filter((id) => grouped[id] && grouped[id].length).map((id) => {
        const rows = grouped[id].map(shopRow).join("");
        return `<section class="aisle"><h3 class="aisle-name">${esc(PW.AISLE_LABEL[id])}</h3><ul class="shop-list">${rows}</ul></section>`;
      }).join("");
    }
    const home = list.excluded.length
      ? `<p class="callout">Already at home, so left off the list: ${esc(list.excluded.map(cap).join(", "))}.</p>`
      : "";
    return `<section>
      <h2>Shopping list</h2>
      <p class="shop-summary">${open} to buy${done ? " · " + done + " checked" : ""}. Quantities are combined by item and unit.</p>
      <div class="toolbar">
        <button type="button" class="primary" data-action="copy-list">Copy list as text</button>
        <button type="button" data-action="toggle-checked" aria-pressed="${state.hideChecked ? "true" : "false"}">${state.hideChecked ? "Show checked" : "Hide checked"}</button>
        <button type="button" data-action="uncheck">Uncheck all</button>
        <a class="btn" href="print/week.html">Print</a>
      </div>
      <form id="extraForm" class="search-row">
        <div class="grow" style="flex:1">
          <label class="field" for="extraItem">Add an extra item</label>
          <input id="extraItem" type="text" placeholder="1 lb roast beef, paper towels, 2 lemons…" autocomplete="off" list="units" />
        </div>
        <button type="submit" class="primary">Add to list</button>
      </form>
      ${home}
      ${body}
    </section>`;
  }

  function removeExtraItem(item, unit) {
    PW.removeManualExtra(state, item, unit || "");
    commit();
    toast("Removed from the list.");
  }

  function shopRow(item) {
    const checked = item.checked ? "checked" : "";
    const manual = item.extraOnly;
    const haveBtn = item.kind === "note"
      ? ""
      : `<button type="button" class="have" data-action="have" data-item="${esc(item.item)}" aria-label="Already have ${esc(item.label)}">Have it</button>`;
    const menuBtn = manual
      ? `<details class="shop-row__menu">
          <summary class="shop-row__more" aria-label="More actions for ${esc(item.label)}">⋯</summary>
          <button type="button" class="shop-row__menu-remove" data-action="remove-extra" data-item="${esc(item.item)}" data-unit="${esc(item.unit)}">Remove from list</button>
        </details>`
      : "";
    const rowClass = `shop-row${item.checked ? " done" : ""}${manual ? " shop-row--manual" : ""}`;
    const manualData = manual
      ? ` data-manual="1" data-item="${esc(item.item)}" data-unit="${esc(item.unit || "")}"`
      : "";
    return `<li class="${rowClass}"${manualData}>
      <label class="check">
        <input type="checkbox" data-action="check" data-kind="${esc(item.kind)}" data-key="${esc(item.key)}" data-item="${esc(item.item || "")}" data-unit="${esc(item.unit || "")}" data-qty="${item.qty == null ? "" : esc(String(item.qty))}" ${checked} />
        <span>${esc(item.label)}</span>
      </label>
      ${haveBtn}
      ${menuBtn}
    </li>`;
  }

  function recordSmartChefResult(result) {
    if (!result || result.error || !window.PW_SMART_CHEF) return;
    if (!ui.smartChef.sessionHashes) ui.smartChef.sessionHashes = [];
    [result.fingerprint, result.nameHash].forEach((hash) => {
      if (!hash) return;
      if (ui.smartChef.sessionHashes.indexOf(hash) === -1) ui.smartChef.sessionHashes.push(hash);
      PW_SMART_CHEF.persistHash(hash);
    });
    if (result.variation != null) ui.smartChef.variation = result.variation;
  }

  function smartChefSeen() {
    const session = (ui.smartChef && ui.smartChef.sessionHashes) || [];
    const stored = window.PW_SMART_CHEF ? PW_SMART_CHEF.loadHashes() : [];
    return session.concat(stored);
  }

  function originalSmartChef(seen) {
    if (!window.PW_SMART_CHEF) {
      return { error: "Smart Chef didn't load.", source: "original", sourceName: "Smart Chef original" };
    }
    const result = PW_SMART_CHEF.generate(state.pantry, {
      variation: ui.smartChef.variation,
      servings: ui.smartChef.servings,
      existingRecipes: state.recipes.filter((x) => !(x.tags || []).includes("smart-chef")),
      rejectHashes: seen
    });
    if (result && !result.error) {
      result.source = "original";
      result.sourceName = "Smart Chef original";
    }
    return result;
  }

  function beginSmartChef() {
    const token = (ui.smartChef.token = (ui.smartChef.token || 0) + 1);
    const seen = smartChefSeen();
    const library = window.PW_SOURCE && PW_SOURCE.pickLibraryRecipe(state.pantry, state.recipes, seen);
    if (library) {
      ui.smartChef.loading = false;
      ui.smartChef.result = library;
      return;
    }
    const online = !window.PW_FIND || PW_FIND.browserOnline();
    const query = window.PW_SOURCE ? PW_SOURCE.pantrySearchQuery(state.pantry) : "";
    if (!online || !query || !window.PW_SOURCE || !window.PW_FIND) {
      ui.smartChef.loading = false;
      ui.smartChef.result = originalSmartChef(seen);
      return;
    }
    ui.smartChef.loading = true;
    ui.smartChef.result = null;
    PW_SOURCE.findWebRecipe(query, seen, state.pantry, PW_SOURCE.WEB_TIMEOUT_MS).then((web) => {
      if (token !== ui.smartChef.token) return;
      ui.smartChef.loading = false;
      ui.smartChef.result = web || originalSmartChef(smartChefSeen());
      if (ui.view === "pantry" && !ui.editor && !ui.cook) render();
    });
  }

  function refreshSmartChef(force) {
    if (!window.PW_SMART_CHEF && !window.PW_SOURCE) return;
    if (!ui.smartChef) ui.smartChef = { variation: 0, servings: 4, result: null, sessionHashes: [], token: 0, loading: false };
    if (!ui.smartChef.sessionHashes) ui.smartChef.sessionHashes = [];
    // Only ideas the user has seen and moved past (New idea) are remembered; pantry edits no longer burn ideas.
    if (!force && (ui.smartChef.loading || ui.smartChef.result)) return;
    beginSmartChef();
  }

  const ICON_REFRESH = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5 0 1.07-.34 2.07-.92 2.89l1.46 1.46A7.938 7.938 0 0 0 19 12c0-2.21-.9-4.21-2.35-5.65zM6 12c0-1.07.34-2.07.92-2.89L5.46 7.65A7.938 7.938 0 0 0 5 12c0 2.21.9 4.21 2.35 5.65l1.46-1.46A4.98 4.98 0 0 1 7 12zm7 7-5-5h3c0-2.76 2.24-5 5-5v3l5-5-5-5v3a7 7 0 0 0-7 7h3z"/></svg>';

  function smartChefNewIdeaBtn(extraClass) {
    return `<button type="button" class="smart-chef__new-idea${extraClass ? " " + extraClass : ""}" data-action="smart-chef-again" aria-label="New idea" title="New idea">${ICON_REFRESH}<span>New idea</span></button>`;
  }

  function smartChefSectionHtml() {
    const head = `<div class="smart-chef__head">
        <div>
          <h3 id="smartChefTitle">Smart Chef</h3>
          <p class="smart-chef__deck">Builds a full recipe from your pantry — offline, no AI.</p>
        </div>
        <span class="smart-chef__badge">Template kitchen</span>
      </div>`;
    if (!state.pantry.length) {
      return `<section class="smart-chef smart-chef--idle" aria-labelledby="smartChefTitle">${head}
        <p class="empty">Add a few pantry items above to generate a custom recipe.</p>
      </section>`;
    }
    refreshSmartChef(false);
    const r = ui.smartChef.result;
    const retryTop = `<div class="smart-chef__title-row smart-chef__title-row--solo">${smartChefNewIdeaBtn()}</div>`;
    const resetBar = `<div class="smart-chef__actions toolbar smart-chef__actions--reset">
        <button type="button" data-action="smart-chef-reset">Reset Smart Chef history</button>
      </div>`;
    if (ui.smartChef.loading && !r) {
      return `<section class="smart-chef" aria-labelledby="smartChefTitle">${head}
        ${retryTop}
        <p class="smart-chef__loading" role="status">Looking for a real recipe…</p>
        ${resetBar}
      </section>`;
    }
    if (!r || r.error) {
      return `<section class="smart-chef smart-chef--idle" aria-labelledby="smartChefTitle">${head}
        ${retryTop}
        <p class="empty">${esc(r && r.error ? r.error : "Could not build a recipe yet.")}</p>
        ${resetBar}
      </section>`;
    }
    const recipe = smartChefDraftRecipe();
    if (!recipe) {
      return `<section class="smart-chef smart-chef--idle" aria-labelledby="smartChefTitle">${head}
        ${retryTop}
        <p class="empty">Could not build a recipe yet.</p>
        ${resetBar}
      </section>`;
    }
    if (!r.source || r.source === "original") ensureSmartChefInRecipes();
    const badges = recipeBadges(recipe);
    const hero = photoUrl(recipe);
    const ings = recipe.ingredients.map((ing) => `<li>${esc(PW.formatLine(ing.qty, ing.unit, ing.item))}</li>`).join("");
    const steps = recipe.steps.map((step) => `<li>${esc(step)}</li>`).join("");
    const missNote = r.missing && r.missing.length
      ? `<p class="smart-chef__missing">Not in pantry: <strong>${esc(r.missing.slice(0, 6).join(", "))}</strong></p>`
      : `<p class="smart-chef__missing smart-chef__missing--ok">Everything listed is in your pantry (staples like salt and oil assumed).</p>`;
    return `<section class="smart-chef" aria-labelledby="smartChefTitle">
      ${head}
      <article class="recipe-card recipe-card--smart">
        ${smartChefNewIdeaBtn("smart-chef__new-idea--corner")}
        <button type="button" class="plain smart-chef__open" data-action="open-smart-chef-detail">
          <div class="card-photo" style="background-image:url('${hero.replace(/'/g, "%27")}')" role="img" aria-label=""></div>
          <div class="card-bar ${barClass(recipe)}"></div>
          <div class="card-body">
            <p class="smart-chef__kicker">${esc([r.templateLabel, r.profileLabel].filter(Boolean).join(" · "))}</p>
            <div class="smart-chef__title-row">
              <h4 class="smart-chef__name">${esc(recipe.name)}</h4>
            </div>
            <p class="meta">${esc(timeLabel(recipe))} · ${recipe.servings} servings</p>
            ${badges ? `<p class="diet">${esc(badges)}</p>` : ""}
          </div>
        </button>
        ${smartChefSourceLine(r)}
        ${missNote}
        <h4 class="smart-chef__subhead">Ingredients</h4>
        <ul class="ing-list smart-chef__ings">${ings}</ul>
        <h4 class="smart-chef__subhead">Steps</h4>
        <ol class="step-list smart-chef__steps">${steps}</ol>
      </article>
      <div class="smart-chef__actions toolbar">
        <button type="button" class="primary" data-action="smart-chef-save">Save to my recipes</button>
        <button type="button" data-action="open-smart-chef-detail">View full recipe</button>
        <button type="button" data-action="smart-chef-plan">Add to plan</button>
        <button type="button" data-action="smart-chef-shop">Add missing to list</button>
        <button type="button" data-action="smart-chef-cook">Cook</button>
      </div>
      ${resetBar}
    </section>`;
  }

  function smartChefDraftRecipe() {
    const r = ui.smartChef && ui.smartChef.result;
    if (!r || r.error) return null;
    const draft = PW.normalizeRecipe(PW.clone(r.recipe));
    if (r.templateId && r.profileId && window.PW_SMART_CHEF && PW_SMART_CHEF.photoKeyFor) {
      draft.photoKey = PW_SMART_CHEF.photoKeyFor(r.templateId, r.profileId);
    } else if (r.recipe.photoKey) {
      draft.photoKey = r.recipe.photoKey;
    }
    if (r.sourceUrl) draft.sourceUrl = r.sourceUrl;
    if (r.sourceName) draft.sourceName = r.sourceName;
    if (r.sourceLicense) draft.sourceLicense = r.sourceLicense;
    return draft;
  }

  function smartChefSourceLine(r) {
    if (!r) return "";
    if (r.source === "original" || r.sourceName === "Smart Chef original") {
      return `<p class="smart-chef__source">Smart Chef original</p>`;
    }
    if (r.sourceUrl) {
      const license = r.sourceLicense ? ` (${esc(r.sourceLicense)})` : "";
      return `<p class="smart-chef__source">From <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.sourceName || "source")}</a>${license}</p>`;
    }
    if (r.sourceName) return `<p class="smart-chef__source">${esc(r.sourceName)}</p>`;
    return "";
  }

  function openSmartChefDetail() {
    const draft = ensureSmartChefInRecipes();
    if (!draft) {
      toast("Add more pantry items for Smart Chef to work with.");
      return;
    }
    ui.view = "recipes";
    ui.detailId = draft.id;
    pushHistory();
    render();
    window.scrollTo(0, 0);
  }

  function ensureSmartChefInRecipes() {
    const current = ui.smartChef && ui.smartChef.result;
    const draft = smartChefDraftRecipe();
    if (!draft) return null;
    if (current && current.source === "library") return PW.recipeById(state, draft.id) || draft;
    const rid = draft.id;
    let idx = state.recipes.findIndex((r) => r.id === rid);
    if (idx < 0) {
      state.recipes.push(draft);
      return draft;
    }
    if (current && current.source === "web") return state.recipes[idx];
    state.recipes[idx] = draft;
    return state.recipes[idx];
  }

  function saveSmartChefRecipe() {
    const current = ui.smartChef && ui.smartChef.result;
    if (current && current.source === "library") {
      toast("Already in your recipes.");
      return PW.recipeById(state, current.recipe.id) || current.recipe;
    }
    const draft = ensureSmartChefInRecipes();
    if (!draft) {
      toast("Add more pantry items for Smart Chef to work with.");
      return null;
    }
    if (draft.tags.indexOf("my-creation") === -1) draft.tags.push("my-creation");
    draft.tags = draft.tags.filter((t) => t !== "smart-chef");
    commit();
    toast("Saved under My creations in Recipes.");
    return draft;
  }

  function bumpSmartChefPantry() {
    if (!ui.smartChef) return;
    ui.smartChef.token = (ui.smartChef.token || 0) + 1;
    ui.smartChef.loading = false;
    ui.smartChef.result = null;
    ui.smartChef.sessionHashes = [];
    ui.smartChef.variation = 0;
  }

  function addSmartChefMissingToList() {
    const r = ui.smartChef && ui.smartChef.result;
    if (!r || r.error || !r.missing || !r.missing.length) {
      toast("Nothing extra to add — you're covered.");
      return;
    }
    let added = 0;
    r.missing.forEach((item) => {
      const key = PW.stapleKey(item);
      if (state.extras.some((ex) => PW.stapleKey(ex.item) === key)) return;
      state.extras.push({ id: PW.uid("x_"), qty: null, unit: "", item: item });
      added += 1;
    });
    commit();
    toast(added ? "Added " + added + " item(s) to the shopping list." : "Those items are already on your list.");
  }

  function pantryHtml() {
    const items = state.pantry.length
      ? `<ul class="pantry-list">${state.pantry.map((item) => `<li><span>${esc(cap(item.item))}</span><button type="button" class="danger" data-action="pantry-remove" data-id="${esc(item.id)}" aria-label="Remove ${esc(item.item)} from pantry">Remove</button></li>`).join("")}</ul>`
      : `<p class="empty">Nothing saved as already at home. Add an item, or tap Have it on the shopping list.</p>`;
    if (ui.pantryCook._prevIds) finishPantryCookReaction();
    else ensurePantryCookRows();
    const rows = ui.pantryCook.rows || [];
    const shareBtn = state.pantry.length && rows.length
      ? `<div class="toolbar pantry-share-row"><button type="button" class="primary" data-action="share-pantry">Share</button></div>`
      : "";
    const flashBar = `<p id="pantryCookFlash" class="pantry-cook-flash" role="status"${ui.pantryCook.flash ? "" : " hidden"}>${esc(ui.pantryCook.flash || "")}</p>`;
    const suggest = !state.pantry.length
      ? ""
      : (rows.length
        ? `${shareBtn}${flashBar}<div id="pantrySuggestList" class="suggest">${pantrySuggestListHtml(rows, ui.pantryCook.shown, ui.pantryCook.expanded)}</div>`
        : `<p class="empty">No close matches yet. Add a few more things you have, using the same names as the shopping list.</p>`);
    return `<section>
      <h2>Pantry</h2>
      <p class="lead">What you already have is left off the shopping list. Names should match the ingredient, such as olive oil or lemon.</p>
      <form id="pantryForm" class="search-row">
        <div style="flex:1">
          <label class="field" for="pantryItem">Add an item you have</label>
          <input id="pantryItem" type="text" placeholder="olive oil" autocomplete="off" />
        </div>
        <button type="submit" class="primary">Add</button>
      </form>
      <div class="toolbar">
        <button type="button" data-action="staples">I have salt, pepper, and olive oil</button>
      </div>
      ${items}
      ${smartChefSectionHtml()}
      <h3>Cook from what you have</h3>
      ${suggest}
    </section>`;
  }

  function importHtml() {
    const imp = ui.import || { step: "home", drafts: [], error: "" };
    const back = `<button type="button" class="btn" data-action="import-cancel">← Back to More</button>`;
    if (imp.step === "csv") {
      const headers = PW_IMPORT && imp.csvText ? PW_IMPORT.csvHeaders(imp.csvText) : [];
      const map = imp.csvMap || {};
      const opts = (key) => headers.map((h) => `<option value="${esc(h)}"${map[key] === h ? " selected" : ""}>${esc(h)}</option>`).join("");
      return `<section class="import-screen">
        <h2>Map CSV columns</h2>
        <p class="lead">Tell Pantry Week which column is the recipe name, ingredients, and steps.</p>
        ${back}
        <form id="csvMapForm" class="stack">
          <label class="field">Recipe name <select name="name" required><option value="">—</option>${opts("name")}</select></label>
          <label class="field">Ingredients <select name="ingredients"><option value="">—</option>${opts("ingredients")}</select></label>
          <label class="field">Steps <select name="steps"><option value="">—</option>${opts("steps")}</select></label>
          <label class="field">Minutes (optional) <select name="minutes"><option value="">—</option>${opts("minutes")}</select></label>
          <label class="field">Servings (optional) <select name="servings"><option value="">—</option>${opts("servings")}</select></label>
          ${imp.error ? `<p class="error" role="alert">${esc(imp.error)}</p>` : ""}
          <button type="submit" class="primary">Preview recipes</button>
        </form>
      </section>`;
    }
    if (imp.step === "preview" && imp.drafts && imp.drafts.length) {
      const rows = imp.drafts.map((row, index) => {
        const dup = row.duplicateId ? PW.recipeById(state, row.duplicateId) : null;
        const recipe = row.recipe || PW_IMPORT.finalizeDraft(row.draft);
        const photo = photoUrl(recipe);
        const dupNote = dup ? `<span class="meta">Matches existing: ${esc(dup.name)} — will skip</span>` : "";
        return `<article class="import-preview-row">
          <label class="check-row">
            <input type="checkbox" data-action="import-toggle" data-index="${index}"${row.selected && !dup ? " checked" : ""}${dup ? " disabled" : ""} />
            <span><strong>${esc(recipe.name)}</strong> · ${esc(timeLabel(recipe))} · ${recipe.ingredients.length} ingredients</span>
          </label>
          ${dupNote}
          ${sourceCreditHtml(recipe)}
          <div class="import-preview-thumb" style="background-image:url('${photo.replace(/'/g, "%27")}')"></div>
          <button type="button" data-action="import-edit" data-index="${index}">Edit before import</button>
        </article>`;
      }).join("");
      return `<section class="import-screen">
        <h2>Preview import</h2>
        <p class="lead">Recipes get the <strong>Imported</strong> tag. Duplicates by name are skipped unless you edit the title.</p>
        ${back}
        <div class="stack">${rows}</div>
        ${imp.error ? `<p class="error" role="alert">${esc(imp.error)}</p>` : ""}
        <div class="toolbar">
          <button type="button" class="primary" data-action="import-commit">Add selected recipes</button>
        </div>
      </section>`;
    }
    return `<section class="import-screen">
      <h2>Import from another app</h2>
      <p class="lead">Bring recipes from Paprika, Mela, CSV exports, or schema.org JSON. Mealime doesn't offer a bulk export — paste a recipe link or text instead.</p>
      ${back}
      <div class="import-methods stack">
        <div class="callout">
          <h3>Recipe file</h3>
          <p class="meta">.paprikarecipes, .paprikarecipe, .melarecipes, .melarecipe, .json / JSON-LD, or .csv</p>
          <input id="importRecipeFile" type="file" accept=".paprikarecipes,.paprikarecipe,.melarecipes,.melarecipe,.json,.jsonld,.csv,application/json,text/csv" />
        </div>
        <form id="importLinkForm" class="stack">
          <h3>Paste a recipe link</h3>
          <p class="meta">Fetches schema.org Recipe data once (needs internet). Works on sites that publish recipe markup.</p>
          <label class="field" for="importLink">Recipe URL</label>
          <input id="importLink" type="url" inputmode="url" placeholder="https://…" value="${esc(imp.linkUrl || "")}" />
          <button type="submit" class="primary">Fetch recipe</button>
        </form>
        <form id="importTextForm" class="stack">
          <h3>Paste recipe text</h3>
          <label class="field" for="importPaste">Title, ingredients, then steps</label>
          <textarea id="importPaste" rows="8" placeholder="Recipe title&#10;&#10;1 cup …&#10;&#10;Steps…">${esc(imp.pasteText || "")}</textarea>
          <button type="submit">Parse text</button>
        </form>
      </div>
      ${imp.error ? `<p class="error" role="alert">${esc(imp.error)}</p>` : ""}
    </section>`;
  }

  function openImport() {
    ui.import = { step: "home", drafts: [], error: "", csvText: "", csvMap: {}, linkUrl: "", pasteText: "" };
    ui.view = "import";
    ui.detailId = null;
    pushHistory();
    render();
    window.scrollTo(0, 0);
  }

  function importDraftsFromRaw(drafts) {
    if (!PW_IMPORT) {
      ui.import.error = "Import tools didn't load. Refresh and try again.";
      render();
      return;
    }
    const list = (drafts || []).filter(Boolean);
    if (!list.length) {
      ui.import.error = "No recipes were found in that input.";
      render();
      return;
    }
    ui.import.drafts = list.map((draft) => {
      const dup = PW_IMPORT.findDuplicate(state.recipes, draft.name);
      return {
        draft: draft,
        recipe: null,
        selected: !dup,
        duplicateId: dup ? dup.id : null
      };
    });
    ui.import.step = "preview";
    ui.import.error = "";
    render();
  }

  function moreHtml() {
    const ver = appSemver();
    const filterHint = ui.filter !== "all"
      ? `<p class="meta">Recipe filter active: <strong>${esc(PW.tagLabel(ui.filter))}</strong> (used when you fill the week).</p>`
      : "";
    return `<section>
      <h2>More</h2>
      <p class="lead">Back up or restore your plan. Nothing is uploaded — a backup file is how you move it to another device.</p>
      ${filterHint}
      <div class="toolbar">
        <button type="button" class="primary" data-action="open-import">Import from another app</button>
      </div>
      <div class="toolbar">
        <button type="button" class="primary" data-action="download">Download backup</button>
        <button type="button" data-action="copy-backup">Copy backup</button>
        <a class="btn" href="print/week.html">Print week and list</a>
      </div>
      <form id="importForm" class="stack">
        <label class="field" for="importFile">Import a backup file</label>
        <input id="importFile" type="file" accept=".json,application/json,text/plain" />
        <label class="field" for="importBox">Or paste backup JSON</label>
        <textarea id="importBox" placeholder="Paste a Pantry Week backup here"></textarea>
        ${ui.importError ? `<p class="error" role="alert">${esc(ui.importError)}</p>` : ""}
        <button type="submit">Import backup</button>
      </form>
      <div class="callout">Clearing this browser's site data erases the plan. Download a backup first if you want to keep it.</div>
      <div class="toolbar">
        <button type="button" data-action="restore">Add missing starter recipes</button>
      </div>
      <section class="settings-block" data-du-settings aria-labelledby="settingsTitle">
        <h3 id="settingsTitle">Settings</h3>
        <p class="settings-note">Your plan is saved on this device only.</p>
        <p class="meta" id="themeChoiceLabel">Appearance</p>
        <div class="theme-choice" role="group" aria-labelledby="themeChoiceLabel">
          <button type="button" data-action="theme-set" data-theme="light" aria-pressed="${currentTheme() === "light"}">Light</button>
          <button type="button" data-action="theme-set" data-theme="dark" aria-pressed="${currentTheme() === "dark"}">Dark</button>
        </div>
        <p class="meta du-app-version" data-du-version="${esc(ver)}">Pantry Week v${esc(ver)}</p>
        <button type="button" class="settings-link" data-action="clear-buyer-code">Remove the buyer code from this device</button>
      </section>
    </section>`;
  }

  function renderPicker() {
    const picker = ui.picker;
    const title = PW.DAY_LABEL[picker.day] + " " + PW.SLOT_LABEL[picker.slot].toLowerCase();
    const matches = state.recipes.filter((recipe) => PW.recipeMatches(recipe, picker.query, picker.filter));
    const rows = matches.length
      ? matches.map((recipe) => `<button type="button" class="pick-row" data-action="pick" data-id="${esc(recipe.id)}"><span class="pick-name">${esc(recipe.name)}</span><span class="pick-meta">${esc(timeLabel(recipe))}</span></button>`).join("")
      : `<p class="empty">No recipes match.</p>`;
    const shell = $("picker");
    const existing = $("pickerSearch");
    const keepFocus = existing && document.activeElement === existing;
    const cursor = keepFocus ? existing.selectionStart : null;
    shell.innerHTML = `<div class="modal-card picker-card" role="document" data-sheet-body="1">
      ${sheetGrab()}
      ${modalChrome("pickerTitle", title, "Back")}
      <div class="picker-tools">
        <label class="field" for="pickerSearch">Search recipes</label>
        <input id="pickerSearch" type="search" value="${esc(picker.query)}" placeholder="Search" />
        <div class="filters" role="toolbar" aria-label="Filters">${chips(picker.filter, "pfilter")}</div>
      </div>
      <div class="picker-list" id="pickerList">${rows}</div>
      <form id="customForm" class="picker-custom">
        <div class="grow">
          <label class="field" for="customMeal">Or type a meal</label>
          <input id="customMeal" type="text" placeholder="Pizza night" autocomplete="off" />
        </div>
        <button type="submit">Add</button>
      </form>
    </div>`;
    shell.hidden = false;
    setInert();
    if (keepFocus) {
      const input = $("pickerSearch");
      input.focus();
      if (cursor != null) input.setSelectionRange(cursor, cursor);
    }
  }

  function renderPickerList() {
    if (!$("pickerList") || !ui.picker) return;
    const matches = state.recipes.filter((recipe) => PW.recipeMatches(recipe, ui.picker.query, ui.picker.filter));
    $("pickerList").innerHTML = matches.length
      ? matches.map((recipe) => `<button type="button" class="pick-row" data-action="pick" data-id="${esc(recipe.id)}"><span class="pick-name">${esc(recipe.name)}</span><span class="pick-meta">${esc(timeLabel(recipe))}</span></button>`).join("")
      : `<p class="empty">No recipes match.</p>`;
  }

  function renderAssign() {
    const assign = ui.assign;
    const recipe = PW.recipeById(state, assign.recipeId);
    if (!recipe) { ui.assign = null; $("assign").hidden = true; return; }
    const dayOpts = PW.DAYS.map((day) => `<option value="${day}"${day === assign.day ? " selected" : ""}>${PW.DAY_LABEL[day]}</option>`).join("");
    const slotOpts = PW.SLOTS.map((slot) => `<option value="${slot}"${slot === assign.slot ? " selected" : ""}>${PW.SLOT_LABEL[slot]}</option>`).join("");
    $("assign").innerHTML = `<div class="modal-card" data-sheet-body="1">
      ${sheetGrab()}
      ${modalChrome("assignTitle", "Add to the week", "Back")}
      <p>${esc(recipe.name)}</p>
      <div class="stack">
        <div><label class="field" for="assignDay">Day</label><select id="assignDay">${dayOpts}</select></div>
        <div><label class="field" for="assignSlot">Meal</label><select id="assignSlot">${slotOpts}</select></div>
        <div class="slot-row">
          <button type="button" class="stepper" data-action="assign-servings" data-dir="-1" aria-label="Fewer servings">−</button>
          <span class="servings" id="assignServings">${assign.servings} servings</span>
          <button type="button" class="stepper" data-action="assign-servings" data-dir="1" aria-label="More servings">+</button>
        </div>
        <button type="button" class="primary" data-action="confirm-assign">Add to plan</button>
      </div>
    </div>`;
    $("assign").hidden = false;
    setInert();
  }

  function renderEditor(focusSelector) {
    const ed = ui.editor;
    if (!ed) { $("editor").hidden = true; return; }
    const checks = DIET.map((tag) => {
      const on = ed.tags.indexOf(tag) !== -1 ? "checked" : "";
      return `<label><input type="checkbox" name="tag" value="${esc(tag)}" ${on} /> ${esc(PW.tagLabel(tag))}</label>`;
    }).join("");
    const rows = ed.rows.map((row, index) => `<div class="ing-row">
      <input data-f="qty" inputmode="decimal" aria-label="Amount" placeholder="Amt" value="${esc(row.qty)}" />
      <input data-f="unit" list="units" aria-label="Unit" placeholder="Unit" value="${esc(row.unit)}" />
      <input data-f="item" aria-label="Ingredient" placeholder="Item" value="${esc(row.item)}" />
      <button type="button" data-action="remove-row" data-index="${index}" aria-label="Remove ingredient row ${index + 1}">Remove</button>
    </div>`).join("");
    $("editor").innerHTML = `<div class="modal-card" data-sheet-body="1">
      ${sheetGrab()}
      ${modalChrome("editorTitle", ed.id ? "Edit recipe" : "New recipe", "Back")}
      <form id="editorForm" class="stack">
        <details class="paste">
          <summary>Paste a recipe from notes</summary>
          <label class="field" for="pasteBox">Plain text</label>
          <textarea id="pasteBox" placeholder="Title&#10;Servings: 4&#10;Time: 20 min&#10;&#10;Ingredients:&#10;1 lb chicken thighs&#10;2 lemons&#10;&#10;Steps:&#10;Heat the oven."></textarea>
          <button type="button" data-action="paste">Fill the form</button>
        </details>
        <div class="photo-add">
          <p class="field">Add from photo</p>
          <p class="meta">Snap or choose a picture of a recipe card or cookbook page. The words are read on this device, then you can fix them.</p>
          <div class="photo-add__actions">
            <button type="button" class="primary" data-action="photo-camera" ${ed.photoBusy ? "disabled" : ""}>Take photo</button>
            <button type="button" data-action="photo-library" ${ed.photoBusy ? "disabled" : ""}>Choose photo</button>
          </div>
          <input id="photoRecipeCamera" class="photo-add__file" type="file" accept="image/*" capture="environment" tabindex="-1" aria-hidden="true" />
          <input id="photoRecipeFile" class="photo-add__file" type="file" accept="image/*" tabindex="-1" aria-hidden="true" />
          ${ed.photoNote ? `<p class="meta" role="status">${esc(ed.photoNote)}</p>` : ""}
        </div>
        ${ed.error ? `<p class="error" role="alert">${esc(ed.error)}</p>` : ""}
        <div class="two">
          <div><label class="field" for="edName">Name</label><input id="edName" type="text" value="${esc(ed.name)}" required /></div>
          <div><label class="field" for="edMinutes">Minutes</label><input id="edMinutes" type="text" inputmode="numeric" value="${esc(ed.minutes)}" /></div>
        </div>
        <div><label class="field" for="edServings">Servings</label><input id="edServings" type="text" inputmode="numeric" value="${esc(ed.servings)}" /></div>
        <div>
          <p class="field">Tags</p>
          <div class="check-grid">${checks}</div>
        </div>
        <div>
          <p class="field">Ingredients</p>
          <div id="edRows" class="stack">${rows}</div>
          <button type="button" data-action="add-row">Add ingredient</button>
        </div>
        <div>
          <label class="field" for="edSteps">Steps, one per line</label>
          <textarea id="edSteps">${esc(ed.stepsText)}</textarea>
        </div>
        <button type="submit" class="primary">Save recipe</button>
      </form>
    </div>`;
    $("editor").hidden = false;
    setInert();
    const focus = focusSelector ? document.querySelector(focusSelector) : $("edName");
    if (focus) focus.focus();
  }

  function captureEditor() {
    const ed = ui.editor;
    if (!ed || !$("edName")) return;
    ed.name = $("edName").value;
    ed.minutes = $("edMinutes").value;
    ed.servings = $("edServings").value;
    ed.stepsText = $("edSteps").value;
    ed.tags = [...document.querySelectorAll("#editorForm input[name=tag]:checked")].map((el) => el.value);
    ed.rows = [...document.querySelectorAll("#edRows .ing-row")].map((row) => ({
      qty: row.querySelector("[data-f=qty]").value,
      unit: row.querySelector("[data-f=unit]").value,
      item: row.querySelector("[data-f=item]").value
    }));
  }

  let wakeLock = null;

  function releaseWakeLock() {
    const lock = wakeLock;
    wakeLock = null;
    if (!lock) return;
    try {
      const done = lock.release();
      if (done && typeof done.catch === "function") done.catch(() => {});
    } catch (err) { /* unsupported or already released */ }
  }

  function requestWakeLock() {
    try {
      if (!ui.cook || wakeLock) return;
      if (!navigator.wakeLock || typeof navigator.wakeLock.request !== "function") return;
      if (document.visibilityState && document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then((lock) => {
        if (!ui.cook) {
          try {
            const done = lock.release();
            if (done && typeof done.catch === "function") done.catch(() => {});
          } catch (err) { /* already gone */ }
          return;
        }
        wakeLock = lock;
        try {
          lock.addEventListener("release", () => {
            if (wakeLock === lock) wakeLock = null;
          });
        } catch (err) { /* listener is optional */ }
      }).catch(() => { /* permission, file://, or no support */ });
    } catch (err) { /* fail silently */ }
  }

  function renderCook() {
    const cook = ui.cook;
    const recipe = cook && PW.recipeById(state, cook.id);
    if (!recipe) { ui.cook = null; $("cook").hidden = true; releaseWakeLock(); return; }
    const step = recipe.steps[cook.step] || "";
    const ings = recipe.ingredients.map((ing) => `<li>${esc(PW.formatLine(ing.qty, ing.unit, ing.item))}</li>`).join("");
    const last = cook.step >= recipe.steps.length - 1;
    const ingCount = recipe.ingredients.length;
    const ingOpen = !!cook.ingredientsOpen;
    $("cook").innerHTML = `<div class="cook-top cook-top--chrome">
        ${iconBtn("nav-back", "Close cook mode", ICON_BACK)}
        <div class="cook-top__main">
          <p class="cook-kicker">Step ${cook.step + 1} of ${recipe.steps.length}</p>
          <h2 id="cookTitle">${esc(recipe.name)}</h2>
        </div>
        ${iconBtn("nav-back", "Close", ICON_CLOSE)}
      </div>
      <details class="cook-ingredients"${ingOpen ? " open" : ""}>
        <summary>
          <span class="cook-ingredients__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>
          </span>
          <span class="cook-ingredients__text">
            <span class="cook-ingredients__label">Ingredients</span>
            <span class="cook-ingredients__hint">${ingCount} item${ingCount === 1 ? "" : "s"} · tap to ${ingOpen ? "hide" : "show"}</span>
          </span>
          <span class="cook-ingredients__chev" aria-hidden="true">›</span>
        </summary>
        <ul class="ing-list cook-ingredients__list">${ings}</ul>
      </details>
      <p class="step-text" id="cookStep" tabindex="-1">${esc(step)}</p>
      <div class="cook-bar">
        <button type="button" data-action="cook-prev"${cook.step === 0 ? " disabled" : ""}>Back</button>
        <button type="button" class="primary" data-action="cook-next">${last ? "Done" : "Next"}</button>
      </div>`;
    $("cook").hidden = false;
    setInert();
    requestWakeLock();
    const ingPanel = $("cook").querySelector(".cook-ingredients");
    if (ingPanel) {
      ingPanel.addEventListener("toggle", () => {
        cook.ingredientsOpen = ingPanel.open;
        const hint = ingPanel.querySelector(".cook-ingredients__hint");
        if (hint) {
          hint.textContent = `${ingCount} item${ingCount === 1 ? "" : "s"} · tap to ${ingPanel.open ? "hide" : "show"}`;
        }
      });
    }
    const live = $("cookStep");
    if (live) live.focus();
  }

  function showText(title, body) {
    $("textDialog").innerHTML = `<div class="modal-card">
      ${modalChrome("textTitle", title, "Back")}
      <p class="lead">Select the text and copy it if the automatic copy did not work.</p>
      <textarea id="copyText" readonly>${esc(body)}</textarea>
    </div>`;
    $("textDialog").hidden = false;
    pushHistory();
    setInert();
    const box = $("copyText");
    box.focus();
    box.select();
  }

  async function copyOrShow(title, text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast("Copied.");
        return;
      }
    } catch (err) { /* show the text instead */ }
    showText(title, text);
  }

  async function sharePantryMeals() {
    const text = PW.formatPantryShareText(cookableRecipes(), state.pantry, state.assumeStaples);
    if (!text) {
      toast("Add a few pantry items first so we can suggest meals to share.");
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: "Meals we can make at home", text: text });
        toast("Shared.");
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    await copyOrShow("Meals we can make at home", text);
  }

  function openPicker(day, slot) {
    ui.picker = { day, slot, query: "", filter: ui.filter === "all" ? slot : ui.filter };
    pushHistory();
    renderPicker();
    const input = $("pickerSearch");
    if (input) input.focus();
  }

  function openAssign(id) {
    const recipe = PW.recipeById(state, id);
    if (!recipe) return;
    ui.assign = { recipeId: id, day: PW.todayKey(), slot: "dinner", servings: recipe.servings || 4 };
    pushHistory();
    renderAssign();
    const day = $("assignDay");
    if (day) day.focus();
  }

  function openEditor(recipe) {
    ui.editor = {
      id: recipe ? recipe.id : null,
      name: recipe ? recipe.name : "",
      minutes: recipe && recipe.minutes != null ? String(recipe.minutes) : "20",
      servings: recipe ? String(recipe.servings || 4) : "4",
      tags: recipe ? recipe.tags.filter((tag) => DIET.indexOf(tag) !== -1) : ["dinner"],
      extraTags: recipe ? recipe.tags.filter((tag) => DIET.indexOf(tag) === -1 && tag !== "quick" && tag !== "fast") : [],
      rows: recipe && recipe.ingredients.length
        ? recipe.ingredients.map((ing) => ({ qty: PW.formatQty(ing.qty), unit: ing.unit || "", item: ing.item }))
        : [{ qty: "", unit: "", item: "" }, { qty: "", unit: "", item: "" }, { qty: "", unit: "", item: "" }],
      stepsText: recipe ? recipe.steps.join("\n") : "",
      photoUrl: recipe && recipe.photoUrl ? recipe.photoUrl : "",
      photoKey: recipe && recipe.photoKey ? recipe.photoKey : "",
      sourceUrl: recipe && recipe.sourceUrl ? recipe.sourceUrl : "",
      sourceName: recipe && recipe.sourceName ? recipe.sourceName : "",
      sourceLicense: recipe && recipe.sourceLicense ? recipe.sourceLicense : "",
      photoNote: "",
      photoBusy: false,
      ocrText: "",
      error: ""
    };
    pushHistory();
    renderEditor();
  }

  function openCook(id) {
    const recipe = PW.recipeById(state, id);
    if (!recipe) return;
    if (!recipe.steps.length) {
      toast("This recipe has no steps yet. Edit it to add some.");
      return;
    }
    ui.cook = { id: id, step: 0, ingredientsOpen: false };
    pushHistory();
    renderCook();
  }

  function assignRecipe(id, day, slot, servings) {
    const recipe = PW.recipeById(state, id);
    if (!recipe || !state.week[day]) return;
    const current = state.week[day][slot];
    if ((current.recipeId || current.custom) && current.recipeId !== id) {
      const label = PW.slotLabel(state, current);
      if (!confirm("Replace " + PW.DAY_LABEL[day] + " " + slot + " (" + label + ") with " + recipe.name + "?")) return;
    }
    state.week[day][slot] = {
      recipeId: id,
      custom: "",
      servings: servings || recipe.servings || 4,
      leftover: false
    };
    ui.picker = null;
    ui.assign = null;
    commit();
    popHistorySilently();
    toast(recipe.name + " is on " + PW.DAY_LABEL[day] + " " + slot + ".");
  }

  function assignCustom(day, slot, name) {
    const text = String(name || "").trim();
    if (!text) return;
    const current = state.week[day][slot];
    if ((current.recipeId || current.custom) && current.custom !== text) {
      if (!confirm("Replace " + PW.DAY_LABEL[day] + " " + slot + " with " + text + "?")) return;
    }
    state.week[day][slot] = { recipeId: "", custom: text, servings: 4, leftover: false };
    ui.picker = null;
    commit();
    toast(text + " is on " + PW.DAY_LABEL[day] + " " + slot + ".");
  }

  function addTonight(id) {
    const recipe = PW.recipeById(state, id);
    if (!recipe) return;
    const day = PW.todayKey();
    const current = state.week[day].dinner;
    if ((current.recipeId || current.custom) && current.recipeId !== id) {
      if (!confirm("Replace " + PW.DAY_LABEL[day] + " dinner (" + PW.slotLabel(state, current) + ") with " + recipe.name + "?")) return;
    }
    state.week[day].dinner = { recipeId: id, custom: "", servings: recipe.servings || 4, leftover: false };
    commit();
    toast(recipe.name + " is tonight's dinner (" + PW.DAY_LABEL[day] + ").");
  }

  function deleteRecipe(id) {
    const recipe = PW.recipeById(state, id);
    if (!recipe) return;
    let used = 0;
    [state.week, state.previousWeek, state.repeatWeek].forEach((week) => {
      if (!week) return;
      PW.DAYS.forEach((day) => PW.SLOTS.forEach((slot) => {
        if (week[day][slot].recipeId === id) used += 1;
      }));
    });
    const message = used
      ? "Remove " + recipe.name + " from your recipe box? It will also come off the plan."
      : "Remove " + recipe.name + " from your recipe box?";
    if (!confirm(message)) return;
    state.recipes = state.recipes.filter((item) => item.id !== id);
    [state.week, state.previousWeek, state.repeatWeek].forEach((week) => {
      if (!week) return;
      PW.DAYS.forEach((day) => PW.SLOTS.forEach((slot) => {
        if (week[day][slot].recipeId === id) week[day][slot] = PW.blankSlot();
      }));
    });
    if (ui.detailId === id) ui.detailId = null;
    commit();
    toast("Recipe removed.");
    writeHash();
  }

  function saveEditor(event) {
    if (event) event.preventDefault();
    captureEditor();
    const ed = ui.editor;
    const name = ed.name.trim();
    if (!name) { ed.error = "Add a recipe name."; renderEditor("#edName"); return; }
    const minutes = PW.parseMinutes(ed.minutes);
    if (minutes == null || minutes < 1) { ed.error = "Add a time in minutes."; renderEditor("#edMinutes"); return; }
    const servings = parseInt(ed.servings, 10);
    if (!servings || servings < 1 || servings > 24) { ed.error = "Servings should be between 1 and 24."; renderEditor("#edServings"); return; }
    const ingredients = [];
    for (let i = 0; i < ed.rows.length; i++) {
      const row = ed.rows[i];
      if (!row.qty.trim() && !row.unit.trim() && !row.item.trim()) continue;
      if (!row.item.trim()) { ed.error = "Each ingredient needs an item name."; renderEditor(); return; }
      let qty = null;
      if (row.qty.trim()) {
        qty = PW.parseQty(row.qty.trim());
        if (qty == null || qty <= 0) {
          ed.error = 'Check the amount "' + row.qty.trim() + '". Use 2, 1/2, or 1 1/2.';
          renderEditor();
          return;
        }
      }
      ingredients.push({ qty: qty, unit: row.unit.trim(), item: row.item.trim() });
    }
    if (!ingredients.length) { ed.error = "Add at least one ingredient."; renderEditor(); return; }
    const steps = ed.stepsText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (!steps.length) { ed.error = "Add at least one step, one per line, so Cook mode has something to show."; renderEditor("#edSteps"); return; }
    const tags = ed.tags.concat(ed.extraTags || []);
    const recipe = PW.normalizeRecipe({
      id: ed.id || PW.uid("c_"),
      name: name,
      minutes: minutes,
      servings: servings,
      tags: tags,
      ingredients: ingredients,
      steps: steps,
      photoUrl: ed.photoUrl || "",
      photoKey: ed.photoKey || "",
      sourceUrl: ed.sourceUrl || "",
      sourceName: ed.sourceName || "",
      sourceLicense: ed.sourceLicense || ""
    });
    if (ui.import && ui.import.editIndex != null) {
      const rowIdx = ui.import.editIndex;
      const dup = PW_IMPORT.findDuplicate(state.recipes, recipe.name);
      ui.import.drafts[rowIdx] = {
        draft: {
          name: recipe.name,
          minutes: recipe.minutes,
          servings: recipe.servings,
          tags: recipe.tags,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          photoUrl: recipe.photoUrl || "",
          photoKey: recipe.photoKey || ""
        },
        recipe: recipe,
        selected: !dup,
        duplicateId: dup ? dup.id : null
      };
      ui.import.editIndex = null;
      ui.editor = null;
      $("editor").hidden = true;
      ui.view = "import";
      setInert();
      render();
      toast("Updated import preview.");
      writeHash();
      return;
    }
    const index = state.recipes.findIndex((item) => item.id === recipe.id);
    if (index >= 0) state.recipes[index] = recipe;
    else state.recipes.push(recipe);
    ui.editor = null;
    ui.detailId = recipe.id;
    ui.view = "recipes";
    $("editor").hidden = true;
    commit(false);
    toast("Recipe saved.");
    writeHash();
  }

  function applyParsedToEditor(parsed) {
    if (parsed.name) ui.editor.name = parsed.name;
    if (parsed.minutes) ui.editor.minutes = String(parsed.minutes);
    if (parsed.servings) ui.editor.servings = String(parsed.servings);
    parsed.tags.forEach((tag) => {
      if (DIET.indexOf(tag) !== -1 && ui.editor.tags.indexOf(tag) === -1) ui.editor.tags.push(tag);
      else if (DIET.indexOf(tag) === -1 && tag !== "quick" && tag !== "fast" && ui.editor.extraTags.indexOf(tag) === -1) ui.editor.extraTags.push(tag);
    });
    if (parsed.ingredients.length) {
      ui.editor.rows = parsed.ingredients.map((ing) => ({
        qty: ing.qty == null ? "" : PW.formatQty(ing.qty),
        unit: ing.unit || "",
        item: ing.item
      }));
    }
    if (parsed.steps.length) ui.editor.stepsText = parsed.steps.join("\n");
    ui.editor.error = parsed.warning || "";
  }

  function applyPaste() {
    captureEditor();
    applyParsedToEditor(PW.parseRecipeText($("pasteBox").value));
    renderEditor();
    toast(ui.editor.error || "Form filled. Check it, then save.");
  }

  function readRecipePhoto(file) {
    if (!ui.editor || !file) return;
    captureEditor();
    if (!window.PW_PHOTO_OCR) {
      ui.editor.photoNote = "Photo reading didn't load. Paste the recipe instead.";
      renderEditor();
      return;
    }
    ui.editor.photoBusy = true;
    ui.editor.photoNote = "Reading the photo…";
    renderEditor();
    PW_PHOTO_OCR.recognize(file, (msg) => {
      if (!ui.editor) return;
      ui.editor.photoNote = msg;
      const note = document.querySelector(".photo-add [role=status]");
      if (note) note.textContent = msg;
    }).then((text) => {
      if (!ui.editor) return;
      const cleaned = PW_PHOTO_OCR.cleanOcrText(text);
      applyParsedToEditor(PW.parseRecipeText(cleaned));
      ui.editor.ocrText = cleaned;
      ui.editor.photoBusy = false;
      ui.editor.photoNote = ui.editor.error || "Check the text, then save. Photo reading makes mistakes.";
      renderEditor();
    }).catch((err) => {
      if (!ui.editor) return;
      ui.editor.photoBusy = false;
      ui.editor.photoNote = (err && err.message) || "Couldn't read that photo.";
      renderEditor();
    });
  }

  const FILL_SCOPES = [
    ["dinner", "Dinners only"],
    ["lunch_dinner", "Lunch + dinner"],
    ["all", "All three meals"]
  ];

  function renderFill() {
    const prefs = state.fillPrefs || { scope: "dinner", replaceAll: false };
    const segments = FILL_SCOPES.map(([id, label]) => {
      const on = prefs.scope === id ? "true" : "false";
      return `<button type="button" class="segment" data-action="fill-scope" data-scope="${esc(id)}" aria-pressed="${on}">${esc(label)}</button>`;
    }).join("");
    const filterNote = ui.filter !== "all"
      ? `Only recipes matching <strong>${esc(PW.tagLabel(ui.filter))}</strong> will be used.`
      : "Recipes are picked at random from your full library (" + PW.STARTERS.length + " starters plus any you added).";
    $("fill").innerHTML = `<div class="modal-card sheet-card" role="document" data-sheet-body="1">
      ${sheetGrab()}
      ${modalChrome("fillTitle", "Fill the week", "Back")}
      <p class="lead">Empty slots are filled with varied meals. Nothing repeats in the same week.</p>
      <p class="meta">${filterNote}</p>
      <p class="field-label">Which meals?</p>
      <div class="segmented" role="group" aria-label="Meals to fill">${segments}</div>
      <label class="check-row">
        <input type="checkbox" id="fillReplaceAll"${prefs.replaceAll ? " checked" : ""} />
        <span>Replace meals already on the plan (not just empty slots)</span>
      </label>
      <div class="toolbar sheet-actions">
        <button type="button" class="primary" data-action="fill-run">Fill week</button>
        <button type="button" data-action="close-fill">Cancel</button>
      </div>
    </div>`;
    $("fill").hidden = false;
    setInert();
  }

  function openFill() {
    ui.fill = true;
    pushHistory();
    renderFill();
  }

  function closeFill() {
    ui.fill = null;
    $("fill").hidden = true;
    setInert();
    popHistorySilently();
  }

  function runFill() {
    const scopeBtn = $("fill").querySelector('.segment[aria-pressed="true"]');
    const scope = scopeBtn ? scopeBtn.getAttribute("data-scope") : (state.fillPrefs && state.fillPrefs.scope) || "dinner";
    const replaceAll = $("fillReplaceAll") && $("fillReplaceAll").checked;
    state.fillPrefs = { scope, replaceAll };
    const options = { scope, replaceAll, filter: ui.filter, query: ui.query };
    const targets = PW.slotsForFillScope ? PW.slotsForFillScope(scope) : ["dinner"];
    let touchesFilled = false;
    if (!replaceAll) {
      PW.DAYS.forEach((day) => {
        targets.forEach((slot) => {
          const cell = state.week[day][slot];
          if (cell && (cell.recipeId || cell.custom)) touchesFilled = true;
        });
      });
    }
    if (replaceAll && PW.weekHasMeals(state.week)) {
      if (!confirm("Replace the selected meals with a new random plan? Copy last week can bring the old plan back.")) return;
      state.previousWeek = PW.clone(state.week);
    } else if (touchesFilled && !replaceAll) {
      /* only empty slots — no confirm */
    }
    state.week = PW.fillSimpleWeek(state.week, state.recipes, options);
    ui.fill = null;
    $("fill").hidden = true;
    setInert();
    commit();
    popHistorySilently();
    toast("Week filled with a fresh mix. Tap any meal to swap it.");
  }

  function fillWeek() {
    openFill();
  }

  function clearWeek() {
    if (!PW.weekHasMeals(state.week)) { toast("The week is already empty."); return; }
    if (!confirm("Clear the whole week?")) return;
    state.previousWeek = PW.clone(state.week);
    state.week = PW.blankWeek();
    commit();
    toast("Week cleared. Copy last week brings it back.");
  }

  function copyLast() {
    if (!state.previousWeek || !PW.weekHasMeals(state.previousWeek)) {
      toast("No earlier week yet. Clear or replace a week, and Copy last week can bring it back.");
      return;
    }
    if (PW.weekHasMeals(state.week) && !confirm("Replace this week with the one you had before?")) return;
    const incoming = PW.clone(state.previousWeek);
    if (PW.weekHasMeals(state.week)) state.previousWeek = PW.clone(state.week);
    state.week = incoming;
    commit();
    toast("Last week is on the planner.");
  }

  function repeatWeek() {
    if (!state.repeatWeek || !PW.weekHasMeals(state.repeatWeek)) {
      if (!PW.weekHasMeals(state.week)) {
        toast("Plan a week first, then tap Repeat week to remember it.");
        return;
      }
      state.repeatWeek = PW.clone(state.week);
      commit();
      toast("This week is saved. Repeat week will put it back after you change the plan.");
      return;
    }
    if (PW.weeksEqual(state.week, state.repeatWeek)) {
      toast("This is already your repeating week.");
      return;
    }
    if (PW.weekHasMeals(state.week) && !confirm("Replace this week with your saved repeating week?")) return;
    if (PW.weekHasMeals(state.week)) state.previousWeek = PW.clone(state.week);
    state.week = PW.clone(state.repeatWeek);
    commit();
    toast("Your repeating week is on the planner.");
  }

  function eatAgain(day, slot) {
    const next = PW.nextDay(day);
    const source = state.week[day][slot];
    if (!source.recipeId && !source.custom) return;
    if (!next) { toast("Sunday has no next day. Mark another meal as leftovers instead."); return; }
    const dest = state.week[next][slot];
    if ((dest.recipeId || dest.custom) && !confirm("Replace " + PW.DAY_LABEL[next] + " " + slot + " with leftovers?")) return;
    state.week[next][slot] = {
      recipeId: source.recipeId,
      custom: source.custom,
      servings: source.servings,
      leftover: true
    };
    commit();
    toast("Leftovers are set for " + PW.DAY_LABEL[next] + ". They are not added to the list again.");
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(PW.exportPayload(state), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pantry-week-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast("Backup file downloading.");
  }

  function applyImport(text) {
    let next;
    try { next = PW.importBackup(text); }
    catch (err) {
      ui.importError = err.message || "That backup could not be read.";
      render();
      return;
    }
    if (!confirm("Replace this device's plan and recipes with the backup (" + next.recipes.length + " recipes)?")) return;
    state = next;
    ui.importError = "";
    ui.detailId = null;
    ui.view = "plan";
    commit(false);
    toast("Backup imported.");
    writeHash();
  }

  function restoreStarters() {
    const ids = {};
    state.recipes.forEach((recipe) => { ids[recipe.id] = 1; });
    let added = 0;
    PW.STARTERS.forEach((starter) => {
      if (ids[starter.id]) return;
      state.recipes.push(PW.normalizeRecipe(PW.clone(starter)));
      added += 1;
    });
    if (!added) { toast("All starter recipes are already in your box."); return; }
    commit();
    toast("Added " + added + " starter recipes.");
  }

  function dismissTip() {
    state.tipSeen = true;
    PW.save(state);
    $("tip").hidden = true;
    setInert();
  }

  function closeTop() {
    navBack();
  }

  function onClick(event) {
    const printLink = event.target.closest && event.target.closest("a[href='print/week.html']");
    if (printLink) {
      try {
        if (PW.storage()) window.name = "";
        else window.name = "PWPRINT:" + JSON.stringify(state);
      } catch (err) { /* the sheet can still read this browser's saved plan */ }
    }
    const btn = event.target.closest("[data-action]");
    if (!btn) {
      if (event.target.id === "tip") dismissTip();
      else if (event.target.classList && event.target.classList.contains("modal")) closeTop();
      return;
    }
    const action = btn.getAttribute("data-action");
    const day = btn.getAttribute("data-day");
    const slot = btn.getAttribute("data-slot");
    const id = btn.getAttribute("data-id");
    if (action === "nav") go(btn.getAttribute("data-view"));
    else if (action === "nav-back") navBack();
    else if (action === "open-plan-recipe") {
      const value = state.week[day][slot];
      const recipe = PW.recipeById(state, value.recipeId);
      if (recipe) {
        ui.view = "recipes";
        ui.detailId = recipe.id;
        pushHistory();
        render();
        window.scrollTo(0, 0);
      } else {
        openPicker(day, slot);
      }
    } else if (action === "open-smart-chef-detail") openSmartChefDetail();
    else if (action === "smart-chef-cook") {
      const draft = ensureSmartChefInRecipes();
      if (draft) openCook(draft.id);
    } else if (action === "clear-buyer-code") {
      if (!confirm("Remove the buyer code from this device? You will need your PDF code to open Pantry Week again.")) return;
      try {
        localStorage.removeItem(BUYER_LS_KEY);
        sessionStorage.removeItem(BUYER_LS_KEY);
      } catch (err) { /* ignore */ }
      toast("Buyer code removed. Reload the app to enter it again.");
    } else if (action === "open-slot") openPicker(day, slot);
    else if (action === "fill") fillWeek();
    else if (action === "fill-scope") {
      const next = btn.getAttribute("data-scope");
      state.fillPrefs = Object.assign({}, state.fillPrefs || {}, { scope: next });
      renderFill();
    } else if (action === "fill-run") runFill();
    else if (action === "close-fill") closeFill();
    else if (action === "clear-week") clearWeek();
    else if (action === "copy-last") copyLast();
    else if (action === "repeat") repeatWeek();
    else if (action === "servings") {
      const dir = parseInt(btn.getAttribute("data-dir"), 10) || 0;
      const value = state.week[day][slot];
      value.servings = Math.min(24, Math.max(1, (value.servings || 1) + dir));
      state = PW.normalize(state);
      PW.save(state);
      const label = btn.parentElement && btn.parentElement.querySelector(".servings");
      if (label) label.textContent = state.week[day][slot].servings + " servings";
    } else if (action === "leftover") {
      state.week[day][slot].leftover = !state.week[day][slot].leftover;
      commit();
    } else if (action === "again") eatAgain(day, slot);
    else if (action === "clear-slot") {
      const prev = PW.clone(state.week[day][slot]);
      if (!prev.recipeId && !prev.custom) return;
      const label = PW.slotLabel(state, prev);
      state.week[day][slot] = PW.blankSlot();
      commit();
      showUndo("Cleared " + PW.DAY_LABEL[day] + " " + PW.SLOT_LABEL[slot].toLowerCase() + (label ? " (" + label + ")." : "."), () => {
        state.week[day][slot] = prev;
        commit();
        toast("Restored " + PW.DAY_LABEL[day] + " " + PW.SLOT_LABEL[slot].toLowerCase() + ".");
      });
    } else if (action === "undo-clear") {
      const restore = undoClear;
      undoClear = null;
      clearTimeout(toast._t);
      hideToast();
      if (restore) restore();
    } else if (action === "cook") openCook(id);
    else if (action === "tonight") addTonight(id);
    else if (action === "open-recipe") {
      ui.detailId = id;
      ui.view = "recipes";
      pushHistory();
      render();
      window.scrollTo(0, 0);
    } else if (action === "choose-slot") openAssign(id);
    else if (action === "edit") openEditor(PW.recipeById(state, id));
    else if (action === "delete") deleteRecipe(id);
    else if (action === "new-recipe") openEditor(null);
    else if (action === "filter") {
      ui.filter = btn.getAttribute("data-filter");
      render();
    } else if (action === "pfilter") {
      ui.picker.filter = btn.getAttribute("data-filter");
      renderPicker();
    } else if (action === "pick") assignRecipe(id, ui.picker.day, ui.picker.slot, PW.recipeById(state, id).servings);
    else if (action === "close-picker" || action === "close-assign" || action === "close-editor" || action === "close-cook" || action === "close-text" || action === "close-fill") navBack();
    else if (action === "assign-servings") {
      const dir = parseInt(btn.getAttribute("data-dir"), 10) || 0;
      ui.assign.servings = Math.min(24, Math.max(1, ui.assign.servings + dir));
      $("assignServings").textContent = ui.assign.servings + " servings";
    } else if (action === "confirm-assign") {
      assignRecipe(ui.assign.recipeId, $("assignDay").value, $("assignSlot").value, ui.assign.servings);
    } else if (action === "add-row") {
      captureEditor();
      ui.editor.rows.push({ qty: "", unit: "", item: "" });
      renderEditor("#edRows .ing-row:last-child [data-f=item]");
    } else if (action === "remove-row") {
      captureEditor();
      ui.editor.rows.splice(parseInt(btn.getAttribute("data-index"), 10), 1);
      if (!ui.editor.rows.length) ui.editor.rows.push({ qty: "", unit: "", item: "" });
      renderEditor();
    } else if (action === "paste") applyPaste();
    else if (action === "photo-camera") {
      const input = $("photoRecipeCamera");
      if (input) input.click();
    } else if (action === "photo-library") {
      const input = $("photoRecipeFile");
      if (input) input.click();
    } else if (action === "find-open") {
      openFoundRecipe(btn.getAttribute("data-url") || "");
    }
    else if (action === "copy-list") copyOrShow("Shopping list", PW.listAsText(PW.buildShoppingList(state)));
    else if (action === "share-pantry") sharePantryMeals();
    else if (action === "pantry-cook-more") {
      loadMorePantryCook();
    } else if (action === "pantry-cook-show-all") {
      ui.pantryCook.expanded = true;
      ui.pantryCook.shown = (ui.pantryCook.rows || []).length;
      renderPantrySuggestList();
    } else if (action === "pantry-smart-chef-open") {
      openPantrySmartChef(btn);
    } else if (action === "pantry-smart-chef-cook") {
      const result = pantrySmartChefResultFromBtn(btn);
      if (!result) return;
      ui.smartChef.result = result;
      const draft = ensureSmartChefInRecipes();
      if (draft) openCook(draft.id);
    } else if (action === "pantry-smart-chef-plan") {
      const result = pantrySmartChefResultFromBtn(btn);
      if (!result) return;
      ui.smartChef.result = result;
      const draft = ensureSmartChefInRecipes();
      if (draft) openAssign(draft.id);
    }
    else if (action === "theme-toggle") setTheme(currentTheme() === "dark" ? "light" : "dark");
    else if (action === "theme-set") setTheme(btn.getAttribute("data-theme"));
    else if (action === "smart-chef-reset") {
      try { localStorage.removeItem("pantry_week_smart_chef_hashes"); } catch (err) { /* ignore */ }
      ui.smartChef = { variation: 0, servings: (ui.smartChef && ui.smartChef.servings) || 4, result: null, sessionHashes: [], token: (ui.smartChef && ui.smartChef.token || 0) + 1, loading: false };
      refreshSmartChef(true);
      render();
      toast("Smart Chef history cleared.");
    }
    else if (action === "smart-chef-again") {
      const prev = ui.smartChef.result;
      recordSmartChefResult(prev);
      ui.smartChef.variation = prev && prev.variation != null ? prev.variation + 1 : (ui.smartChef.variation || 0) + 1;
      refreshSmartChef(true);
      render();
    } else if (action === "smart-chef-save") {
      saveSmartChefRecipe();
    } else if (action === "smart-chef-shop") {
      addSmartChefMissingToList();
    } else if (action === "smart-chef-plan") {
      const draft = ensureSmartChefInRecipes();
      if (!draft) {
        toast("Add more pantry items for Smart Chef to work with.");
        return;
      }
      PW.save(state);
      openAssign(draft.id);
    }
    else if (action === "toggle-checked") { state.hideChecked = !state.hideChecked; commit(); }
    else if (action === "uncheck") {
      if (!Object.keys(state.checked).some((key) => state.checked[key])) { toast("Nothing is checked."); return; }
      if (!confirm("Uncheck every item?")) return;
      state.checked = {};
      commit();
    } else if (action === "have") {
      const item = btn.getAttribute("data-item");
      if (!state.pantry.some((entry) => PW.stapleKey(entry.item) === PW.stapleKey(item))) {
        preparePantryCookReaction(item, true);
        state.pantry.push({ id: PW.uid("p_"), item: item });
      }
      commit();
      toast(cap(item) + " is in the pantry, so it stays off the list.");
    } else if (action === "remove-extra") {
      const menu = btn.closest(".shop-row__menu");
      if (menu) menu.open = false;
      removeExtraItem(btn.getAttribute("data-item"), btn.getAttribute("data-unit") || "");
    } else if (action === "pantry-remove") {
      const removed = state.pantry.find((entry) => entry.id === id);
      preparePantryCookReaction(removed ? removed.item : "", false);
      state.pantry = state.pantry.filter((entry) => entry.id !== id);
      bumpSmartChefPantry();
      commit();
    } else if (action === "staples") {
      let added = 0;
      preparePantryCookReaction("staples", true);
      PW.STAPLES.forEach((item) => {
        if (state.pantry.some((entry) => PW.singularKey(entry.item) === PW.singularKey(item))) return;
        state.pantry.push({ id: PW.uid("p_"), item: item });
        added += 1;
      });
      bumpSmartChefPantry();
      commit();
      toast(added ? "Salt, pepper, and olive oil are marked as already at home." : "Those staples are already in the pantry.");
    } else if (action === "download") downloadBackup();
    else if (action === "copy-backup") copyOrShow("Pantry Week backup", JSON.stringify(PW.exportPayload(state), null, 2));
    else if (action === "restore") restoreStarters();
    else if (action === "open-import") openImport();
    else if (action === "import-cancel") {
      ui.import = null;
      go("more", null);
      writeHash();
    } else if (action === "import-toggle") {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (ui.import && ui.import.drafts[idx] && !ui.import.drafts[idx].duplicateId) {
        ui.import.drafts[idx].selected = !ui.import.drafts[idx].selected;
      }
    } else if (action === "import-edit") {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (!ui.import || !ui.import.drafts[idx] || !PW_IMPORT) return;
      const recipe = PW_IMPORT.finalizeDraft(ui.import.drafts[idx].draft);
      ui.import.editIndex = idx;
      openEditor(recipe);
    } else if (action === "import-commit") commitImport();
    else if (action === "cook-prev") {
      if (ui.cook && ui.cook.step > 0) { ui.cook.step -= 1; renderCook(); }
    } else if (action === "cook-next") {
      if (!ui.cook) return;
      const recipe = PW.recipeById(state, ui.cook.id);
      if (ui.cook.step >= recipe.steps.length - 1) {
        ui.cook = null;
        $("cook").hidden = true;
        $("cook").innerHTML = "";
        setInert();
        releaseWakeLock();
        popHistorySilently();
        toast("That's the end of the recipe.");
      } else {
        ui.cook.step += 1;
        renderCook();
      }
    }
  }

  function onSubmit(event) {
    const form = event.target;
    if (form.id === "extraForm") {
      event.preventDefault();
      const parsed = PW.parseIngredientLine($("extraItem").value);
      if (!parsed || !parsed.item) return;
      state.extras.push({ id: PW.uid("x_"), qty: parsed.qty, unit: parsed.unit, item: parsed.item });
      commit();
      toast("Added to the list.");
    } else if (form.id === "pantryForm") {
      event.preventDefault();
      const parsed = PW.parseIngredientLine($("pantryItem").value);
      if (!parsed || !parsed.item) return;
      if (state.pantry.some((entry) => PW.stapleKey(entry.item) === PW.stapleKey(parsed.item))) {
        toast("That's already in the pantry.");
        return;
      }
      preparePantryCookReaction(parsed.item, true);
      state.pantry.push({ id: PW.uid("p_"), item: parsed.item });
      bumpSmartChefPantry();
      commit();
      toast(cap(parsed.item) + " added to the pantry.");
    } else if (form.id === "customForm") {
      event.preventDefault();
      if (!ui.picker) return;
      assignCustom(ui.picker.day, ui.picker.slot, $("customMeal").value);
    } else if (form.id === "editorForm") {
      event.preventDefault();
      saveEditor(event);
    } else if (form.id === "importForm") {
      event.preventDefault();
      const text = $("importBox").value.trim();
      if (!text) {
        ui.importError = "Paste a backup first, or choose a file.";
        render();
        return;
      }
      applyImport(text);
    } else if (form.id === "importLinkForm") {
      event.preventDefault();
      if (!PW_IMPORT) return;
      const url = $("importLink").value.trim();
      ui.import.linkUrl = url;
      ui.import.error = "";
      if (!url) {
        ui.import.error = "Paste a recipe URL first.";
        render();
        return;
      }
      PW_IMPORT.fetchRecipeFromUrl(url).then((drafts) => importDraftsFromRaw(drafts)).catch((err) => {
        ui.import.error = err.message || "Could not fetch that link.";
        render();
      });
    } else if (form.id === "importTextForm") {
      event.preventDefault();
      const text = $("importPaste").value;
      ui.import.pasteText = text;
      const parsed = PW.parseRecipeText(text);
      if (parsed.warning && !parsed.name && !parsed.ingredients.length) {
        ui.import.error = parsed.warning;
        render();
        return;
      }
      importDraftsFromRaw([{
        name: parsed.name || "Imported recipe",
        minutes: parsed.minutes,
        servings: parsed.servings || 4,
        tags: parsed.tags,
        ingredients: parsed.ingredients,
        steps: parsed.steps,
        photoUrl: ""
      }]);
    } else if (form.id === "csvMapForm") {
      event.preventDefault();
      if (!PW_IMPORT) return;
      const map = {
        name: form.name.value,
        ingredients: form.ingredients.value,
        steps: form.steps.value,
        minutes: form.minutes.value,
        servings: form.servings.value
      };
      ui.import.csvMap = map;
      try {
        const drafts = PW_IMPORT.parseCsv(ui.import.csvText, map);
        importDraftsFromRaw(drafts);
      } catch (err) {
        ui.import.error = err.message || "Could not read that CSV.";
        render();
      }
    } else if (form.id === "findMoreForm") {
      event.preventDefault();
      runFindMore($("findMoreQuery") ? $("findMoreQuery").value : "");
    } else if (form.id === "findLinkForm") {
      event.preventDefault();
      const url = $("findLink") ? $("findLink").value.trim() : "";
      if (!ui.findMore) ui.findMore = { query: "", status: "", results: [], links: [], linkUrl: "", token: 0 };
      ui.findMore.linkUrl = url;
      openFoundRecipe(url);
    } else if (form.getAttribute("role") === "search") {
      event.preventDefault();
    }
  }

  function runFindMore(raw) {
    if (!ui.findMore) ui.findMore = { query: "", status: "", results: [], links: [], linkUrl: "", token: 0 };
    ui.findMore.query = raw;
    if (!window.PW_FIND) return;
    if (!PW_FIND.browserOnline()) {
      ui.findMore.status = PW_FIND.OFFLINE;
      ui.findMore.results = [];
      ui.findMore.links = [];
      render();
      return;
    }
    const query = PW_FIND.cleanQuery(raw);
    if (!query) {
      ui.findMore.status = "Type a dish, like chicken tikka or pork chops.";
      ui.findMore.results = [];
      ui.findMore.links = [];
      render();
      return;
    }
    const token = (ui.findMore.token = (ui.findMore.token || 0) + 1);
    ui.findMore.status = "Searching…";
    ui.findMore.links = PW_FIND.browseLinks(query);
    ui.findMore.results = [];
    render();
    PW_FIND.search(query).then((body) => {
      if (!ui.findMore || ui.findMore.token !== token) return;
      ui.findMore.results = (body && body.results) || [];
      ui.findMore.status = ui.findMore.results.length ? "" : "No Cookbook page for that. Open a recipe site below, or paste a link.";
      render();
    }).catch((err) => {
      if (!ui.findMore || ui.findMore.token !== token) return;
      ui.findMore.results = [];
      ui.findMore.status = (err && err.message) || "Search is unavailable. Open a recipe site or paste a link.";
      render();
    });
  }

  function openFoundRecipe(url) {
    const target = String(url || "").trim();
    if (!ui.findMore) ui.findMore = { query: "", status: "", results: [], links: [], linkUrl: "", token: 0 };
    if (!target) {
      ui.findMore.status = "Paste a recipe URL first.";
      render();
      return;
    }
    if (window.PW_FIND && !PW_FIND.browserOnline()) {
      ui.findMore.status = PW_FIND.OFFLINE;
      render();
      return;
    }
    if (!window.PW_IMPORT) return;
    ui.findMore.status = "Fetching that recipe…";
    ui.findMore.busy = true;
    render();
    PW_IMPORT.fetchRecipeFromUrl(target).then((drafts) => {
      if (ui.findMore) ui.findMore.busy = false;
      if (!ui.import) ui.import = { step: "home", drafts: [], error: "", csvText: "", csvMap: {}, linkUrl: target, pasteText: "" };
      ui.import.linkUrl = target;
      ui.import.error = "";
      ui.view = "import";
      pushHistory();
      importDraftsFromRaw(drafts);
    }).catch((err) => {
      if (ui.findMore) {
        ui.findMore.busy = false;
        ui.findMore.status = (err && err.message) || "Could not fetch that link.";
      }
      ui.view = "recipes";
      render();
    });
  }

  function onInput(event) {
    if (event.target.id === "recipeSearch") {
      ui.query = event.target.value;
      renderRecipeList();
    } else if (event.target.id === "pickerSearch" && ui.picker) {
      ui.picker.query = event.target.value;
      renderPickerList();
    } else if (event.target.id === "findMoreQuery" && ui.findMore) {
      ui.findMore.query = event.target.value;
    } else if (event.target.id === "findLink" && ui.findMore) {
      ui.findMore.linkUrl = event.target.value;
    }
  }

  function onChange(event) {
    const el = event.target;
    if (el.matches && el.matches("[data-action=check]")) {
      const kind = el.getAttribute("data-kind");
      const key = el.getAttribute("data-key");
      if (kind === "note") {
        if (el.checked) state.checked[key] = true;
        else delete state.checked[key];
      } else {
        const itemKey = PW.mergeKey(el.getAttribute("data-item"), el.getAttribute("data-unit") || "");
        const rawQty = el.getAttribute("data-qty");
        const qty = rawQty ? parseFloat(rawQty) : null;
        PW.tickKeys(el.getAttribute("data-item"), el.getAttribute("data-unit") || "").forEach((key) => {
          delete state.checked[key];
        });
        if (el.checked) state.checked[itemKey] = (qty != null && isFinite(qty) && qty > 0) ? qty : true;
      }
      commit();
    } else if ((el.id === "photoRecipeCamera" || el.id === "photoRecipeFile") && el.files && el.files[0]) {
      const file = el.files[0];
      el.value = "";
      readRecipePhoto(file);
    } else if (el.id === "importFile" && el.files && el.files[0]) {
      const reader = new FileReader();
      reader.onload = () => applyImport(String(reader.result || ""));
      reader.onerror = () => {
        ui.importError = "That file could not be read.";
        render();
      };
      reader.readAsText(el.files[0]);
    } else if (el.id === "importRecipeFile" && el.files && el.files[0] && ui.import && PW_IMPORT) {
      const file = el.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result);
        PW_IMPORT.parseFileBytes(bytes, file.name).then((drafts) => importDraftsFromRaw(drafts)).catch((err) => {
          if (err && err.message === "csv-needs-map") {
            ui.import.csvText = bytesToImportText(bytes);
            ui.import.step = "csv";
            ui.import.error = "";
            render();
            return;
          }
          ui.import.error = err.message || "That file could not be read.";
          render();
        });
      };
      reader.onerror = () => {
        ui.import.error = "That file could not be read.";
        render();
      };
      reader.readAsArrayBuffer(file);
      el.value = "";
    }
  }

  function bytesToImportText(bytes) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  function commitImport() {
    if (!ui.import || !PW_IMPORT) return;
    let added = 0;
    ui.import.drafts.forEach((row) => {
      if (!row.selected || row.duplicateId) return;
      const recipe = row.recipe || PW_IMPORT.finalizeDraft(row.draft);
      state.recipes.push(recipe);
      added += 1;
    });
    if (!added) {
      ui.import.error = "No new recipes selected. Uncheck duplicates or edit a title.";
      render();
      return;
    }
    ui.import = null;
    ui.filter = "imported";
    commit(false);
    go("recipes", null);
    toast(added === 1 ? "1 recipe imported." : added + " recipes imported.");
    writeHash();
  }

  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);

  let shopManualPress = null;
  document.addEventListener("touchstart", (event) => {
    const row = event.target.closest && event.target.closest(".shop-row--manual");
    if (!row || event.target.closest(".shop-row__menu, .have, .check")) return;
    const touch = event.touches[0];
    shopManualPress = {
      row,
      x: touch.clientX,
      y: touch.clientY,
      timer: window.setTimeout(() => {
        if (!shopManualPress || shopManualPress.row !== row) return;
        removeExtraItem(row.getAttribute("data-item"), row.getAttribute("data-unit") || "");
        shopManualPress = null;
      }, 600)
    };
  }, { passive: true });
  document.addEventListener("touchmove", (event) => {
    if (!shopManualPress) return;
    const touch = event.touches[0];
    const dx = touch.clientX - shopManualPress.x;
    const dy = touch.clientY - shopManualPress.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      window.clearTimeout(shopManualPress.timer);
      if (dx < -72 && Math.abs(dy) < 48) {
        removeExtraItem(
          shopManualPress.row.getAttribute("data-item"),
          shopManualPress.row.getAttribute("data-unit") || ""
        );
        shopManualPress = null;
        return;
      }
      shopManualPress.row.classList.toggle("shop-row--swiped", dx < -36 && Math.abs(dy) < 48);
    }
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (!shopManualPress) return;
    window.clearTimeout(shopManualPress.timer);
    if (shopManualPress.row) shopManualPress.row.classList.remove("shop-row--swiped");
    shopManualPress = null;
  }, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { closeTop(); return; }
    if (!$("cook").hidden && event.target.tagName !== "INPUT" && event.target.tagName !== "TEXTAREA") {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = document.querySelector("[data-action=cook-next]");
        if (next) next.click();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        const prev = document.querySelector("[data-action=cook-prev]");
        if (prev && !prev.disabled) prev.click();
      }
    }
    if (event.key !== "Tab") return;
    const open = ["cook", "editor", "assign", "picker", "textDialog", "tip"].map($).find((el) => el && !el.hidden);
    if (!open) return;
    const list = [...open.querySelectorAll("button, input, select, textarea, a[href], summary")].filter((el) => !el.disabled && el.tabIndex !== -1);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  function syncChrome() {
    document.body.classList.toggle("tabs-bottom", window.matchMedia("(max-width: 800px)").matches);
  }
  syncChrome();
  window.addEventListener("resize", syncChrome);
  window.addEventListener("popstate", (event) => {
    if (silentHistoryPop > 0) {
      silentHistoryPop -= 1;
      if (navDepth > 0) navDepth -= 1;
      if (event.state && event.state.pw) restoreSnapshot(event.state.pw);
      else readHash();
      render();
      setInert();
      return;
    }
    if (planRootActive()) {
      if (!planExitPending) {
        armPlanExitToast();
        suppressHash++;
        history.pushState({ pw: navSnapshot(), planExitGuard: true }, "", navUrl());
        navDepth += 1;
        suppressHash--;
        return;
      }
      planExitPending = false;
      clearTimeout(planExitTimer);
    }
    if (navDepth > 0) navDepth -= 1;
    if (event.state && event.state.pw) restoreSnapshot(event.state.pw);
    else readHash();
    render();
    setInert();
  });
  window.addEventListener("hashchange", () => {
    if (suppressHash > 0) return;
    readHash();
    render();
  });
  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("pw-page-hidden", document.hidden);
    try {
      if (document.visibilityState === "visible" && ui.cook) requestWakeLock();
    } catch (err) { /* fail silently */ }
  });

  readHash();
  syncHistory(true);
  render();
  if (!state.tipSeen) {
    $("tipBody").textContent = PW.lastMigrated
      ? "Your meals and recipes from the previous version are still on this device. Tap a meal to pick a recipe. The shopping list groups itself by aisle, and Cook walks you through one step at a time."
      : "Tap a meal to pick a recipe. Pantry Week builds a shopping list by aisle, and Cook shows one step at a time. Everything stays on this device.";
    $("tip").hidden = false;
    setInert();
    $("tipOk").focus();
  }
  $("tipOk").addEventListener("click", dismissTip);

  const SWIPE_TAB_PX = 56;
  const SWIPE_LOCK_PX = 14;
  const SWIPE_SHEET_PX = 72;
  let tabTouch = null;
  let sheetTouch = null;

  function isHorizontalScrollArea(el) {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      if (!node.classList) continue;
      if (node.classList.contains("filters") || node.classList.contains("chips") || node.classList.contains("segmented")) return true;
      if (node.classList.contains("modal") || node.classList.contains("cook")) return true;
      const style = window.getComputedStyle(node);
      const ox = style.overflowX;
      if ((ox === "auto" || ox === "scroll" || ox === "overlay") && node.scrollWidth > node.clientWidth + 4) return true;
    }
    return false;
  }

  function tabSwipeAllowed(target, clientX) {
    if (!window.matchMedia("(max-width: 800px)").matches) return false;
    if (overlayOpen()) return false;
    if (ui.detailId) return false;
    if (!target || !target.closest) return false;
    if (!target.closest("#app")) return false;
    if (typeof clientX === "number") {
      const edge = TAB_EDGE_PX;
      if (clientX < edge || clientX > window.innerWidth - edge) return false;
    }
    if (isHorizontalScrollArea(target)) return false;
    return true;
  }

  function sheetSwipeStart(target) {
    const modal = target.closest && target.closest(".modal");
    if (!modal || modal.hidden || modal.id === "tip") return false;
    const head = target.closest(".modal-head--chrome, [data-sheet-grab]");
    return head && modal.contains(head);
  }

  document.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    const t = event.touches[0];
    if (sheetSwipeStart(event.target)) {
      sheetTouch = { y0: t.clientY, x0: t.clientX, locked: null };
      return;
    }
    if (!tabSwipeAllowed(event.target, t.clientX)) return;
    tabTouch = { x0: t.clientX, y0: t.clientY, locked: null };
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (event.touches.length !== 1) return;
    const t = event.touches[0];
    if (sheetTouch) {
      const dy = t.clientY - sheetTouch.y0;
      const dx = t.clientX - sheetTouch.x0;
      if (!sheetTouch.locked) {
        if (Math.abs(dy) < SWIPE_LOCK_PX && Math.abs(dx) < SWIPE_LOCK_PX) return;
        sheetTouch.locked = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
      }
      return;
    }
    if (!tabTouch) return;
    const dx = t.clientX - tabTouch.x0;
    const dy = t.clientY - tabTouch.y0;
    if (!tabTouch.locked) {
      if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
      tabTouch.locked = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
    }
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    const t = event.changedTouches[0];
    if (sheetTouch) {
      const dy = t.clientY - sheetTouch.y0;
      const dx = t.clientX - sheetTouch.x0;
      if (sheetTouch.locked !== "h" && dy >= SWIPE_SHEET_PX && Math.abs(dy) > Math.abs(dx)) navBack();
      sheetTouch = null;
      return;
    }
    if (!tabTouch) return;
    const dx = t.clientX - tabTouch.x0;
    const dy = t.clientY - tabTouch.y0;
    if (tabTouch.locked === "h" && Math.abs(dx) >= SWIPE_TAB_PX && Math.abs(dx) > Math.abs(dy)) {
      const idx = TAB_ORDER.indexOf(ui.view);
      if (idx !== -1) {
        const animNext = prefersReducedMotion() ? null : "right";
        const animPrev = prefersReducedMotion() ? null : "left";
        if (dx < 0 && idx < TAB_ORDER.length - 1) go(TAB_ORDER[idx + 1], animNext);
        else if (dx > 0 && idx > 0) go(TAB_ORDER[idx - 1], animPrev);
      }
    }
    tabTouch = null;
  }, { passive: true });
})();
