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

async function goRecipes(page) {
  await page.locator('[data-action="nav"][data-view="recipes"]').click();
  await page.waitForSelector("#findMoreQuery", { timeout: 20000 });
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
    if (msg.type() === "error" && !/ERR_INTERNET_DISCONNECTED|Failed to load resource: the server responded with a status of 404/.test(t)) {
      errs.push("console:" + t);
    }
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector("#main", { timeout: 60000 });
  await dismissTip(page);

  await goRecipes(page);
  await page.locator('[data-action="new-recipe"]').click();
  await page.waitForSelector("#editorForm", { timeout: 15000 });
  await page.locator('[data-action="photo-library"]').click();
  const file = path.join(__dirname, "test-recipe-card.png");
  await page.setInputFiles("#photoRecipeFile", file);
  await page.waitForTimeout(14000);
  const name = await page.inputValue("#edName").catch(() => "");
  if (!/cheeseburger/i.test(name)) errs.push("photo: name not filled from card");
  await page.locator("#editor .icon-btn[aria-label='Back']").click();
  await page.waitForTimeout(400);

  await goRecipes(page);
  await page.fill("#findMoreQuery", "lasagna");
  await page.locator("#findMoreForm button[type=submit]").click();
  await page.waitForTimeout(5000);
  const hit = page.locator('[data-action="find-open"]').first();
  if (!(await hit.count())) errs.push("find-more: no lasagna hit");
  else {
    await hit.click();
    await page.waitForTimeout(6000);
    const body = await page.locator("#main, #editor, #import").first().innerText();
    if (!/Wikibooks/i.test(body)) errs.push("import: missing Wikibooks credit");
    await page.locator(".modal .icon-btn[aria-label='Back']").first().click().catch(() => {});
    await page.waitForTimeout(300);
  }

  await page.locator('[data-action="nav"][data-view="pantry"]').click();
  for (const item of ["pork chops", "white onion", "mustard"]) {
    await page.fill("#pantryItem", item);
    await page.locator("#pantryForm button[type=submit]").click();
    await page.waitForTimeout(120);
  }
  await page.locator('[data-action="smart-chef-again"]').click();
  await page.waitForTimeout(3500);
  const libText = await page.locator(".smart-chef").innerText();
  if (!/from your library|pantry week library/i.test(libText)) errs.push("smart-chef: library recipe not first");

  await context.setOffline(true);
  await goRecipes(page).catch(() => {});
  await page.waitForTimeout(800);
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
