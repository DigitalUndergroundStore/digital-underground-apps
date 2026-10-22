/**
 * GET /api/nav → { owner: boolean, creator: { name } | null }. Owner Dashboard link + the signed-in maker's menu.
 * Owner = valid owner-dashboard session cookie, or a creator session cookie for the account that
 * owns Pantry Week (Donald). Never returns secrets; always 200 so normal visitors see no errors.
 */
import { getKv, json, kvGetListing } from "../_lib/community.js";
import { ownerAuthorized } from "../_lib/owner.js";
import { authCreatorEx } from "../_lib/creator.js";

const OWNER_LISTING = "cm_mv8qdn7s_d433793b";
const H = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function onRequestGet({ request, env }) {
  let owner = false, creator = null;
  try {
    // Cookie-only: ignore any Authorization header so the link can't be unlocked by a pasted token.
    const req = new Request(request.url, { headers: { Cookie: request.headers.get("Cookie") || "" } });
    if (await ownerAuthorized(req, env)) owner = true;
    if (/du_creator=/.test(req.headers.get("Cookie"))) {
      const kv = getKv(env);
      const who = kv ? await authCreatorEx(req, env, kv) : null;
      if (who) {
        let name = "";
        for (const id of (who.acct.listingIds || []).slice(0, 3)) { const r = await kvGetListing(kv, id); if (r && r.makerName) { name = r.makerName; break; } }
        creator = { name: String(name || "My account").slice(0, 40) };
      }
      if (!owner && who && who.via !== "link") {
        const row = await kvGetListing(kv, OWNER_LISTING);
        owner = !!row && row.creatorId === who.acct.id;
      }
    }
  } catch {
    owner = false;
  }
  return json({ owner, creator }, 200, H);
}
