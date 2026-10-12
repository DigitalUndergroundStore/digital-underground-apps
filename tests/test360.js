#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("playwright");
const { loadSecret } = require("./_pw-secret.js");

const origin = (process.argv[2] || "https://digitalundergroundstore.com").replace(/\/$/, "");
const shotDir = process.argv[3] || path.join(__dirname, "shots360");
const errs = [];

async function dismissTip(page) {
  const ok = page.locator("#tipOk");
  if (await ok.isVisible().catch(() => false)) await ok.click();
}

async function main() {
  const { code } = loadSecret();
  const url = `${origin}/pantry-week/#code=${encodeURIComponent(code)}`;
  fs.mkdirSync(shotDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["Pixel 5"],
    viewport: { width: 412, height: 915 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errs.push("pageerror:" + e.message));
  page.on("console", (msg) => {
    const t = msg.text();
    if (msg.type() === "error" && !/ERR_INTERNET_DISCONNECTED/.test(t)) errs.push("console:" + t);
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector("#main", { timeout: 60000 });
  await dismissTip(page);

  await page.locator('[data-action="nav"][data-view="recipes"]').click();
  await page.fill("#findMoreQuery", "lasagna");
  await page.locator("#findMoreForm button[type=submit]").click();
  await page.waitForTimeout(4000);
  const hit = page.locator('[data-action="find-open"]').first();
  if (!(await hit.count())) errs.push("find-more: no lasagna hit");
  else {
    await hit.click();
    await page.waitForTimeout(5000);
    const credit = await page.locator("text=Wikibooks").first().textContent().catch(() => "");
    if (!/Wikibooks/i.test(credit || "")) errs.push("import: missing Wikibooks credit");
  }

  await page.locator('[data-action="nav"][data-view="recipes"]').click();
  await dismissTip(page);
  await page.locator('[data-action="new-recipe"]').click();
  await page.locator('[data-action="photo-library"]').click();
  const file = path.join(__dirname, "test-recipe-card.png");
  await page.setInputFiles("#photoRecipeFile", file);
  await page.waitForTimeout(12000);
  const name = await page.inputValue("#edName").catch(() => "");
  if (!/cheeseburger/i.test(name)) errs.push("photo: name not filled from card");

  await page.keyboard.press("Escape");
  await page.locator('[data-action="nav-back"]').first().click().catch(() => {});

  await page.locator('[data-action="nav"][data-view="pantry"]').click();
  for (const item of ["pork chops", "onion", "mustard"]) {
    await page.fill("#pantryItem", item);
    await page.locator("#pantryForm button[type=submit]").click();
    await page.waitForTimeout(120);
  }
  await page.locator('[data-action="smart-chef-again"]').click();
  await page.waitForTimeout(3000);
  const lib = await page.locator("text=Pantry Week library").first().isVisible().catch(() => false);
  if (!lib) errs.push("smart-chef: library recipe not first");

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(1500);
  const offlineMsg = await page.locator("text=offline").first().isVisible().catch(() => false);
  if (!offlineMsg) errs.push("offline: no offline message");

  await browser.close();
  console.log(JSON.stringify({ errs, shots: shotDir }, null, 2));
  if (errs.length) process.exit(1);
}

main().catch((e) => {
  console.log(JSON.stringify({ errs: [String(e)] }, null, 2));
  process.exit(1);
});
