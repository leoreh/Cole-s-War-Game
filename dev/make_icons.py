# -*- coding: utf-8 -*-
"""make_icons.py - draw the app icons into docs/icons/.

A rounded dark square with the classic emblem on it: a shield with two swords
crossed behind it, in cream. The emblem is the same geometry as the classic
glyph in src/themes.js, so the icon on the home screen is the piece in the
game.

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


def rotate(pts, deg, cx=50.0, cy=50.0):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * ca - (y - cy) * sa,
             cy + (x - cx) * sa + (y - cy) * ca) for x, y in pts]


def sword(angle):
    """Pommel, guard and blade, the three shapes of the classic sword."""
    pommel = stadium(45.5, 4, 9, 15)
    guard = stadium(34, 17, 32, 9)
    blade = [(44.5, 25), (55.5, 25), (55.5, 82), (50, 94), (44.5, 82)]
    return [rotate(p, angle) for p in (pommel, guard, blade)]


def shield():
    """M21,36 H79 V58 C79,75 66,86 50,91 C34,86 21,75 21,58 Z"""
    pts = [(21, 36), (79, 36), (79, 58)]
    pts += bezier((79, 58), (79, 75), (66, 86), (50, 91))[1:]
    pts += bezier((50, 91), (34, 86), (21, 75), (21, 58))[1:]
    return pts


SWORDS = sword(38) + sword(-38)
SHIELD = shield()


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
    every = SWORDS + [SHIELD]
    xs = [p[0] for g in every for p in g]
    ys = [p[1] for g in every for p in g]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    span = max(x1 - x0, y1 - y0)
    k = n * SAFE / span
    ox = (n - (x1 - x0) * k) / 2.0 - x0 * k
    oy = (n - (y1 - y0) * k) / 2.0 - y0 * k

    def put(g):
        return [(x * k + ox, y * k + oy) for x, y in g]

    # Every shape in the glyph carries an outline, which is what keeps the two
    # swords apart and the shield in front of them. Pillow has no stroke, so
    # each shape is laid down as a thick line of the background along its edge
    # and then filled: the half of that line outside the shape survives as the
    # gap, exactly as the SVG stroke does.
    gap = max(2, int(n * 0.028))
    for g in SWORDS + [SHIELD]:
        pts = put(g)
        d.line(pts + [pts[0]], fill=BG, width=gap, joint='curve')
        d.polygon(pts, fill=FG)

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
