import { chromium } from "playwright";
import fs from "fs";
import https from "https";

const QUERIES = [
  "food", "dinner", "breakfast", "lunch", "pasta", "salad", "soup", "chicken",
  "salmon", "taco", "curry", "dessert", "steak", "shrimp", "rice", "pizza",
  "bowl", "sandwich", "vegetarian", "noodles", "eggs", "beef", "pork", "tofu",
];

function headOk(slug) {
  const url = `https://images.unsplash.com/photo-${slug}?w=400&q=80`;
  return new Promise((resolve) => {
    https
      .request(url, { method: "HEAD" }, (res) => resolve(res.statusCode && res.statusCode < 400))
      .on("error", () => resolve(false))
      .end();
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const slugs = [];
for (const q of QUERIES) {
  await page.goto(`https://unsplash.com/s/photos/${q}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1800);
  const html = await page.content();
  const re = /images\.unsplash\.com\/photo-(\d+-[a-f0-9]{8,12})/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!slugs.includes(m[1])) slugs.push(m[1]);
  }
}
await browser.close();

const verified = [];
for (const s of slugs) {
  if (await headOk(s)) verified.push(s);
}
fs.writeFileSync("/workspace/jhagho-work/scripts/verified-slug-pool.json", JSON.stringify(verified, null, 2));
console.log("pool", slugs.length, "verified", verified.length);
