/**
 * Worker-side health probes for the Owner dashboard.
 *
 * /owner/ is edge-gated with HTTP Basic Auth. An unauthenticated GET returns
 * 401 (or 403) with a Basic challenge when the gate is up. That is healthy.
 * Every other probe still fails on any non-2xx response.
 */

export const SLOW_MS = 1500;

export const PROBES = [
  { name: "Owner login", path: "/owner/" },
  { name: "Maker League", path: "/api/league" },
];

export function isOwnerLoginProbe(probe) {
  if (!probe) return false;
  if (probe.name === "Owner login") return true;
  const path = String(probe.path || "");
  return path === "/owner" || path === "/owner/";
}

/** True when this response means the probed page is up. */
export function responseIsUp(probe, response) {
  if (!response) return false;
  const status = Number(response.status);
  if (response.ok || (status >= 200 && status < 300)) return true;
  if (isOwnerLoginProbe(probe) && (status === 401 || status === 403)) return true;
  return false;
}

/**
 * @returns {"ok"|"slow"|"fail"}
 * Slow is unchanged: an up response slower than SLOW_MS is "slow", not "fail".
 */
export function probeState(probe, response, ms) {
  if (!responseIsUp(probe, response)) return "fail";
  if (Number(ms) > SLOW_MS) return "slow";
  return "ok";
}

/** Label shown on the Owner Health tab. */
export function healthVerdict(probe, response, ms) {
  const state = probeState(probe, response, ms);
  const name = probe?.name || "Check";
  const status = Number(response?.status) || 0;
  if (state === "fail") {
    return { state, label: name + " down" + (status ? " (" + status + ")" : "") };
  }
  if (state === "slow") return { state, label: name + " slow" };
  return { state, label: name + " ok" };
}

/**
 * GET each probe from the Worker, without the caller's Basic credentials,
 * so /owner/ receives the auth challenge.
 * @param {string} origin
 * @param {typeof fetch} [fetchImpl]
 */
export async function runProbes(origin, fetchImpl = fetch) {
  const base = new URL(origin);
  const results = [];
  for (const probe of PROBES) {
    const url = new URL(probe.path, base);
    if (url.origin !== base.origin) {
      results.push({ name: probe.name, path: probe.path, status: 0, ms: 0, state: "fail" });
      continue;
    }
    const t0 = Date.now();
    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method: "GET",
        redirect: "follow",
        headers: { Accept: "*/*", "User-Agent": "du-health-probe" },
      });
    } catch {
      results.push({
        name: probe.name,
        path: probe.path,
        status: 0,
        ms: Date.now() - t0,
        state: "fail",
      });
      continue;
    }
    const ms = Date.now() - t0;
    const verdict = healthVerdict(probe, response, ms);
    results.push({
      name: probe.name,
      path: probe.path,
      status: response.status,
      ms,
      state: verdict.state,
      label: verdict.label,
    });
  }
  return results;
}
