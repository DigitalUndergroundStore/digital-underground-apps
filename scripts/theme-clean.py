#!/usr/bin/env python3
"""Clean theme (approved by Wolf, Oct 23 2026): recolour DU site CSS to the strict palette.
  background #11141a  ·  accent/buttons #4f46e5 (text #e6e8ec on it, 5.1:1)  ·  text #e6e8ec
  small accent text/links #9a97e8 (7:1)  ·  muted #a8acb5 (8.1:1) / dim #8f949e (6.1:1)  ·  surfaces/borders = mixes of the three.
Property-aware: text colours -> text/muted/dim/indigo-text, fills -> surfaces/indigo, glows + text-shadows removed,
decorative gradients flattened (neutral image scrims kept), gradient text -> plain text.
Usage: theme-clean.py FILE...   (.css whole file; .html/.js/.py: <style> blocks + style="" attributes)
Never run on product apps (pantry-week, session-forge, get/, buyer PWAs, tools/field-studio) or Kerzy Labs games."""
import re, sys, colorsys

BG = (17, 20, 26); TEXT = (230, 232, 236); ACC = (79, 70, 229); ACC_T = (154, 151, 232)
MUTED = (168, 172, 181); DIM = (143, 148, 158); DANGER = (240, 128, 128)
SURF = [(17, 20, 26), (22, 26, 33), (26, 30, 38), (32, 36, 45), (40, 45, 55)]
NAMED = {"white": (255, 255, 255, 1), "black": (0, 0, 0, 1), "red": (255, 0, 0, 1), "purple": (128, 0, 128, 1), "violet": (238, 130, 238, 1),
         "cyan": (0, 255, 255, 1), "aqua": (0, 255, 255, 1), "magenta": (255, 0, 255, 1), "fuchsia": (255, 0, 255, 1), "lime": (0, 255, 0, 1),
         "gold": (255, 215, 0, 1), "yellow": (255, 255, 0, 1), "orange": (255, 165, 0, 1), "pink": (255, 192, 203, 1), "blue": (0, 0, 255, 1),
         "green": (0, 128, 0, 1), "indigo": (75, 0, 130, 1), "hotpink": (255, 105, 180, 1), "deeppink": (255, 20, 147, 1), "transparent": (0, 0, 0, 0)}
COL = re.compile(r"#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|%23[0-9a-fA-F]{6}\b|%23[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|(?<![-\w#.$/:])\b(?:" + "|".join(NAMED) + r")\b(?![-\w(])", re.I)

def parse(c):
    c = c.strip(); lc = c.lower()
    if lc in NAMED: return NAMED[lc]
    if lc.startswith("%23"): lc = "#" + lc[3:]
    if lc.startswith("#"):
        h = lc[1:]
        if len(h) in (3, 4): h = "".join(x * 2 for x in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16); a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return (r, g, b, a)
    m = re.match(r"(rgba?|hsla?)\((.*)\)", lc)
    if not m: return None
    parts = [p for p in re.split(r"[\s,/]+", m.group(2).strip()) if p]
    if any("var(" in p or "calc" in p for p in parts) or len(parts) < 3: return None
    def num(p, scale=255):
        return float(p[:-1]) / 100 * scale if p.endswith("%") else float(p)
    try:
        a = num(parts[3], 1) if len(parts) > 3 else 1
        if m.group(1).startswith("rgb"): return (num(parts[0]), num(parts[1]), num(parts[2]), a)
        h = float(re.sub("deg", "", parts[0])) / 360; s = num(parts[1], 1); l = num(parts[2], 1)
        r, g, b = colorsys.hls_to_rgb(h, l, s); return (r * 255, g * 255, b * 255, a)
    except Exception: return None

def fmt(rgb, a=1, like=""):
    r, g, b = (int(round(x)) for x in rgb[:3])
    if like.lower().startswith("%23"): return "%%23%02x%02x%02x" % (r, g, b)
    if a >= 0.995: return "#%02x%02x%02x" % (r, g, b)
    return "rgba(%d,%d,%d,%s)" % (r, g, b, ("%.2f" % a).rstrip("0").rstrip(".") if a > 0 else "0")

def hls(c):
    h, l, s = colorsys.rgb_to_hls(*(x / 255 for x in c[:3])); return h * 360, l, s

def saturated(c):
    h, l, s = hls(c); chroma = (max(c[:3]) - min(c[:3])) / 255
    return chroma > 0.16 and s > 0.25 and l >= .22  # very dark tinted colours are surfaces, not accents

