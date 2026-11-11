import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const leagueHtml = readFileSync(join(root, "league/index.html"), "utf8");
const homeJs = readFileSync(join(root, "assets/home-v3/home.js"), "utf8");
const homeSsr = readFileSync(join(root, "functions/index.js"), "utf8");

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

check("home.js cache-bust unchanged", indexHtml.includes("/assets/home-v3/home.js?v=20261110speed1"));
check("motw-home slot unchanged", /id="motw-slot"[^>]*motw-home|class="[^"]*motw-home[^"]*"[^>]*id="motw-slot"/.test(indexHtml));
check("featured promo unchanged", indexHtml.includes('id="featured"') && indexHtml.includes("this-spot-could-be-yours-wide.webp") && indexHtml.includes("Get Maker Pro"));
check("no hero store promos", !indexHtml.includes("hc-shop") && !indexHtml.includes("hc-pill"));
check("hcx-stats shell still present", indexHtml.includes('<dl class="hcx-stats" id="hcxStats" hidden></dl>'));
check("existing hcx-stats look kept", indexHtml.includes(".hcx-stats{display:flex;flex-wrap:wrap;gap:22px") && indexHtml.includes(".hcx-stats dd{margin:0;font-size:1.35rem;font-weight:700;color:#f1f2f5}"));

check("focus-visible style on stat link", indexHtml.includes(".hcx-stats a.hcx-stat-link:focus-visible{outline:2px solid #c4b5fd;outline-offset:2px}"));
check("stat link has no default underline on the overlay", indexHtml.includes("a.hcx-stat-link{") && indexHtml.includes("text-decoration:none;cursor:pointer"));
check("whole tile is positioned for a hit target", indexHtml.includes(".hcx-stats .hcx-stat{position:relative}") && indexHtml.includes("position:absolute;inset:-6px"));

const mapMatch = indexHtml.match(/st\.map\(function\(s\)\{[\s\S]*?\}\)/);
check("stats mapper is in homepage script (SSR source + client)", !!mapMatch);
const mapperSrc = mapMatch ? mapMatch[0] : "st.map(function(s){return ''})";
let rendered = "";
try {
  const E = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
  const st = [[63, "Makers"], [107, "Maker listings"], [42, "League votes this week"]];
  rendered = eval(mapperSrc).join("");
} catch (e) {
  console.error("mapper eval error", e);
}
check("client/SSR script output contains votes link to /league/#standings", rendered.includes('href="/league/#standings"') && rendered.includes("League votes this week") && rendered.includes('class="hcx-stat-link"'));
check("votes tile wraps number+label and is a single link", /<div class="hcx-stat"><dt>League votes this week<\/dt><dd>42<\/dd><a class="hcx-stat-link" href="\/league\/#standings">/.test(rendered));
check("Makers stat is not a link", rendered.includes("<div><dt>Makers</dt><dd>63</dd></div>") && !/hcx-stat-link"[^>]*>Makers/.test(rendered));
check("Maker listings stat is not a link", rendered.includes("<div><dt>Maker listings</dt><dd>107</dd></div>"));
check("only one stat link is rendered", (rendered.match(/hcx-stat-link/g) || []).length === 1);

check("functions/index.js does not rewrite #hcxStats (SSR keeps the same script)", !homeSsr.includes("hcxStats") && !homeSsr.includes("hcx-stats") && !homeSsr.includes("League votes"));
check("home.js does not overwrite the stats row", !homeJs.includes("hcxStats") && !homeJs.includes("hcx-stats") && !homeJs.includes("League votes"));

check("league page has id=standings on the standings section", /<section class="card" id="standings" aria-labelledby="standingsHead">/.test(leagueHtml));
check("league #standings has scroll-margin for the sticky nav", leagueHtml.includes("#standings { scroll-margin-top: 88px; }"));
check("standings heading and vote grid still present", leagueHtml.includes('id="standingsHead"') && leagueHtml.includes("This Week’s Standings") && leagueHtml.includes('id="voteHead"') && leagueHtml.includes('id="voteGrid"'));
check("vote section was not given the standings id", !/<section class="card" id="standings" aria-labelledby="voteHead">/.test(leagueHtml));

const cssOnly = (indexHtml.match(/\.hcx-stats[\s\S]*?<\/style>/) || [""])[0];
check("default number/label colors unchanged for unlinked stats", cssOnly.includes(".hcx-stats dt{order:2;font-size:.74rem;color:#8f949e") && cssOnly.includes(".hcx-stats dd{margin:0;font-size:1.35rem;font-weight:700;color:#f1f2f5}"));

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all checks passed");
