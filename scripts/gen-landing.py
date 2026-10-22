#!/usr/bin/env python3
"""Generate SEO landing pages (one folder per page) from PAGES below. Re-run after edits, then gen-sitemap.py."""
import importlib.util as _ilu
_spec=_ilu.spec_from_file_location("site_nav", __import__("os").path.join(__import__("os").path.dirname(__file__),"site-nav.py")); _site_nav=_ilu.module_from_spec(_spec); _spec.loader.exec_module(_site_nav)
import os,json,html
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); B="https://digitalundergroundstore.com"; e=html.escape
G="https://kerzy.gumroad.com/l/"
PAGES=[
dict(slug="weekly-meal-planner-canada",title="Weekly Meal Planner for Canadian Families: Pantry Week",desc="Pantry Week is an offline weekly meal planner with 1,000+ recipes. Plan 7 days, get a shopping list by aisle, cook step by step. CA$24 once, no subscription.",
 og="/p/og/pantry-week.jpg?v=20261020pw",h1="A weekly meal planner that writes your grocery list",
 lead="Pantry Week plans your week of dinners (plus breakfast and lunch if you want them) from 1,000+ hand-checked recipes. It then builds one combined shopping list, sorted by aisle. It is priced in Canadian dollars, works offline on iPhone, Android and computers, and costs CA$24 once.",
 points=["Plan 7 days in minutes: tap a meal, pick a recipe, or fill the week automatically","One shopping list, grouped by aisle, with quantities combined across recipes","Pantry tracking, so you do not buy what you already have","Cook mode shows one step at a time","Works offline and installs to your home screen. No account, no subscription"],
 cta=("Get Pantry Week for CA$24",G+"jhagho"),cta2=("See the product page","/p/pantry-week/"),
 faq=[("Is Pantry Week a subscription?","No. You pay CA$24 once on Gumroad and keep it, including updates."),("Does it work in Canada?","Yes. It is made in Ontario and priced in CA$. Recipes use common grocery-store ingredients, and the list adds grams next to pounds and ounces."),("Does it need internet?","Only to unlock it the first time. After that it works offline on your phone or computer."),("Can I add my own recipes?","Yes. You can add, edit and import your own recipes alongside the built-in ones.")]),
dict(slug="ai-prompt-packs-for-creators",title="AI Prompt Packs for Creators: Grok and ChatGPT Prompts",desc="Two ready-to-use prompt packs: 172 professional Grok prompts (CA$29) and 80 ChatGPT prompts for digital product creators with tips for every prompt (CA$9).",
 og="/p/og/grok-prompt-pack.jpg",h1="Prompt packs that get useful answers, not filler",
 lead="Skip the blank chat box. Each pack is organised by task, uses clear [BRACKETS] for your details, and includes tips on getting a stronger second draft.",
 points=["Professional Grok Prompt Pack: 172 prompts across writing, business, engineering, research, social and creative work (CA$29)","ChatGPT Prompt Pack for Digital Creators: 80 prompts to plan, build, package, sell and support digital products, each with a tip or example (CA$9)","Delivered instantly as PDF or Word documents","Use the outputs in your own commercial work"],
 cta=("Get the Grok Prompt Pack (CA$29)",G+"jsdrug"),cta2=("Get the ChatGPT Prompt Pack (CA$9)",G+"lqynfs"),
 faq=[("Do the Grok prompts work in ChatGPT or Claude?","Most do. They are written for Grok, but any capable AI assistant handles them well."),("What format are the packs?","PDF, plus Word and text versions for the Grok pack, so you can copy prompts easily."),("Can I use the outputs commercially?","Yes. You can use what you create with the prompts in personal and commercial work. Please do not resell the pack itself.")]),
dict(slug="share-live-location-link",title="Share Your Live Location with a Link, No App to Watch: Easy Tracker",desc="Easy Tracker for Android shares your live location as a simple link. The person watching just opens it in a browser, with no app or account. The link ends when you stop or after 12 hours.",
 og="/assets/og/easy-tracker.jpg",h1="Share a live location link that anyone can open",
 lead="When you are on your way, Easy Tracker gives you a link to send. The other person opens it on their phone and sees you coming. They do not need an app or an account. The link stops when you tap Stop, or after 12 hours.",
 points=["Free Android app (currently in testing)","Watchers need no app and no account, just a browser","The link expires automatically after 12 hours","Stop sharing any time with one tap"],
 cta=("Download Easy Tracker (Android APK)","/downloads/easy-tracker/"),cta2=("Privacy policy","https://track.digitalundergroundstore.com/privacy"),
 faq=[("Is Easy Tracker free?","Yes, it is free while in testing."),("Does the other person need the app?","No. They open your link in any phone browser."),("How long does the link last?","Until you tap Stop, or 12 hours at most."),("Is there an iPhone version?","Not yet. Easy Tracker is Android only for now, but iPhone users can watch a link.")]),
dict(slug="offline-invoice-generator",title="Offline Invoice Generator for Freelancers, No Subscription: Invoice Desk",desc="Make professional invoices offline in your browser. Invoice Desk (CA$19), Rate Wire rate calculator (CA$9) and Scope Lock project briefs (CA$12). Pay once, no account, your data stays on your device.",
 og="/p/og/invoice-desk.jpg",h1="Freelance paperwork without another subscription",
 lead="Offline browser tools for freelancers who want to look professional and get paid. Nothing to sign up for, and your client data never leaves your device.",
 points=["Invoice Desk: build and print or save professional invoices (CA$19)","Rate Wire: work out your hourly and day rate floor before you quote (CA$9)","Scope Lock: client project briefs that stop scope creep (CA$12)","Launch Ledger: income tracker and invoices in one offline money hub (CA$29)","Or get the Freelance Admin Stack bundle (CA$35)"],
 cta=("Get Invoice Desk (CA$19)",G+"nvmvyx"),cta2=("See the Freelance Admin Stack (CA$35)",G+"lggigy"),
 faq=[("Do these tools work offline?","Yes. Each one is a self-contained file that runs in your browser on a computer or phone with no internet."),("Is there a monthly fee?","No. You pay once on Gumroad and keep it."),("Where is my data stored?","Only on your own device, in your browser's storage. Export or print whenever you like.")]),
dict(slug="offline-habit-tracker-focus-timer",title="Offline Habit Tracker and Focus Timer: Streak Kit and Focus Gate",desc="Simple offline habit streaks (Streak Kit, CA$9) and a calm deep-work focus timer with session log (Focus Gate, CA$7). No account, no ads, works on phone and computer.",
 og="/p/og/streak-kit.jpg",h1="Build habits and protect your focus, offline",
 lead="Two small, calm tools with no account, ads or notifications nagging you. They run in your browser and keep your data on your device.",
 points=["Streak Kit: add habits and tap the last 14 days to keep streaks (CA$9)","Focus Gate: set an intention, run a deep-work timer and log your sessions (CA$7)","Focus & Habits Pack bundle (CA$19)","Free for students: Exam Desk study toolkit and Due Desk assignment tracker"],
 cta=("Get Streak Kit (CA$9)",G+"idasqr"),cta2=("Get Focus Gate (CA$7)",G+"tckoc"),
 faq=[("Do I need an account?","No. Open the file and start. Your data stays in your browser."),("Does it work on my phone?","Yes. Each kit includes a phone guide for adding it to your home screen."),("Are there free options?","Yes. Exam Desk and Due Desk are free on Gumroad.")]),
dict(slug="free-study-planner-for-students",title="Free Offline Study Planner for Students: Exam Desk and Due Desk",desc="Free study tools: Exam Desk (exam countdown, focus timer and grade calculator) and Due Desk (assignment tracker). Offline, no account, works on phone and laptop.",
 og="/p/og/exam-desk.jpg",h1="Free study tools for finals and deadlines",
 lead="Two free, offline tools for students juggling exams and assignments. Download them free from Gumroad and open them in your browser.",
 points=["Exam Desk: exam countdown, focus timer and grade math","Due Desk: a simple assignment and deadline tracker","Works offline on laptop or phone","No account and no ads"],
 cta=("Get Exam Desk free",G+"zpqpto"),cta2=("Get Due Desk free",G+"gfbgve"),
 faq=[("Are they really free?","Yes. Both are free on Gumroad."),("Do they need internet?","No. After downloading, they run offline in your browser."),("Can I use them on my phone?","Yes. A phone guide is included.")]),
dict(slug="list-your-indie-app-free",title="List Your Indie App Free: Developer Marketplace",desc="A free place to list indie apps, games, tools and open-source projects. Submit in minutes, get a shareable listing page and reach buyers and AI agents through our MCP and API.",
 og="/community/og-dm-v3.jpg",h1="A free place to list your indie app or game",
 lead="The Digital Underground Developer Marketplace showcases indie and open-source projects. Listing is free. You get a clean listing page with screenshots or video, and your project can be found through our public API and MCP server for AI agents.",
 points=["Free to list, with no commission on your own sales links","A shareable listing page with media","A creator dashboard to edit your listing","Discoverable by AI assistants through the /mcp server and the OpenAPI spec"],
 cta=("Submit your project","/community/submit/"),cta2=("Browse the marketplace","/"),
 faq=[("Does it cost anything to list?","No. Listing is free."),("What can I list?","Indie apps, games, developer tools, browser projects and open-source software."),("How do AI agents find my listing?","Through our public listings API, openapi.json and the /mcp server, which assistants can query."),("Are listings reviewed?","Yes. New submissions are reviewed before they appear.")]),
]
TPL=open(os.path.join(R,"scripts","landing.tpl.html")).read()
for p in PAGES:
  url=f"{B}/{p['slug']}/"; og=B+p["og"] if p["og"].startswith("/") else p["og"]
  faq={"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in p["faq"]]}
  def a(c,cls): href,label=c[1],c[0]; ext=' rel="noopener"' if href.startswith("http") else ""; return f'<a class="{cls}" href="{e(href)}"{ext}>{e(label)}</a>'
  others="".join(f'<li><a href="/{q["slug"]}/">{e(q["h1"])}</a></li>' for q in PAGES if q is not p)
  out=(TPL.replace("{{TITLE}}",e(p["title"])).replace("{{DESC}}",e(p["desc"])).replace("{{URL}}",url).replace("{{OG}}",og)
    .replace("{{FAQJSON}}",json.dumps(faq,ensure_ascii=False).replace("</","<\\/")).replace("{{H1}}",e(p["h1"])).replace("{{LEAD}}",e(p["lead"]))
    .replace("{{POINTS}}","".join(f"<li>{e(x)}</li>" for x in p["points"])).replace("{{CTA}}",a(p["cta"],"cta")+a(p["cta2"],"cta2"))
    .replace("{{FAQ}}","".join(f"<details><summary>{e(q)}</summary><p>{e(a_)}</p></details>" for q,a_ in p["faq"])).replace("{{OTHERS}}",others).replace("{{OGALT}}",e(p["h1"])))
  os.makedirs(os.path.join(R,p["slug"]),exist_ok=True); open(os.path.join(R,p["slug"],"index.html"),"w").write(_site_nav.apply(out))
print(len(PAGES),"pages")
import subprocess,sys; subprocess.run([sys.executable,os.path.join(R,"scripts","seo-meta.py")],check=True)
