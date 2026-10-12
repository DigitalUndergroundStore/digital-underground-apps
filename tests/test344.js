#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("playwright");
const { loadSecret } = require("./_pw-secret.js");

const origin = (process.argv[2] || "https://digitalundergroundstore.com").replace(/\/$/, "");
const shotDir = process.argv[3] || path.join(__dirname, "shots344");
const errs = [];
const chefBad = [];

const PANTRY = ["mustard", "ribs", "hamburger", "tortilla", "white onion", "pork chops", "eggs", "cheddar", "chicken broth", "peanut butter", "bread", "garlic"];

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
    if (msg.type() === "error") errs.push("console:" + msg.text());
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector("#main", { timeout: 60000 });
  await dismissTip(page);
  await page.screenshot({ path: path.join(shotDir, "01-home.png") });

  const theme = page.locator("#pwThemeToggle");
  if (await theme.count()) await theme.click();
  await page.screenshot({ path: path.join(shotDir, "02-theme.png") });

  await page.locator('[data-action="nav"][data-view="pantry"]').click();
  for (const item of PANTRY) {
    await page.fill("#pantryItem", item);
    await page.locator("#pantryForm button[type=submit]").click();
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1500);
  const suggest = await page.locator("#pantrySuggestList [data-action=open-recipe]").count();
  if (suggest < 3) errs.push("pantry-cook: expected suggest list");
  await page.screenshot({ path: path.join(shotDir, "03-pantry.png") });

  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    const btn = page.locator('[data-action="smart-chef-again"]');
    if (!(await btn.count())) break;
    await btn.click();
    await page.waitForTimeout(700);
    const title = await page.locator(".smart-chef h4, .smart-chef .card-title, .smart-chef strong").first().textContent().catch(() => "");
    const t = (title || "").trim().toLowerCase();
    if (!t || seen.has(t)) chefBad.push(t || "(dup)");
    else seen.add(t);
  }
  const pill = await page.locator(".smart-chef__new-idea").count();
  if (!pill) errs.push("smart-chef: missing New idea pill");

  await page.locator('[data-action="nav"][data-view="recipes"]').click();
  const card = page.locator('[data-action="open-recipe"]').first();
  await card.click();
  await page.waitForSelector(".detail", { timeout: 15000 });
  await page.screenshot({ path: path.join(shotDir, "04-recipe.png") });

  await page.locator('[data-action="nav"][data-view="recipes"]').click();
  await page.fill("#recipeSearch", "cheeseburger");
  await page.waitForTimeout(400);
  const burger = page.locator('[data-action="open-recipe"]:has-text("Cheeseburger"), button.plain.card-title:has-text("Cheeseburger")').first();
  if (await burger.count()) {
    await burger.click();
    await page.locator('[data-action="cook"]').first().click();
    await page.waitForSelector("#cook:not([hidden])", { timeout: 10000 });
    const ing = page.locator('[data-action="cook-ingredients-toggle"], [data-action="cook-toggle-ingredients"]').first();
    if (await ing.count()) await ing.click();
    const ready = page.locator('[data-action="cook-ready"], button:has-text("Ready")').first();
    if (await ready.count()) await ready.click();
  } else errs.push("cheeseburger: not found");

  await browser.close();
  console.log(JSON.stringify({ errs, chefBad, shots: shotDir }, null, 2));
  if (errs.length || chefBad.length) process.exit(1);
}

main().catch((e) => {
  console.log(JSON.stringify({ errs: [String(e)], chefBad }, null, 2));
  process.exit(1);
});
