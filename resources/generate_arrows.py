#!/usr/bin/env python3
"""Generate 1-bit arrow bitmaps for the glucose trend direction indicator.

Renders 7 arrow glyphs as black-on-transparent filled polygons, exported as
palettized 1-bit PNGs sized to sit beside FONT_KEY_GOTHIC_28_BOLD text.

Run:    python3 resources/generate_arrows.py
Output: resources/images/arrow_*.png
"""

import os
from PIL import Image, ImageDraw

# Single-arrow canvas is 24x24 (matches its layer width exactly, so the
# bitmap fills the layer with no alignment ambiguity). Double-arrow canvas is
# 48x24 (two arrows side by side, also matching its layer width).
CAP_HEIGHT = 20
SINGLE_W = 20                # single-arrow canvas width (== layer width)
SINGLE_H = CAP_HEIGHT         # 20
DOUBLE_W = 40                # double-arrow canvas width (== layer width)
DOUBLE_H = SINGLE_H           # 20
ARROW_CELL_W = CAP_HEIGHT     # 20 — width one arrow occupies

# Arrow geometry (within a SINGLE_W x SINGLE_H cell, with ~2 px margin).
MARGIN = 3
SHAFT_HALF = 3                 # half-width of the shaft / arrow base
HEAD_HALF = 7                  # half-width of the arrow head

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")


def _new_canvas(w, h):
    # RGBA canvas: black arrow on transparent background.
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def _draw_arrow_up(draw, ox, oy):
    """Draw an up arrow in the cell starting at (ox, oy)."""
    x_mid = ox + ARROW_CELL_W // 2
    top = oy + MARGIN
    bottom = oy + SINGLE_H - MARGIN - 1
    # Arrow head (triangle pointing up).
    head_tip = (x_mid, top)
    head_left = (x_mid - HEAD_HALF, top + HEAD_HALF)
    head_right = (x_mid + HEAD_HALF, top + HEAD_HALF)
    draw.polygon([head_tip, head_left, head_right], fill=(0, 0, 0, 255))
    # Shaft (rectangle from below the head to the bottom).
    shaft_top = top + HEAD_HALF
    draw.rectangle(
        [(x_mid - SHAFT_HALF, shaft_top), (x_mid + SHAFT_HALF, bottom)],
        fill=(0, 0, 0, 255),
    )


def _draw_arrow_down(draw, ox, oy):
    """Draw a down arrow in the cell starting at (ox, oy)."""
    x_mid = ox + ARROW_CELL_W // 2
    top = oy + MARGIN
    bottom = oy + SINGLE_H - MARGIN - 1
    # Arrow head (triangle pointing down).
    head_tip = (x_mid, bottom)
    head_left = (x_mid - HEAD_HALF, bottom - HEAD_HALF)
    head_right = (x_mid + HEAD_HALF, bottom - HEAD_HALF)
    draw.polygon([head_tip, head_left, head_right], fill=(0, 0, 0, 255))
    # Shaft (rectangle from the top to above the head).
    shaft_bottom = bottom - HEAD_HALF
    draw.rectangle(
        [(x_mid - SHAFT_HALF, top), (x_mid + SHAFT_HALF, shaft_bottom)],
        fill=(0, 0, 0, 255),
    )


def _draw_arrow_right(draw, ox, oy):
    """Draw a right arrow (flat) in the cell starting at (ox, oy)."""
    y_mid = oy + SINGLE_H // 2
    left = ox + MARGIN
    right = ox + ARROW_CELL_W - MARGIN - 1
    # Arrow head (triangle pointing right).
    head_tip = (right, y_mid)
    head_top = (right - HEAD_HALF, y_mid - HEAD_HALF)
    head_bottom = (right - HEAD_HALF, y_mid + HEAD_HALF)
    draw.polygon([head_tip, head_top, head_bottom], fill=(0, 0, 0, 255))
    # Shaft (rectangle from the left to before the head).
    shaft_right = right - HEAD_HALF
    draw.rectangle(
        [(left, y_mid - SHAFT_HALF), (shaft_right, y_mid + SHAFT_HALF)],
        fill=(0, 0, 0, 255),
    )


