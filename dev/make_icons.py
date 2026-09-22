# -*- coding: utf-8 -*-
"""make_icons.py - draw the app icons into docs/icons/.

A rounded dark square with the classic knight on it in cream: the horse head on
its turned base, the same geometry as the classic glyph in src/themes.js, so
the icon on the home screen is a piece off the board. The knight, not the pawn,
because it is the one shape of the set that is still itself at 24 px.

The whole thing is drawn at 8x and shrunk with LANCZOS, because Pillow has no
antialiasing of its own: polygons and lines come out with hard stair edges at
the final size and clean ones when they are drawn big and resampled.

Written:
  docs/icons/icon-192.png        192, rounded corners, transparent outside
  docs/icons/icon-512.png        512, the same
  docs/icons/apple-touch-icon.png  180, the full square (iOS rounds it itself,
                                   and turns transparency black)

The emblem is fitted into the middle 70 percent, the safe area a maskable icon
keeps whatever shape the launcher cuts out of it.

Run: python dev/make_icons.py
"""

import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'docs', 'icons')

BG = (29, 34, 51, 255)        # #1d2233
FG = (239, 230, 207, 255)     # #efe6cf
SAFE = 0.70                   # the emblem lives in the middle 70 percent
SS = 8                        # supersampling factor

# ------------------------------------------------------------- the emblem --
# Coordinates in the same 100x100 box as the SVG glyph.


def bezier(p0, p1, p2, p3, steps=24):
    """The points of one cubic bezier, p0 included, p3 included."""
    pts = []
    for i in range(steps + 1):
        t = i / float(steps)
        u = 1.0 - t
        x = (u * u * u * p0[0] + 3 * u * u * t * p1[0] +
             3 * u * t * t * p2[0] + t * t * t * p3[0])
        y = (u * u * u * p0[1] + 3 * u * u * t * p1[1] +
             3 * u * t * t * p2[1] + t * t * t * p3[1])
        pts.append((x, y))
    return pts


def stadium(x, y, w, h, steps=10):
    """A rectangle with its two short ends rounded off, as the SVG rx does."""
    r = min(w, h) / 2.0
    pts = []
    if w >= h:                                  # round the left and right ends
        cy = y + h / 2.0
        for i in range(steps + 1):              # right cap, top to bottom
            a = -math.pi / 2 + math.pi * i / steps
            pts.append((x + w - r + r * math.cos(a), cy + r * math.sin(a)))
        for i in range(steps + 1):              # left cap, bottom to top
            a = math.pi / 2 + math.pi * i / steps
            pts.append((x + r + r * math.cos(a), cy + r * math.sin(a)))
    else:                                       # round the top and bottom
        cx = x + w / 2.0
        for i in range(steps + 1):
            a = math.pi * i / steps
            pts.append((cx + r * math.cos(a), y + r - r * math.sin(a)))
        for i in range(steps + 1):
            a = math.pi + math.pi * i / steps
            pts.append((cx + r * math.cos(a), y + h - r - r * math.sin(a)))
    return pts


def disc(cx, cy, r, steps=28):
    return [(cx + r * math.cos(2 * math.pi * i / steps),
             cy + r * math.sin(2 * math.pi * i / steps)) for i in range(steps)]


def horse():
    """The head and neck of the classic knight, the glyph's own path."""
    pts = [(27, 91)]
    pts += bezier((27, 91), (24, 72), (29, 54), (42, 44))[1:]
    pts += bezier((42, 44), (50, 38), (55, 29), (56, 20))[1:]
    pts += bezier((56, 20), (56, 14), (62, 12), (65, 17))[1:]
    pts += bezier((65, 17), (67, 20), (67, 24), (66, 28))[1:]
    pts += bezier((66, 28), (71, 22), (78, 23), (82, 29))[1:]
    pts += bezier((82, 29), (87, 37), (89, 46), (89, 52))[1:]
    pts += bezier((89, 52), (89, 57), (85, 60), (79, 60))[1:]
    pts += [(64, 60)]
    pts += bezier((64, 60), (58, 62), (55, 66), (55, 74))[1:]
    pts += [(55, 91)]
    return pts


def foot():
    """M13,90 C13,86 17,83 22,82 H78 C83,83 87,86 87,90 Z"""
    pts = [(13, 90)]
    pts += bezier((13, 90), (13, 86), (17, 83), (22, 82))[1:]
    pts += [(78, 82)]
    pts += bezier((78, 82), (83, 83), (87, 86), (87, 90))[1:]
    return pts


def shrink(pts, k=0.91, dx=-1.3, dy=-8.9):
    """The same transform the glyph puts on the head, to sit it on the base."""
    return [(x * k + dx, y * k + dy) for x, y in pts]


HEAD = shrink(horse())
EYE = shrink(disc(74, 41, 3.5))
FOOT = foot()
PLINTH = stadium(24, 71, 52, 12)
EMBLEM = [HEAD, PLINTH, FOOT]          # painted in this order, as in the glyph


# -------------------------------------------------------------- the icons --

def draw_icon(size, rounded):
    """One icon at `size`, drawn at SS times that and resampled down."""
    n = size * SS
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=BG)
    else:
        d.rectangle([0, 0, n - 1, n - 1], fill=BG)

    # fit the emblem's own bounding box into the safe square in the middle
    xs = [p[0] for g in EMBLEM for p in g]
    ys = [p[1] for g in EMBLEM for p in g]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    span = max(x1 - x0, y1 - y0)
    k = n * SAFE / span
    ox = (n - (x1 - x0) * k) / 2.0 - x0 * k
    oy = (n - (y1 - y0) * k) / 2.0 - y0 * k

    def put(g):
        return [(x * k + ox, y * k + oy) for x, y in g]

    # Every shape in the glyph carries an outline, which is what keeps the head
    # off the plinth and the plinth off the foot. Pillow has no stroke, so each
    # shape is laid down as a thick line of the background along its edge and
    # then filled: the half of that line outside the shape survives as the gap,
    # exactly as the SVG stroke does.
    gap = max(2, int(n * 0.026))
    for g in EMBLEM:
        pts = put(g)
        d.line(pts + [pts[0]], fill=BG, width=gap, joint='curve')
        d.polygon(pts, fill=FG)
    d.polygon(put(EYE), fill=BG)

    return img.resize((size, size), Image.LANCZOS)


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    jobs = [('icon-192.png', 192, True),
            ('icon-512.png', 512, True),
            ('apple-touch-icon.png', 180, False)]
    for name, size, rounded in jobs:
        path = os.path.join(OUT, name)
        draw_icon(size, rounded).save(path)
        print('%s  %d x %d  %d bytes' % (path, size, size, os.path.getsize(path)))


if __name__ == '__main__':
    main()
