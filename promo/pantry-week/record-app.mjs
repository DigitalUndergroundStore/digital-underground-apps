import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "footage");
mkdirSync(out, { recursive: true });
const manifest = [];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--font-render-hinting=none"],
});

function liveUrl() {
  return "https://digitalundergroundstore.com/pantry-week/#code=" + encodeURIComponent(code);
}

async function tidy(page) {
  await page.evaluate(() => {
    window.confirm = () => true;
    window.alert = () => {};
    document.getElementById("du-install")?.remove();
    document.getElementById("du-install-header")?.remove();
    document.getElementById("du-phone-tips")?.remove();
    document.getElementById("du-forget")?.remove();
    document.getElementById("tipOk")?.click();
    const toast = document.getElementById("toast");
    if (toast) toast.hidden = true;
    document.querySelectorAll("a, button, p, div").forEach((el) => {
      if (el.childElementCount > 3) return;
      const text = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (/^Update available/i.test(text) || /Tap to refresh/i.test(text)) el.remove();
    });
  });
}

async function unlock(page, width, height, scale) {
  await page.setViewport({ width, height, deviceScaleFactor: scale, isMobile: width < 800, hasTouch: true });
  try {
    await page.goto(liveUrl(), { waitUntil: "networkidle0", timeout: 45000 });
  } catch (err) {
    const msg = String(err && err.message || err).replace(/code=[^&#\s]+/gi, "code=REDACTED");
    throw new Error(msg.slice(0, 200));
  }
  await page.waitForFunction(() => /The week|Recipe box/.test(document.body.innerText || ""), { timeout: 25000 });
  await tidy(page);
  await new Promise((r) => setTimeout(r, 250));
  await tidy(page);
}

async function photos(page) {
  await page.evaluate(async () => {
    const urls = [...document.querySelectorAll(".card-photo")].map((el) => {
      const bg = getComputedStyle(el).backgroundImage || "";
      const match = bg.match(/url\(["']?(.*?)["']?\)/);
      return match && match[1];
    }).filter(Boolean);
    await Promise.all(urls.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = src;
    })));
  });
}

async function shot(page, name) {
  await tidy(page);
  const file = path.join(out, name + ".png");
  await page.screenshot({ path: file });
  const vp = page.viewport();
  manifest.push({ name, w: vp.width, h: vp.height });
  console.log("saved", name);
}

async function clickText(page, text) {
  const point = await page.evaluate((text) => {
    const el = [...document.querySelectorAll("button, a, [role='button']")].find((node) => (node.innerText || "").replace(/\s+/g, " ").trim() === text);
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  }, text);
  if (!point) throw new Error("missing control");
  return point;
}

async function tap(page, text) {
  const point = await clickText(page, text);
  const vp = page.viewport();
  await page.touchscreen.tap(point.x, point.y);
  return { x: point.x / vp.width, y: point.y / vp.height };
}

async function go(page, view) {
  await page.evaluate((view) => {
    document.querySelector(`[data-action="nav"][data-view="${view}"]`)?.click();
  }, view);
  await new Promise((r) => setTimeout(r, 350));
  await tidy(page);
}

const phone = await browser.newPage();
await unlock(phone, 390, 844, 2);

await go(phone, "recipes");
await photos(phone);
await phone.evaluate(() => {
  const chip = [...document.querySelectorAll("button")].find((el) => (el.innerText || "").trim() === "Canadian");
  if (!chip) return;
  const row = chip.closest(".filters") || chip.parentElement;
  row.scrollLeft = Math.max(0, chip.offsetLeft - 24);
  window.scrollTo(0, 0);
});
await shot(phone, "phone-recipes");
const canadianPoint = await phone.evaluate(() => {
  const chip = [...document.querySelectorAll("button")].find((el) => (el.innerText || "").trim() === "Canadian");
  const r = chip.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
const vp = phone.viewport();
manifest.push({ name: "tap-canadian", x: canadianPoint.x / vp.width, y: canadianPoint.y / vp.height });
await phone.touchscreen.tap(canadianPoint.x, canadianPoint.y);
await photos(phone);
const chipBox = await phone.evaluate(() => {
  const chip = [...document.querySelectorAll("button")].find((el) => (el.innerText || "").trim() === "Canadian");
  if (!chip) return null;
  const row = chip.closest(".filters") || chip.parentElement;
  row.scrollLeft = Math.max(0, chip.offsetLeft - 24);
  const r = chip.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), right: Math.round(r.right) };
});
console.log("canadian chip", chipBox);
await shot(phone, "phone-canadian");

await go(phone, "plan");
await phone.evaluate(() => window.scrollTo(0, 0));
const fillOpen = await tap(phone, "Fill a simple week");
manifest.push({ name: "tap-fill", ...fillOpen });
await new Promise((r) => setTimeout(r, 350));
await shot(phone, "phone-fill");
const allThree = await tap(phone, "All three meals");
manifest.push({ name: "tap-all-three", ...allThree });
await new Promise((r) => setTimeout(r, 150));
await shot(phone, "phone-fill-choice");
await tap(phone, "Fill week");
await new Promise((r) => setTimeout(r, 500));
await phone.evaluate(() => {
  const day = document.querySelector(".day");
  if (day) day.scrollIntoView({ block: "start" });
});
await shot(phone, "phone-week");

await go(phone, "shop");
await phone.evaluate(() => window.scrollTo(0, 180));
await shot(phone, "phone-shop");
const have = await phone.evaluate(() => {
  const btn = document.querySelector('[data-action="have"]');
  if (!btn) return null;
  btn.scrollIntoView({ block: "center" });
  const r = btn.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: btn.getAttribute("aria-label") || "" };
});
if (have) {
  const vp = phone.viewport();
  manifest.push({ name: "tap-have", x: have.x / vp.width, y: have.y / vp.height });
  console.log("have", have.label.replace(/already have /i, ""));
  await shot(phone, "phone-shop-before");
  await phone.touchscreen.tap(have.x, have.y);
  await new Promise((r) => setTimeout(r, 300));
  await shot(phone, "phone-shop-have");
} else {
  console.log("have missing");
}

await go(phone, "pantry");
for (const item of ["chicken thighs", "lemon", "broccoli", "garlic"]) {
  await phone.evaluate((item) => {
    const input = document.getElementById("pantryItem");
    if (!input) return;
    input.value = item;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.form?.requestSubmit();
  }, item);
  await new Promise((r) => setTimeout(r, 120));
}
await phone.evaluate(() => {
  const title = document.getElementById("smartChefTitle");
  if (title) title.scrollIntoView({ block: "start" });
});
await new Promise((r) => setTimeout(r, 300));
await shot(phone, "phone-chef");
await phone.evaluate(() => {
  const share = document.querySelector('[data-action="share-pantry"]');
  if (!share) return;
  const y = share.getBoundingClientRect().top + window.scrollY - 220;
  window.scrollTo(0, Math.max(0, y));
});
await new Promise((r) => setTimeout(r, 200));
const share = await pagePoint(phone, '[data-action="share-pantry"]');
if (share) manifest.push({ name: "tap-share", ...share });
await shot(phone, "phone-share");

await go(phone, "recipes");
await photos(phone);
await phone.evaluate(() => window.scrollTo(0, 0));
await shot(phone, "phone-swipe-recipes");
await go(phone, "plan");
await phone.evaluate(() => window.scrollTo(0, 0));
await shot(phone, "phone-swipe-plan");

const tablet = await browser.newPage();
await unlock(tablet, 1100, 1400, 1.5);
await go(tablet, "recipes");
await tablet.evaluate(() => {
  const chip = [...document.querySelectorAll("button")].find((el) => (el.innerText || "").trim() === "Canadian");
  if (chip) chip.click();
});
await photos(tablet);
await new Promise((r) => setTimeout(r, 300));
const tabletChip = await tablet.evaluate(() => {
  const chip = [...document.querySelectorAll("button")].find((el) => (el.innerText || "").trim() === "Canadian");
  if (!chip) return null;
  const row = chip.closest(".filters") || chip.parentElement;
  row.scrollLeft = Math.max(0, chip.offsetLeft - 24);
  window.scrollTo(0, 0);
  const r = chip.getBoundingClientRect();
  return { x: Math.round(r.x), right: Math.round(r.right), y: Math.round(r.y) };
});
console.log("tablet canadian", tabletChip);
await shot(tablet, "tablet-recipes");

function pagePoint(page, selector) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: (r.x + r.width / 2) / window.innerWidth, y: (r.y + r.height / 2) / window.innerHeight };
  }, selector);
}

writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
console.log("done", manifest.length);

const keep = new Set(manifest.filter((item) => item.w).map((item) => item.name + ".png").concat(["manifest.json"]));
for (const name of ["phone-picker.png", "phone-plan-fill-btn.png", "phone-plan-one.png", "phone-plan-two.png", "phone-print.png", "phone-recipes-added.png", "phone-shop-before-have.png", "phone-week-full.png", "tablet-print.png", "tablet-shop.png", "tablet-week.png"]) {
  if (!keep.has(name)) {
    try { rmSync(path.join(out, name)); console.log("removed", name); } catch (err) { /* already gone */ }
  }
}
