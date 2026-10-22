/**
 * GET /api/community/gimg?id=<imageId>&l=<listingId>
 * Serves one gallery image. Public for approved listings; otherwise only to an account that can edit the
 * listing (so the dashboard preview works while a listing is in review).
 */
import { getKv, kvGetListing } from "../../_lib/community.js";
import { authCreatorEx } from "../../_lib/creator.js";
import { galleryList, getGalleryMeta, isIid, readGalleryBytes } from "../../_lib/gallery.js";
import { writableListing } from "./creator-v2.js";

const NF = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const iid = url.searchParams.get("id") || "", lid = url.searchParams.get("l") || "";
  if (!isIid(iid) || !/^cm_[a-z0-9_]{4,60}$/.test(lid)) return NF();
  const kv = getKv(env);
  if (!kv) return NF();
  const row = await kvGetListing(kv, lid);
  if (!row || !galleryList(row).some((x) => x.id === iid)) return NF();
  let isPublic = row.status === "approved";
  if (!isPublic) {
    const who = await authCreatorEx(request, env, kv);
    if (!who || !(await writableListing(env, kv, who, lid))) return NF();
  }
  const meta = await getGalleryMeta(kv, iid);
  if (!meta || meta.listingId !== lid) return NF();
  const bytes = await readGalleryBytes(kv, meta);
  if (!bytes) return NF();
  return new Response(bytes, {
    headers: {
      "Content-Type": meta.type,
      // Image ids are immutable (a replaced image gets a new id), so public copies cache well.
      "Cache-Control": isPublic ? "public, max-age=86400" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
