#!/usr/bin/env python3
"""Preview-only Featured artwork painter. Builds on Nov 6 update_art.py's
Pillow/Inter supersampled type and existing WEBP bases; no network or deploy.
The original full generator was not present in this checkout (Nov 6 report).
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path('/workspace/du-good')
EV=Path('/workspace/featured-logo-title-nov7')
FONT='/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf'
LOGO=Path('/workspace/digital-underground/brand/logo/du-mark.png')
S=3

def font(size,weight):
 f=ImageFont.truetype(FONT,round(size*S)); f.set_variation_by_axes([32,weight]); return f

def background(a,kind):
 # Fit only unobstructed original grid/gradient pixels, never text/logo pixels.
 h,w=a.shape[:2]; yy,xx=np.mgrid[:h:4,:w:4]; X=xx/w;Y=yy/h
 if kind=='16x9':
  clean=((yy<65)|((xx>490)&(yy<120))|(xx<32)|(xx>1240)|(yy>670)|((xx<690)&(yy>540)&(yy<580)))
 else:
  clean=((yy<45)|((xx>510)&(yy<80))|(xx<55)|(xx>1840)|(yy>510)|((xx>1000)&(xx<1370)))
 def basis(x,y,px,py):
  cols=[x**i*y**j for i in range(5) for j in range(5-i)]
  cols += [np.exp(-((x-.80)/.20)**2-((y-.57)/.53)**2),((px%36)==0).astype(float),((py%36)==0).astype(float)]
  return np.stack(cols,-1)
 b=basis(X,Y,xx,yy); v=a[::4,::4].astype(float)
 mat=b[clean]; vals=v[clean]
 for _ in range(3):
  coeff=np.linalg.lstsq(mat,vals,rcond=None)[0]
  err=np.max(abs(mat@coeff-vals),axis=1); keep=err<max(6,np.quantile(err,.88)); mat=mat[keep];vals=vals[keep]
 y,x=np.mgrid[:h,:w]; bg=np.clip(basis(x/w,y/h,x,y)@coeff,0,255).astype('uint8')
 return Image.fromarray(bg).convert('RGBA')

def retained(im,old,box):
 # Existing chrome and pricing are untouched pixels, feathering only blank margins.
 x0,y0,x1,y1=box; crop=old.crop(box).convert('RGBA'); mask=Image.new('L',crop.size,0)
 d=ImageDraw.Draw(mask); d.rectangle((8,8,crop.width-9,crop.height-9),fill=255); mask=mask.filter(ImageFilter.GaussianBlur(3))
 im.paste(crop,(x0,y0),mask)

def text(layer,xy,words,size,weight,tracking=0,fill=(255,255,255,255)):
 d=ImageDraw.Draw(layer); f=font(size,weight); x,y=xy[0]*S,(xy[1]+size*.76)*S
 for c in words:
  d.text((x,y),c,font=f,fill=fill,anchor='ls');x+=d.textlength(c,font=f)+tracking*S
 return (xy[0],xy[1],x/S,xy[1]+size)

meta={}
for kind in ['16x9','wide']:
 old=Image.open(EV/'before'/f'{kind}.png').convert('RGBA'); w,h=old.size
 im=background(np.array(old)[:,:,:3],kind)
 if kind=='16x9':
  retained(im,old,(20,55,500,225));retained(im,old,(28,580,355,660))
  title=[((44,252),'This spot',76,600,.4),((40,344),'could be yours',106,800,-1.8)]
  subtitle=(44,466); listing=(44,526); small=36; side=290; pad=44
 else:
  retained(im,old,(50,38,500,195));retained(im,old,(52,442,315,507))
  title=[((66,210),'This spot',58,600,.6),((62,282),'could be yours',84,800,-1.2)]
  subtitle=(66,382); listing=(66,430);small=28;side=280;pad=66
  # Price baseline stays at its original y=452; listing stays at original y=382
  subtitle=(66,370);listing=(66,414)
  # Place pricing at original lower-left footprint, keeping clear of listing.
  # Existing price crop is retained below after copying to y=461.
  im.paste(background(np.array(old)[:,:,:3],kind).crop((45,440,330,510)),(45,440))
  retained(im,old,(52,442,315,507))
 # Subtle purple halo: white letterforms remain white.
 layer=Image.new('RGBA',(w*S,h*S)); boxes=[]
 for xy,words,size,weight,tracking in title: boxes.append(text(layer,xy,words,size,weight,tracking))
 glow=Image.new('RGBA',layer.size);glow.paste((159,133,255,65),mask=layer.getchannel('A').point(lambda x: round(x*.22)))
 layer=Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(8*S)),layer)
 text(layer,subtitle,'Featured row · Promotion on our X Channels',small,400,fill=(190,187,219,255))
 text(layer,listing,'Listing stays free.',small,400,fill=(167,164,197,255))
 im=Image.alpha_composite(im,layer.resize(im.size,Image.Resampling.LANCZOS))
 lx=w-pad-side;ly=h-44-side
 shadow=Image.new('RGBA',im.size);ImageDraw.Draw(shadow).rounded_rectangle((lx,ly,lx+side,ly+side),radius=side*.18,fill=(93,55,218,80));im=Image.alpha_composite(im,shadow.filter(ImageFilter.GaussianBlur(20)))
 mark=Image.open(LOGO).convert('RGBA').resize((side,side),Image.Resampling.LANCZOS);im.alpha_composite(mark,(lx,ly))
 assert max(b[2] for b in boxes)<lx-40, (kind,boxes,lx)
 out=ROOT/'assets/featured'/f'this-spot-could-be-yours-{kind}.webp'
 im.convert('RGB').save(out,'WEBP',quality=96,method=6)
 Image.open(out).save(EV/f'featured-{kind}.png')
 meta[kind]={'dimensions':[w,h],'title_bounds':boxes,'logo_bounds':[lx,ly,lx+side,ly+side],'horizontal_clearance':lx-max(b[2] for b in boxes)}
(EV/'layout-checks.json').write_text(json.dumps(meta,indent=2))
