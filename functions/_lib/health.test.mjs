import { readFileSync } from "node:fs";
import { healthVerdict, isOwnerLoginProbe, probeState, PROBES, responseIsUp, runProbes, SLOW_MS } from "./health.js";

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

const owner = PROBES.find((p) => p.name === "Owner login");
const league = PROBES.find((p) => p.path === "/api/league");

check("owner probe is listed", owner && owner.path === "/owner/");
check("owner probe recognized by name and path", isOwnerLoginProbe(owner) && isOwnerLoginProbe({ path: "/owner" }));
check("other probe is not an auth challenge", !isOwnerLoginProbe(league) && !isOwnerLoginProbe({ name: "Home", path: "/" }));

check("owner 401 is up", responseIsUp(owner, { ok: false, status: 401 }));
check("owner 403 is up", responseIsUp(owner, { ok: false, status: 403 }));
check("owner 401 verdict is ok, not down", healthVerdict(owner, { ok: false, status: 401 }, 40).label === "Owner login ok");
check("owner 401 is not fail", probeState(owner, { ok: false, status: 401 }, 40) === "ok");
check("owner 200 is ok", probeState(owner, { ok: true, status: 200 }, 20) === "ok");
check("owner 500 is down", healthVerdict(owner, { ok: false, status: 500 }, 20).label === "Owner login down (500)");
check("owner 404 is down", probeState(owner, { ok: false, status: 404 }, 10) === "fail");

check("league 401 is down", healthVerdict(league, { ok: false, status: 401 }, 30).label === "Maker League down (401)");
check("league 500 is down", probeState(league, { ok: false, status: 500 }, 10) === "fail");
check("league 200 is ok", probeState(league, { ok: true, status: 200 }, 100) === "ok");
check("slow threshold unchanged", SLOW_MS === 1500);
check("slow 200 stays slow", probeState(league, { ok: true, status: 200 }, 1501) === "slow");
check("fast 200 is not slow", probeState(league, { ok: true, status: 200 }, 1500) === "ok");
check("owner 401 slower than threshold is slow, not down", probeState(owner, { ok: false, status: 401 }, 2000) === "slow");

let sawAuth = false;
const fake = async (url, init) => {
  const headers = new Headers((init && init.headers) || {});
  if (headers.has("Authorization")) sawAuth = true;
  if (String(url).endsWith("/owner/")) return { ok: false, status: 401 };
  if (String(url).endsWith("/api/league")) return { ok: true, status: 200 };
  return { ok: false, status: 404 };
};
const rows = await runProbes("https://digitalundergroundstore.com", fake);
const ownerRow = rows.find((r) => r.path === "/owner/");
const leagueRow = rows.find((r) => r.path === "/api/league");
check("runProbes owner 401 is ok", ownerRow && ownerRow.state === "ok" && ownerRow.status === 401 && ownerRow.label === "Owner login ok");
check("runProbes league 200 is ok", leagueRow && leagueRow.state === "ok" && leagueRow.status === 200);
check("probe does not send authorization", sawAuth === false);

const uiSrc = readFileSync(new URL("../../owner/owner.js", import.meta.url), "utf8");
const uiStart = uiSrc.indexOf("function healthVerdict");
const uiEnd = uiSrc.indexOf("function loadHealth");
const healthVerdictUi = new Function(uiSrc.slice(uiStart, uiEnd) + "\nreturn healthVerdict;")();
check(
  "ui treats owner 401 as ok",
  healthVerdictUi({ name: "Owner login", path: "/owner/", status: 401, ms: 80 }).label === "Owner login ok"
);
check(
  "ui still fails other 401s",
  healthVerdictUi({ name: "Maker League", path: "/api/league", status: 401, ms: 80 }).label === "Maker League down (401)"
);
check(
  "ui leaves slow responses slow",
  healthVerdictUi({ name: "Maker League", path: "/api/league", status: 200, ms: 1800 }).state === "slow"
);

if (failed) process.exit(1);
