import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";

const ROOT = path.resolve("/workspace/jhagho-work/jhagho");
const OUT = "/opt/cursor/artifacts/pantry-week-screenshots";
const PORT = 8891;

function serve(dir) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    let p = path.join(dir, decodeURIComponent(url.pathname));
    if (p.endsWith("/")) p += "index.html";
    fs.readFile(p, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end("not found");
        return;
      }
      const ext = path.extname(p);
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
      res.setHeader("Content-Type", types[ext] || "application/octet-stream");
      res.end(data);
    });
  });
}

const shots = [
  { name: "plan-mobile", hash: "#plan", w: 412, h: 915 },
  { name: "fill-sheet-mobile", hash: "#plan", w: 412, h: 915, before: async (page) => {
    const tip = page.locator("#tip");
    if (await tip.isVisible()) await page.click("#tipOk");
    await page.click('[data-action="fill"]');
    await page.waitForSelector("#fill:not([hidden])", { timeout: 5000 });
  }},
  { name: "recipes-mobile", hash: "#recipes", w: 412, h: 915 },
  { name: "shop-mobile", hash: "#shop", w: 412, h: 915 },
  { name: "more-mobile", hash: "#more", w: 412, h: 915 },
  { name: "recipes-desktop", hash: "#recipes", w: 1440, h: 900 },
];

fs.mkdirSync(OUT, { recursive: true });
const server = serve(ROOT);
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${shot.hash}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const tip = page.locator("#tip");
  if (await tip.isVisible()) await page.click("#tipOk");
  if (shot.before) await shot.before(page);
  await page.screenshot({ path: path.join(OUT, `${shot.name}.png`), fullPage: true });
  await page.close();
}
await browser.close();
server.close();
console.log("Saved screenshots to", OUT);
