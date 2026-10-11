import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const format = process.argv[2] === "square" ? "square" : "vertical";
const preview = process.argv.includes("--preview");
const width = 1080;
const height = format === "square" ? 1080 : 1920;
const fps = 30;
const duration = 26;
const frameCount = fps * duration;
const outDir = process.argv.find((a) => a.startsWith("--out="))?.slice(6)
  || path.join("/tmp", `pw-frames-${format}`);

const previewTimes = [0, 0.9, 1.75, 2.7, 4.3, 5.9, 7.3, 8.6, 11.4, 13.2, 15.4, 17.6, 19.2, 23.2, 25.9];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
await page.goto("file://" + path.join(root, "capture", "index.html"), { waitUntil: "networkidle0" });
await page.evaluate((fmt) => {
  document.documentElement.classList.toggle("square", fmt === "square");
  document.body.style.height = fmt === "square" ? "1080px" : "1920px";
}, format);
await page.evaluate(() => document.fonts.ready);
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const times = preview ? previewTimes : Array.from({ length: frameCount }, (_, i) => i / fps);
for (let i = 0; i < times.length; i++) {
  await page.evaluate((t) => window.renderAt(t), times[i]);
  const name = preview
    ? `t${String(times[i]).replace(".", "_")}.png`
    : `${String(i).padStart(4, "0")}.png`;
  await page.screenshot({ path: path.join(outDir, name), type: "png" });
  if (!preview && i % 60 === 0) console.log(format, i, "/", frameCount);
}
await browser.close();
console.log("wrote", times.length, "frames to", outDir);

if (!preview && process.argv.includes("--encode")) {
  const video = process.argv.find((a) => a.startsWith("--video="))?.slice(8);
  const audio = process.argv.find((a) => a.startsWith("--audio="))?.slice(8);
  if (!video || !audio) throw new Error("need --video and --audio");
  await run("ffmpeg", [
    "-y", "-framerate", String(fps), "-i", path.join(outDir, "%04d.png"),
    "-i", audio,
    "-t", String(duration),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
    "-crf", "18", "-preset", "slow", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    "-shortest", video,
  ]);
}