def is_red(c):
    h, l, s = hls(c); return saturated(c) and (h < 18 or h > 345)

def blend(c, base=BG):
    a = c[3]; return tuple(c[i] * a + base[i] * (1 - a) for i in range(3))

FIXED = {BG, TEXT, ACC, ACC_T, MUTED, DIM, DANGER, (67, 56, 202), *SURF}
def fixed(c): return tuple(int(round(x)) for x in c[:3]) in FIXED

def map_text(c):
    a = c[3]
    if fixed(c): return fmt(c, a)
    if a == 0: return fmt(c, 0)
    e = blend(c) if a < 1 else c[:3]
    if saturated(e if a < 1 else c): return fmt(DANGER if is_red(c) else ACC_T, 1 if a > .6 else a)
    h, l, s = hls(e)
    if l >= .80: return fmt(TEXT)
    if l >= .58: return fmt(MUTED)
    if l >= .33: return fmt(DIM)
    return fmt(BG)  # dark text (sits on light chips)

def surf(l):
    return SURF[0] if l < .05 else SURF[1] if l < .085 else SURF[2] if l < .12 else SURF[3] if l < .17 else SURF[4]

def map_fill(c):
    a = c[3]
    if fixed(c): return fmt(c, a)
    if a == 0: return fmt(c, 0)
    if saturated(c):
        if is_red(c): return fmt(DANGER, min(a, .9) if a < 1 else .9) if a >= .5 else fmt(DANGER, a)
        return fmt(ACC, a)
    h, l, s = hls(c)
    if l >= .7: return fmt(TEXT, a)                 # white / light chip fills, white-alpha washes
    if l < .2:
        if a >= .5: return fmt(surf(l), a if a < .9 else 1)
        if max(c[:3]) < 8: return fmt((0, 0, 0), a)   # pure black overlays/scrims stay black
        return fmt(BG, a)
    return fmt(SURF[4], a) if a >= .5 else fmt(TEXT, a * .5)

def map_border(c):
    a = c[3]
    if fixed(c): return fmt(c, a)
    if a == 0: return fmt(c, 0)
    if saturated(c):
        if is_red(c): return fmt(DANGER, a)
        return fmt(ACC, a) if a >= .6 else fmt(TEXT, round(min(.12 + a * .3, .3), 2))
    h, l, s = hls(c)
    if l >= .5: return fmt(TEXT, a)
    if l < .2: return fmt(surf(l) if a >= .5 else BG, a)
    return fmt(TEXT, .14)

def recolor(v, fn):
    return COL.sub(lambda m: m.group(0) if m.group(0).lower() == "transparent" else (fn(p) if (p := parse(m.group(0))) else m.group(0)) if not m.group(0).lower().startswith("%23") else _pct(m.group(0)), v)

def _pct(s):
    p = parse(s); return fmt(parse(map_text(p)) or TEXT, like="%23") if p else s

def split_top(v, sep=","):
    out, d, q, cur = [], 0, None, ""
    for ch in v:
        if q:
            cur += ch
            if ch == q: q = None
            continue
        if ch in "\"'": q = ch
        elif ch == "(": d += 1
        elif ch == ")": d -= 1
        if ch == sep and d == 0: out.append(cur); cur = ""
        else: cur += ch
    out.append(cur); return out

GRAD = re.compile(r"(?:repeating-)?(?:linear|radial|conic)-gradient\(")

def grad_span(v, i):
    d = 0
    for j in range(i, len(v)):
        if v[j] == "(": d += 1
        elif v[j] == ")":
            d -= 1
            if d == 0: return j + 1
    return len(v)

def flatten_grad(g):
    """Return replacement for a gradient: neutral scrim -> kept (recoloured); saturated/decorative -> flat colour or transparent."""
    if g.startswith(("radial", "conic", "repeating")): return "transparent"  # glows, halos, star fields
    cols = [parse(m.group(0)) for m in COL.finditer(g)]; cols = [c for c in cols if c]
    vm = re.search(r"var\(--[\w-]+(?:,[^()]*)?\)", g)
    if vm: return vm.group(0)  # e.g. fading accent divider -> flat line in that colour
    if not cols: return None
    sat = [c for c in cols if saturated(c) and c[3] > 0]
    if not sat:
        # neutral: image scrims (transparent -> black) and surface gradients
        if any(c[3] < .99 for c in cols) and all(max(c[:3]) < 60 for c in cols): return recolor(g, map_fill)  # dark scrim/fade over images: keep
        if any(c[3] < .02 for c in cols): return "transparent"  # light sheen
        if all(c[3] < .12 for c in cols): return "transparent"
        opaque = [c for c in cols if c[3] > .4] or cols
        return map_fill(opaque[0])
    if any(c[3] < .02 for c in cols): return "transparent"  # coloured fade/sheen
    if max(c[3] for c in sat) < .5: return "transparent"  # faint colour wash
    return fmt(ACC)  # solid brand gradient (buttons, bars) -> flat indigo

