import { chromium } from "playwright";
import fs from "fs";

const QUERIES = [
  "roasted lemon chicken", "egg scramble toast", "chickpea grain bowl", "tomato basil pasta",
  "salmon broccoli sheet pan", "overnight oats jar", "turkey taco skillet", "caprese chicken salad",
  "black bean quesadilla", "sausage pepper pasta", "yogurt parfait berries", "miso soup tofu",
  "blt sandwich", "chicken fajitas", "tuna white bean salad", "loaded baked potato",
  "peanut noodle bowl", "shakshuka eggs", "pesto gnocchi", "turkey chili bowl",
  "garlic shrimp skillet", "vegetable fried rice", "hummus wrap", "banana pancakes",
  "lemon garlic cod", "black bean soup", "caprese toast", "teriyaki tofu bowl",
  "tomato soup bowl", "chicken pita", "sweet potato hash", "lentil tacos",
  "cucumber chicken salad", "mushroom omelette", "sesame noodles", "white bean skillet",
  "shrimp noodle bowl", "coconut curry lentils", "korean beef lettuce cups", "moroccan chickpea stew",
  "caprese panini", "thai basil pork", "greek orzo", "roasted cauliflower",
  "breakfast burrito bowl", "miso cod fish", "lemongrass tofu", "garlic shrimp tapas",
  "lentil curry bowl", "jerk chicken skewers", "eggplant bake", "mapo tofu",
  "black bean soup bowl", "herb omelette", "coconut rice", "fattoush salad",
  "sausage peppers", "teriyaki salmon", "saag paneer", "street corn salad",
  "shrimp grits", "egg drop soup", "garlic fried rice", "herb rice eggs",
  "red beans rice", "swedish meatballs", "poke bowl tuna", "pea mint soup",
  "chimichurri steak", "malaysian peanut noodles", "beet borscht", "shakshuka toast",
  "mojo pork bowl", "dal bhat", "kale sausage soup", "gado gado",
  "pork schnitzel", "rice beans plate", "koshari egyptian", "pierogi pan fried",
  "thai green curry shrimp", "colcannon potatoes", "peanut stew african", "lamb chops",
  "corn casserole", "cheese flatbread", "honey brussels sprouts", "seafood paella",
  "coconut rice pudding", "chocolate mousse", "berry parfait", "apple crisp dessert",
  "energy date balls", "mango smoothie bowl", "banana nice cream", "banh mi tofu bowl",
  "lamb kofta", "hummus vegetable wrap", "sweet potato tacos", "creamy tortellini",
  "walnut pesto gnocchi", "sheet pan sausage fennel", "falafel pita", "glazed pork chops",
  "mushroom risotto", "clam linguine pasta", "bbq chicken flatbread", "zucchini fritters",
  "stuffed bell peppers", "tuna nicoise salad", "chicken tikka lettuce", "pumpkin coconut soup",
  "broccoli cheddar frittata", "sesame soba salad", "steak bites garlic", "curry mussels",
  "spinach artichoke quesadilla", "goat cheese grapes", "kimchi fried rice", "pear compote",
  "chili nachos plate",
];

const out = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const seen = new Set();

for (const q of QUERIES) {
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(q.replace(/\s+/g, "-"))}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    const html = await page.content();
    const re = /images\.unsplash\.com\/photo-(\d+-[a-f0-9]{8,12})/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        out.push({ query: q, slug: m[1] });
        break;
      }
    }
  } catch (e) {
    console.error("fail", q, e.message);
  }
}

await browser.close();
fs.writeFileSync("/workspace/jhagho-work/scripts/collected-slugs.json", JSON.stringify(out, null, 2));
console.log("collected", out.length, "unique slugs");
