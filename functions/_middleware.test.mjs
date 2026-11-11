import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalPath,
  isOwnerShell,
  isRetiredAdmin,
  onRequest,
  readOwnerBasic,
  stripAdminComments,
} from "./_middleware.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

function basic(user, pass) {
  return "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
}

function ctx(url, { headers = {}, env = {}, body = "<p>ok</p>", status = 200, contentType = "text/html; charset=utf-8" } = {}) {
  let nextCalls = 0;
  const request = new Request(url, { headers });
  return {
    request,
    env,
    nextCalls: () => nextCalls,
    async next() {
      nextCalls += 1;
      return new Response(body, {
        status,
        headers: { "content-type": contentType },
      });
    },
  };
}

const SECRETS = { OWNER_BASIC_USER: "donald", OWNER_BASIC_PASS: "correct horse" };

check("canonical owner", canonicalPath("/owner/") === "/owner");
check("canonical dots", canonicalPath("/owner/../community/admin.html") === "/community/admin.html");
check("canonical case", canonicalPath("/Owner/Owner.JS") === "/owner/owner.js");
check("owner shell", isOwnerShell("/owner") && isOwnerShell("/owner/owner.js") && !isOwnerShell("/api/owner/me"));
check("not ownership", !isOwnerShell("/ownership"));
check("retired admin", isRetiredAdmin("/community/admin") && isRetiredAdmin("/community/admin.html"));
check("not dashboard", !isRetiredAdmin("/community/dashboard/") && !isRetiredAdmin("/api/community/admin"));

const pair = readOwnerBasic(SECRETS);
check("read pair", pair && pair.user === "donald" && pair.pass === "correct horse");
const combined = readOwnerBasic({ OWNER_BASIC_AUTH: "ada:secret:with:colon\n" });
check("read combined colon", combined && combined.user === "ada" && combined.pass === "secret:with:colon");
check("pair wins", readOwnerBasic({ ...SECRETS, OWNER_BASIC_AUTH: "other:nope" }).user === "donald");
check("missing secrets", readOwnerBasic({}) === null);
check("empty pass missing", readOwnerBasic({ OWNER_BASIC_USER: "donald", OWNER_BASIC_PASS: "" }) === null);

const shell = `<!-- keep -->
<!--
  curl -X POST https://digitalundergroundstore.com/api/community/admin \\
    -H "Authorization: Bearer $COMMUNITY_ADMIN_TOKEN" \\
    -d '{"action":"create_listing"}'
-->
<p>login</p>`;
const stripped = stripAdminComments(shell);
check("strips admin comment", !stripped.includes("create_listing") && !stripped.includes("COMMUNITY_ADMIN_TOKEN"));
check("keeps other comment", stripped.includes("<!-- keep -->") && stripped.includes("<p>login</p>"));

{
  const c = ctx("https://digitalundergroundstore.com/owner/", { env: SECRETS });
  const res = await onRequest(c);
  check("owner no auth 401", res.status === 401 && c.nextCalls() === 0);
  check("www-authenticate", (res.headers.get("WWW-Authenticate") || "").includes("Basic"));
  check("401 no shell", !(await res.text()).includes("login"));
  check("401 noindex", res.headers.get("X-Robots-Tag") === "noindex, nofollow");
}

{
  const c = ctx("https://digitalundergroundstore.com/owner/owner.js?v=18", {
    env: SECRETS,
    headers: { Authorization: basic("donald", "wrong") },
    body: "console.log(1)",
    contentType: "application/javascript",
  });
  const res = await onRequest(c);
  check("bad password 401", res.status === 401 && c.nextCalls() === 0);
}

{
  const c = ctx("https://digitalundergroundstore.com/owner/", {
    env: SECRETS,
    headers: { Authorization: "Bearer community-token" },
    body: "<h1>Owner login</h1>",
  });
  const res = await onRequest(c);
  check("bearer does not open shell", res.status === 401 && c.nextCalls() === 0);
}

{
  const c = ctx("https://digitalundergroundstore.com/owner/index.html", {
    env: SECRETS,
    headers: { Authorization: basic("donald", "correct horse") },
    body: shell,
  });
  const res = await onRequest(c);
  const text = await res.text();
  check("basic opens shell", res.status === 200 && c.nextCalls() === 1);
  check("response strips comment", !text.includes("create_listing") && text.includes("<p>login</p>"));
  check("shell noindex", res.headers.get("X-Robots-Tag") === "noindex, nofollow");
  check("shell private", (res.headers.get("Cache-Control") || "").includes("no-store"));
}

