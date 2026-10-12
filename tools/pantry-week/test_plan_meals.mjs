#!/usr/bin/env node
/**
 * Plan meal-slot check at 412px. Usage:
 *   node tools/pantry-week/test_plan_meals.mjs <origin> [codeFile]
 */
import fs from "fs";
import path from "path";
import { chromium, devices } from "playwright";

const origin = (process.argv[2] || "http://127.0.0.1:8788").replace(/\/$/, "");
const secretPath =
  process.argv[3] ||
  process.env.PW_SECRET ||
  "/cursor/stores/bc-db16adba-726f-5f19-a0ab-fa82d552ca1d/internal/secrets/SECRET-pantry-week-buyer-code.txt";

function readCode() {
  const text = fs.readFileSync(secretPath, "utf8");
  const m = text.match(/^CODE=(.+)$/m);
  if (!m) throw new Error("CODE not found in secret file");
  return m[1].trim();
}

const errs = [];

async function main() {
  const code = readCode();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["Pixel 5"],
    viewport: { width: 412, height: 915 },
  });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${origin}/pantry-week/#code=${encodeURIComponent(code)}`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector("#main h2", { timeout: 60000 });
  const tip = page.locator("#tip");
  if (await tip.isVisible().catch(() => false)) {
    await page.click("#tipOk");
    await tip.waitFor({ state: "hidden", timeout: 5000 });
  }

  await page.evaluate(() => {
    const PW = window.PW;
    const state = PW.load();
    state.week = PW.blankWeek();
    const byName = (n) => state.recipes.find((r) => r.name.includes(n));
    const put = (day, slot, name) => {
      const r = byName(name);
      if (!r) throw new Error("missing recipe " + name);
      if (!PW.recipeFitsSlot(r, slot)) {
        throw new Error(r.name + " does not fit " + slot);
      }
      state.week[day][slot] = {
        recipeId: r.id,
        custom: "",
        servings: r.servings || 4,
        leftover: false,
      };
    };
    put("Mon", "breakfast", "Greek Yogurt");
    put("Mon", "dinner", "Garlic Shrimp");
    put("Tue", "dinner", "Ají de Gallina");
    PW.save(state);
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".slot--meal", { timeout: 30000 });

  const slots = await page.$$eval(".slot--meal", (nodes) =>
    nodes.map((n) => ({
      kicker: n.querySelector(".slot-kicker")?.textContent?.trim() || "",
      name: n.querySelector(".meal-card__name")?.textContent?.trim() || "",
    }))
  );

  for (const s of slots) {
    const meal = (s.kicker || "").split("·")[0].trim().toLowerCase();
    if (meal === "breakfast" && /shrimp|gallina|ají/i.test(s.name)) {
      errs.push(`breakfast row has dinner dish: ${s.name}`);
    }
    if (meal === "dinner" && /parfait|yogurt parfait/i.test(s.name)) {
      errs.push(`dinner row has breakfast dish: ${s.name}`);
    }
  }

  async function runFillAll() {
    await page.evaluate(() => {
      const tab = document.querySelector('button[data-tab="plan"]');
      if (tab) tab.click();
    });
    await page.click('button[data-action="fill"]');
    await page.waitForSelector('button[data-action="fill-run"]', { timeout: 10000 });
    await page.click('button[data-scope="all"]');
    await page.check("#fillReplaceAll");
    await page.click('button[data-action="fill-run"]');
    await page.waitForTimeout(800);
  }

  const fillSignatures = [];
  for (let i = 0; i < 3; i++) {
    await runFillAll();
    const sig = await page.$$eval(".slot .meal-card__name", (nodes) =>
      nodes.map((n) => n.textContent.trim()).sort().join("|")
    );
    fillSignatures.push(sig);
  }
  if (new Set(fillSignatures).size < 2) {
    errs.push("fill: identical recipe mix across 3 Fill a simple week runs");
  }

  const filled = await page.$$eval(".slot", (nodes) =>
    nodes
      .filter((n) => n.querySelector(".meal-card__name"))
      .map((n) => ({
        kicker: n.querySelector(".slot-kicker")?.textContent?.trim() || "",
        name: n.querySelector(".meal-card__name")?.textContent?.trim() || "",
      }))
  );

  const slotErrs = await page.evaluate(() => {
    const PW = window.PW;
    const state = PW.load();
    const bad = [];
    const slotFromKicker = (k) => (k || "").split("·")[0].trim().toLowerCase();
    document.querySelectorAll(".slot").forEach((node) => {
      const kicker = node.querySelector(".slot-kicker")?.textContent?.trim() || "";
      const slot = slotFromKicker(kicker);
      if (!["breakfast", "lunch", "dinner"].includes(slot)) return;
      const name = node.querySelector(".meal-card__name")?.textContent?.trim();
      if (!name) return;
      const recipe = state.recipes.find((r) => r.name === name);
      if (!recipe) return;
      if (!PW.recipeFitsSlot(recipe, slot)) {
        bad.push(`${slot}: ${recipe.name}`);
      }
    });
    return bad;
  });
  for (const e of slotErrs) errs.push(`fill slot fit: ${e}`);

  await browser.close();
  console.log(JSON.stringify({ errs, slots, filledCount: filled.length }, null, 2));
  if (errs.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
