import { chromium } from "playwright";
import fs from "fs";
import http from "http";
import path from "path";

const ROOT = path.resolve("/workspace/pw-v322/jhagho");
const OUT = "/opt/cursor/artifacts";
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
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".webp": "image/webp",
        ".png": "image/png",
      };
      res.setHeader("Content-Type", types[ext] || "application/octet-stream");
      res.end(data);
    });
  });
}

const shots = [
  { file: "pantry-week-v330-plan-412.png", hash: "#plan" },
  { file: "pantry-week-v330-recipe-detail-412.png", hash: "#recipe/r1" },
  { file: "pantry-week-v330-pantry-412.png", hash: "#pantry", setup: async (page) => {
    await page.evaluate(() => {
      const st = window.PW.load();
      if (!st.pantry.length) {
        st.pantry.push({ id: "p_demo1", item: "chicken breast" }, { id: "p_demo2", item: "rice" }, { id: "p_demo3", item: "broccoli" });
        window.PW.save(st);
      }
    });
    await page.reload({ waitUntil: "networkidle" });
  }},
  { file: "pantry-week-v330-list-412.png", hash: "#shop" },
  { file: "pantry-week-v330-more-412.png", hash: "#more" },
];

fs.mkdirSync(OUT, { recursive: true });
const server = serve(ROOT);
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${shot.hash}`, { waitUntil: "networkidle" });
  const tip = page.locator("#tip");
  if (await tip.isVisible()) await page.click("#tipOk");
  if (shot.setup) await shot.setup(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, shot.file), fullPage: true });
  await page.close();
}
await browser.close();
server.close();
console.log("Screenshots saved to", OUT);
