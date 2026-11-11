import { recordServerError } from "./_lib/health.js";
import { mintOwnerSession, verifyOwnerSession, parseCookies, ownerSessionCookie, OWNER_COOKIE } from "./_lib/owner.js";
import { isJunkStoreOrToolPath } from "./_lib/junk-store-slugs.js";
const HSTS = "max-age=31536000; includeSubDomains";
// Force HTTPS + HSTS. Owner dashboard shell also requires HTTP Basic Auth (OWNER_BASIC_* Pages secrets).
/**
 * Cloudflare Pages middleware for the owner dashboard shell.
 *
 * Gates /owner and /owner/* with HTTP Basic Auth so crawlers never receive
 * the dashboard HTML or JS. After Basic Auth, the passcode session in
 * /api/owner/login still applies. This file does not authenticate
 * /api/owner/* or /api/community/admin — those stay on the owner session
 * cookie and Bearer COMMUNITY_ADMIN_TOKEN.
 *
 * Pages secrets (encrypt them; either form works):
 *   OWNER_BASIC_USER and OWNER_BASIC_PASS
 *   or OWNER_BASIC_AUTH = "user:pass" (split on the first colon only)
 * When both are set, OWNER_BASIC_USER + OWNER_BASIC_PASS win.
 *
 * Fail closed: if those secrets are missing, every host except loopback
 * (localhost, 127.0.0.1, ::1) gets 401 and the shell is not served.
 * Production and *.pages.dev are never loopback. `wrangler pages dev` on
 * loopback still serves /owner without the secrets, matching local dev
 * before this gate existed. Put the vars in .dev.vars to test the prompt.
 *
 * /community/admin and /community/admin.html always 404. The creator
 * dashboard (/community/dashboard/) and /wolf-updates-x4p9/ are not gated.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function canonicalPath(pathname) {
  let p = String(pathname || "/");
  try {
    p = decodeURIComponent(p);
  } catch {
    /* leave the raw path; a bad escape should not open the gate */
  }
  const parts = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return ("/" + parts.join("/")).toLowerCase();
}

export function isOwnerShell(pathname) {
  const p = canonicalPath(pathname);
  return p === "/owner" || p.startsWith("/owner/");
}

export function isRetiredAdmin(pathname) {
  const p = canonicalPath(pathname);
  return p === "/community/admin" || p === "/community/admin.html";
}

function stripTrailingNewline(value) {
  return String(value ?? "").replace(/\r?\n$/, "");
}

/** @returns {{ user: string, pass: string } | null} */
export function readOwnerBasic(env) {
  const user = String(env?.OWNER_BASIC_USER ?? "").trim();
  const pass = stripTrailingNewline(env?.OWNER_BASIC_PASS);
  if (user && pass) return { user, pass };
  const combined = stripTrailingNewline(env?.OWNER_BASIC_AUTH).trim();
  const i = combined.indexOf(":");
  if (i > 0) {
    const passPart = combined.slice(i + 1);
    const userPart = combined.slice(0, i).trim();
    if (userPart && passPart) return { user: userPart, pass: passPart };
  }
  return null;
}

function timingSafeEqualStr(a, b) {
  const ea = new TextEncoder().encode(String(a ?? ""));
  const eb = new TextEncoder().encode(String(b ?? ""));
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}

function isLoopback(request) {
  try {
    let host = new URL(request.url).hostname.toLowerCase();
    if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
    return LOOPBACK_HOSTS.has(host) || LOOPBACK_HOSTS.has(`[${host}]`);
  } catch {
    return false;
  }
}

function parseBasic(header) {
  const raw = String(header || "");
  if (raw.length > 4096) return null;
  const m = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(raw);
  if (!m) return null;
  let bytes;
  try {
    const bin = atob(m[1]);
    bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  const decoded = new TextDecoder().decode(bytes);
  const i = decoded.indexOf(":");
  if (i < 0) return null;
  return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
}

function basicMatches(presented, expected) {
  if (!presented || !expected) return false;
  const userOk = timingSafeEqualStr(presented.user, expected.user);
  const passOk = timingSafeEqualStr(presented.pass, expected.pass);
  return userOk && passOk;
}

function textResponse(status, body, extra) {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    Vary: "Authorization",
  });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  }
  return new Response(body, { status, headers });
}

function challenge() {
  return textResponse(401, "Unauthorized\n", {
    "WWW-Authenticate": 'Basic realm="Owner", charset="UTF-8"',
  });
}

function unconfigured() {
  return textResponse(401, "Unauthorized\n");
}

function notFound() {
  return textResponse(404, "Not found\n");
}

/**
 * Drop HTML comments that document admin API calls. Other comments stay.
 * The live owner shell has carried a create_listing curl recipe in a comment.
 */
export function stripAdminComments(html) {
  return String(html).replace(/<!--[\s\S]*?-->/g, (block) => {
    if (/create_listing|COMMUNITY_ADMIN_TOKEN|\/api\/community\/admin|\/api\/owner\//i.test(block)) {
      return "";
    }
    return block;
  });
}

function withOwnerHeaders(res) {
  const headers = new Headers(res.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Authorization");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

async function hardenOwnerResponse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("text/html") || res.status === 204 || res.status === 304) {
    return withOwnerHeaders(res);
  }
  const html = await res.text();
  const stripped = stripAdminComments(html);
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Authorization");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(stripped, { status: res.status, statusText: res.statusText, headers });
}


