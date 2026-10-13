#!/usr/bin/env node
/** Screenshot Plan tab at iPhone width. CODE from PW_SECRET file (first line before comma). */
import { chromium, devices } from "playwright";
import { readFileSync } from "fs";
import { mkdirSync } from "fs";

const origin = process.argv[2] || "https://digitalundergroundstore.com";
const outDir = process.argv[3] || "/tmp/plan-shots";
const secretPath =
  process.env.PW_SECRET ||
  "/cursor/stores/bc-db16adba-726f-5f19-a0ab-fa82d552ca1d/internal/secrets/SECRET-pantry-week-buyer-code.txt";

function loadCode() {
  const raw = readFileSync(secretPath, "utf8");
  const line = raw.split("\n").find((l) => /^CODE=/i.test(l.trim()));
  if (!line) throw new Error("Could not parse buyer code from secret file");
  return line.replace(/^CODE=/i, "").trim();
}

mkdirSync(outDir, { recursive: true });
const code = loadCode();
const base = origin.replace(/\/$/, "");
const hosted = /digitalundergroundstore\.com|pages\.dev/i.test(base);
const url = `${base}${hosted ? "/pantry-week" : ""}/#code=${encodeURIComponent(code)}`;

const iPhone = devices["iPhone 13"];
const browser = await chromium.launch();
const context = await browser.newContext({
  ...iPhone,
  locale: "en-US",
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector('[data-action="fill"], .days, .slot', { timeout: 120000 });
await page.waitForTimeout(1500);
const tipDismiss = page.locator("#tipOk");
if (await tipDismiss.count()) {
  try {
    await tipDismiss.first().click({ timeout: 3000 });
    await page.waitForTimeout(300);
  } catch { /* no tip */ }
}
const skipFill = process.argv.includes("--no-fill");
let filterShot = "";
if (!skipFill) {
  const fill = page.locator('button[data-action="fill"]');
  if (await fill.count()) {
    try {
      await fill.first().click({ timeout: 8000 });
      await page.waitForTimeout(900);
    } catch {
      /* plan may already have meals or overlay blocked tap */
    }
  }
}
if (process.argv.includes("--filter-ui") || process.argv.includes("--canadian-fill")) {
  const canadianOnly = process.argv.includes("--canadian-fill");
  filterShot = `${outDir}/${canadianOnly ? "fill-sheet-canadian-chips" : "fill-sheet-cuisine-chips"}.png`;
  await page.screenshot({ path: filterShot, fullPage: false });
  const cuisine = page.locator(`[data-cuisine="${canadianOnly ? "canadian" : "italian"}"]`);
  if (await cuisine.count()) await cuisine.first().click();
  await page.waitForTimeout(250);
  const run = page.locator('[data-action="fill-run"]');
  if (await run.count()) {
    await run.first().click();
    await page.waitForTimeout(1400);
  }
  await page.evaluate(() => window.scrollTo(0, document.querySelector(".days")?.offsetTop || 400));
  await page.waitForTimeout(400);
  const filled = `${outDir}/${canadianOnly ? "plan-canadian-fill-week" : "plan-filled-filter-mobile"}.png`;
  await page.screenshot({ path: filled, fullPage: false });
  filterShot = filled;
} else if (!skipFill) {
  await page.evaluate(() => window.scrollTo(0, document.querySelector(".days")?.offsetTop || 400));
  await page.waitForTimeout(400);
}
const shot = `${outDir}/plan-mobile.png`;
if (!filterShot) await page.screenshot({ path: shot, fullPage: false });
console.log(JSON.stringify({
  url: origin,
  shot: filterShot || shot,
  filterShot,
  version: await page.evaluate(() => window.__DU_APP_SEMVER__),
}));
await browser.close();
