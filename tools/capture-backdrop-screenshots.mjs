#!/usr/bin/env node
import puppeteer from "puppeteer-core";
import path from "path";
import { mkdir } from "fs/promises";

const ROOT = process.env.JHAGHO_ROOT || path.resolve("/workspace/pw-v322/jhagho");
const OUT = process.env.ARTIFACTS_DIR || "/opt/cursor/artifacts";
const label = process.argv[2] || "after";
const URL = "file://" + path.join(ROOT, "index.html");

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), type: "png" });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 120000 });
  await page.evaluate(() => {
    const p = document.getElementById("du-preview");
    if (p) p.style.display = "none";
    return document.fonts.ready;
  });

  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem("pantry_week_theme", t);
    }, theme);
    await new Promise((r) => setTimeout(r, 500));
    await shot(page, `backdrop-${label}-plan-${theme}-412.png`);
    await page.click('[data-action="nav"][data-view="recipes"]');
    await new Promise((r) => setTimeout(r, 450));
    await shot(page, `backdrop-${label}-recipes-${theme}-412.png`);
    await page.click('[data-action="nav"][data-view="shop"]');
    await new Promise((r) => setTimeout(r, 450));
    await shot(page, `backdrop-${label}-list-${theme}-412.png`);
    await page.click('[data-action="nav"][data-view="plan"]');
    await new Promise((r) => setTimeout(r, 250));
  }
  await browser.close();
}

await mkdir(OUT, { recursive: true });
await run();
console.log("saved backdrop shots:", label, "from", ROOT);
