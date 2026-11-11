from PIL import Image, ImageFilter
import numpy as np, vtracer
L='logo/'
src=Image.open(L+'kerzylabs-logo-original.jpg').convert('RGB')
def up(im,s):
    r=im.resize((s,s),Image.LANCZOS)
    return r.filter(ImageFilter.UnsharpMask(radius=2,percent=60,threshold=2))
for s in (2048,4096): up(src,s).save(L+f'kerzylabs-logo-{s}.png',optimize=True)
def keyout(im):
    a=np.asarray(im).astype(np.float32)
    m=a.max(axis=2)
    alpha=np.clip((m-14)/(120-14),0,1)  # kill jpeg noise floor
    alpha=alpha        # solid in body, soft on glow edges
    rgb=np.where(alpha[...,None]>0, np.clip(a/np.maximum(alpha[...,None],1e-3)*(alpha[...,None]/1.0),0,255),0)
    # unpremultiply against black: color = a / alpha_raw
    araw=np.maximum(alpha,1e-3)[...,None]
    rgb=np.clip(a/araw,0,255)
    out=np.dstack([rgb,alpha*255]).astype(np.uint8)
    return Image.fromarray(out,'RGBA')
for s,name in ((1024,'kerzylabs-logo-transparent.png'),(2048,'kerzylabs-logo-transparent-2048.png'),(4096,'kerzylabs-logo-transparent-4096.png')):
    keyout(src if s==1024 else up(src,s)).save(L+name,optimize=True)
full=keyout(up(src,4096))
def trim(im,pad):
    bb=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox();c=im.crop(bb)
    return c
icon=trim(full.crop((270*4,225*4,760*4,655*4)),0)
w,h=icon.size;S=int(max(w,h)*1.08)
sq=Image.new('RGBA',(S,S));sq.paste(icon,((S-w)//2,(S-h)//2));sq.save(L+'kerzylabs-icon-master.png')
for s in (512,192,180,32,16):
    sq.resize((s,s),Image.LANCZOS).save(L+f'kerzylabs-icon-{s}.png')
# apple touch on black (iOS ignores alpha)
bk=Image.new('RGBA',(180,180),(0,0,0,255));bk.alpha_composite(sq.resize((150,150),Image.LANCZOS),(15,15));bk.convert('RGB').save(L+'apple-touch-icon.png')
sq.resize((256,256),Image.LANCZOS).save(L+'favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(256,256)])
word=trim(full.crop((180*4,660*4,850*4,750*4)),0)
ih=1000;ic=sq.resize((ih,ih),Image.LANCZOS)
wh=int(ih*0.30);ww=int(word.width*wh/word.height);wd=word.resize((ww,wh),Image.LANCZOS)
gap=int(ih*0.12);pad=int(ih*0.08)
lk=Image.new('RGBA',(pad*2+ih+gap+ww,pad*2+ih));lk.alpha_composite(ic,(pad,pad));lk.alpha_composite(wd,(pad+ih+gap,pad+(ih-wh)//2))
lk.save(L+'kerzylabs-lockup-horizontal-transparent.png',optimize=True)
b=Image.new('RGBA',lk.size,(0,0,0,255));b.alpha_composite(lk);b.convert('RGB').save(L+'kerzylabs-lockup-horizontal-black.png',optimize=True)
lk.resize((lk.width*120//lk.height,120),Image.LANCZOS).save(L+'kerzylabs-lockup-horizontal-transparent-h120.png')
# og card 1200x630
og=Image.new('RGBA',(1200,630),(0,0,0,255));sm=lk.resize((1000,lk.height*1000//lk.width),Image.LANCZOS);og.alpha_composite(sm,(100,(630-sm.height)//2));og.convert('RGB').save(L+'kerzylabs-og-1200x630.png')
# svg trace of icon from 1024 black version
sq.resize((1024,1024),Image.LANCZOS).save('/tmp/ic.png')
vtracer.convert_image_to_svg_py('/tmp/ic.png',L+'kerzylabs-icon-traced.svg',colormode='color',hierarchical='stacked',mode='spline',filter_speckle=6,color_precision=7,layer_difference=12,corner_threshold=60,path_precision=3)
# colors
a=np.asarray(src).reshape(-1,3).astype(int);m=a.max(1)>120
for nm,(x,y) in {'lime top':(470,270),'green left face':(370,420),'emerald mid':(520,470),'teal bottom':(560,600),'teal right face':(660,520),'orbit ring':(305,440),'orbit node':(720,440),'wordmark':(213,705)}.items():
    p=src.getpixel((x,y));print(nm,'#%02X%02X%02X'%p)
