import { verifyDownloadToken } from "../../_lib/download-token.js";
import { getSku } from "../../_lib/store-skus.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  }
  const url = new URL(request.url);
  const token = url.searchParams.get("t") || "";
  const fileId = url.searchParams.get("file") || "";
  const verified = await verifyDownloadToken(env?.DOWNLOAD_SIGNING_SECRET, token);
  if (!verified.ok) {
    return new Response("This download link is invalid or has expired. Open your thank-you page to get a new one.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const rec = getSku(verified.sku);
  if (!rec) return new Response("Unknown product.", { status: 404 });
  const file = rec.files.find((f) => f.id === fileId) || rec.files[0];
  if (!file) return new Response("No file.", { status: 404 });
  const kv = env?.DOWNLOADS_KV;
  if (!kv || typeof kv.get !== "function") {
    return new Response("Downloads are not configured yet.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const buf = await kv.get(file.key, { type: "arrayBuffer" });
  if (buf == null) return new Response("File missing.", { status: 404, headers: { "Cache-Control": "no-store" } });
  const headers = {
    "Content-Type": file.type || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${file.filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  return new Response(buf, { status: 200, headers });
}
