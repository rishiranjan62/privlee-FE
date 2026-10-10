from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os, math

INK="#1d1a16"; CREAM="#faf6ef"; GOLD="#a8763a"; GOLD_SOFT="#d4a762"
def load(path, wght):
    f=TTFont(path); return instancer.instantiateVariableFont(f,{"wght":wght})
ROMAN=load("CG.ttf",520); ITALIC=load("CGI.ttf",500)

def text_path(font, text, size, x=0, y=0, tracking=0):
    """Outline `text` as one SVG path. Returns (d, width)."""
    gs=font.getGlyphSet(); cmap=font.getBestCmap(); upm=font['head'].unitsPerEm
    s=size/upm; pen=SVGPathPen(gs); cx=x
    for ch in text:
        name=cmap[ord(ch)]; adv=font['hmtx'][name][0]
        tp=TransformPen(pen,(s,0,0,-s,cx,y)); gs[name].draw(tp)
        cx+=adv*s+tracking
    return pen.getCommands(), cx-x

def defs(uid="g"):
    return (f'<linearGradient id="{uid}" x1="0" y1="0" x2="1" y2="1">'
            f'<stop offset="0" stop-color="#8f5f26"/><stop offset="0.5" stop-color="{GOLD_SOFT}"/>'
            f'<stop offset="1" stop-color="#9a6a2d"/></linearGradient>')

# ---------- symbol concepts (all in a 100x100 box) ----------
def sym_keyhole(fill="url(#g)"):
    # a "P": stem + round bowl, with a keyhole cut out of the bowl
    return (f'<mask id="kh"><rect width="100" height="100" fill="#fff"/>'
            f'<circle cx="58" cy="33.5" r="7.2" fill="#000"/>'
            f'<path d="M54.4 38 L61.6 38 L64.6 55 L51.4 55 Z" fill="#000"/></mask>'
            f'<g mask="url(#kh)" fill="{fill}"><rect x="27" y="13" width="15" height="74" rx="7.5"/>'
            f'<circle cx="58" cy="38" r="27"/></g>')
def sym_vesica(stroke="url(#g)", lens="url(#g)"):
    # two people, one private space between them
    return (f'<clipPath id="lensclip"><circle cx="37" cy="50" r="27"/></clipPath>'
            f'<g clip-path="url(#lensclip)"><circle cx="63" cy="50" r="27" fill="{lens}" opacity=".95"/></g>'
            f'<circle cx="37" cy="50" r="27" fill="none" stroke="{stroke}" stroke-width="3.4"/>'
            f'<circle cx="63" cy="50" r="27" fill="none" stroke="{stroke}" stroke-width="3.4"/>')
def sym_monogram(fill="url(#g)", ring="url(#g)"):
    d,w=text_path(ROMAN,"P",74,0,0); 
    # centre the glyph
    gs=ROMAN.getGlyphSet(); pen=SVGPathPen(gs)
    from fontTools.pens.boundsPen import BoundsPen
    bp=BoundsPen(gs); gs[ROMAN.getBestCmap()[ord('P')]].draw(bp); x0,y0,x1,y1=bp.bounds
    s=74/ROMAN['head'].unitsPerEm; gw=(x1-x0)*s; gh=(y1-y0)*s
    tx=50-gw/2-x0*s; ty=50+gh/2+y0*s
    tp=TransformPen(pen,(s,0,0,-s,tx,ty)); gs[ROMAN.getBestCmap()[ord('P')]].draw(tp)
    return (f'<circle cx="50" cy="50" r="45" fill="none" stroke="{ring}" stroke-width="2.2"/>'
            f'<path d="{pen.getCommands()}" fill="{fill}"/>')

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen
def _contours(font, ch):
    gs=font.getGlyphSet(); name=font.getBestCmap()[ord(ch)]
    rec=DecomposingRecordingPen(gs); gs[name].draw(rec)
    out=[]; cur=[]
    for op,args in rec.value:
        cur.append((op,args))
        if op in ("closePath","endPath"): out.append(cur); cur=[]
    return out
def _bounds(contour, gs):
    bp=BoundsPen(gs)
    for op,args in contour: getattr(bp,op)(*args)
    return bp.bounds
