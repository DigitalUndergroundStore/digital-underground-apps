// Remote MCP server (Streamable HTTP, JSON-RPC 2.0, stateless) for the Developer Marketplace.
// Public reads need no auth. submit_listing proxies to /api/v1/listings with the creator's own
// API key, so it goes through the normal screening, owner-approval queue and alert email.
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER = { name: "digital-underground-marketplace", title: "Digital Underground Developer Marketplace", version: "1.0.0" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};
const CATS = ["apps", "ai-tools", "books", "templates", "other"];
const TOOLS = [
  {
    name: "search_listings",
    title: "Search marketplace listings",
    description: "Search approved products on the Digital Underground Developer Marketplace (apps, AI tools, books, templates by independent makers). Returns summaries with links. Checkout happens on each maker's own site.",
    inputSchema: { type: "object", properties: {
      query: { type: "string", description: "Words to match in name, tagline, maker or tags. Omit to list everything." },
      category: { type: "string", enum: CATS },
      tag: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
    } },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_listing",
    title: "Get one listing",
    description: "Get full public details (including the long description) of one approved listing by its id (cm_...).",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string", pattern: "^cm_[a-z0-9_]{4,40}$" } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "submit_listing",
    title: "Submit a listing for review",
    description: "Submit the user's own product to the marketplace. Requires the creator's API key (duk_..., from the Creator dashboard -> API keys; never guess one). Free. Every submission is screened and waits for human owner approval; nothing is published automatically. Only submit real products the user owns, with accurate claims.",
    inputSchema: { type: "object", required: ["api_key", "name", "projectUrl", "category", "pitchShort", "descriptionLong", "terms"], properties: {
      api_key: { type: "string", description: "Creator API key, duk_..." },
      name: { type: "string", maxLength: 120 },
      projectUrl: { type: "string", description: "https link to the product" },
      category: { type: "string", enum: CATS },
      pitchShort: { type: "string", maxLength: 280 },
      descriptionLong: { type: "string", maxLength: 4000 },
      imageUrl: { type: "string", description: "https cover image URL" },
      tags: { type: "array", items: { type: "string" }, maxItems: 6 },
      priceLabel: { type: "string", maxLength: 40 },
      videoUrl: { type: "string" },
      terms: { type: "boolean", description: "Must be true: accepts the terms at https://digitalundergroundstore.com/community/submit/" },
    } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "get_my_listing_status",
    title: "Check my listing status",
    description: "Check the review status (pending, approved, rejected) of one of the user's own listings. Requires their API key.",
    inputSchema: { type: "object", required: ["api_key", "id"], properties: { api_key: { type: "string" }, id: { type: "string" } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const send = (body, status = 200, extra = {}) => new Response(body == null ? null : JSON.stringify(body), {
  status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
});
const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const text = (obj, isError = false) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }], ...(typeof obj === "object" && !isError ? { structuredContent: obj } : {}), isError });

async function getJson(origin, path, init) {
  const r = await fetch(origin + path, { ...init, headers: { Accept: "application/json", ...(init?.headers || {}) } });
  let d = null; try { d = await r.json(); } catch {}
  return { status: r.status, data: d };
}

async function callTool(origin, name, a = {}) {
  if (name === "search_listings") {
    const { status, data } = await getJson(origin, "/api/community/listings");
    if (status !== 200) return text("Could not load listings right now.", true);
    let rows = data?.listings || [];
    const q = String(a.query || "").toLowerCase().trim();
    if (a.category) rows = rows.filter((r) => r.category === a.category);
    if (a.tag) rows = rows.filter((r) => (r.tags || []).some((t) => t.toLowerCase() === String(a.tag).toLowerCase()));
    if (q) {
      const words = q.split(/\s+/);
      rows = rows.filter((r) => { const h = [r.name, r.pitchShort, r.makerName, r.category, ...(r.tags || [])].join(" ").toLowerCase(); return words.every((w) => h.includes(w)); });
    }
    const limit = Math.min(Math.max(parseInt(a.limit) || 20, 1), 50);
    const listings = rows.slice(0, limit).map((r) => ({ id: r.id, name: r.name, maker: r.makerName, category: r.category, price: r.priceLabel, pitch: r.pitchShort, tags: r.tags, stage: r.stage || undefined, url: r.visitUrl || r.projectUrl, imageUrl: r.imageUrl }));
    return text({ total: rows.length, returned: listings.length, listings, browse: origin + "/community/" });
  }
  if (name === "get_listing") {
    const id = String(a.id || "");
    if (!/^cm_[a-z0-9_]{4,40}$/.test(id)) return text("Invalid id. Use an id from search_listings.", true);
    const { status, data } = await getJson(origin, "/api/community/listing?id=" + encodeURIComponent(id));
    if (status !== 200) return text("Listing not found (or not approved).", true);
    return text(data);
  }
  if (name === "submit_listing" || name === "get_my_listing_status") {
    const key = String(a.api_key || "");
    if (!/^duk_[A-Za-z0-9_-]{8,}$/.test(key)) return text("A creator API key (duk_...) is required. The creator can make one at https://digitalundergroundstore.com/community/dashboard/ (API keys).", true);
    const headers = { Authorization: "Bearer " + key, "Content-Type": "application/json" };
    if (name === "get_my_listing_status") {
      const { status, data } = await getJson(origin, "/api/v1/listings/" + encodeURIComponent(String(a.id || "")), { headers });
      return text(data || { error: "HTTP " + status }, status >= 400);
    }
    const { api_key, ...body } = a;
    const { status, data } = await getJson(origin, "/api/v1/listings", { method: "POST", headers, body: JSON.stringify(body) });
    if (status >= 400) return text(data || { error: "HTTP " + status }, true);
    return text({ ...data, note: "Submitted for review. It is not public until the owner approves it." });
  }
  return null;
}

async function handle(origin, msg) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return fail(msg?.id, -32600, "Invalid Request");
  const { id, method, params = {} } = msg;
  const isNote = id === undefined || id === null;
  if (isNote) return null; // notifications (initialized, cancelled...) need no reply
  switch (method) {
    case "initialize": {
      const v = VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : VERSIONS[1];
      return ok(id, { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER,
        instructions: "Browse and search the free Digital Underground Developer Marketplace. Submitting needs the creator's own API key and always goes to human review." });
    }
    case "ping": return ok(id, {});
    case "tools/list": return ok(id, { tools: TOOLS });
    case "tools/call": {
      try {
        const r = await callTool(origin, params.name, params.arguments || {});
        return r ? ok(id, r) : fail(id, -32602, "Unknown tool: " + params.name);
      } catch (e) { return ok(id, text("Tool error. Try again later.", true)); }
    }
    case "resources/list": return ok(id, { resources: [] });
    case "prompts/list": return ok(id, { prompts: [] });
    default: return fail(id, -32601, "Method not found: " + method);
  }
}

export async function onRequest({ request }) {
  const origin = new URL(request.url).origin;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method === "GET") {
    if ((request.headers.get("Accept") || "").includes("text/event-stream")) return send(null, 405, { Allow: "POST, OPTIONS" });
    return send({ name: SERVER.title, transport: "streamable-http", endpoint: origin + "/mcp", usage: "POST JSON-RPC 2.0 (initialize, tools/list, tools/call).", docs: origin + "/llms.txt" });
  }
  if (request.method === "DELETE") return send(null, 405, { Allow: "POST, OPTIONS" });
  if (request.method !== "POST") return send(fail(null, -32600, "Use POST."), 405);
  let body;
  try { body = await request.json(); } catch { return send(fail(null, -32700, "Parse error"), 400); }
  if (Array.isArray(body)) {
    if (!body.length) return send(fail(null, -32600, "Empty batch"), 400);
    const out = (await Promise.all(body.map((m) => handle(origin, m)))).filter(Boolean);
    return out.length ? send(out) : send(null, 202);
  }
  const res = await handle(origin, body);
  return res ? send(res) : send(null, 202);
}
