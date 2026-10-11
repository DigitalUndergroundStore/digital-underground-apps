import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import http from "http";

const ROOT = path.resolve("/workspace/pw-v322/jhagho");
const OUT = "/opt/cursor/artifacts/pantry-week-import-screenshots";
const PORT = 8892;

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

fs.mkdirSync(OUT, { recursive: true });
const server = serve(ROOT);
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html#import`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const tip = page.locator("#tip");
if (await tip.isVisible()) await page.click("#tipOk");
await page.screenshot({ path: path.join(OUT, "import-methods-mobile.png"), fullPage: true });

const fixture = path.join(ROOT, "test-fixtures/import/paprika-sample.paprikarecipe");
await page.setInputFiles("#importRecipeFile", fixture);
await page.waitForSelector('text=Preview import', { timeout: 8000 });
await page.screenshot({ path: path.join(OUT, "import-preview-mobile.png"), fullPage: true });

await browser.close();
server.close();
console.log("Saved to", OUT);