def sym_serifkey(fill="url(#g)", key="url(#g)", size=76):
    """The brand serif P, with a small keyhole sitting in its bowl."""
    gs=ROMAN.getGlyphSet(); name=ROMAN.getBestCmap()[ord('P')]; upm=ROMAN['head'].unitsPerEm
    s=size/upm
    cs=_contours(ROMAN,'P'); bs=[_bounds(c,gs) for c in cs]
    area=lambda b:(b[2]-b[0])*(b[3]-b[1])
    outer=bs[0] if len(bs)==1 else max(bs,key=area)
    # whole-glyph bounds
    bp=BoundsPen(gs); gs[name].draw(bp); x0,y0,x1,y1=bp.bounds
    gw=(x1-x0)*s; gh=(y1-y0)*s; tx=50-gw/2-x0*s; ty=50+gh/2+y0*s
    pen=SVGPathPen(gs); gs[name].draw(TransformPen(pen,(s,0,0,-s,tx,ty)))
    out=f'<path d="{pen.getCommands()}" fill="{fill}"/>'
    # The bowl is open, so there is no hole to find. Instead: sample the glyph, and put the keyhole at the
    # point in the bowl's space that is furthest from any ink (its "pole of inaccessibility").
    from fontTools.pens.pointInsidePen import PointInsidePen
    def inside(px,py):
        p=PointInsidePen(gs,(px,py)); gs[name].draw(p); return p.getResult()
    N=64; gx=[x0+(x1-x0)*i/(N-1) for i in range(N)]; gy=[y0+(y1-y0)*j/(N-1) for j in range(N)]
    ink=[[inside(px,py) for px in gx] for py in gy]
    best=None
    for j in range(int(N*0.45),int(N*0.95)):
        for i in range(int(N*0.30),int(N*0.90)):
            if ink[j][i]: continue
            # distance (in grid cells) to the nearest ink cell
            d=min(((i-ii)**2+(j-jj)**2)**.5 for jj in range(N) for ii in range(N) if ink[jj][ii])
            if best is None or d>best[0]: best=(d,i,j)
    d,bi,bj=best
    cx=tx+gx[bi]*s; cy=ty-gy[bj]*s
    radius_units=d*((x1-x0)/(N-1))*s          # room available around the centre, in icon units
    H=radius_units*2.15; r=H*0.27; ccy=cy-H/2+r
    out+=(f'<circle cx="{cx:.2f}" cy="{ccy:.2f}" r="{r:.2f}" fill="{key}"/>'
          f'<path d="M{cx-0.62*r:.2f} {ccy+0.35*r:.2f} L{cx+0.62*r:.2f} {ccy+0.35*r:.2f} '
          f'L{cx+1.05*r:.2f} {ccy+(H-r):.2f} L{cx-1.05*r:.2f} {ccy+(H-r):.2f} Z" fill="{key}"/>')
    return out

SYMS={"keyhole":sym_keyhole,"vesica":sym_vesica,"monogram":sym_monogram,"serifkey":sym_serifkey}

def icon_svg(name, bg=INK, rounded=22, size=512):
    body=SYMS[name]() if name!='serifkey' else sym_serifkey(size=96)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}">'
            f'<defs>{defs()}</defs><rect width="100" height="100" rx="{rounded}" fill="{bg}"/>'
            f'<g transform="translate(12 12) scale(.76)">{body}</g></svg>') if name!="serifkey" else (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}"><defs>{defs()}</defs><rect width="100" height="100" rx="{rounded}" fill="{bg}"/>{body}</svg>')
def symbol_svg(name, mono=None, size=256):
    if mono:
        body=SYMS[name](mono) if name!="vesica" else SYMS[name](mono,mono)
        if name=="monogram": body=SYMS[name](mono,mono)
    else: body=SYMS[name]()
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}"><defs>{defs()}</defs>{body}</svg>'

def lockup_svg(name, dark=False, mono=None):
    ink=CREAM if dark else INK
    S=0.0
    # wordmark: "Priv" roman + "lee" italic, outlined
    size=64
    d1,w1=text_path(ROMAN,"Priv",size,0,0,tracking=0.6)
    d2,w2=text_path(ITALIC,"lee",size,0,0,tracking=0.6)
    symsize=72; gap=18; ox=symsize+gap; base=symsize*0.72
    wm=(f'<g transform="translate({ox} {base})"><path d="{d1}" fill="{mono or ink}"/>'
        f'<path transform="translate({w1+1} 0)" d="{d2}" fill="{mono or "url(#g)"}"/></g>')
    if mono:
        sym=symbol_svg(name,mono,symsize).replace('<svg xmlns="http://www.w3.org/2000/svg" ','<svg x="0" y="0" ')
    else:
        sym=symbol_svg(name,None,symsize).replace('<svg xmlns="http://www.w3.org/2000/svg" ','<svg x="0" y="0" ')
    W=ox+w1+w2+2
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {symsize}" width="{W*1.6:.0f}" height="{symsize*1.6:.0f}">'
            f'<defs>{defs()}</defs>{sym}{wm}</svg>')