export async function onRequest({ request, next, env, waitUntil }) {
  const url = new URL(request.url);
  const proto = request.headers.get("X-Forwarded-Proto") || url.protocol.replace(":", "");
  const www = url.hostname === "www.digitalundergroundstore.com";
    if (www || (proto === "http" && !isLoopback(request))) {
    // One canonical origin: https://digitalundergroundstore.com (path + query preserved).
    url.protocol = "https:";
    if (www) url.hostname = "digitalundergroundstore.com";
    url.port = "";
    return new Response(null, { status: 301, headers: { Location: url.toString(), "Strict-Transport-Security": HSTS } });
  }
  if (isRetiredAdmin(url.pathname)) return notFound();

  // Store-only cleanup: unpublished mass-batch leftover product/tool pages 301 to /store/.
  if (isJunkStoreOrToolPath(url.pathname)) {
    return new Response(null, { status: 301, headers: { Location: "/store/", "Strict-Transport-Security": HSTS, "X-Robots-Tag": "noindex" } });
  }

  // Edge-gate /owner shell (APIs under /api/owner stay session/Bearer-only).
  if (isOwnerShell(url.pathname)) {
    const expected = readOwnerBasic(env);
    if (!expected) {
      if (!isLoopback(request)) return unconfigured();
    } else {
      // A valid signed owner session cookie (minted after one successful Basic
      // login, 30-day HttpOnly/Secure) also opens the shell. Without this, every
      // asset/navigation re-required Basic, and browsers that drop cached Basic
      // creds (iOS Safari, PWA, tab restore) re-prompted in a loop.
      const presented = parseBasic(request.headers.get("Authorization"));
      if (!basicMatches(presented, expected)) {
        let sessOk = false;
        try { sessOk = await verifyOwnerSession(env, parseCookies(request)[OWNER_COOKIE]); } catch { sessOk = false; }
        if (!sessOk) return challenge();
      }
    }
    const isApiOwner = false; // shell only
    let resOwner;
    try {
      resOwner = await next();
    } catch (e) {
      throw e;
    }
    resOwner = await hardenOwnerResponse(resOwner);
    // Basic Auth is the only owner gate: passing it mints the owner session cookie
    // used by /api/owner/* (replaces the old 4-word passcode login).
    try {
      const have = parseCookies(request)[OWNER_COOKIE];
      if (!(await verifyOwnerSession(env, have))) {
        const sess = await mintOwnerSession(env);
        if (sess) {
          resOwner = new Response(resOwner.body, resOwner);
          resOwner.headers.append("Set-Cookie", ownerSessionCookie(sess));
        }
      }
    } catch (e) { console.error("owner session mint", e); }
    if (!resOwner.headers.has("Strict-Transport-Security")) {
      const out = new Response(resOwner.body, resOwner);
      out.headers.set("Strict-Transport-Security", HSTS);
      return out;
    }
    return resOwner;
  }

  // Repo-only paths (except the published static /tools/field-studio/ app) (unencrypted app source, build tools, internal docs, logs) must never be served.
  if (/^\/(src|tools|scripts|docs|workers|node_modules)(\/|$)/i.test(url.pathname) && !/^\/tools\/(field-studio|commission-request-form|inventory-restock-tracker|maker-weekly-planner|plant-watering-schedule|birthday-reminder-list|contractor-quote-compare|craft-fair-checklist|product-photo-shot-list|maker-order-tracker|savings-goal-tracker|warranty-receipt-log|morning-routine-checklist|launch-post-builder|maker-price-calculator|bill-due-date-tracker|subscription-tracker|emergency-contact-sheet|cleaning-schedule|launch-day-kit|listing-kit|changelog-kit|pricing-page-kit|cold-dm-kit|testimonial-kit|onboarding-email-kit|weekly-budget-kit|move-checklist-kit|waitlist-kit|indie-seo-kit|build-in-public-pack|feedback-kit|holiday-gift-planner|home-maintenance-calendar|job-hunt-kit|indie-pricing-playbook|indie-saas-ops-pack|holiday-hosting-pack|press-kit|beta-invite-kit|competitor-teardown-kit|product-hunt-kit|apartment-hunt-kit|new-parent-checklist|road-trip-kit|pet-care-starter|freelance-tax-year-canada|alternatives-page-kit|wedding-planner|newsletter-welcome-kit|indie-faq-kit|screenshot-checklist|podcast-pitch-kit|declutter-challenge|student-semester-starter|first-apartment-essentials|kids-chore-chart|dunning-email-pack|debt-payoff-planner|new-year-reset-planner|tenant-move-out-checklist|garage-sale-kit|saas-onboarding-checklist|refund-policy-kit|emergency-prep-kit|babysitter-info-sheet|launch-week-email-sequence|client-onboarding-kit|sinking-funds-planner|wedding-thank-you-tracker|meal-train-organizer|holiday-card-tracker|pet-sitter-info-sheet|app-launch-press-list|product-listing-optimizer|cold-outreach-pack|rent-ledger|side-hustle-tax-tracker|baby-shower-gift-tracker|kids-birthday-party-planner|car-maintenance-log|affiliate-program-kit|price-increase-kit|app-store-copy-pack|roommate-bill-splitter|estate-admin-checklist|wedding-rsvp-tracker|college-application-tracker|home-inventory-kit|black-friday-sale-kit|user-interview-kit|giveaway-kit|landing-page-copy-pack|elder-care-coordination|packing-list-kit|family-medical-records|school-lunch-planner|crowdfunding-launch-kit|discord-community-kit|webinar-kit|cancellation-survey-kit|course-outline-pack|kitchen-renovation-planner|listing-copy-builder|maker-outreach-builder|launch-countdown-planner|grocery-budget-tracker|medication-schedule|market-booth-sales-log|wholesale-order-sheet|package-shipping-log|pantry-inventory-list|appliance-manual-log|utility-bill-tracker|maker-time-tracker|custom-order-deposit-log|supply-cost-log|home-repair-log|library-book-tracker|gift-card-balance-tracker|yarn-stash-inventory|craft-show-application-tracker|maker-sales-goal-tracker|freezer-inventory-list|vet-visit-log|kids-allowance-tracker|craft-class-roster|bake-sale-recipe-costing|sewing-pattern-library|plant-propagation-log|household-supply-list|babysitting-hours-log|commission-waitlist|sticker-pricing-calculator|wholesale-price-calculator|medication-refill-tracker|school-forms-tracker|carpool-schedule|craft-fair-booth-layout|print-on-demand-cost-sheet|vendor-sales-tax-summary|meal-prep-label-list|shared-chore-board|etsy-fee-reverse-calculator|consignment-tracking-log|packaging-cost-sheet|potluck-dish-tracker|garden-harvest-log|laundry-stain-checklist|wholesale-moq-planner|digital-download-delivery-checklist|booth-lighting-checklist|moving-box-inventory|kids-activity-calendar|fridge-leftovers-tracker|wholesale-terms-cheat-sheet|craft-fair-breakeven-calculator|supplier-contact-book|packaging-insert-checklist|vacation-away-checklist|team-snack-schedule|screen-time-agreement|maker-newsletter-content-calendar|craft-show-packing-timeline|wholesale-line-sheet-builder|maker-return-request-log|craft-content-idea-bank|pet-medication-schedule|carpool-gas-split-calculator|craft-fair-weather-plan|wholesale-sample-request-tracker|custom-order-timeline-estimator|craft-stall-price-tag-sheet|appliance-energy-cost-log|guest-wifi-card-sheet|seasonal-closet-swap-checklist|parcel-carrier-rate-compare|product-bundle-pricing-calculator|batch-recipe-scaler|discount-code-tracker|room-paint-calculator|bill-tip-splitter|unit-price-compare|maker-cash-flow-forecast|shop-review-request-tracker|vendor-mileage-log|material-cut-yield-calculator|flooring-tile-calculator|baby-feeding-sleep-log|garden-soil-mulch-calculator|cash-float-planner|candle-wax-fragrance-calculator|holiday-shipping-deadline-planner|maker-hourly-rate-calculator|wallpaper-roll-calculator|fuel-economy-log|party-food-quantity-calculator|resin-mix-calculator|shop-conversion-rate-tracker|yarn-yardage-calculator|bulk-supply-price-break-calculator|room-ac-btu-calculator|bedtime-sleep-cycle-calculator|dog-food-portion-calculator|subscription-box-planner|workshop-class-pricing-calculator|3d-print-cost-calculator|kiln-firing-log|commute-cost-calculator|kids-height-growth-log|picture-hanging-calculator|embroidery-stitch-pricing-calculator|print-size-dpi-calculator|clearance-markdown-planner|shipping-box-fit-picker|desk-ergonomics-calculator|lawn-seed-calculator|tv-size-viewing-distance-calculator|quilt-backing-binding-calculator|clay-shrinkage-calculator|board-foot-lumber-calculator|shop-ads-roas-tracker|fence-picket-calculator|holiday-lights-calculator|exam-study-planner|knitting-gauge-converter|jewelry-metal-cost-calculator|screen-print-quote-calculator|personalization-upcharge-calculator|tire-size-comparison-calculator|recipe-unit-converter|home-solar-payback-calculator|macrame-cord-length-calculator|candle-burn-test-log|bulk-order-discount-quote|weaving-warp-calculator|rent-vs-buy-calculator|ev-charging-cost-calculator|curtain-fabric-calculator|bead-bracelet-calculator|leather-hide-calculator|sourdough-feeding-log|concrete-bag-calculator|deck-stain-calculator|water-heater-cost-calculator|soap-lye-calculator|cross-stitch-fabric-calculator|drywall-sheet-calculator|gravel-path-calculator|space-heater-cost-calculator|firewood-cord-calculator|roof-shingle-calculator|pool-chlorine-dose-calculator|rain-barrel-harvest-calculator|pottery-glaze-batch-calculator|equilibrium-brine-calculator|propane-tank-runtime-calculator|stair-stringer-calculator|bakers-percentage-calculator|attic-insulation-calculator|coffee-brew-ratio-calculator|lawn-fertilizer-calculator|homebrew-abv-priming-calculator|aquarium-water-change-calculator|turkey-roast-time-calculator|electrical-circuit-load-calculator|smoked-meat-yield-calculator|board-and-batten-wall-calculator|baseboard-trim-calculator|ice-melt-salt-calculator|led-strip-power-supply-calculator|gutter-downspout-calculator|caulk-sealant-tube-calculator|tile-grout-calculator|epoxy-floor-coating-calculator|pizza-dough-ball-calculator|window-insulation-film-calculator|christmas-tree-size-calculator|retaining-wall-block-calculator|paver-patio-base-calculator|spray-paint-can-calculator|weatherstripping-calculator|led-bulb-savings-calculator|cookie-swap-batch-calculator|crown-moulding-calculator|countertop-area-calculator|gift-wrap-paper-calculator|room-humidifier-size-calculator|pipe-insulation-calculator|snow-day-shovel-time-calculator|picture-frame-mat-calculator|floating-shelf-load-calculator|area-rug-size-calculator|holiday-punch-batch-calculator|block-heater-cost-calculator|plywood-sheet-yield-calculator|embroidery-floss-skein-calculator|backyard-ice-rink-calculator|heat-pump-savings-calculator|gingerbread-house-dough-calculator|bird-seed-feeder-calculator|wood-pellet-stove-cost-calculator|crochet-blanket-yarn-calculator|vinyl-decal-sheet-calculator|beeswax-wrap-calculator|dehumidifier-running-cost-calculator|portable-generator-fuel-calculator|hot-tub-energy-cost-calculator|clothes-dryer-cost-calculator|laser-engraving-job-price-calculator|bath-bomb-batch-calculator|lip-balm-batch-calculator|tie-dye-batch-calculator|dishwasher-running-cost-calculator|ceiling-fan-cost-calculator|chest-freezer-running-cost-calculator|sublimation-mug-price-calculator|wax-melt-batch-calculator|jam-batch-calculator|wreath-supply-calculator|electric-blanket-cost-calculator|air-fryer-vs-oven-cost-calculator|sump-pump-running-cost-calculator|sugar-scrub-batch-calculator|cupcake-order-price-calculator|bookbinding-signature-calculator|slow-cooker-vs-stove-cost-calculator|electric-kettle-vs-stovetop-calculator|heated-towel-rack-cost-calculator|beard-oil-blend-calculator|kombucha-batch-calculator|chocolate-bar-mold-calculator|pool-pump-running-cost-calculator|electric-fireplace-cost-calculator|aquarium-heater-cost-calculator|hot-sauce-batch-calculator|beef-jerky-batch-calculator|granola-batch-calculator|pond-pump-running-cost-calculator|home-sauna-running-cost-calculator|heated-driveway-mat-cost-calculator|maple-syrup-boil-calculator|sausage-batch-calculator|mead-batch-calculator|roof-heat-cable-cost-calculator|garage-heater-cost-calculator|heated-floor-running-cost-calculator|hard-cider-batch-calculator|cheese-yield-calculator|sauerkraut-salt-calculator|baseboard-heater-running-cost-calculator|chicken-coop-heater-cost-calculator|electric-car-winter-range-calculator|pickle-brine-calculator|yogurt-batch-calculator|bone-broth-batch-calculator|snowblower-fuel-cost-calculator|furnace-filter-cost-calculator|winter-tire-cost-calculator|mulled-wine-batch-calculator|hot-chocolate-batch-calculator|fudge-batch-calculator|chili-batch-calculator|humidifier-running-cost-calculator|christmas-light-circuit-calculator|eggnog-batch-calculator|soup-batch-calculator|shortbread-batch-calculator|latke-batch-calculator|holiday-ham-size-calculator|window-insulation-film-calculator|ski-season-pass-calculator|tourtiere-batch-calculator|pierogi-batch-calculator|stuffing-batch-calculator|cranberry-sauce-batch-calculator|cheese-fondue-calculator|butter-tart-batch-calculator|advent-calendar-filler-calculator|nanaimo-bar-batch-calculator|gravy-batch-calculator|mashed-potato-batch-calculator|chocolate-truffle-batch-calculator|party-meatball-calculator|mince-tart-batch-calculator|stocking-stuffer-budget-calculator|charcuterie-board-calculator|sugar-cookie-batch-calculator|dinner-roll-batch-calculator|pie-crust-batch-calculator|roast-vegetable-tray-calculator|yorkshire-pudding-batch-calculator|gift-exchange-budget-calculator|prime-rib-roast-calculator|holiday-tipping-budget-calculator|houseguest-stay-cost-calculator|holiday-drive-fuel-cost-calculator|new-years-champagne-calculator|winter-heating-budget-calculator|wassail-batch-calculator|hot-cocoa-bar-calculator|peppermint-bark-batch-calculator|holiday-tamale-batch-calculator|gift-bow-ribbon-calculator|holiday-card-postage-calculator|snow-removal-service-cost-calculator|real-vs-artificial-tree-calculator|toffee-batch-calculator|peanut-brittle-batch-calculator|salt-dough-ornament-calculator|popcorn-garland-calculator|caramel-corn-batch-calculator|boxing-day-sale-savings-calculator|christmas-dinner-cost-per-guest-calculator|marshmallow-batch-calculator|royal-icing-cookie-calculator|knit-hat-yarn-calculator|dried-orange-garland-calculator|winter-utility-bill-split-calculator|holiday-pet-sitting-cost-calculator|cookie-tin-assembly-calculator|felt-stocking-sewing-calculator|pom-pom-garland-yarn-calculator|felted-wool-ornament-calculator|ugly-sweater-party-budget-calculator|snowshoe-rent-vs-buy-calculator|kids-hockey-season-cost-calculator|family-ski-day-cost-calculator|curling-league-season-cost-calculator|skate-sharpening-schedule-calculator|cross-country-ski-season-pass-calculator|new-years-eve-party-budget-calculator|gift-parcel-shipping-budget-calculator|knit-scarf-yarn-calculator|crochet-mitten-yarn-calculator|ski-wax-tuning-budget-calculator|snowboard-lesson-package-calculator|new-years-day-brunch-budget-calculator|gift-courier-vs-post-calculator|knit-sock-yarn-calculator|crochet-cowl-yarn-calculator|new-years-resolution-savings-calculator|ski-pass-break-even-calculator|ice-fishing-trip-cost-calculator|knit-blanket-yarn-calculator|holiday-gift-budget-split-calculator|party-ice-bag-calculator|winter-boot-cost-per-wear-calculator|toboggan-hill-day-trip-calculator|heat-pump-vs-furnace-cost-calculator|weighted-blanket-fill-calculator|windshield-washer-fluid-calculator|draft-stopper-sewing-calculator|chimney-cleaning-cost-calculator|wool-dryer-ball-batch-calculator|heated-throw-running-cost-calculator|engine-block-heater-cost-calculator|water-heater-blanket-savings-calculator|storm-window-cost-calculator|knit-mitten-yarn-calculator|weaving-warp-length-calculator|gift-basket-cost-calculator|emergency-water-storage-calculator|freezer-meal-batch-cost-calculator|potluck-serving-size-calculator|pressure-canner-batch-calculator|boot-dryer-running-cost-calculator|crochet-hat-yarn-calculator|candle-burn-time-calculator|quilt-batting-size-calculator|thermos-flask-heat-loss-calculator|garage-door-insulation-savings-calculator|radiator-reflector-savings-calculator|sourdough-starter-feed-calculator|knitting-scarf-yarn-calculator|soap-making-batch-cost-calculator|latch-hook-rug-yarn-calculator|car-battery-tender-cost-calculator|dehydrator-batch-time-calculator|tea-blend-batch-cost-calculator|snow-fence-length-calculator|felted-slipper-wool-calculator|attic-hatch-insulation-savings-calculator|beeswax-wrap-batch-calculator|hot-water-bottle-fill-cost-calculator|loom-weaving-yarn-calculator|cold-frame-soil-volume-calculator|jerky-marinade-batch-calculator|window-quilt-fabric-calculator|wool-felt-sheet-cost-calculator|fireplace-glass-door-savings-calculator|seed-starting-tray-cost-calculator|rain-barrel-winterize-cost-calculator|insulated-curtains-savings-calculator|spice-blend-batch-cost-calculator|candle-wick-sizing-calculator|yarn-swift-winder-time-calculator|bread-proofing-box-cost-calculator|ice-scraper-kit-cost-calculator|mudroom-boot-tray-size-calculator|lunch-box-meal-prep-cost-calculator|window-plastic-kit-cost-calculator|crochet-amigurumi-yarn-calculator|heated-pet-bed-running-cost-calculator|sewing-bias-tape-yardage-calculator|root-cellar-volume-calculator|felt-ornament-batch-cost-calculator|heated-birdbath-running-cost-calculator|knitting-fingerless-gloves-yarn-calculator|garage-floor-epoxy-cost-calculator|crochet-dishcloth-yarn-calculator|propane-tank-refill-cost-calculator|knitting-baby-blanket-yarn-calculator|crochet-granny-square-yarn-calculator|car-windshield-cover-cost-calculator|embroidery-hoop-project-cost-calculator|ice-fishing-tip-up-kit-calculator|felted-soap-cover-batch-calculator|wool-sweater-wash-cost-calculator|snow-blower-oil-change-cost-calculator|knitting-tea-cozy-yarn-calculator|driveway-salt-spread-calculator|crochet-market-bag-yarn-calculator|heated-floor-mat-running-cost-calculator|sewing-apron-fabric-calculator|felt-coaster-batch-cost-calculator|pressure-washer-rental-vs-buy-calculator|quilt-binding-strip-calculator|garage-heater-propane-cost-calculator|beeswax-wrap-batch-cost-calculator|window-film-insulation-kit-calculator|macrame-plant-hanger-cord-calculator|gutter-guard-length-cost-calculator|window-caulking-perimeter-cost-calculator|tote-bag-fabric-batch-calculator|smart-thermostat-savings-calculator|scrunchie-batch-cost-calculator|ceiling-paint-coverage-cost-calculator|resin-coaster-batch-cost-calculator|door-sweep-heat-loss-savings-calculator|pipe-insulation-length-cost-calculator|candle-wax-batch-cost-calculator|baseboard-trim-length-cost-calculator|quilt-backing-fabric-calculator|weatherstrip-door-kit-cost-calculator|soap-loaf-batch-cost-calculator|crochet-blanket-yarn-cost-calculator|stair-runner-carpet-cost-calculator|bath-salt-jar-batch-cost-calculator|shiplap-wall-board-cost-calculator|rope-basket-cord-cost-calculator|fence-stain-coverage-cost-calculator|pillow-cover-fabric-cost-calculator|backsplash-tile-cost-calculator|vinyl-plank-flooring-cost-calculator|polymer-clay-earring-batch-cost-calculator|deck-board-cost-calculator|tufted-rug-yarn-cost-calculator|kitchen-cabinet-paint-cost-calculator|linen-napkin-set-fabric-cost-calculator|roller-blind-fabric-cost-calculator|epoxy-river-table-resin-cost-calculator|interior-door-replacement-cost-calculator|leather-wallet-batch-cost-calculator|pegboard-wall-cost-calculator|closet-shelving-cost-calculator|candle-tin-batch-cost-calculator|concrete-planter-batch-cost-calculator|smoke-alarm-replacement-cost-calculator|bathroom-exhaust-fan-cost-calculator|storm-door-install-cost-calculator|shower-glass-door-cost-calculator|dog-treat-batch-cost-calculator|acrylic-keychain-batch-cost-calculator|linocut-print-batch-cost-calculator|kitchen-faucet-replacement-cost-calculator|sump-pump-replacement-cost-calculator|garage-door-opener-cost-calculator|range-hood-install-cost-calculator|enamel-pin-batch-cost-calculator|iron-on-patch-batch-cost-calculator|greeting-card-batch-cost-calculator|water-softener-install-cost-calculator|video-doorbell-install-cost-calculator|dryer-vent-replacement-cost-calculator|garbage-disposal-install-cost-calculator|tea-towel-batch-cost-calculator|resin-trinket-tray-batch-cost-calculator|wooden-coaster-batch-cost-calculator|bathroom-vanity-install-cost-calculator|mailbox-post-install-cost-calculator|under-cabinet-lighting-cost-calculator|kitchen-sink-replacement-cost-calculator|pet-bandana-batch-cost-calculator|cutting-board-batch-cost-calculator|fabric-bookmark-batch-cost-calculator|toilet-replacement-cost-calculator|closet-door-install-cost-calculator|grout-sealing-cost-calculator|paver-patio-sealing-cost-calculator|hair-clip-batch-cost-calculator|leather-keychain-batch-cost-calculator|fabric-headband-batch-cost-calculator|dishwasher-install-cost-calculator|bathroom-mirror-install-cost-calculator|curtain-rod-install-cost-calculator|towel-bar-install-cost-calculator|resin-bookmark-batch-cost-calculator|crochet-coaster-batch-cost-calculator|knit-beanie-batch-cost-calculator|shower-head-replacement-cost-calculator|light-fixture-replacement-cost-calculator|cabinet-hardware-upgrade-cost-calculator|door-knob-replacement-cost-calculator|pressed-flower-frame-batch-cost-calculator|hand-carved-stamp-batch-cost-calculator|air-dry-clay-trinket-dish-batch-cost-calculator|electrical-outlet-replacement-cost-calculator|window-blind-replacement-cost-calculator|stair-handrail-install-cost-calculator|pyrography-sign-batch-cost-calculator|string-art-sign-batch-cost-calculator|hand-painted-mug-batch-cost-calculator|beaded-sun-catcher-batch-cost-calculator|attic-ladder-install-cost-calculator|laundry-sink-install-cost-calculator|medicine-cabinet-install-cost-calculator|wire-wrapped-ring-batch-cost-calculator|stained-glass-ornament-batch-cost-calculator|wooden-spoon-batch-cost-calculator|macrame-wall-hanging-batch-cost-calculator|toilet-seat-replacement-cost-calculator|towel-warmer-install-cost-calculator|soap-dispenser-install-cost-calculator|lavender-sachet-batch-cost-calculator|cork-board-batch-cost-calculator|crochet-plant-hanger-batch-cost-calculator|resin-coaster-set-batch-cost-calculator|door-peephole-install-cost-calculator|closet-rod-install-cost-calculator|keyboard-tray-install-cost-calculator|wind-chime-batch-cost-calculator|dreamcatcher-batch-cost-calculator|bookend-batch-cost-calculator|wall-key-rack-batch-cost-calculator|grab-bar-install-cost-calculator|coat-hook-rail-install-cost-calculator|house-number-sign-install-cost-calculator|bathtub-recaulk-cost-calculator|pot-holder-batch-cost-calculator|candle-holder-batch-cost-calculator|fridge-magnet-batch-cost-calculator|door-threshold-replace-cost-calculator|shelf-bracket-install-cost-calculator|towel-ring-install-cost-calculator|pin-cushion-batch-cost-calculator|napkin-ring-batch-cost-calculator|embroidered-patch-batch-cost-calculator|sticker-sheet-batch-cost-calculator|faucet-aerator-replace-cost-calculator|light-switch-replace-cost-calculator|toilet-flapper-replace-cost-calculator|fabric-bunting-batch-cost-calculator|tassel-garland-batch-cost-calculator|wax-seal-stamp-batch-cost-calculator|mug-rug-batch-cost-calculator|cabinet-hinge-replace-cost-calculator|drawer-slide-replace-cost-calculator|gfci-outlet-replace-cost-calculator|hair-bow-batch-cost-calculator|key-fob-wristlet-batch-cost-calculator|zipper-pouch-batch-cost-calculator|pressed-flower-card-batch-cost-calculator|window-screen-replace-cost-calculator|cabinet-pull-replace-cost-calculator|outlet-cover-plate-replace-cost-calculator|beaded-earring-batch-cost-calculator|quilted-placemat-batch-cost-calculator|wire-wrapped-pendant-batch-cost-calculator|coin-purse-batch-cost-calculator|door-stop-replace-cost-calculator|cabinet-shelf-liner-cost-calculator|range-hood-filter-replace-cost-calculator|ceramic-ring-dish-batch-cost-calculator|hand-stamped-bracelet-batch-cost-calculator|cork-coaster-batch-cost-calculator|fabric-wine-bag-batch-cost-calculator|shower-curtain-replace-cost-calculator|bath-mat-replace-cost-calculator|furnace-humidifier-pad-replace-cost-calculator|tile-trivet-batch-cost-calculator|painted-plant-pot-batch-cost-calculator|leather-luggage-tag-batch-cost-calculator|beeswax-food-wrap-batch-cost-calculator|clothesline-install-cost-calculator|floor-vent-cover-replace-cost-calculator|sink-strainer-replace-cost-calculator|macrame-keychain-batch-cost-calculator|stained-glass-suncatcher-batch-cost-calculator|fabric-bowl-cover-batch-cost-calculator|knit-pot-holder-batch-cost-calculator|door-knocker-install-cost-calculator|garage-bike-rack-install-cost-calculator|entryway-shoe-rack-build-cost-calculator|outdoor-hose-reel-install-cost-calculator|pinecone-firestarter-batch-cost-calculator|crochet-coffee-sleeve-batch-cost-calculator|knit-ear-warmer-batch-cost-calculator|porch-swing-install-cost-calculator|stair-runner-install-cost-calculator|window-film-install-cost-calculator|under-sink-organizer-build-cost-calculator|yarn-pompom-garland-batch-cost-calculator|clay-soap-dish-batch-cost-calculator|punch-needle-wall-art-batch-cost-calculator|closet-shelf-install-cost-calculator|baseboard-heater-cover-build-cost-calculator|magnetic-knife-strip-install-cost-calculator|rag-rug-batch-cost-calculator|dried-flower-bouquet-batch-cost-calculator|leather-bookmark-batch-cost-calculator|rice-heat-pack-batch-cost-calculator|shed-shelving-build-cost-calculator|chalk-paint-furniture-refinish-cost-calculator|window-box-planter-build-cost-calculator|drawer-pull-replacement-cost-calculator|driftwood-wall-hanging-batch-cost-calculator|pebble-art-frame-batch-cost-calculator|macrame-mirror-batch-cost-calculator|wainscoting-panel-install-cost-calculator|radiator-cover-build-cost-calculator|upholstered-headboard-build-cost-calculator|mudroom-bench-build-cost-calculator|sashiko-patch-batch-cost-calculator|shibori-tea-towel-batch-cost-calculator|terrarium-kit-batch-cost-calculator|window-seat-build-cost-calculator|plant-stand-build-cost-calculator|cyanotype-print-batch-cost-calculator|paper-lantern-batch-cost-calculator|quilted-table-runner-batch-cost-calculator|incense-cone-batch-cost-calculator|potting-bench-build-cost-calculator|bird-house-build-cost-calculator|floating-nightstand-build-cost-calculator|needle-felted-animal-batch-cost-calculator|botanical-bath-tea-batch-cost-calculator|clay-bead-necklace-batch-cost-calculator|paper-marbling-batch-cost-calculator|spice-rack-build-cost-calculator|ladder-bookshelf-build-cost-calculator|herb-drying-rack-build-cost-calculator|porch-swing-build-cost-calculator|block-printed-napkin-batch-cost-calculator|beeswax-taper-candle-batch-cost-calculator|punch-needle-pillow-batch-cost-calculator|shade-sail-install-cost-calculator|flagstone-walkway-cost-calculator|compost-bin-build-cost-calculator|pergola-build-cost-calculator|mosaic-stepping-stone-batch-cost-calculator|hand-dyed-yarn-batch-cost-calculator|seed-paper-card-batch-cost-calculator|raised-garden-bed-build-cost-calculator|garden-trellis-build-cost-calculator|picture-ledge-build-cost-calculator|garden-gate-build-cost-calculator|beaded-brooch-batch-cost-calculator|wooden-toy-car-batch-cost-calculator|bow-tie-batch-cost-calculator|fire-pit-ring-build-cost-calculator|firewood-shed-build-cost-calculator|kids-sandbox-build-cost-calculator|outdoor-shower-build-cost-calculator|dog-collar-batch-cost-calculator|quilted-oven-mitt-batch-cost-calculator|tied-fishing-fly-batch-cost-calculator|mud-kitchen-build-cost-calculator|deck-skirting-build-cost-calculator|wall-cubby-build-cost-calculator|patio-bar-counter-build-cost-calculator|beaded-anklet-batch-cost-calculator|rope-dog-toy-batch-cost-calculator|leather-watch-strap-batch-cost-calculator|trash-can-enclosure-build-cost-calculator|wine-rack-build-cost-calculator|hammock-stand-build-cost-calculator|cornhole-board-set-build-cost-calculator|stitch-marker-set-batch-cost-calculator|felt-pennant-flag-batch-cost-calculator|copper-rain-chain-batch-cost-calculator|bat-house-build-cost-calculator|dog-ramp-build-cost-calculator|coat-tree-build-cost-calculator|bee-hotel-build-cost-calculator|knife-roll-batch-cost-calculator|paracord-leash-batch-cost-calculator|beaded-lanyard-batch-cost-calculator|cat-tree-build-cost-calculator|sawhorse-pair-build-cost-calculator|step-stool-build-cost-calculator|wooden-toolbox-build-cost-calculator|guitar-strap-batch-cost-calculator|catnip-toy-batch-cost-calculator|wooden-name-puzzle-batch-cost-calculator|umbrella-stand-build-cost-calculator|magazine-rack-build-cost-calculator|towel-ladder-build-cost-calculator|bread-box-build-cost-calculator|yarn-bowl-batch-cost-calculator|tissue-box-cover-batch-cost-calculator|fabric-storage-bin-batch-cost-calculator|laundry-hamper-build-cost-calculator|storage-ottoman-build-cost-calculator|hanging-pot-rack-build-cost-calculator|wall-mail-sorter-build-cost-calculator|crayon-roll-batch-cost-calculator|reusable-makeup-pad-batch-cost-calculator|leather-cord-keeper-batch-cost-calculator|wall-mug-rack-build-cost-calculator|charging-station-build-cost-calculator|monitor-stand-build-cost-calculator|plate-rack-build-cost-calculator|wax-sachet-batch-cost-calculator|sleep-mask-batch-cost-calculator|wooden-serving-tray-batch-cost-calculator|raised-pet-feeder-build-cost-calculator|broom-mop-holder-build-cost-calculator|wine-glass-rack-build-cost-calculator|toilet-paper-tower-build-cost-calculator|lavender-eye-pillow-batch-cost-calculator|leather-belt-batch-cost-calculator|recipe-box-batch-cost-calculator|workbench-build-cost-calculator|litter-box-enclosure-build-cost-calculator|dog-crate-table-build-cost-calculator|guitar-wall-hanger-build-cost-calculator|reusable-hand-warmer-batch-cost-calculator|wooden-jewelry-box-batch-cost-calculator|wooden-knife-block-batch-cost-calculator|bunk-bed-build-cost-calculator|kayak-rack-build-cost-calculator|vinyl-record-crate-build-cost-calculator|bath-caddy-build-cost-calculator|wall-bottle-opener-batch-cost-calculator|wooden-desk-organizer-batch-cost-calculator|sewn-plush-toy-batch-cost-calculator|toy-box-build-cost-calculator|dog-house-build-cost-calculator|bar-cart-build-cost-calculator|kids-art-easel-build-cost-calculator|wooden-wall-clock-batch-cost-calculator|lazy-susan-batch-cost-calculator|countertop-paper-towel-holder-batch-cost-calculator|adirondack-chair-build-cost-calculator|rabbit-hutch-build-cost-calculator|murphy-bed-build-cost-calculator|concrete-bird-bath-build-cost-calculator|book-nook-batch-cost-calculator|wooden-dollhouse-batch-cost-calculator|felt-hand-puppet-batch-cost-calculator|picnic-table-build-cost-calculator|chicken-coop-build-cost-calculator|cold-plunge-tub-build-cost-calculator|rolling-tool-chest-build-cost-calculator|cribbage-board-batch-cost-calculator|ceramic-spoon-rest-batch-cost-calculator|wooden-chess-board-batch-cost-calculator|platform-bed-frame-build-cost-calculator|farmhouse-coffee-table-build-cost-calculator|duck-house-build-cost-calculator|tumbling-tower-block-game-batch-cost-calculator|wooden-domino-set-batch-cost-calculator|ring-toss-yard-game-batch-cost-calculator|tic-tac-toe-set-batch-cost-calculator|langstroth-beehive-build-cost-calculator|goat-shelter-build-cost-calculator|pallet-patio-sofa-build-cost-calculator|kids-table-chair-set-build-cost-calculator|surf-wax-batch-cost-calculator|bean-bag-chair-batch-cost-calculator|sewn-dog-bed-batch-cost-calculator|hoop-greenhouse-build-cost-calculator|pizza-oven-build-cost-calculator|deck-storage-box-build-cost-calculator|gazebo-build-cost-calculator|baby-bib-batch-cost-calculator|wooden-baby-teether-batch-cost-calculator|felt-quiet-book-batch-cost-calculator|kids-playhouse-build-cost-calculator|outdoor-grill-station-build-cost-calculator|skate-quarter-pipe-build-cost-calculator|floating-dock-build-cost-calculator|pikler-climbing-triangle-batch-cost-calculator|wooden-balance-board-batch-cost-calculator|lotion-bar-batch-cost-calculator|barrel-sauna-build-cost-calculator|backyard-treehouse-build-cost-calculator|cedar-hope-chest-build-cost-calculator|home-climbing-wall-build-cost-calculator|whipped-body-butter-batch-cost-calculator|wooden-headphone-stand-batch-cost-calculator|wooden-clothes-hanger-batch-cost-calculator|ninja-obstacle-course-build-cost-calculator|wooden-dresser-build-cost-calculator|entryway-console-table-build-cost-calculator|solid-shampoo-bar-batch-cost-calculator|natural-deodorant-batch-cost-calculator|homemade-playdough-kit-batch-cost-calculator|wooden-tie-rack-batch-cost-calculator|sliding-barn-door-build-cost-calculator|backyard-putting-green-build-cost-calculator|gaga-ball-pit-build-cost-calculator|wooden-wardrobe-armoire-build-cost-calculator|clay-face-mask-batch-cost-calculator|cuticle-oil-batch-cost-calculator|wooden-rolling-pin-batch-cost-calculator|aquarium-stand-build-cost-calculator|cat-wall-shelf-build-cost-calculator|backyard-smokehouse-build-cost-calculator|pantry-pullout-shelf-build-cost-calculator|kokedama-batch-cost-calculator|succulent-arrangement-batch-cost-calculator|wooden-pickleball-paddle-batch-cost-calculator|tetherball-pole-build-cost-calculator|chalkboard-wall-build-cost-calculator|garden-arbor-build-cost-calculator|horseshoe-pit-build-cost-calculator|bonsai-starter-kit-batch-cost-calculator|potpourri-jar-batch-cost-calculator|leather-valet-tray-batch-cost-calculator|bocce-court-build-cost-calculator|garage-storage-loft-build-cost-calculator|backyard-basketball-court-build-cost-calculator|floating-desk-build-cost-calculator|infused-olive-oil-batch-cost-calculator|creamed-honey-batch-cost-calculator|wooden-key-holder-batch-cost-calculator|backyard-zipline-build-cost-calculator|rain-garden-build-cost-calculator|tree-swing-build-cost-calculator|wooden-pizza-peel-batch-cost-calculator|vanilla-extract-batch-cost-calculator|cocktail-bitters-batch-cost-calculator|backyard-privacy-screen-build-cost-calculator|lumber-storage-rack-build-cost-calculator|compost-sifter-build-cost-calculator|garden-bench-build-cost-calculator|fresh-pasta-batch-cost-calculator|soft-pretzel-batch-cost-calculator|almond-biscotti-batch-cost-calculator|dry-creek-bed-build-cost-calculator|garden-pond-build-cost-calculator|french-drain-build-cost-calculator|garden-edging-build-cost-calculator|energy-ball-batch-cost-calculator|seed-cracker-batch-cost-calculator|apple-chutney-batch-cost-calculator|router-table-build-cost-calculator|miter-saw-station-build-cost-calculator|shop-outfeed-table-build-cost-calculator|basil-pesto-batch-cost-calculator|lemon-curd-batch-cost-calculator|fresh-salsa-batch-cost-calculator|pickled-red-onion-batch-cost-calculator|clamp-rack-build-cost-calculator|curio-cabinet-build-cost-calculator|shop-dust-collection-build-cost-calculator|bbq-sauce-batch-cost-calculator|hummus-batch-cost-calculator|whole-grain-mustard-batch-cost-calculator|tzatziki-batch-cost-calculator|sideboard-buffet-build-cost-calculator|daybed-build-cost-calculator|shop-paint-booth-build-cost-calculator|sweet-pickle-relish-batch-cost-calculator|salad-vinaigrette-batch-cost-calculator|garlic-confit-batch-cost-calculator|guacamole-batch-cost-calculator|catio-build-cost-calculator|carport-build-cost-calculator|deck-railing-build-cost-calculator|compound-butter-batch-cost-calculator|focaccia-batch-cost-calculator|bagel-batch-cost-calculator|garlic-crouton-batch-cost-calculator|window-awning-build-cost-calculator|living-wall-planter-build-cost-calculator|hydroponic-grow-rack-build-cost-calculator|buttermilk-scone-batch-cost-calculator|blueberry-muffin-batch-cost-calculator|beef-empanada-batch-cost-calculator|pork-dumpling-batch-cost-calculator|garden-fountain-build-cost-calculator|home-gym-lifting-platform-build-cost-calculator|wooden-plyo-box-build-cost-calculator|dumbbell-rack-build-cost-calculator|vegetable-samosa-batch-cost-calculator|vegetable-spring-roll-batch-cost-calculator|falafel-batch-cost-calculator|laundry-folding-table-build-cost-calculator|wall-ironing-board-cabinet-build-cost-calculator|dog-wash-station-build-cost-calculator|fudge-brownie-batch-cost-calculator|brown-butter-blondie-batch-cost-calculator|mini-cheesecake-batch-cost-calculator|fruit-galette-batch-cost-calculator|screened-porch-enclosure-build-cost-calculator|outdoor-pull-up-bar-build-cost-calculator|heavy-bag-stand-build-cost-calculator|french-macaron-batch-cost-calculator|cream-puff-batch-cost-calculator|baked-donut-batch-cost-calculator|walnut-baklava-batch-cost-calculator|ice-fishing-shack-build-cost-calculator|attic-knee-wall-storage-build-cost-calculator|window-well-cover-build-cost-calculator|strawberry-shortcake-batch-cost-calculator|tiramisu-batch-cost-calculator|vanilla-panna-cotta-batch-cost-calculator|chocolate-mousse-cup-batch-cost-calculator|exterior-window-shutters-build-cost-calculator|garage-cupola-build-cost-calculator|home-yoga-corner-build-cost-calculator|strawberry-mochi-batch-cost-calculator|french-crepe-batch-cost-calculator|mini-quiche-batch-cost-calculator|freezer-waffle-batch-cost-calculator|fireplace-mantel-build-cost-calculator|faux-ceiling-beam-build-cost-calculator|faux-stone-veneer-wall-build-cost-calculator|ricotta-cannoli-batch-cost-calculator|mini-pavlova-batch-cost-calculator|cinnamon-churro-batch-cost-calculator|flour-tortilla-batch-cost-calculator|tv-media-unit-build-cost-calculator|room-divider-build-cost-calculator|acoustic-wall-panel-build-cost-calculator|chocolate-babka-batch-cost-calculator|cheese-danish-batch-cost-calculator|spanakopita-batch-cost-calculator|salmon-onigiri-batch-cost-calculator|kitchen-island-build-cost-calculator|window-casing-build-cost-calculator|garage-slatwall-build-cost-calculator|mushroom-arancini-batch-cost-calculator|steamed-bao-batch-cost-calculator|scotch-egg-batch-cost-calculator|potato-croquette-batch-cost-calculator|backyard-smoker-build-cost-calculator|dog-agility-course-build-cost-calculator|table-tennis-table-build-cost-calculator|paneer-pakora-batch-cost-calculator|cherry-strudel-batch-cost-calculator|fruit-kolache-batch-cost-calculator|chicken-satay-skewer-batch-cost-calculator|archery-target-build-cost-calculator|backyard-batting-cage-build-cost-calculator|soccer-goal-build-cost-calculator|lemon-madeleine-batch-cost-calculator|crumpet-batch-cost-calculator|naan-batch-cost-calculator|silken-tofu-batch-cost-calculator|volleyball-net-build-cost-calculator|wooden-seesaw-build-cost-calculator|slackline-frame-build-cost-calculator|red-lentil-dal-batch-cost-calculator|lamb-biryani-batch-cost-calculator|seafood-paella-batch-cost-calculator|shakshuka-batch-cost-calculator|backyard-bmx-track-build-cost-calculator|hillside-terrace-build-cost-calculator|tent-pad-build-cost-calculator|breakfast-burrito-batch-cost-calculator|carnitas-taco-batch-cost-calculator|banh-mi-sandwich-batch-cost-calculator|poke-bowl-batch-cost-calculator|backyard-outhouse-build-cost-calculator|blacksmith-forge-build-cost-calculator|seedling-cloche-build-cost-calculator|rice-horchata-batch-cost-calculator|agua-fresca-batch-cost-calculator|cheese-pupusa-batch-cost-calculator|tres-leches-cake-batch-cost-calculator|backyard-yurt-build-cost-calculator|kids-teepee-build-cost-calculator|telescope-pier-build-cost-calculator|creme-brulee-batch-cost-calculator|peach-cobbler-batch-cost-calculator|mango-kulfi-batch-cost-calculator|gulab-jamun-batch-cost-calculator|backyard-footbridge-build-cost-calculator|hugelkultur-mound-build-cost-calculator|pool-cabana-build-cost-calculator|masala-dosa-batch-cost-calculator|kasha-knish-batch-cost-calculator|adjarian-khachapuri-batch-cost-calculator|zucchini-fritter-batch-cost-calculator|chaise-lounge-build-cost-calculator|moving-dolly-build-cost-calculator|zen-rock-garden-build-cost-calculator|shrimp-ceviche-batch-cost-calculator|shawarma-platter-batch-cost-calculator|dolma-batch-cost-calculator|moussaka-batch-cost-calculator|porch-column-wrap-build-cost-calculator|crawlspace-vapour-barrier-build-cost-calculator|basement-subfloor-build-cost-calculator|overnight-oats-batch-cost-calculator|chia-seed-cup-batch-cost-calculator|smoothie-freezer-pack-batch-cost-calculator|buttermilk-pancake-batch-cost-calculator|model-railway-layout-build-cost-calculator|drum-riser-build-cost-calculator|dartboard-backboard-build-cost-calculator|braided-challah-batch-cost-calculator|ciabatta-batch-cost-calculator|candied-pecan-batch-cost-calculator|hazelnut-cocoa-spread-batch-cost-calculator|kids-rocking-horse-build-cost-calculator|marble-run-wall-build-cost-calculator|croquet-set-build-cost-calculator|pepperoni-calzone-batch-cost-calculator|cornish-pasty-batch-cost-calculator|cotton-candy-batch-cost-calculator|greek-loukoumades-batch-cost-calculator|arcade-machine-build-cost-calculator|skittle-alley-build-cost-calculator|toddler-busy-board-build-cost-calculator|alfajor-batch-cost-calculator|rugelach-batch-cost-calculator|nougat-batch-cost-calculator|florentine-batch-cost-calculator|disc-golf-catcher-build-cost-calculator|backyard-aviary-build-cost-calculator|parrot-play-perch-build-cost-calculator|lasagna-batch-cost-calculator|cajun-jambalaya-batch-cost-calculator|enchilada-batch-cost-calculator|cassoulet-batch-cost-calculator|tortoise-pen-build-cost-calculator|hamster-habitat-build-cost-calculator|ant-farm-build-cost-calculator|hungarian-goulash-batch-cost-calculator|tonkatsu-batch-cost-calculator|meatloaf-batch-cost-calculator|stroganoff-batch-cost-calculator|puppet-theater-build-cost-calculator|skee-ball-lane-build-cost-calculator|reptile-vivarium-build-cost-calculator|shepherds-pie-batch-cost-calculator|risotto-batch-cost-calculator|ratatouille-batch-cost-calculator|moroccan-tagine-batch-cost-calculator|wooden-tilt-maze-build-cost-calculator|shuffleboard-court-build-cost-calculator|hermit-crab-crabitat-build-cost-calculator|seafood-gumbo-batch-cost-calculator|souvlaki-batch-cost-calculator|bulgogi-batch-cost-calculator|birria-taco-batch-cost-calculator|wooden-stilts-build-cost-calculator|hopscotch-path-build-cost-calculator|chick-brooder-build-cost-calculator|arepa-batch-cost-calculator|filipino-adobo-batch-cost-calculator|beef-rendang-batch-cost-calculator|lamb-kofta-batch-cost-calculator|crokinole-board-build-cost-calculator|carrom-board-build-cost-calculator|kids-indoor-slide-build-cost-calculator|cat-window-perch-build-cost-calculator|schnitzel-batch-cost-calculator|osso-buco-batch-cost-calculator|crawfish-etouffee-batch-cost-calculator|mancala-board-build-cost-calculator|butterfly-habitat-build-cost-calculator|saddle-rack-build-cost-calculator|piroshki-batch-cost-calculator|quesadilla-batch-cost-calculator|elote-cup-batch-cost-calculator|onion-bhaji-batch-cost-calculator|kids-pull-wagon-build-cost-calculator|soapbox-racer-build-cost-calculator|nine-mens-morris-board-build-cost-calculator|swiss-rosti-batch-cost-calculator|kibbeh-batch-cost-calculator|poutine-batch-cost-calculator|bitterballen-batch-cost-calculator|kids-xylophone-build-cost-calculator|wooden-abacus-build-cost-calculator|plinko-board-build-cost-calculator|hen-roost-bar-build-cost-calculator|aloo-paratha-batch-cost-calculator|idli-sambar-batch-cost-calculator|vada-pav-batch-cost-calculator|pani-puri-batch-cost-calculator|kids-kalimba-build-cost-calculator|wooden-tangram-set-build-cost-calculator|horse-mounting-block-build-cost-calculator|cavaletti-pole-set-build-cost-calculator|lumpia-batch-cost-calculator|coxinha-batch-cost-calculator|pao-de-queijo-batch-cost-calculator|tequenos-batch-cost-calculator|peg-solitaire-board-build-cost-calculator|four-in-a-row-board-build-cost-calculator|wooden-kendama-build-cost-calculator|chicken-dust-bath-build-cost-calculator|tack-trunk-build-cost-calculator|burek-batch-cost-calculator|chebureki-batch-cost-calculator|ensaimada-batch-cost-calculator|hnefatafl-board-build-cost-calculator|kids-kaleidoscope-build-cost-calculator|kids-periscope-build-cost-calculator|goat-milking-stand-build-cost-calculator|knafeh-batch-cost-calculator|basbousa-batch-cost-calculator|sesame-halva-batch-cost-calculator|lavash-batch-cost-calculator|senet-board-build-cost-calculator|royal-game-of-ur-board-build-cost-calculator|pinhole-camera-build-cost-calculator|cardboard-castle-build-cost-calculator|dog-snuffle-mat-build-cost-calculator|mitarashi-dango-batch-cost-calculator|taiyaki-batch-cost-calculator|takoyaki-batch-cost-calculator|fox-and-geese-board-build-cost-calculator|parcheesi-board-build-cost-calculator|kids-geoboard-build-cost-calculator|wooden-lacing-card-set-build-cost-calculator|egg-incubator-build-cost-calculator|okonomiyaki-batch-cost-calculator|yakitori-batch-cost-calculator|karaage-batch-cost-calculator|alquerque-board-build-cost-calculator|halma-board-build-cost-calculator|wooden-train-track-set-build-cost-calculator|wooden-shape-sorter-build-cost-calculator|gyudon-batch-cost-calculator|tamagoyaki-batch-cost-calculator|chawanmushi-batch-cost-calculator|unagi-don-batch-cost-calculator|kids-sensory-bin-build-cost-calculator|kids-light-table-build-cost-calculator|sjoelen-board-build-cost-calculator|hook-and-ring-game-build-cost-calculator|mapo-tofu-batch-cost-calculator|jianbing-batch-cost-calculator|scallion-pancake-batch-cost-calculator|char-siu-batch-cost-calculator|kids-water-wall-build-cost-calculator|felt-story-board-build-cost-calculator|kids-music-wall-build-cost-calculator|cat-exercise-wheel-build-cost-calculator|turon-batch-cost-calculator|bibingka-batch-cost-calculator|hopia-batch-cost-calculator|puto-batch-cost-calculator|kids-art-cart-build-cost-calculator|doll-cradle-build-cost-calculator|halo-halo-batch-cost-calculator|leche-flan-batch-cost-calculator|cassava-cake-batch-cost-calculator|polvoron-batch-cost-calculator|pandesal-batch-cost-calculator|suman-batch-cost-calculator)(\/|$)/i.test(url.pathname) || /^\/(dev\.log|README\.md|package(-lock)?\.json)$/i.test(url.pathname)) {
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain", "Strict-Transport-Security": HSTS, "X-Robots-Tag": "noindex" } });
  }
  // /apps/<app>/... -> /<app>/... (canonical phone-app URLs live at the site root)
  const am = url.pathname.match(/^\/apps\/([a-z0-9-]+)(\/.*)?$/);
  if (am) {
    url.pathname = "/" + am[1] + (am[2] || "/");
    return new Response(null, { status: 301, headers: { Location: url.toString(), "Strict-Transport-Security": HSTS } });
  }
  const isApi = url.pathname.startsWith("/api/");
  // This least-privilege export must remain read-only even on backend failures.
  const isReadOnlyContacts = /^\/api\/internal\/maker-contacts\/?$/.test(url.pathname);
  let res;
  try {
    res = await next();
  } catch (e) {
    if (isApi && !isReadOnlyContacts && env && env.COMMUNITY_KV) waitUntil(recordServerError(env.COMMUNITY_KV, url.pathname, "throw"));
    throw e;
  }
  if (isApi && !isReadOnlyContacts && res.status >= 500 && env && env.COMMUNITY_KV) waitUntil(recordServerError(env.COMMUNITY_KV, url.pathname, res.status));
  // Site-wide presence heartbeat: inject /assets/presence.js into public HTML pages missing it.
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!isApi && request.method === "GET" && res.status === 200 && ct.includes("text/html") && typeof HTMLRewriter !== "undefined") {
    let seen = false;
    res = new HTMLRewriter()
      .on('script[src*="presence.js"]', { element() { seen = true; } })
      .on("body", { element(el) { el.onEndTag((end) => { if (!seen) end.before('<script src="/assets/presence.js?v=2" defer></script>', { html: true }); }); } })
      .transform(res);
  }
  if (res.headers.has("Strict-Transport-Security")) return res;
  const out = new Response(res.body, res);
  out.headers.set("Strict-Transport-Security", HSTS);
  return out;
}
