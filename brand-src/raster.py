"""Tiny SVG -> PNG renderer for the logo files only: paths (M L H V Q C Z), circles, rounded rects,
translate/scale transforms, solid fills and the one 3-stop diagonal gradient. 4x supersampled."""
import re, xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageChops

SS=4
STOPS=[(0.0,(0x8f,0x5f,0x26)),(0.5,(0xd4,0xa7,0x62)),(1.0,(0x9a,0x6a,0x2d))]
def _ramp():
    lut=[[],[],[]]
    for i in range(256):
        t=i/255
        for k in range(len(STOPS)-1):
            (t0,c0),(t1,c1)=STOPS[k],STOPS[k+1]
            if t<=t1 or k==len(STOPS)-2:
                f=0 if t1==t0 else max(0,min(1,(t-t0)/(t1-t0)))
                for ch in range(3): lut[ch].append(int(c0[ch]+(c1[ch]-c0[ch])*f))
                break
    return lut
LUT=_ramp()

def parse_transform(t):
    sx=sy=1; tx=ty=0
    if not t: return (1,1,0,0)
    for name,args in re.findall(r'(\w+)\(([^)]*)\)',t):
        a=[float(v) for v in re.split(r'[ ,]+',args.strip())]
        if name=="translate": tx+=a[0]*sx; ty+=(a[1] if len(a)>1 else 0)*sy
        elif name=="scale": sx*=a[0]; sy*=(a[1] if len(a)>1 else a[0])
    return (sx,sy,tx,ty)
def compose(p,c):  # parent then child
    return (p[0]*c[0], p[1]*c[1], p[2]+p[0]*c[2], p[3]+p[1]*c[3])

def flatten(d):
    toks=re.findall(r'[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?',d)
    i=0; subs=[]; cur=[]; x=y=0; sx=sy=0
    def num():
        nonlocal i; v=float(toks[i]); i+=1; return v
    cmd=None
    while i<len(toks):
        if toks[i] in "MLHVQCZ": cmd=toks[i]; i+=1
        if cmd=="M":
            if cur: subs.append(cur)
            x,y=num(),num(); sx,sy=x,y; cur=[(x,y)]; cmd="L"
        elif cmd=="L": x,y=num(),num(); cur.append((x,y))
        elif cmd=="H": x=num(); cur.append((x,y))
        elif cmd=="V": y=num(); cur.append((x,y))
        elif cmd=="Q":
            cx,cy,ex,ey=num(),num(),num(),num()
            for s in range(1,13):
                t=s/12; cur.append(((1-t)**2*x+2*(1-t)*t*cx+t*t*ex,(1-t)**2*y+2*(1-t)*t*cy+t*t*ey))
            x,y=ex,ey
        elif cmd=="C":
            c1x,c1y,c2x,c2y,ex,ey=[num() for _ in range(6)]
            for s in range(1,17):
                t=s/16; u=1-t
                cur.append((u**3*x+3*u*u*t*c1x+3*u*t*t*c2x+t**3*ex,u**3*y+3*u*u*t*c1y+3*u*t*t*c2y+t**3*ey))
            x,y=ex,ey
        elif cmd=="Z":
            if cur: subs.append(cur); cur=[]
            x,y=sx,sy; cmd=None
    if cur: subs.append(cur)
    return subs