def map_bg_value(v, rule):
    layers = split_top(v); out = []
    for L in layers:
        s = L.strip(); m = GRAD.search(s)
        if m:
            j = grad_span(s, m.start()); g = s[m.start():j]; r = flatten_grad(g)
            if r is None: out.append(L); continue
            rest = (s[:m.start()] + s[j:]).strip()
            if GRAD.match(r): out.append((s[:m.start()] + r + s[j:]).strip()); continue
            rule["flat"].append(r); continue  # becomes the background-color
        out.append(recolor(L, map_fill))
    out = [o for o in out if o.strip()]
    return out

def shadow_value(v, text=False):
    if text: return "none"
    keep = []
    for sh in split_top(v):
        s = sh.strip()
        if not s or s in ("none",): continue
        cm = list(COL.finditer(s)); c = parse(cm[-1].group(0)) if cm else None
        if "var(" in s and not c: keep.append(s); continue
        nums = re.findall(r"-?[\d.]+px|\b0\b", s.replace(cm[-1].group(0), "") if cm else s)
        blur = float(nums[2].replace("px", "")) if len(nums) > 2 else 0
        if c and saturated(c):
            if blur == 0 and "inset" not in s: keep.append(s.replace(cm[-1].group(0), fmt(ACC_T if c[3] > .6 else ACC, min(c[3], .45))))  # focus ring
            continue  # coloured glow -> gone
        if c and max(c[:3]) > 200 and "inset" in s: continue  # inner highlight sheen
        keep.append(recolor(s, map_fill) if c else s)
    return ", ".join(keep) if keep else "none"

TEXTP = {"color", "-webkit-text-fill-color", "caret-color", "fill", "stroke", "text-decoration-color", "column-rule-color", "accent-color", "-webkit-text-stroke-color", "stop-color"}
def var_kind(name, val):
    n = name.lower()
    if GRAD.search(val): return "bg"
    if re.search(r"shadow|glow", n): return "shadow"
    if re.search(r"border|line|ring|outline|stroke", n): return "border"
    if re.search(r"brand|grad|bg|surface|card|elev|glass|panel|backdrop|overlay|z9|z8|z7|deep|base|fill|soft|tint|wash", n): return "fill"
    if re.search(r"text|muted|dim|fg|ink|z[1-5]|label|placeholder|ph\b|copy|heading|title", n): return "text"
    c = parse(COL.search(val).group(0)) if COL.search(val) else None
    if c and c[3] < .5: return "fill"
    return "text"  # accent-like vars default to the text-safe indigo; fills using them get re-pointed below

ACCENTISH = set()
def acc_fill(v):
    return re.sub(r"var\((--[\w-]+)\)", lambda m: "var(--du-accent-fill,#4f46e5)" if m.group(1) in ACCENTISH else m.group(0), v)

