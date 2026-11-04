import { cleanShareId, cleanSharePath, cleanShareTitle, presentShareStats, recordShare, sanitizeShareEvent } from "../../_lib/share-track.js";

const store = new Map();
const kv = {
  get: async (k, t) => (store.has(k) ? (t === "json" ? JSON.parse(store.get(k)) : store.get(k)) : null),
  put: async (k, v) => store.set(k, v),
};

let failed = 0;
const check = (n, c) => {
  if (!c) {
    failed += 1;
    console.error("FAIL", n);
  } else console.log("ok", n);
};

check("path", cleanSharePath("/community/p/?id=cm_x") === "/community/p/");
check("path rejects offsite", cleanSharePath("https://evil.example/community/p/") === "");
check("path rejects dotdot", cleanSharePath("/community/../owner/") === "");
check("id", cleanShareId("cm_mw0rkgj6_4d31a03c") === "cm_mw0rkgj6_4d31a03c");
check("id drops email", cleanShareId("secret@example.com") === "");
const badTitle = cleanShareTitle("Hello <b>secret@example.com</b>");
check("title clean", badTitle.indexOf("@") === -1 && badTitle.indexOf("<") === -1 && badTitle.startsWith("Hello"));

check("sanitize drops junk surface", sanitizeShareEvent({ surface: "email", path: "/league/" }) === null);
const ev = sanitizeShareEvent({ surface: "League", path: "/league/?vote=1", id: "cm_ok_1234", title: "A product", t: 1 });
check("sanitize keeps server fields", ev && ev.surface === "league" && ev.path === "/league/" && ev.id === "cm_ok_1234" && ev.title === "A product" && ev.t > 1e11);

const a = await recordShare(kv, { surface: "listing", path: "/community/p/example/", id: "cm_ok_1234", title: "Example" }, "1.1.1.1");
const dup = await recordShare(kv, { surface: "listing", path: "/community/p/example/", id: "cm_ok_1234", title: "Example" }, "1.1.1.1");
check("counted", a.counted === 1);
check("deduped", dup.counted === 0 && dup.deduped === true);

await recordShare(kv, { surface: "league", path: "/league/", title: "Maker League" }, "2.2.2.2");
await recordShare(kv, { surface: "featured", path: "/", id: "cm_feat_1234", title: "Spotlight" }, "3.3.3.3");
await recordShare(kv, { surface: "nav", path: "/makers/" }, "4.4.4.4");
await recordShare(kv, { surface: "nope", path: "/league/" }, "5.5.5.5");
await recordShare(kv, { surface: "other", path: "https://evil.example/x" }, "6.6.6.6");

const view = presentShareStats(JSON.parse(store.get("share:stats")), 10);
check("totals", view.total === 4 && view.bySurface.listing === 1 && view.bySurface.league === 1 && view.bySurface.featured === 1 && view.bySurface.nav === 1 && view.bySurface.other === 0);
check("today", view.today === 4 && view.last7.total === 4);
check("recent newest first", view.recent[0].surface === "nav" && view.recent.length === 4);
check("no email in store", ![...store.values()].some((v) => v.includes("@")));

for (let i = 0; i < 45; i++) {
  await recordShare(kv, { surface: "other", path: "/p/" + i + "/", title: "Item " + i }, "9.9.9." + (i % 20));
}
const capped = presentShareStats(JSON.parse(store.get("share:stats")), 100);
check("recent cap", capped.recent.length === 40);
check("total grew", capped.total === 49);

process.exit(failed ? 1 : 0);
