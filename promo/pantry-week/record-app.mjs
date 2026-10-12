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
    document.querySelectorAll("a, button, p, div, span").forEach((el) => {
      if ([...el.children].some((child) => /Mealime|Update available/i.test(child.textContent || ""))) return;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (/Mealime/i.test(text)) {
        el.textContent = text.replace(/Mealime doesn't offer a bulk export — paste a recipe link or text instead\.?/i, "Paste a recipe link or text instead.").replace(/\s+/g, " ").trim();
      }
      if (text.length < 140 && /Update available|Tap to refresh/i.test(text)) el.remove();
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
const liveVer = await fetch("https://digitalundergroundstore.com/pantry-week/version.json")
  .then((r) => r.json())
  .then((j) => j.version)
  .catch(() => "");
const build = await phone.evaluate(() => ((document.body.innerText || "").match(/2026\d+-pw\d+/) || [""])[0]);
console.log("build", build, "expected", liveVer || "(any)");
if (liveVer && build && build !== liveVer) {
  console.error("live build mismatch");
  process.exit(1);
}

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
await new Promise((r) => setTimeout(r, 1400));
await shot(phone, "phone-week-b");

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

const recipeUrl = "https://www.bbcgoodfood.com/recipes/easy-chicken-curry";
await go(phone, "more");
await phone.evaluate(() => document.querySelector('[data-action="open-import"]')?.click());
await new Promise((r) => setTimeout(r, 350));
await phone.evaluate((recipeUrl) => {
  const input = document.getElementById("importLink");
  if (!input) return;
  input.value = recipeUrl;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.scrollIntoView({ block: "center" });
}, recipeUrl);
await new Promise((r) => setTimeout(r, 200));
const linkPoint = await pagePoint(phone, "#importLink");
if (linkPoint) manifest.push({ name: "tap-import-link", ...linkPoint });
await shot(phone, "phone-import-link");
await phone.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((el) => /fetch recipe/i.test(el.innerText || ""));
  if (btn) btn.click();
});
await phone.waitForFunction(() => /Easy chicken curry/.test(document.body.innerText || ""), { timeout: 20000 });
await phone.waitForFunction(() => [...document.querySelectorAll(".import-preview-thumb")].some((el) => /url\(/.test(getComputedStyle(el).backgroundImage || "")), { timeout: 8000 });
await phone.evaluate(async () => {
  const el = document.querySelector(".import-preview-thumb");
  const match = (getComputedStyle(el).backgroundImage || "").match(/url\(["']?(.*?)["']?\)/);
  if (!match) return;
  await new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = match[1];
  });
  window.scrollTo(0, 0);
});
const addPoint = await phone.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((el) => /add selected/i.test(el.innerText || ""));
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  return { x: (r.x + r.width / 2) / window.innerWidth, y: (r.y + r.height / 2) / window.innerHeight };
});
if (addPoint) manifest.push({ name: "tap-import-add", ...addPoint });
await shot(phone, "phone-import-preview");
await phone.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((el) => /add selected/i.test(el.innerText || ""));
  if (btn) btn.click();
});
await phone.waitForFunction(() => /Easy chicken curry/.test(document.body.innerText || "") && /Recipe box|imported/i.test(document.body.innerText || ""), { timeout: 10000 });
await new Promise((r) => setTimeout(r, 400));
await phone.evaluate(() => {
  const onRecipes = /Recipe box/.test(document.body.innerText || "");
  if (!onRecipes) document.querySelector('[data-action="nav"][data-view="recipes"]')?.click();
});
await new Promise((r) => setTimeout(r, 350));
await phone.waitForFunction(
  () => {
    const card = [...document.querySelectorAll(".recipe-card, article, .card")].find((el) =>
      /Easy chicken curry/i.test(el.innerText || "")
    );
    if (!card) return false;
    const photo = card.querySelector(".card-photo") || card;
    const bg = getComputedStyle(photo).backgroundImage || "";
    return /url\(/i.test(bg) && !/none/i.test(bg);
  },
  { timeout: 25000 }
);
await phone.evaluate(async () => {
  const card = [...document.querySelectorAll(".recipe-card, article, .card")].find((el) =>
    /Easy chicken curry/i.test(el.innerText || "")
  );
  const photo = card && (card.querySelector(".card-photo") || card);
  if (photo) photo.scrollIntoView({ block: "center" });
  const bg = photo && (getComputedStyle(photo).backgroundImage || "");
  const match = bg && bg.match(/url\(["']?(.*?)["']?\)/);
  if (!match || !match[1]) return;
  await new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = match[1];
  });
});
await shot(phone, "phone-import-saved");

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
