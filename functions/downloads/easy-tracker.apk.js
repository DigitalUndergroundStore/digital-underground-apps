// Serves the Easy Tracker APK (37.5 MB) by streaming two static parts, since Pages caps single files at 25 MB.
const PARTS = ["/downloads/parts/easy-tracker-1.0.7.apk.part0", "/downloads/parts/easy-tracker-1.0.7.apk.part1"];
const SIZE = 37562009;
export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const headers = {
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": 'attachment; filename="easy-tracker-1.0.7.apk"',
    "Content-Length": String(SIZE),
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (request.method === "HEAD") return new Response(null, { headers });
  const { readable, writable } = new FixedLengthStream(SIZE);
  (async () => {
    try {
      for (const p of PARTS) {
        const r = await env.ASSETS.fetch(new URL(p, request.url));
        if (!r.ok || !r.body) throw new Error("part missing " + p);
        await r.body.pipeTo(writable, { preventClose: true });
      }
      await writable.close();
    } catch (e) { try { await writable.abort(e); } catch {} }
  })();
  return new Response(readable, { headers });
}