os.makedirs("out",exist_ok=True)
for n in SYMS:
    open(f"out/{n}-icon.svg","w").write(icon_svg(n))
    open(f"out/{n}-symbol.svg","w").write(symbol_svg(n))
    open(f"out/{n}-lockup.svg","w").write(lockup_svg(n))
    open(f"out/{n}-lockup-dark.svg","w").write(lockup_svg(n,dark=True))
print("ok", os.listdir("out"))

# ================= final kit: the wordmark's first letter IS the keyhole P =================
from fontTools.pens.pointInsidePen import PointInsidePen
def _key_geometry():
    """Where the keyhole goes in the P, in font units: (centre_x, top_y of keyhole, height)."""
    gs=ROMAN.getGlyphSet(); name=ROMAN.getBestCmap()[ord('P')]
    bp=BoundsPen(gs); gs[name].draw(bp); x0,y0,x1,y1=bp.bounds
    def inside(px,py):
        p=PointInsidePen(gs,(px,py)); gs[name].draw(p); return p.getResult()
    N=64; gx=[x0+(x1-x0)*i/(N-1) for i in range(N)]; gy=[y0+(y1-y0)*j/(N-1) for j in range(N)]
    ink=[[inside(px,py) for px in gx] for py in gy]
    inkcells=[(ii,jj) for jj in range(N) for ii in range(N) if ink[jj][ii]]
    best=None
    for j in range(int(N*0.45),int(N*0.95)):
        for i in range(int(N*0.30),int(N*0.90)):
            if ink[j][i]: continue
            d=min(((i-ii)**2+(j-jj)**2)**.5 for ii,jj in inkcells)
            if best is None or d>best[0]: best=(d,i,j)
    d,bi,bj=best
    room=d*((x1-x0)/(N-1))
    return gx[bi], gy[bj], room*1.62, (x0,y0,x1,y1)
KEY=_key_geometry()

def keyhole_shapes(cx, cy_center, H, fill, flip=True):
    """circle + slot, with total height H, vertically centred on cy_center (already in output coords)."""
    r=H*0.27; ccy=cy_center-H/2+r
    return (f'<circle cx="{cx:.2f}" cy="{ccy:.2f}" r="{r:.2f}" fill="{fill}"/>'
            f'<path d="M{cx-0.62*r:.2f} {ccy+0.35*r:.2f} L{cx+0.62*r:.2f} {ccy+0.35*r:.2f} '
            f'L{cx+1.05*r:.2f} {ccy+(H-r):.2f} L{cx-1.05*r:.2f} {ccy+(H-r):.2f} Z" fill="{fill}"/>')

def p_key(size, x, base, fill="url(#g)", key="url(#g)"):
    """The keyhole P at font-size `size`, left edge origin x, baseline `base`. Returns (svg, advance)."""
    gs=ROMAN.getGlyphSet(); name=ROMAN.getBestCmap()[ord('P')]; upm=ROMAN['head'].unitsPerEm; s=size/upm
    pen=SVGPathPen(gs); gs[name].draw(TransformPen(pen,(s,0,0,-s,x,base)))
    kx,ky,kH,_=KEY
    svg=f'<path d="{pen.getCommands()}" fill="{fill}"/>'+keyhole_shapes(x+kx*s, base-ky*s, kH*s, key)
    return svg, ROMAN['hmtx'][name][0]*s

