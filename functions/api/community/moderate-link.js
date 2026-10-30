import {
  getKv,
  json,
  kvGetListing,
  notifyMakerApproved,
  setListingStatus,
  verifyEmailModerationToken,
} from "../../_lib/community.js";

function htmlPage(title, body) {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5} a{color:#6cf}</style></head><body>${body}<p><a href="/owner/">Open Owner Dashboard</a> · <a href="/community/">Community</a></p></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") {
    return json({ error: "Use GET." }, 405);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const action = url.searchParams.get("action") || "";
  const exp = url.searchParams.get("exp") || "";
  const sig = url.searchParams.get("sig") || "";

  const verified = await verifyEmailModerationToken(env, { id, action, exp, sig });
  if (!verified.ok) {
    return htmlPage("Link invalid", `<h1>Link invalid or expired</h1><p>${verified.error}</p>`);
  }

  const kv = getKv(env);
  if (!kv) {
    return htmlPage("Storage unavailable", "<h1>Storage not configured</h1><p>COMMUNITY_KV is not bound.</p>");
  }

  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : null;
  if (!status) {
    return htmlPage("Unknown action", "<h1>Unknown action</h1><p>Use approve or reject.</p>");
  }

  try {
    const before = await kvGetListing(kv, id);
    const row = await setListingStatus(kv, id, status);
    if (!row) {
      return htmlPage("Not found", `<h1>Listing not found</h1><p>ID: ${id}</p>`);
    }
    if (status === "approved") {
      await notifyMakerApproved(env, kv, row, request, before?.status || "");
    }
    const label = status === "approved" ? "approved" : "rejected";
    return htmlPage(
      `Listing ${label}`,
      `<h1>Listing ${label}</h1><p><strong>${row.name}</strong> is now <strong>${label}</strong>.</p>`
    );
  } catch (e) {
    console.error("moderate-link error", e);
    return htmlPage("Error", "<h1>Something went wrong</h1><p>Try the admin UI.</p>");
  }
}
