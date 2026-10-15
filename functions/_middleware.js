// Force HTTPS: any plain-http request gets a permanent redirect; responses carry HSTS.
const HSTS = "max-age=31536000; includeSubDomains";
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const proto = request.headers.get("X-Forwarded-Proto") || url.protocol.replace(":", "");
  if (proto === "http" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    url.protocol = "https:";
    return new Response(null, { status: 301, headers: { Location: url.toString(), "Strict-Transport-Security": HSTS } });
  }
  const res = await next();
  if (res.headers.has("Strict-Transport-Security")) return res;
  const out = new Response(res.body, res);
  out.headers.set("Strict-Transport-Security", HSTS);
  return out;
}
