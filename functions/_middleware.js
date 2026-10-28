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
    const host = new URL(request.url).hostname.toLowerCase();
    return LOOPBACK_HOSTS.has(host);
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

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;
  if (isRetiredAdmin(path)) return notFound();
  if (!isOwnerShell(path)) return context.next();

  const expected = readOwnerBasic(env);
  if (!expected) {
    if (isLoopback(request)) return context.next();
    return unconfigured();
  }
  const presented = parseBasic(request.headers.get("Authorization"));
  if (!basicMatches(presented, expected)) return challenge();
  return hardenOwnerResponse(await context.next());
}
