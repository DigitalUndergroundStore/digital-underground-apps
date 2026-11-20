#!/usr/bin/env node
import puppeteer from "puppeteer-core";
import path from "path";
import { mkdir } from "fs/promises";

const CAPTURE = process.env.PROMO_CAPTURE || "/tmp/promo-pantry-week/capture/index.html";
const OUT = process.env.ARTIFACTS_DIR || "/opt/cursor/artifacts";

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
const url = "file://" + path.resolve(CAPTURE);
await page.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({
  path: path.join(OUT, "promo-backdrop-reference-412.png"),
  type: "png",
  clip: { x: 0, y: 0, width: 412, height: 915 },
});
await browser.close();
console.log("promo still saved");
