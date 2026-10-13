#!/usr/bin/env python3
"""Assign exactly one plan cuisine tag per recipe (Canadian, American, Italian, …)."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import unquote

from proofread_recipes import load_batches, write_batch

JS_DIR = Path(__file__).resolve().parents[2] / "src" / "jhagho" / "js"

PLAN_CUISINES = (
    "canadian",
    "american",
    "italian",
    "mexican",
    "chinese",
    "indian",
    "british",
    "french",
    "mediterranean",
    "japanese",
    "thai",
    "korean",
    "greek",
    "middle_eastern",
    "caribbean",
    "african",
    "other",
)

COLLECTION_MAP = {
    "collection-indian": "indian",
    "collection-italian": "italian",
    "collection-mexican": "mexican",
    "collection-texmex": "mexican",
    "collection-asian": "chinese",
    "collection-pub": "british",
}

# (pattern, cuisine) — earlier rows win when multiple match in slug scan
SLUG_CUISINE_HINTS: tuple[tuple[str, str], ...] = (
    ("japanese", "japanese"),
    ("japan", "japanese"),
    ("sushi", "japanese"),
    ("ramen", "japanese"),
    ("teriyaki", "japanese"),
    ("miso", "japanese"),
    ("udon", "japanese"),
    ("tempura", "japanese"),
    ("korean", "korean"),
    ("bibimbap", "korean"),
    ("bulgogi", "korean"),
    ("kimchi", "korean"),
    ("gochujang", "korean"),
    ("thai", "thai"),
    ("pad_thai", "thai"),
    ("tom_yum", "thai"),
    ("green_curry", "thai"),
    ("massaman", "thai"),
    ("greek", "greek"),
    ("gyro", "greek"),
    ("souvlaki", "greek"),
    ("moussaka", "greek"),
    ("tzatziki", "greek"),
    ("spanakopita", "greek"),
    ("jamaican", "caribbean"),
    ("caribbean", "caribbean"),
    ("cuban", "caribbean"),
    ("puerto_rican", "caribbean"),
    ("haitian", "caribbean"),
    ("trinidad", "caribbean"),
    ("plantain", "caribbean"),
    ("jerk_", "caribbean"),
    ("lebanese", "middle_eastern"),
    ("persian", "middle_eastern"),
    ("iranian", "middle_eastern"),
    ("turkish", "middle_eastern"),
    ("moroccan", "middle_eastern"),
    ("israeli", "middle_eastern"),
    ("yemen", "middle_eastern"),
    ("shawarma", "middle_eastern"),
    ("falafel", "middle_eastern"),
    ("hummus", "middle_eastern"),
    ("tagine", "middle_eastern"),
    ("kebab", "middle_eastern"),
    ("mexican", "mexican"),
    ("mexico", "mexican"),
    ("enchilada", "mexican"),
    ("tamale", "mexican"),
    ("taco", "mexican"),
    ("italian", "italian"),
    ("pasta", "italian"),
    ("lasagna", "italian"),
    ("risotto", "italian"),
    ("indian", "indian"),
    ("curry", "indian"),
    ("masala", "indian"),
    ("biryani", "indian"),
    ("bengali", "indian"),
    ("chinese", "chinese"),
    ("sichuan", "chinese"),
    ("wonton", "chinese"),
    ("dim_sum", "chinese"),
    ("french", "french"),
    ("bourguignon", "french"),
    ("vichyssoise", "french"),
    ("quiche", "french"),
    ("british", "british"),
    ("scottish", "british"),
    ("irish", "british"),
    ("welsh", "british"),
    ("yorkshire", "british"),
    ("canadian", "canadian"),
    ("canada", "canadian"),
    ("poutine", "canadian"),
    ("tourtiere", "canadian"),
    ("tourtière", "canadian"),
    ("spanish", "mediterranean"),
    ("portuguese", "mediterranean"),
    ("paella", "mediterranean"),
    ("tapas", "mediterranean"),
    ("cajun", "american"),
    ("creole", "american"),
    ("southern", "american"),
    ("texas", "american"),
    ("bbq", "american"),
    ("barbecue", "american"),
    ("nigerian", "african"),
    ("sinasir", "african"),
    ("ethiopian", "african"),
    ("injera", "african"),
    ("moroccan", "middle_eastern"),
    ("lebanese", "middle_eastern"),
    ("fattoush", "middle_eastern"),
    ("filipino", "other"),
    ("bicol", "other"),
    ("binagoongan", "other"),
    ("peruvian", "other"),
    ("anticuchos", "other"),
    ("vietnamese", "other"),
    ("malaysian", "other"),
    ("indonesian", "other"),
    ("australian", "british"),
    ("boliche", "caribbean"),
)

CANADIAN = re.compile(
    r"(canadian|canada|poutine|tourti[eè]re|nanaimo|montreal|beaver tail|peameal|butter tart|"
    r"maple (?:bacon|glazed|syrup)|back bacon|donair|bannock|timbits|caesar cocktail|"
    r"nova scotia|halifax|vancouver|toronto|quebec|ontario|alberta|manitoba|"
    r"split pea soup canadian|kraft dinner|ketchup chips)",
    re.I,
)
JAPANESE = re.compile(
    r"(japanese|japan\b|sushi|sashimi|ramen|udon|teriyaki|miso\b|tempura|tonkatsu|"
    r"okonomiyaki|yakitori|onigiri|donburi|gyoza|edamame|matcha\b|katsu)",
    re.I,
)
KOREAN = re.compile(
    r"(korean|korea\b|bibimbap|bulgogi|kimchi|gochujang|japchae|galbi|tteok|mandu|"
    r"korean fried chicken|samgyeopsal)",
    re.I,
)
THAI = re.compile(
    r"(thai\b|thailand|pad thai|tom yum|tom kha|massaman|panang|larb\b|som tam|"
    r"green curry|red curry|thai basil)",
    re.I,
)
GREEK = re.compile(
    r"(greek\b|greece|gyro|souvlaki|moussaka|tzatziki|spanakopita|dolmades|"
    r"feta\b|halloumi|baklava greek|avgolemono)",
    re.I,
)
AFRICAN = re.compile(
    r"(african|nigeria|nigerian|ghana|ghanaian|senegal|senegalese|ethiopian|ethiopia|"
    r"injera|egyptian|egypt\b|tunisia|algeria|kenya|kenyan|"
    r"sinasir|jollof|suya|egusi|fufu|bobotie|biltong|harira)",
    re.I,
)
CARIBBEAN = re.compile(
    r"(caribbean|jamaican|jamaica|cuban|cuba\b|puerto rico|haitian|trinidad|"
    r"plantain|jerk chicken|jerk pork|ackee|callaloo|ropa vieja|mofongo|"
    r"arroz con (?:pollo|gandules)|pernil|sofrito)",
    re.I,
)
MIDDLE_EASTERN = re.compile(
    r"(middle eastern|lebanese|syrian|persian|iranian|iraqi|yemenite|yemeni|"
    r"turkish|moroccan|israeli|palestinian|egyptian|shawarma|falafel|hummus|"
    r"tahini|tabbouleh|baba ganoush|shakshuka|tagine|couscous|harissa|"
    r"kofta|kebab|kibbeh|fattoush|mansaf|za'atar|dukkah|muhammara)",
    re.I,
)
MEXICAN = re.compile(
    r"(mexican|mexico|tex-?mex|enchilada|tamale|tostada|quesadilla|fajita|burrito|"
    r"carnitas|mole\b|chilaquiles|pozole|elote|huevos rancheros|salsa verde|"
    r"guacamole|taco|nachos|chipotle|jalape[nñ]o popper|birria|tamal)",
    re.I,
)
ITALIAN = re.compile(
    r"(italian|italy|pasta\b|lasagna|lasagne|spaghetti|fettuccine|penne|ravioli|"
    r"risotto|osso buco|parmigiana|parmesan|marinara|bolognese|carbonara|"
    r"pesto\b|gnocchi|polenta|bruschetta|caprese|minestrone|tiramisu|"
    r"ciabatta|prosciutto|mozzarella|neapolitan|sicilian|calzone|stromboli|"
    r"puttanesca|arrabbiata|cacciatore|piccata|saltimbocca)",
    re.I,
)
CHINESE = re.compile(
    r"(chinese|china|sichuan|szechuan|cantonese|dim sum|wonton|dumpling|"
    r"chow mein|lo mein|kung pao|mapo|char siu|peking|hot pot|congee|"
    r"fried rice|stir.?fry|bao\b|spring roll|egg roll|general tso|orange chicken|"
    r"dan dan|ma po|twice.cooked)",
    re.I,
)
INDIAN = re.compile(
    r"(indian|india|curry\b|masala|tikka|tandoori|biryani|dal\b|dosa\b|"
    r"samosa|naan\b|chana|paneer|korma|vindaloo|butter chicken|"
    r"chana masala|palak|saag|rogan josh|pakora|khichuri|khichdi|"
    r"goan|punjabi|bengali|garam masala)",
    re.I,
)
BRITISH = re.compile(
    r"(british|english|scottish|welsh|irish|uk\b|yorkshire|bangers|toad in the hole|"
    r"shepherd'?s pie|cottage pie|fish and chips|bubble and squeak|"
    r"ploughman|cornish|scones?\b(?!.*soup)|crumpet|full english|"
    r"bread and butter pudding|sticky toffee|spotted dick|bangers and mash|"
    r"welsh rarebit|cornish pasty|beef wellington|steak and kidney|"
    r"anzac biscuit|bangers mash)",
    re.I,
)
FRENCH = re.compile(
    r"(french|france|coq au|ratatouille|bouillabaisse|quiche|croissant|"
    r"cr[eê]pe|souffl[eé]|cassoulet|confit|beurre blanc|hollandaise|"
    r"b[eé]arnaise|gratin dauphinois|tarte tatin|beef bourguignon|boeuf bourguignon|"
    r"onion soup|french toast|french onion|vichyssoise|gratin|au vin|"
    r"croque monsieur|blanquette|daube|pot au feu|bouillabaisse)",
    re.I,
)
MEDITERRANEAN = re.compile(
    r"(mediterranean|spanish|portuguese|paella|tapas|piri piri|"
    r"gazpacho|tortilla espa[nñ]ola|chorizo|calamari|cioppino|"
    r"puttanesca|sicilian|basque|catalan)",
    re.I,
)
AMERICAN = re.compile(
    r"(american|\busa\b|u\.s\.|new england|texas|philly|"
    r"buffalo wings|bbq|barbecue|meatloaf|pot roast|sloppy joe|jambalaya|gumbo|"
    r"mac and cheese|grits|cornbread|biscuits and gravy|clam chowder|"
    r"cheesesteak|lobster roll|po.? ?boy|pulled pork|brisket|"
    r"thanksgiving|pumpkin pie|pecan pie|key lime|apple pie|"
    r"chicken and waffles|corn dog|hot dog|hamburger|cheeseburger|"
    r"ranch\b|deviled eggs|potato salad|green bean casserole|"
    r"cincinnati|memphis|carolina|midwestern|pedernales|usda|"
    r"cobbler|hash brown|boston baked|fried green tomato|prime rib|"
    r"pork chop|meat loaf|burger\b|sloppy|chili con|peanut butter cookie|"
    r"blueberry muffin|pancake|waffle|cornbread|succotash|"
    r"southern fried|buttermilk biscuit|banana bread|blt\b|"
    r"reuben sandwich|club sandwich|tater tot|corn chowder|"
    r"macaroni and cheese|mac and cheese|pot pie|frittata|biscuits\b|black bean soup|"
    r"collard green|pinto bean|brown betty|apple cobbler|berry chia|gravy\b|"
    r"skillet supper|casserole|chili\b|burgers\b|salmon burger|potato bar|"
    r"tomato soup|blended soup|cheddar|broccoli burger|beanburger|hobo burger)",
    re.I,
)

# Regional dishes that should not fall through to Other
DISH_OVERRIDES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(lebanese|fattoush)\b", re.I), "middle_eastern"),
    (re.compile(r"\b(nigerian|sinasir|jollof|egusi)\b", re.I), "african"),
    (re.compile(r"\bborscht\b", re.I), "other"),
    (re.compile(r"\b(peruvian|ceviche|lomo saltado|aj[ií] de gallina)\b", re.I), "other"),
    (re.compile(r"\b(filipino|adobo|lumpia|sinigang)\b", re.I), "other"),
    (re.compile(r"\b(vietnamese|pho\b|banh mi)\b", re.I), "other"),
    (re.compile(r"\b(indonesian|nasi goreng|rendang)\b", re.I), "other"),
    (re.compile(r"\b(malaysian|laksa)\b", re.I), "other"),
    (re.compile(r"\b(german|schnitzel|bratwurst|sauerkraut)\b", re.I), "other"),
    (re.compile(r"\b(polish|pierogi|bigos)\b", re.I), "other"),
    (re.compile(r"\b(russian|beef stroganoff|pelmeni)\b", re.I), "other"),
    (re.compile(r"\b(anticuchos|peruvian)\b", re.I), "other"),
    (re.compile(r"\b(bicol express|binagoongan|lumpia)\b", re.I), "other"),
)

GENERIC_WIKIBOOKS_AMERICAN = re.compile(
    r"(salad|soup|sandwich|burger|cookie|muffin|pancake|waffle|omelet|omelette|"
    r"casserole|roast|baked|grilled|steamed|fried|stew|chowder|"
    r"potato|chicken|rice|pork|beef|turkey|egg|broccoli|spinach|"
    r"meatloaf|cobbler|brownie|bar\b|dip\b|spread|dressing)",
    re.I,
)


def haystack(recipe: dict) -> str:
    parts = [recipe.get("name") or "", recipe.get("sourceUrl") or ""]
    for tag in recipe.get("tags") or []:
        parts.append(str(tag))
    for ing in recipe.get("ingredients") or []:
        parts.append(str(ing.get("item") or ""))
    return " ".join(parts).lower()


def wikibooks_slug(recipe: dict) -> str:
    url = (recipe.get("sourceUrl") or "").lower()
    if "wikibooks.org" not in url or "cookbook:" not in url:
        return ""
    slug = url.split("cookbook:", 1)[-1]
    slug = unquote(slug).lower().replace("-", "_").replace(" ", "_")
    return slug


def cuisine_from_slug(slug: str) -> str | None:
    if not slug:
        return None
    for hint, cuisine in SLUG_CUISINE_HINTS:
        if hint in slug:
            return cuisine
    return None


def strip_cuisine_tags(tags: list) -> list[str]:
    out = []
    for tag in tags or []:
        t = str(tag).lower()
        if t in PLAN_CUISINES:
            continue
        out.append(tag)
    return out


def infer_cuisine(recipe: dict) -> str:
    tags = [str(t).lower() for t in (recipe.get("tags") or [])]
    if "canadian" in tags:
        return "canadian"
    for col, cuisine in COLLECTION_MAP.items():
        if col in tags:
            return cuisine

    blob = haystack(recipe)
    slug = wikibooks_slug(recipe)

    for pattern, cuisine in DISH_OVERRIDES:
        if pattern.search(blob) or (slug and pattern.search(slug.replace("_", " "))):
            return cuisine

    slug_cuisine = cuisine_from_slug(slug)
    if slug_cuisine:
        return slug_cuisine

    checks = (
        (CANADIAN, "canadian"),
        (JAPANESE, "japanese"),
        (KOREAN, "korean"),
        (THAI, "thai"),
        (GREEK, "greek"),
        (CARIBBEAN, "caribbean"),
        (AFRICAN, "african"),
        (MIDDLE_EASTERN, "middle_eastern"),
        (MEXICAN, "mexican"),
        (ITALIAN, "italian"),
        (CHINESE, "chinese"),
        (INDIAN, "indian"),
        (BRITISH, "british"),
        (FRENCH, "french"),
        (MEDITERRANEAN, "mediterranean"),
        (AMERICAN, "american"),
    )
    for pattern, cuisine in checks:
        if pattern.search(blob):
            return cuisine

    url = (recipe.get("sourceUrl") or "").lower()
    if "usda" in url or "nutrition.gov" in url:
        return "american"

    if slug or "wikibooks.org" in url:
        name = (recipe.get("name") or "").lower()
        combined = f"{slug} {name}"
        for hint, cuisine in SLUG_CUISINE_HINTS:
            if hint.replace("_", " ") in combined or hint in combined:
                return cuisine
        if GENERIC_WIKIBOOKS_AMERICAN.search(blob):
            return "american"

    return "other"


def tag_recipe(recipe: dict) -> tuple[dict, str]:
    cuisine = infer_cuisine(recipe)
    tags = strip_cuisine_tags(list(recipe.get("tags") or []))
    tags.append(cuisine)
    recipe["tags"] = tags
    return recipe, cuisine


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--report", type=Path, default=Path("/tmp/plan-cuisine-tags.json"))
    args = ap.parse_args()

    batches = load_batches()
    counts = {c: 0 for c in PLAN_CUISINES}
    samples: dict[str, list[str]] = {c: [] for c in PLAN_CUISINES}

    for batch_file, recipes in batches.items():
        for recipe in recipes:
            _, cuisine = tag_recipe(recipe)
            counts[cuisine] += 1
            if len(samples[cuisine]) < 3:
                samples[cuisine].append(f"{recipe.get('id')}: {recipe.get('name')}")

    report = {"counts": counts, "samples": samples, "total": sum(counts.values())}
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(counts, indent=2))

    if not args.dry_run:
        for batch_file, recipes in batches.items():
            write_batch(batch_file, recipes)


if __name__ == "__main__":
    main()
