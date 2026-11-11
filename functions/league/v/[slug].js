/** /league/v/<name-slug> — pretty share URL (e.g. /league/v/rival-lanes). */
import { render } from "./index.js";
export const onRequestGet = (c) => render(c, String(c.params.slug || "").toLowerCase());
export const onRequestHead = async (c) => { const r = await render(c, String(c.params.slug || "").toLowerCase()); return new Response(null, { status: r.status, headers: r.headers }); };
