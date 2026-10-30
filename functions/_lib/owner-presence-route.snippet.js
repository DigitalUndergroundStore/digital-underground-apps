/**
 * PASTE into the live owner router (the file that already handles
 * GET /api/owner/presence), REPLACING the whole
 * `if (head === "presence" && request.method === "GET") { ... }` block.
 *
 * `json` and `kv` are the ones that route already uses.
 * Do not replace the live router with this repo's functions/api/owner/[[path]].js.
 */
export const LIVE_PRESENCE_GET_BLOCK = `
  if (head === "presence" && request.method === "GET") {
    try {
      const { ownerPresence } = await import("../../_lib/presence.js");
      return json(await ownerPresence(kv));
    } catch (e) {
      console.error("owner presence", e);
      return json({ error: "Could not load live presence." }, 500);
    }
  }
`;
