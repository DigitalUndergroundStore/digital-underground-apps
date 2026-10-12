/** Complete import-saved + tablet after a partial record-app run. */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, readFileSync as rf } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const secretPath = process.argv[2];
const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "footage");
const secret = readFileSync(secretPath, "utf8");
const code = (secret.match(/^CODE=(.+)$/m) || [])[1];
const manifest = JSON.parse(rf(path.join(out, "manifest.json"), "utf8"));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

function liveUrl() {
  return "https://digitalundergroundstore.com/pantry-week/#code=" + encodeURIComponent(code);
}

async function tidy(page) {
  await page.evaluate(() => {
    document.getElementById("du-install")?.remove();
    document.getElementById("du-phone-tips")?.remove();
    const toast = document.getElementById("toast");
    if (toast) toast.hidden = true;
  });
}

async function unlock(page, width, height, scale) {
  await page.setViewport({ width, height, deviceScaleFactor: scale, isMobile: width < 800, hasTouch: true });
  await page.goto(liveUrl(), { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(() => /The week|Recipe box/.test(document.body.innerText || ""), { timeout: 25000 });
  await tidy(page);
}

async function shot(page, name) {
  await tidy(page);
  await page.screenshot({ path: path.join(out, name + ".png") });
  console.log("saved", name);
}

async function go(page, view) {
  await page.evaluate((view) => {
    document.querySelector(`[data-action="nav"][data-view="${view}"]`)?.click();
  }, view);
  await new Promise((r) => setTimeout(r, 400));
}

const phone = await browser.newPage();
await unlock(phone, 390, 844, 2);
const recipeUrl = "https://www.bbcgoodfood.com/recipes/easy-chicken-curry";
await go(phone, "more");
await phone.evaluate(() => document.querySelector('[data-action="open-import"]')?.click());
await new Promise((r) => setTimeout(r, 400));
await phone.evaluate((recipeUrl) => {
  const input = document.getElementById("importLink");
  if (input) {
    input.value = recipeUrl;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}, recipeUrl);
await phone.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((el) => /fetch recipe/i.test(el.innerText || ""));
  if (btn) btn.click();
});
await phone.waitForFunction(() => /Easy chicken curry/.test(document.body.innerText || ""), { timeout: 25000 });
await phone.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((el) => /add selected/i.test(el.innerText || ""));
  if (btn) btn.click();
});
await new Promise((r) => setTimeout(r, 800));
await go(phone, "recipes");
await phone.waitForFunction(
  () => {
    const card = [...document.querySelectorAll(".recipe-card, article, .card")].find((el) =>
      /Easy chicken curry/i.test(el.innerText || "")
    );
    if (!card) return false;
    const photo = card.querySelector(".card-photo") || card;
    return /url\(/i.test(getComputedStyle(photo).backgroundImage || "");
  },
  { timeout: 30000 }
);
await shot(phone, "phone-import-saved");

const tablet = await browser.newPage();
await unlock(tablet, 1100, 1400, 1.5);
await go(tablet, "recipes");
await tablet.evaluate(() => {
  const chip = [...document.querySelectorAll("button")].find((el) => (el.innerText || "").trim() === "Canadian");
  if (chip) chip.click();
});
await new Promise((r) => setTimeout(r, 500));
await shot(tablet, "tablet-recipes");

writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
console.log("finish-record done");
