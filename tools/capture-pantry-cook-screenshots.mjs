#!/usr/bin/env node
import puppeteer from "puppeteer-core";
import path from "path";
import { mkdir } from "fs/promises";

const ROOT = path.resolve("/workspace/pw-v322/jhagho");
const OUT = "/opt/cursor/artifacts";
const URL = "file://" + path.join(ROOT, "index.html");

await mkdir(OUT, { recursive: true });
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
});
await page.click('[data-action="nav"][data-view="pantry"]');
await new Promise((r) => setTimeout(r, 400));

async function addItem(name) {
  await page.evaluate((n) => {
    document.getElementById("pantryItem").value = n;
  }, name);
  await page.click("#pantryForm button[type=submit]");
  await new Promise((r) => setTimeout(r, 600));
}

for (const item of ["ground beef", "hamburger buns", "cheddar", "onion", "pork chops"]) {
  await addItem(item);
}
await page.screenshot({ path: path.join(OUT, "pantry-cook-managed-412.png"), type: "png" });
await page.evaluate(() => {
  document.documentElement.setAttribute("data-theme", "dark");
  localStorage.setItem("pantry_week_theme", "dark");
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(OUT, "pantry-cook-managed-dark-412.png"), type: "png" });
await browser.close();
console.log("saved pantry cook screenshots");