def process_block(body, sel=""):
    decls = split_top(body, ";"); rule = {"flat": []}; out = []
    clip_text = re.search(r"background-clip\s*:\s*text", body, re.I) is not None
    for d in decls:
        if ":" not in d or d.strip().startswith(("//",)): out.append(d); continue
        k, v = d.split(":", 1); p = re.sub(r"/\*.*?\*/", "", k, flags=re.S).strip().lower(); vs = v
        imp = ""
        if re.search(r"!\s*important\s*$", vs.strip()): imp = "!important"; vs = re.sub(r"\s*!\s*important\s*$", "", vs.rstrip())
        lead = re.match(r"\s*", vs).group(0)
        nv = None
        if p.startswith("--"):
            kind = var_kind(p, vs)
            if kind == "bg": r = map_bg_value(vs, rule); nv = ",".join(r) if r else (rule["flat"].pop() if rule["flat"] else "transparent"); rule["flat"] = []
            elif kind == "shadow": nv = shadow_value(vs)
            elif kind == "border": nv = recolor(vs, map_border)
            elif kind == "fill": nv = recolor(vs, map_fill)
            else:
                nv = recolor(vs, map_text)
                cm = COL.search(vs)
                if cm and (c := parse(cm.group(0))) and saturated(c) and not is_red(c): ACCENTISH.add(p)
        elif p in TEXTP:
            if clip_text and p == "-webkit-text-fill-color": nv = "currentColor"
            elif clip_text and p == "color" and not re.search(r"var\(", vs): nv = fmt(TEXT)
            else: nv = recolor(vs, map_text)
        elif p in ("background", "background-image"):
            if clip_text: nv = "none"
            else:
                r = map_bg_value(vs, rule); vv = acc_fill(",".join(r))
                rule["flat"] = [acc_fill(x) for x in rule["flat"]]
                if rule["flat"]:
                    flat = rule["flat"][0]; rule["flat"] = []
                    if p == "background-image": nv = vv or "none"; rule["bgc"] = flat
                    elif not vv.strip(): nv = flat
                    else:
                        last = split_top(vv)[-1]
                        nv = vv if (COL.search(last) or "var(" in last) else vv + " " + flat
                else: nv = vv or "none"
        elif p == "background-color":
            nv = re.sub(r"var\((--[\w-]+)\)", lambda m: "var(--du-accent-fill,#4f46e5)" if m.group(1) in ACCENTISH else m.group(0), recolor(vs, map_fill))
        elif p in ("-webkit-background-clip", "background-clip") and "text" in vs: nv = " border-box"
        elif p.startswith("outline"): nv = recolor(vs, map_text)
        elif p.startswith("border") or p in ("column-rule",):
            nv = re.sub(r"var\((--[\w-]+)\)", lambda m: "var(--du-accent-fill,#4f46e5)" if m.group(1) in ACCENTISH and not p.startswith("outline") else m.group(0), recolor(vs, map_border))
        elif p == "box-shadow": nv = " " + shadow_value(vs.strip())
        elif p == "text-shadow": nv = " none"
        elif p in ("filter", "-webkit-filter") and "drop-shadow" in vs:
            nv = re.sub(r"drop-shadow\((?:[^()]|\([^()]*\))*\)", lambda m: "" if any(saturated(c) for c in [parse(x.group(0)) for x in COL.finditer(m.group(0))] if c) else m.group(0), vs).strip() or "none"
            nv = " " + nv
        elif p == "mask" or p == "-webkit-mask" or p.endswith("mask-image"): nv = None
        if nv is None: out.append(d); continue
        if not nv.startswith((" ", "\n")) and lead: nv = lead + nv.lstrip()
        out.append(k + ":" + nv + ((" " + imp) if imp else ""))
    if rule.get("bgc"): out.append("background-color:" + rule["bgc"])
    return ";".join(out)

def css(text):
    # walk leaf blocks { ... } with no nested braces; skip comments
    res, i, n = [], 0, len(text)
    pattern = re.compile(r"/\*.*?\*/|\{([^{}]*)\}", re.S)
    def rep(m):
        if m.group(0).startswith("/*"): return m.group(0)
        return "{" + process_block(m.group(1)) + "}"
    # first pass to learn accent vars (definitions), second to apply
    for m in pattern.finditer(text):
        if m.group(1) and ":root" in text[max(0, m.start() - 80):m.start()] or (m.group(1) and "--" in (m.group(1) or "")): process_block(m.group(1))
    return pattern.sub(rep, text)

def attr(v):
    return process_block(v)

def run(path):
    s = open(path, encoding="utf8").read(); o = s
    if path.endswith(".css"): s = css(s)
    else:
        s = re.sub(r"(<style[^>]*>)(.*?)(</style>)", lambda m: m.group(1) + css(m.group(2)) + m.group(3), s, flags=re.S)
        s = re.sub(r'(\sstyle=")([^"]*)(")', lambda m: m.group(1) + attr(m.group(2)) + m.group(3), s)
        s = re.sub(r"(\sstyle=')([^']*)(')", lambda m: m.group(1) + attr(m.group(2)) + m.group(3), s)
    if s != o: open(path, "w", encoding="utf8").write(s); print("theme-clean:", path)

if __name__ == "__main__":
    for f in sys.argv[1:]: run(f)