def _draw_arrow_diagonal_up(draw, ox, oy):
    """Draw a diagonal up-right arrow in the cell starting at (ox, oy).

    Thick diagonal shaft from bottom-left to top-right, with a proper
    arrowhead at the top-right tip (two barbs pointing back along the
    horizontal and vertical directions).
    """
    left = ox + MARGIN
    top = oy + MARGIN
    right = ox + ARROW_CELL_W - MARGIN - 1
    bottom = oy + SINGLE_H - MARGIN - 1
    # Shaft: thick line along the main diagonal. Built as a polygon by
    # offsetting along the normal (nx, ny) = (1, 1) (upper-left normal).
    t = 3  # half-thickness
    nx, ny = 1, 1
    p1 = (left + nx * t, bottom + ny * t)
    p2 = (left - nx * t, bottom - ny * t)
    # Shaft stops short of the tip to leave room for the arrowhead.
    shaft_end_x = right - HEAD_HALF
    shaft_end_y = top + HEAD_HALF
    p3 = (shaft_end_x - nx * t, shaft_end_y - ny * t)
    p4 = (shaft_end_x + nx * t, shaft_end_y + ny * t)
    draw.polygon([p1, p2, p3, p4], fill=(0, 0, 0, 255))
    # Arrowhead: triangle at the tip (right, top) with two barbs.
    tip = (right, top)
    barb1 = (right - HEAD_HALF, top)        # horizontal barb (left)
    barb2 = (right, top + HEAD_HALF)        # vertical barb (down)
    draw.polygon([tip, barb1, barb2], fill=(0, 0, 0, 255))


def _draw_arrow_diagonal_down(draw, ox, oy):
    """Draw a diagonal down-right arrow in the cell starting at (ox, oy).

    Thick diagonal shaft from top-left to bottom-right, with a proper
    arrowhead at the bottom-right tip.
    """
    left = ox + MARGIN
    top = oy + MARGIN
    right = ox + ARROW_CELL_W - MARGIN - 1
    bottom = oy + SINGLE_H - MARGIN - 1
    t = 3
    nx, ny = 1, -1  # normal points toward upper-right
    p1 = (left + nx * t, top + ny * t)
    p2 = (left - nx * t, top - ny * t)
    shaft_end_x = right - HEAD_HALF
    shaft_end_y = bottom - HEAD_HALF
    p3 = (shaft_end_x - nx * t, shaft_end_y - ny * t)
    p4 = (shaft_end_x + nx * t, shaft_end_y + ny * t)
    draw.polygon([p1, p2, p3, p4], fill=(0, 0, 0, 255))
    # Arrowhead: triangle at the tip (right, bottom) with two barbs.
    tip = (right, bottom)
    barb1 = (right - HEAD_HALF, bottom)     # horizontal barb (left)
    barb2 = (right, bottom - HEAD_HALF)     # vertical barb (up)
    draw.polygon([tip, barb1, barb2], fill=(0, 0, 0, 255))


def _save_1bit(img, path):
    """Save the RGBA canvas as a PNG with black arrow on transparent background.

    On color platforms (basalt/chalk/emery) this gives true alpha transparency
    via GCompOpSet. On 2-color platforms (aplite/diorite/flint) the alpha is
    thresholded to 1-bit, which also works with GCompOpSet.
    """
    img.save(path, optimize=True)


def render_single(name, draw_fn):
    img = _new_canvas(SINGLE_W, SINGLE_H)
    draw = ImageDraw.Draw(img)
    # Draw the single arrow in the left 24px cell of the 48px canvas.
    draw_fn(draw, 0, 0)
    path = os.path.join(OUTPUT_DIR, f"arrow_{name}.png")
    _save_1bit(img, path)
    print(f"wrote {path}  ({SINGLE_W}x{SINGLE_H})")


def render_double(name, draw_fn):
    img = _new_canvas(DOUBLE_W, DOUBLE_H)
    draw = ImageDraw.Draw(img)
    # Two arrows side by side, each occupying a SINGLE_W cell.
    draw_fn(draw, 0, 0)
    draw_fn(draw, ARROW_CELL_W, 0)
    path = os.path.join(OUTPUT_DIR, f"arrow_{name}.png")
    _save_1bit(img, path)
    print(f"wrote {path}  ({DOUBLE_W}x{DOUBLE_H})")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    render_single("single_up", _draw_arrow_up)
    render_single("single_down", _draw_arrow_down)
    render_single("flat", _draw_arrow_right)
    render_single("forty_five_up", _draw_arrow_diagonal_up)
    render_single("forty_five_down", _draw_arrow_diagonal_down)
    render_double("double_up", _draw_arrow_up)
    render_double("double_down", _draw_arrow_down)


if __name__ == "__main__":
    main()
