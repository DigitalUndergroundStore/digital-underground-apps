import {
  mergeScreenResults,
  runBlocklist,
  submissionTextBundle,
} from "../../_lib/community-screening.js";

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

const clean = submissionTextBundle({
  name: "Task Helper",
  pitchShort: "A calm productivity app for students.",
  descriptionLong: "Organize homework without ads.",
  projectUrl: "https://example.com/app",
  makerName: "Maker",
});
check("clean blocklist", runBlocklist(clean.haystack).decision === "approved");

const scam = runBlocklist("best crypto pump coin guaranteed");
check("scam block", scam.decision === "rejected" && scam.reasons.length > 0);

const adult = runBlocklist("free onlyfans leaks");
check("adult block", adult.decision === "rejected");

check(
  "merge rejects win",
  mergeScreenResults([
    { decision: "approved", reasons: [] },
    { decision: "pending", reasons: ["x"] },
    { decision: "rejected", reasons: ["bad"] },
  ]).decision === "rejected"
);

check(
  "merge pending over approved",
  mergeScreenResults([
    { decision: "approved", reasons: [] },
    { decision: "pending", reasons: ["x"] },
  ]).decision === "pending"
);

if (failed) process.exit(1);
