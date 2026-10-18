#!/usr/bin/env python3
"""Regenerate sitemap.xml: public static pages (skips noindex) + live marketplace listings."""
import os,re,json,urllib.request,datetime
B="https://digitalundergroundstore.com"; R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cands=["/","/store/","/community/","/advertise/","/downloads/","/downloads/easy-tracker/","/privacy/","/free-book/"]
try:
  import importlib.util as iu; sp=iu.spec_from_file_location("gl",f"{R}/scripts/gen-landing.py")
  SL=[l.split('slug="')[1].split('"')[0] for l in open(f"{R}/scripts/gen-landing.py") if l.startswith('dict(slug="')]
  cands+=[f"/{x}/" for x in SL]
except Exception as ex: print("landing list failed",ex)
cands+=[f"/p/{d}/" for d in sorted(os.listdir(f"{R}/p")) if os.path.isfile(f"{R}/p/{d}/index.html")]
cands+=[f"/get/{d}/" for d in sorted(os.listdir(f"{R}/get")) if os.path.isfile(f"{R}/get/{d}/index.html")]
urls=[]
for u in cands:
  f=f"{R}{u}index.html"
  if os.path.isfile(f) and re.search(r'name="robots"[^>]*noindex',open(f,encoding="utf8").read()): continue
  if not os.path.isfile(f) and u!="/downloads/easy-tracker/": continue
  urls.append(u)
try:
  d=json.load(urllib.request.urlopen(urllib.request.Request(B+"/api/community/listings",headers={"User-Agent":"Mozilla/5.0 du-sitemap"}),timeout=20)); L=d.get("listings",d) if isinstance(d,dict) else d
  urls+=[f"/community/p/?id={x['id']}" for x in L if x.get("id")]
except Exception as e: print("listings fetch failed:",e)
today=datetime.date.today().isoformat()
x='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+"".join(f"  <url><loc>{B}{u.replace('&','&amp;')}</loc><lastmod>{today}</lastmod></url>\n" for u in urls)+"</urlset>\n"
open(f"{R}/sitemap.xml","w").write(x); print(len(urls),"urls")