def render(svg_text, out, width):
    root=ET.fromstring(svg_text); vb=[float(v) for v in root.get("viewBox").split()]
    W=width; H=round(width*vb[3]/vb[2]); k=W/vb[2]
    canvas=Image.new("RGBA",(W,H),(0,0,0,0))
    def paint(mask,fill,bbox):
        if fill is None or fill=="none": return
        x0,y0,x1,y1=[int(v) for v in (bbox[0]-1,bbox[1]-1,bbox[2]+2,bbox[3]+2)]
        x0=max(0,x0); y0=max(0,y0); x1=min(W,x1); y1=min(H,y1)
        if x1<=x0 or y1<=y0: return
        region=mask.crop((x0,y0,x1,y1))
        if fill.startswith("url("):
            w=x1-x0; h=y1-y0
            bx0,by0,bx1,by1=bbox; bw=max(1,bx1-bx0); bh=max(1,by1-by0)
            gh=Image.linear_gradient("L").rotate(90).resize((w,h))     # across x
            gv=Image.linear_gradient("L").resize((w,h))                 # down y
            # shift so 0..255 spans the shape's own bounding box, not the padded crop
            def span(img,lo,hi,size):
                return img.point(lambda v:v)  # placeholder (replaced below)
            # build t by direct mapping through the bbox
            tmap=Image.new("L",(w,h))
            px=tmap.load()
            xs=[min(255,max(0,int(255*((x0+i+0.5-bx0)/bw)))) for i in range(w)]
            ys=[min(255,max(0,int(255*((y0+j+0.5-by0)/bh)))) for j in range(h)]
            for j in range(h):
                yj=ys[j]
                for i in range(w): px[i,j]=(xs[i]+yj)//2
            rgb=Image.merge("RGB",[tmap.point(LUT[c]) for c in range(3)])
            layer=Image.new("RGBA",(w,h)); layer.paste(rgb,(0,0)); layer.putalpha(region)
        else:
            col=tuple(int(fill[i:i+2],16) for i in (1,3,5)) if len(fill)==7 else (255,255,255)
            layer=Image.new("RGBA",(x1-x0,y1-y0),col+(255,)); layer.putalpha(region)
        canvas.alpha_composite(layer,(x0,y0))
    def shape_mask(polys, even_odd=True, rrect=None, circle=None):
        m=Image.new("L",(W*SS,H*SS),0)
        if rrect:
            ImageDraw.Draw(m).rounded_rectangle([v*SS for v in rrect[:4]],radius=rrect[4]*SS,fill=255)
        elif circle:
            cx,cy,r=circle; ImageDraw.Draw(m).ellipse([(cx-r)*SS,(cy-r)*SS,(cx+r)*SS,(cy+r)*SS],fill=255)
        else:
            # Scanline nonzero-winding fill, exactly as fonts and browsers do it: for every row, find where the
            # outlines cross it (each crossing counts +1 or -1 by direction) and ink the stretches where the
            # running total is not zero.
            d=ImageDraw.Draw(m)
            edges=[]
            for poly in polys:
                n=len(poly)
                for i in range(n):
                    (x0,y0),(x1,y1)=poly[i],poly[(i+1)%n]
                    if y0!=y1: edges.append((x0*SS,y0*SS,x1*SS,y1*SS))
            if edges:
                top=max(0,int(min(min(e[1],e[3]) for e in edges))); bot=min(H*SS-1,int(max(max(e[1],e[3]) for e in edges))+1)
                for row in range(top,bot+1):
                    yc=row+0.5; xs=[]
                    for x0,y0,x1,y1 in edges:
                        lo,hi=(y0,y1) if y0<y1 else (y1,y0)
                        if lo<=yc<hi: xs.append((x0+(yc-y0)*(x1-x0)/(y1-y0), 1 if y1>y0 else -1))
                    xs.sort(); w=0
                    for j in range(len(xs)-1):
                        w+=xs[j][1]
                        if w!=0: d.line([(round(xs[j][0]),row),(round(xs[j+1][0])-1,row)],fill=255)
        return m.resize((W,H),Image.LANCZOS)
    def walk(el,tf):
        for ch in el:
            tag=ch.tag.split('}')[-1]
            t=compose(tf,parse_transform(ch.get("transform")))
            if tag in("defs","clipPath","mask","linearGradient"): continue
            if tag=="g": walk(ch,t); continue
            fill=ch.get("fill")
            tx=lambda x:(t[2]+t[0]*x)*k; ty=lambda y:(t[3]+t[1]*y)*k
            if tag=="rect":
                x,y,w,h=[float(ch.get(a,0)) for a in("x","y","width","height")]; rx=float(ch.get("rx",0))
                m=shape_mask(None,rrect=(tx(x),ty(y),tx(x+w),ty(y+h),rx*t[0]*k)); bb=(tx(x),ty(y),tx(x+w),ty(y+h))
            elif tag=="circle":
                cx,cy,r=[float(ch.get(a)) for a in("cx","cy","r")]
                m=shape_mask(None,circle=(tx(cx),ty(cy),r*t[0]*k)); bb=(tx(cx-r),ty(cy-r),tx(cx+r),ty(cy+r))
            elif tag=="path":
                polys=[[(tx(px),ty(py)) for px,py in sub] for sub in flatten(ch.get("d"))]
                allp=[p for s in polys for p in s]
                bb=(min(p[0] for p in allp),min(p[1] for p in allp),max(p[0] for p in allp),max(p[1] for p in allp))
                m=shape_mask(polys)
            else: continue
            paint(m,fill,bb)
    walk(root,(1,1,0,0))
    canvas.save(out)
    return canvas.size

if __name__=="__main__":
    import sys
    print(render(open(sys.argv[1]).read(), sys.argv[2], int(sys.argv[3])))
