import {
  appendRefParam,
  contactsToCsv,
  isValidEmail,
  normalizeXHandle,
  publicListing,
  validateSubmission,
} from "../../_lib/community.js";

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

check("ref param", appendRefParam("https://example.com/path").includes("ref=digitalunderground"));
check("ref param keeps query", appendRefParam("https://example.com/?x=1").includes("x=1"));

check("x handle", normalizeXHandle("@Maker_Name") === "Maker_Name");
check("x handle reject", normalizeXHandle("bad!handle") === "");

const good = validateSubmission({
  name: "Test App",
  projectUrl: "https://example.com/app",
  makerName: "Maker",
  email: "maker@example.com",
  category: "apps",
  pitchShort: "Short pitch",
  descriptionLong: "Longer text",
  imageUrl: "https://example.com/cover.png",
  terms: true,
});
check("valid submission", good.listing && good.listing.status === "pending");

const honeypot = validateSubmission({
  website: "spam",
  name: "x",
  projectUrl: "https://example.com",
  makerName: "m",
  email: "a@b.co",
  category: "apps",
  pitchShort: "p",
  descriptionLong: "d",
  imageUrl: "https://example.com/i.png",
  terms: true,
});
check("honeypot", honeypot.error && honeypot.status === 400);

const badEmail = validateSubmission({
  name: "Test App",
  projectUrl: "https://example.com/app",
  makerName: "Maker",
  email: "not-an-email",
  category: "apps",
  pitchShort: "Short pitch",
  descriptionLong: "Longer text",
  imageUrl: "https://example.com/cover.png",
  terms: true,
});
check("reject bad email", badEmail.error && badEmail.status === 400);

check("isValidEmail ok", isValidEmail("Maker@Example.com") === true);
check("isValidEmail bad", isValidEmail("nope") === false);

const pub = publicListing({
  id: "cm_x",
  name: "N",
  makerName: "M",
  email: "secret@example.com",
  category: "apps",
  priceLabel: "Free",
  pitchShort: "p",
  imageUrl: "https://example.com/i.png",
  projectUrl: "https://example.com",
  visitUrl: "https://example.com/?ref=digitalunderground",
});
check("publicListing strips email", !("email" in pub) && !JSON.stringify(pub).includes("secret@"));

const csv = contactsToCsv([{
  email: "a@example.com",
  name: "A",
  listingIds: ["cm_1"],
  first_seen: 1,
  last_seen: 2,
  source: "developer-marketplace",
}]);
check("csv header", csv.startsWith("email,name,listing_ids,"));
check("csv row", csv.includes("a@example.com") && csv.includes("cm_1"));

if (failed) {
  process.exit(1);
}
