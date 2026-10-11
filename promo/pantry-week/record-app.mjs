import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const secretPath = process.argv[2];
if (!secretPath) {
  console.error("need secret file path");
  process.exit(1);
}
const secret = readFileSync(secretPath, "utf8");
const code = (secret.match(/^CODE=(.+)$/m) || [])[1];
if (!code || code.length < 8) {
  console.error("secret file unusable");
  process.exit(1);
}

const out = "/tmp/pw-shots";
mkdirSync(out, { recursive: true });
const manifest = [];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--font-render-hinting=none"],
});

async function prepare(page) {
  await page.evaluate(() => {
    window.confirm = () => true;
    window.alert = () => {};
    const tips = document.getElementById("du-phone-tips");
    if (tips) tips.remove();
  });
}

async function unlock(page, width, height, scale) {
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  const target = "http://127.0.0.1:8765/index.html#code=" + encodeURIComponent(code);
  await page.goto(target, { waitUntil: "networkidle0", timeout: 30000 });
  await page.waitForSelector("#main", { timeout: 20000 });
  await prepare(page);
  const tip = await page.$("#tipOk");
  if (tip) {
    const hidden = await page.$eval("#tip", (el) => el.hidden);
    if (!hidden) {
      await tip.click();
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  await prepare(page);
}

async function shot(page, name, note) {
  await page.evaluate(() => {
    const t = document.getElementById("toast");
    if (t) t.hidden = true;
  });
  const file = path.join(out, name + ".png");
  await page.screenshot({ path: file });
  const vp = page.viewport();
  manifest.push({ name, note: note || "", w: vp.width, h: vp.height, scale: vp.deviceScaleFactor });
  console.log("saved", name);
}

async function boxOf(page, selector) {
  const handle = await page.$(selector);
  if (!handle) return null;
  const box = await handle.boundingBox();
  return box;
}

async function tap(page, selector) {
  const box = await boxOf(page, selector);
  if (!box) throw new Error("missing " + selector);
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 28);
  await page.mouse.click(x, y);
  const vp = page.viewport();
  return { x: x / vp.width, y: y / vp.height };
}

const phone = await browser.newPage();
await unlock(phone, 390, 844, 2);

await phone.click('[data-action="nav"][data-view="recipes"]');
await new Promise((r) => setTimeout(r, 250));
await phone.evaluate(() => {
  const cards = [...document.querySelectorAll(".recipe-card")];
  const card = cards.find((el) => el.textContent.includes("Lemon Herb Chicken"));
  if (card) card.scrollIntoView({ block: "center" });
});
await shot(phone, "phone-recipes", "recipe box");

const tonight = await phone.evaluate(() => {
  const cards = [...document.querySelectorAll(".recipe-card")];
  const card = cards.find((el) => el.textContent.includes("Lemon Herb Chicken"));
  const btn = card.querySelector('[data-action="tonight"]');
  const r = btn.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
manifest.push({ name: "tap-tonight-lemon", x: tonight.x / 390, y: tonight.y / 844 });
await phone.mouse.click(tonight.x, tonight.y);
await new Promise((r) => setTimeout(r, 350));
await shot(phone, "phone-recipes-added", "tonight added");

await phone.click('[data-action="nav"][data-view="plan"]');
await new Promise((r) => setTimeout(r, 250));
await phone.evaluate(() => {
  const days = document.querySelector(".days");
  if (days) days.scrollIntoView({ block: "start" });
});
await new Promise((r) => setTimeout(r, 150));
await shot(phone, "phone-plan-one", "sunday dinner set, scroll to days");

const openMon = await tap(phone, '[data-action="open-slot"][data-day="Mon"][data-slot="dinner"]');
manifest.push({ name: "tap-mon-dinner", ...openMon });
await new Promise((r) => setTimeout(r, 300));
await phone.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-action="pick"]')];
  const row = rows.find((el) => el.textContent.includes("Tomato Basil Pasta"));
  if (row) row.scrollIntoView({ block: "center" });
});
await shot(phone, "phone-picker", "monday dinner picker");

const pickPasta = await phone.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-action="pick"]')];
  const row = rows.find((el) => el.textContent.includes("Tomato Basil Pasta"));
  const r = row.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
manifest.push({ name: "tap-pasta", x: pickPasta.x / 390, y: pickPasta.y / 844 });
await phone.mouse.click(pickPasta.x, pickPasta.y);
await new Promise((r) => setTimeout(r, 350));
await phone.evaluate(() => {
  const days = document.querySelector(".days");
  if (days) days.scrollIntoView({ block: "start" });
});
await shot(phone, "phone-plan-two", "monday pasta added");

const fillBox = await phone.evaluate(() => {
  const btn = document.querySelector('[data-action="fill"]');
  btn.scrollIntoView({ block: "center" });
  const r = btn.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
manifest.push({ name: "tap-fill", x: fillBox.x / 390, y: fillBox.y / 844 });
await shot(phone, "phone-plan-fill-btn", "fill button in view");
await phone.mouse.click(fillBox.x, fillBox.y);
await new Promise((r) => setTimeout(r, 400));
await phone.evaluate(() => {
  const days = document.querySelector(".days");
  if (days) days.scrollIntoView({ block: "start" });
});
await shot(phone, "phone-week-full", "week filled");

await phone.click('[data-action="nav"][data-view="shop"]');
await new Promise((r) => setTimeout(r, 300));
await shot(phone, "phone-shop", "shopping list top");

const have = await phone.evaluate(() => {
  const btns = [...document.querySelectorAll('[data-action="have"]')];
  const btn = btns.find((el) => /green bean/i.test(el.getAttribute("aria-label") || "")) || btns[2] || btns[0];
  if (!btn) return null;
  btn.scrollIntoView({ block: "center" });
  const r = btn.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: btn.getAttribute("aria-label") };
});
if (have) {
  manifest.push({ name: "tap-have", x: have.x / 390, y: have.y / 844 });
  console.log("have target ok", Boolean(have.label));
  await shot(phone, "phone-shop-before-have", "before have it");
  await phone.mouse.click(have.x, have.y);
  await new Promise((r) => setTimeout(r, 300));
  await shot(phone, "phone-shop-have", "after have it");
}

await phone.click('a[href="print/week.html"]');
await phone.waitForSelector("#week", { timeout: 15000 });
await prepare(phone);
await new Promise((r) => setTimeout(r, 250));
await shot(phone, "phone-print", "print sheet");

const tablet = await browser.newPage();
await unlock(tablet, 1100, 1400, 1.5);
await tablet.evaluate(() => {
  const days = document.querySelector(".days");
  if (days) days.scrollIntoView({ block: "start" });
});
await shot(tablet, "tablet-week", "tablet week");
await tablet.click('[data-action="nav"][data-view="shop"]');
await new Promise((r) => setTimeout(r, 300));
await shot(tablet, "tablet-shop", "tablet list");
await tablet.goto("http://127.0.0.1:8765/print/week.html", { waitUntil: "networkidle0" });
await tablet.waitForSelector("#week", { timeout: 15000 });
await prepare(tablet);
await shot(tablet, "tablet-print", "tablet print");

writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
console.log("done", manifest.length);
