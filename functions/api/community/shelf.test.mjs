import {
  kvGetIndex,
  kvGetListing,
  kvSaveIndex,
  listApproved,
  reconcileShelf,
  saveListing,
  setListingStatus,
} from "../../_lib/community.js";

const store = new Map();
const kv = {
  async get(k, t) {
    if (!store.has(k)) return null;
    const v = store.get(k);
    return t === "json" ? JSON.parse(v) : v;
  },
  async put(k, v) {
    store.set(k, v);
  },
  async delete(k) {
    store.delete(k);
  },
  async list({ prefix }) {
    const keys = [...store.keys()].filter((name) => name.startsWith(prefix || "")).sort();
    return { keys: keys.map((name) => ({ name })), list_complete: true };
  },
};

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

function listing(id, extra = {}) {
  return {
    id,
    status: "approved",
    name: extra.name || id,
    makerName: "Maker",
    projectUrl: "https://example.com/" + id,
    videoUrl: "https://youtu.be/abcdefghijk",
    videoApprovedUrl: "https://youtu.be/abcdefghijk",
    ...extra,
  };
}

store.clear();
await saveListing(kv, listing("cm_keep"));
const edited = await kvGetListing(kv, "cm_keep");
edited.name = "Kept Live";
edited.status = "pending";
edited.screening = { reasons: ["Project URL timed out; needs manual review."] };
await saveListing(kv, edited, { reason: "creator_edit" });
const kept = await kvGetListing(kv, "cm_keep");
const keptIndex = await kvGetIndex(kv);
check("rescreen does not demote approved status", kept.status === "approved" && kept.name === "Kept Live");
check("rescreen keeps id in approved bucket only", keptIndex.approved.includes("cm_keep") && !keptIndex.pending.includes("cm_keep"));
check("blocked demotion is logged", (kept.shelfLog || []).some((e) => e.action === "kept_approved" && e.blocked === "pending"));

const videoEdit = await kvGetListing(kv, "cm_keep");
videoEdit.status = "pending";
videoEdit.videoUrl = "upload:v_newvideoid12345678";
videoEdit.videoFile = { type: "video/mp4", size: 12 };
await saveListing(kv, videoEdit, { reason: "creator_video" });
const held = await kvGetListing(kv, "cm_keep");
check("new video does not replace the live video", held.videoUrl === "https://youtu.be/abcdefghijk" && held.status === "approved");
check("new video waits for review", held.pendingVideo && held.pendingVideo.url === "upload:v_newvideoid12345678");
const publicRows = await listApproved(kv);
check("listing stays on the public shelf", publicRows.some((row) => row.id === "cm_keep" && row.name === "Kept Live"));

const promoted = await setListingStatus(kv, "cm_keep", "approved", { reason: "owner_approve" });
check("approve publishes the held video", promoted.videoUrl === "upload:v_newvideoid12345678" && !promoted.pendingVideo);
check("approve signs off that video", promoted.videoApprovedUrl === "upload:v_newvideoid12345678" && promoted.status === "approved");

await saveListing(kv, listing("cm_other", { name: "Other" }));
const stale = await kvGetIndex(kv);
stale.approved = stale.approved.filter((id) => id !== "cm_keep");
await kvSaveIndex(kv, stale);
const healed = await listApproved(kv);
const healedIndex = await kvGetIndex(kv);
check("heal-on-read returns an approved orphan", healed.some((row) => row.id === "cm_keep") && healed.some((row) => row.id === "cm_other"));
check("heal-on-read writes the orphan back into index.approved", healedIndex.approved.includes("cm_keep") && healedIndex.approved.includes("cm_other"));

const direct = await reconcileShelf(kv);
check("reconcile is a no-op when the shelf matches", direct.added.length === 0 && direct.removed.length === 0);

const hidden = await kvGetListing(kv, "cm_other");
hidden.status = "unpublished";
await saveListing(kv, hidden, { demote: true, reason: "creator_unpublish" });
const afterHide = await kvGetListing(kv, "cm_other");
const hideIndex = await kvGetIndex(kv);
const shelf = await listApproved(kv);
check("explicit unpublish leaves the shelf", afterHide.status === "unpublished" && !shelf.some((row) => row.id === "cm_other"));
check("explicit unpublish moves the index bucket", hideIndex.unpublished.includes("cm_other") && !hideIndex.approved.includes("cm_other"));
check("explicit unpublish is logged", (afterHide.shelfLog || []).some((e) => e.action === "demote" && e.reason === "creator_unpublish"));

const rejected = await setListingStatus(kv, "cm_keep", "rejected", { reason: "admin_reject" });
const forced = await kvGetIndex(kv);
forced.approved = [...(forced.approved || []), "cm_keep"];
await kvSaveIndex(kv, forced);
const afterReject = await listApproved(kv);
const rejectIndex = await kvGetIndex(kv);
const stillRejected = await kvGetListing(kv, "cm_keep");
check("reconcile does not republish a rejected listing", !afterReject.some((row) => row.id === "cm_keep") && stillRejected.status === "rejected");
check("reconcile drops a rejected id from the approved bucket", !rejectIndex.approved.includes("cm_keep"));
check("admin reject is logged", (rejected.shelfLog || []).some((e) => e.action === "demote" && e.reason === "admin_reject"));

await saveListing(kv, listing("cm_new", { status: "pending", name: "New" }));
const fresh = await kvGetListing(kv, "cm_new");
const freshIndex = await kvGetIndex(kv);
check("new pending listing is not forced live", fresh.status === "pending" && freshIndex.pending.includes("cm_new") && !freshIndex.approved.includes("cm_new"));

if (failed) process.exit(1);