def wordmark_svg(on="light", mono=None, size=64, pad=4):
    ink = mono or (CREAM if on=="dark" else INK)
    gold = mono or "url(#g)"
    pk,adv=p_key(size,0,0,fill=gold if mono else ink,key=gold)   # P in the text colour, keyhole in gold
    # keep the P in the text colour; the keyhole is the one gold accent in the roman part
    d1,w1=text_path(ROMAN,"riv",size,0,0,tracking=0.6)
    d2,w2=text_path(ITALIC,"lee",size,0,0,tracking=0.6)
    x1=adv+0.6; x2=x1+w1+1
    W=x2+w2+pad*2; asc=size*0.72; desc=size*0.08; H=asc+desc+pad*2
    body=(f'<g transform="translate({pad} {pad+asc})">{pk}'
          f'<path transform="translate({x1:.2f} 0)" d="{d1}" fill="{ink}"/>'
          f'<path transform="translate({x2:.2f} 0)" d="{d2}" fill="{gold}"/></g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} {H:.1f}" width="{W*1.5:.0f}" height="{H*1.5:.0f}"><defs>{defs()}</defs>{body}</svg>'

def icon_final(bg=INK, rounded=22, size=512, glyph=0.70, cornerless=False):
    """App icon: the keyhole P, centred, on an ink tile."""
    gs=ROMAN.getGlyphSet(); name=ROMAN.getBestCmap()[ord('P')]
    kx,ky,kH,(x0,y0,x1,y1)=KEY
    fs=100*glyph/((y1-y0)/ROMAN['head'].unitsPerEm)   # font size so the cap height fills `glyph` of the tile
    s=fs/ROMAN['head'].unitsPerEm
    gw=(x1-x0)*s; gh=(y1-y0)*s
    ox=50-gw/2-x0*s; base=50+gh/2+y0*s
    svg,_=p_key(fs,ox,base)
    r='' if cornerless else f' rx="{rounded}"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}"><defs>{defs()}</defs>'
            f'<rect width="100" height="100"{r} fill="{bg}"/>{svg}</svg>')

def symbol_final(size=256, fill="url(#g)", key=None):
    kx,ky,kH,(x0,y0,x1,y1)=KEY
    fs=100*0.92/((y1-y0)/ROMAN['head'].unitsPerEm); s=fs/ROMAN['head'].unitsPerEm
    gw=(x1-x0)*s; gh=(y1-y0)*s; ox=50-gw/2-x0*s; base=50+gh/2+y0*s
    svg,_=p_key(fs,ox,base,fill=fill,key=key or fill)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}"><defs>{defs()}</defs>{svg}</svg>'

os.makedirs("final",exist_ok=True)
open("final/privlee-wordmark.svg","w").write(wordmark_svg("light"))
open("final/privlee-wordmark-on-dark.svg","w").write(wordmark_svg("dark"))
open("final/privlee-wordmark-ink.svg","w").write(wordmark_svg("light",mono=INK))
open("final/privlee-wordmark-white.svg","w").write(wordmark_svg("dark",mono="#ffffff"))
open("final/privlee-icon.svg","w").write(icon_final())
open("final/privlee-icon-square.svg","w").write(icon_final(cornerless=True))   # for platforms that round it themselves
open("final/privlee-symbol.svg","w").write(symbol_final())
open("final/privlee-symbol-ink.svg","w").write(symbol_final(fill=INK,key=INK))
open("final/privlee-symbol-white.svg","w").write(symbol_final(fill="#ffffff",key="#ffffff"))
# favicon: bigger P, tighter, so it holds at 16px
open("final/favicon.svg","w").write(icon_final(rounded=20,size=64,glyph=0.78))
print(sorted(os.listdir("final")))

# ---- social card, with the tagline drawn as outlines (so any renderer shows it identically)
import re as _re
_wm=open("final/privlee-wordmark.svg").read()
_m=_re.search(r'<svg[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*>(.*)</svg>',_wm,_re.S)
_w,_h,_body=float(_m.group(1)),float(_m.group(2)),_m.group(3)
_sc=2.9
_tag,_tw=text_path(ITALIC,"Connection, without exposure.",34,0,0)
_card=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
       f'<defs>{defs()}</defs><rect width="1200" height="630" fill="#faf6ef"/>'
       f'<g transform="translate({(1200-_w*_sc)/2:.1f} {250-_h*_sc/2+30:.1f}) scale({_sc})">{_body}</g>'
       f'<path transform="translate({(1200-_tw)/2:.1f} 432)" d="{_tag}" fill="#6f675c"/>'
       f'<rect x="540" y="472" width="120" height="3" rx="1.5" fill="#d4a762"/></svg>')
open("final/og-image.svg","w").write(_card)
