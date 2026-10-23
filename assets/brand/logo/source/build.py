"""Génère le kit du logo Automerio (piste A · Écoute) en SVG, sans trait : tout en contours."""
import math, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONT, OUT = sys.argv[1], sys.argv[2]
GREEN, GREEN_DARK, INK, INK_DARK, WHITE = "#15803d", "#2fbc5b", "#111418", "#eef0f3", "#ffffff"

def f(v): return f"{v:.2f}".rstrip("0").rstrip(".")

def mark_path(p1, p2, p3, w, dot_cy, dot_r):
    """Λ à bouts et sommet arrondis (rayon w), plus la pastille ; renvoie un `d`."""
    def unit(a, b):
        dx, dy = b[0]-a[0], b[1]-a[1]; l = math.hypot(dx, dy); return dx/l, dy/l
    u1, u2 = unit(p1, p2), unit(p2, p3)
    n1, n2 = (u1[1], -u1[0]), (u2[1], -u2[0])           # normales extérieures
    o1a = (p1[0]+n1[0]*w, p1[1]+n1[1]*w); o1b = (p2[0]+n1[0]*w, p2[1]+n1[1]*w)
    o2a = (p2[0]+n2[0]*w, p2[1]+n2[1]*w); o2b = (p3[0]+n2[0]*w, p3[1]+n2[1]*w)
    i2 = (p3[0]-n2[0]*w, p3[1]-n2[1]*w); i1 = (p1[0]-n1[0]*w, p1[1]-n1[1]*w)
    # sommet intérieur : intersection des deux bords intérieurs
    t = ((i2[0]-i1[0])*u2[1] - (i2[1]-i1[1])*u2[0]) / (u1[0]*u2[1] - u1[1]*u2[0])
    apex = (i1[0]+u1[0]*t, i1[1]+u1[1]*t)
    P = lambda p: f"{f(p[0])} {f(p[1])}"
    r = f(w)
    d = (f"M{P(o1a)}L{P(o1b)}A{r} {r} 0 0 1 {P(o2a)}L{P(o2b)}A{r} {r} 0 0 1 {P(i2)}"
         f"L{P(apex)}L{P(i1)}A{r} {r} 0 0 1 {P(o1a)}Z")
    cx, R = p2[0], dot_r
    d += f"M{f(cx-R)} {f(dot_cy)}a{f(R)} {f(R)} 0 1 0 {f(2*R)} 0a{f(R)} {f(R)} 0 1 0 {f(-2*R)} 0Z"
    return d

# Symbole maître (dessin de la planche) et coupe renforcée pour 16–32 px.
MARK = mark_path((56, 206), (128, 50), (200, 206), 18, 166, 21)
SMALL = mark_path((48, 208), (128, 46), (208, 208), 23, 172, 24)

def svg(view, body, title="Automerio"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img">'
            f"<title>{title}</title>{body}</svg>\n")

def write(name, content):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh: fh.write(content)

# Mot « Automerio » en DM Sans 600 (opsz 18, la taille de l'en-tête), vectorisé,
# approche -0,02 em comme tracking-tight.
font = instantiateVariableFont(TTFont(FONT), {"wght": 600, "opsz": 18})
gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
CAP = font["OS/2"].sCapHeight  # 700 / 1000
def word(text, cap_px, x0, baseline):
    s = cap_px / CAP; track = -0.02 * font["head"].unitsPerEm
    pen = SVGPathPen(gs); x = 0
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x0 + x*s, baseline)))
        x += hmtx[g][0] + track
    return pen.getCommands(), (x - track) * s

CAP_PX = 100                      # hauteur de capitale du mot
SYM_H = 180                       # hauteur visible du symbole (y 32 → 224 du dessin, 192 u)
k = SYM_H / 192
def sym(x, y, d=MARK, color="#000"):
    return f'<path fill="{color}" fill-rule="nonzero" transform="translate({f(x)} {f(y)}) scale({f(k)})" d="{d}"/>'

# Horizontal : symbole puis mot, le mot centré sur la hauteur du symbole.
GAP = 0.32 * SYM_H
sym_w = 182 * k                   # x 37 → 219 du dessin
H = 256; top = (H - SYM_H) / 2
base = top + SYM_H/2 + CAP_PX/2
wd, ww = word("Automerio", CAP_PX, 24 + sym_w + GAP, base)
HW = 24 + sym_w + GAP + ww + 24
def horizontal(c_sym, c_word):
    return svg(f"0 0 {f(HW)} {H}", sym(24 - 37*k, top - 32*k, color=c_sym) + f'<path fill="{c_word}" d="{wd}"/>')
# Empilé : symbole au-dessus, mot centré dessous.
SW = max(ww, sym_w) + 48; s_top = 24; s_base = s_top + SYM_H + 0.42*SYM_H + CAP_PX
wd2, _ = word("Automerio", CAP_PX, (SW - ww)/2, s_base)
SH = s_base + 32
def stacked(c_sym, c_word):
    return svg(f"0 0 {f(SW)} {f(SH)}", sym((SW - sym_w)/2 - 37*k, s_top - 32*k, color=c_sym) + f'<path fill="{c_word}" d="{wd2}"/>')

write("automerio-symbol.svg", svg("0 0 256 256", f'<path fill="#000" d="{MARK}"/>'))
write("automerio-symbol-small.svg", svg("0 0 256 256", f'<path fill="#000" d="{SMALL}"/>'))
write("automerio-symbol-green.svg", svg("0 0 256 256", f'<path fill="{GREEN}" d="{MARK}"/>'))
write("automerio-tile.svg", svg("0 0 256 256", f'<rect width="256" height="256" rx="72" fill="{GREEN}"/>'
      f'<path fill="{WHITE}" transform="translate(128 123) scale(0.6) translate(-128 -128)" d="{SMALL}"/>'))
write("automerio-horizontal.svg", horizontal("#000", "#000"))
write("automerio-horizontal-color.svg", horizontal(GREEN, INK))
write("automerio-horizontal-dark.svg", horizontal(GREEN_DARK, INK_DARK))
write("automerio-stacked.svg", stacked("#000", "#000"))
write("automerio-stacked-color.svg", stacked(GREEN, INK))
write("automerio-wordmark.svg", svg(f"0 0 {f(ww+48)} {f(CAP_PX+80)}", f'<path fill="#000" d="{word("Automerio", CAP_PX, 24, 40+CAP_PX)[0]}"/>'))
with open(os.path.join(OUT, "_paths.txt"), "w") as fh: fh.write(f"MARK={MARK}\nSMALL={SMALL}\n")
print("ok", f(HW), f(SW), f(SH))