{
  const c = ctx("https://digitalundergroundstore.com/owner/owner.js", {
    env: { OWNER_BASIC_AUTH: "ada:päss:wörd" },
    headers: { Authorization: basic("ada", "päss:wörd") },
    body: "var x=1",
    contentType: "text/javascript",
  });
  const res = await onRequest(c);
  check("unicode and colon password", res.status === 200 && (await res.text()) === "var x=1");
}

{
  const c = ctx("https://digitalundergroundstore.com/owner/", { env: {} });
  const res = await onRequest(c);
  check("production missing secrets 401", res.status === 401 && c.nextCalls() === 0);
  check("unconfigured has no challenge", res.headers.get("WWW-Authenticate") == null);
}

{
  const c = ctx("https://preview.digital-underground.pages.dev/owner/owner.css", {
    env: {},
    body: "body{}",
    contentType: "text/css",
  });
  const res = await onRequest(c);
  check("preview missing secrets 401", res.status === 401 && c.nextCalls() === 0);
}

for (const url of ["http://localhost:8788/owner/", "http://127.0.0.1:8788/owner/owner.js", "http://[::1]:8788/owner/"]) {
  const c = ctx(url, { env: {}, body: "local" });
  const res = await onRequest(c);
  check("loopback open without secrets " + url, res.status === 200 && (await res.text()) === "local");
}

{
  const c = ctx("http://localhost:8788/owner/", {
    env: SECRETS,
    body: "should-not-see",
  });
  const res = await onRequest(c);
  check("loopback still gated when secrets set", res.status === 401 && c.nextCalls() === 0);
}

{
  const c = ctx("https://digitalundergroundstore.com/api/owner/me", { env: SECRETS, body: '{"error":"Please sign in."}', contentType: "application/json" });
  const res = await onRequest(c);
  check("api owner not basic-gated", res.status === 200 && c.nextCalls() === 1 && res.headers.get("WWW-Authenticate") == null);
}

{
  const c = ctx("https://digitalundergroundstore.com/api/community/admin", { env: SECRETS, body: '{"error":"Unauthorized."}', contentType: "application/json" });
  const res = await onRequest(c);
  check("api community admin not basic-gated", res.status === 200 && c.nextCalls() === 1);
}

for (const path of ["/community/admin", "/community/admin.html", "/community/admin/", "/Community/Admin.html"]) {
  const c = ctx("https://digitalundergroundstore.com" + path, { env: SECRETS, body: "<a href=\"/owner/\">moved</a>" });
  const res = await onRequest(c);
  const text = await res.text();
  check("404 " + path, res.status === 404 && c.nextCalls() === 0 && !text.includes("/owner/"));
}

for (const path of ["/community/dashboard/", "/community/dashboard/index.html", "/wolf-updates-x4p9/", "/screening-room-7k3q/", "/store/", "/"]) {
  const c = ctx("https://digitalundergroundstore.com" + path, { env: SECRETS, body: "public" });
  const res = await onRequest(c);
  check("open " + path, res.status === 200 && (await res.text()) === "public" && res.headers.get("WWW-Authenticate") == null);
}

const ownerHtml = readFileSync(join(root, "owner/index.html"), "utf8");
check("owner shell has no create_listing comment", !/<!--[\s\S]*create_listing[\s\S]*?-->/i.test(ownerHtml));
check("owner shell has no admin token comment", !/<!--[\s\S]*COMMUNITY_ADMIN_TOKEN[\s\S]*?-->/i.test(ownerHtml));
check("admin html removed", !existsSync(join(root, "community/admin.html")));

const headers = readFileSync(join(root, "_headers"), "utf8");
check("headers noindex owner", /\/owner\/\*/.test(headers) && /X-Robots-Tag:\s*noindex,\s*nofollow/.test(headers));
check("headers keep screening noindex", /\/screening-room-7k3q\/\*/.test(headers));
check("headers keep wolf noindex", /\/wolf-updates-x4p9\/\*/.test(headers));

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all passed");
