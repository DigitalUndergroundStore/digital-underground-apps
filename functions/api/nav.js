/**
 * GET /api/nav → { owner, isOwner: boolean, creator: { name } | null }. Owner link + the signed-in maker's menu.
 * isOwner = a real creator session cookie (not a manage link) whose account email matches env.OWNER_EMAIL
 * (fallback: a SHA-256 of the owner email, so the address is not in the source). The email is never
 * returned. This only controls the link; /owner/ and /api/owner/* are protected by the owner passcode session.
 */
import { getKv, json, kvGetListing } from "../_lib/community.js";
import { authCreatorEx } from "../_lib/creator.js";
import { isOwnerEmail, shownAvatar } from "../_lib/account-profile.js";

const H = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function onRequestGet({ request, env }) {
  let owner = false, creator = null;
  try {
    // Cookie-only: ignore any Authorization header so the link can't be unlocked by a pasted token.
    const req = new Request(request.url, { headers: { Cookie: request.headers.get("Cookie") || "" } });
    if (/du_creator=/.test(req.headers.get("Cookie"))) {
      const kv = getKv(env);
      const who = kv ? await authCreatorEx(req, env, kv) : null;
      if (who && who.via === "cookie") owner = await isOwnerEmail(env, who.acct.email);
      if (who) {
        let name = String(who.acct.displayName || "").trim();
        if (!name) for (const id of (who.acct.listingIds || []).slice(0, 3)) { const r = await kvGetListing(kv, id); if (r && r.makerName) { name = r.makerName; break; } }
        creator = { name: String(name || "My account").slice(0, 40), avatar: await shownAvatar(env, who.acct, owner) };
      }
    }
  } catch {
    owner = false;
  }
  return json({ owner, isOwner: owner, creator }, 200, H);
}
