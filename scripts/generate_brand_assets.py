#!/usr/bin/env python3
"""Regenerate Casa Nigeria brand assets from the master logo mark."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MARK_PATH = ROOT / "casa_logo_mark_master_1024.png"
PUBLIC = ROOT / "marketing" / "public"
ADMIN_PUBLIC = ROOT / "admin" / "public"

# Match existing feature graphic green
FEATURE_GREEN = (35, 151, 84)
LOCKUP_BG = (0, 0, 0)
# Approximate lockup green (leaf)
LOCKUP_GREEN = (52, 178, 74)


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=0)
        except OSError:
            continue
    return ImageFont.load_default()


def load_mark() -> Image.Image:
    return Image.open(MARK_PATH).convert("RGBA")


def recolor_mark(mark: Image.Image, rgb: tuple[int, int, int]) -> Image.Image:
    """Keep alpha; replace non-near-black pixels with solid rgb (for white/green icons)."""
    out = mark.copy()
    px = out.load()
    r, g, b = rgb
    w, h = out.size
    for y in range(h):
        for x in range(w):
            pr, pg, pb, pa = px[x, y]
            if pa < 8:
                continue
            # Keep dark keyhole / inner house as transparent against solid backgrounds
            if pr + pg + pb < 45:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (r, g, b, pa)
    return out


def fit(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    img = img.copy()
    img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    return img


def centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    cy: int,
    fnt: ImageFont.ImageFont,
    fill: tuple[int, int, int],
    canvas_w: int,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(((canvas_w - tw) / 2, cy - th / 2), text, font=fnt, fill=fill)


def make_feature_graphic(path: Path) -> None:
    w, h = 1024, 500
    canvas = Image.new("RGB", (w, h), FEATURE_GREEN)
    mark = fit(recolor_mark(load_mark(), (255, 255, 255)), 220, 220)
    mx = (w - mark.width) // 2
    my = 70
    canvas.paste(mark, (mx, my), mark)

    draw = ImageDraw.Draw(canvas)
    title = font(78)
    tag = font(34)
    centered_text(draw, "Casa Nigeria", 330, title, (255, 255, 255), w)
    centered_text(draw, "Find homes in Nigeria", 400, tag, (255, 255, 255), w)
    canvas.save(path, "PNG", optimize=True)
    print(f"wrote {path}")


def make_og(path: Path) -> None:
    """1200×630 social preview built from the feature layout."""
    w, h = 1200, 630
    canvas = Image.new("RGB", (w, h), FEATURE_GREEN)
    mark = fit(recolor_mark(load_mark(), (255, 255, 255)), 260, 260)
    canvas.paste(mark, ((w - mark.width) // 2, 90), mark)
    draw = ImageDraw.Draw(canvas)
    centered_text(draw, "Casa Nigeria", 420, font(92), (255, 255, 255), w)
    centered_text(draw, "Find your home on WhatsApp", 510, font(36), (255, 255, 255), w)
    canvas.save(path, "PNG", optimize=True)
    print(f"wrote {path}")


def make_horizontal_lockup(path: Path) -> None:
    """Black lockup: mark + 'casa nigeria' wordmark."""
    mark = fit(load_mark(), 220, 220)
    # Crop near-black padding from mark for tighter lockup
    bbox = mark.getbbox()
    if bbox:
        mark = mark.crop(bbox)

    pad_x, pad_y = 48, 36
    gap = 28
    title_font = font(96)
    # Measure text
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    tb = probe.textbbox((0, 0), "casa nigeria", font=title_font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]

    content_h = max(mark.height, th)
    width = pad_x * 2 + mark.width + gap + tw
    height = pad_y * 2 + content_h
    canvas = Image.new("RGBA", (width, height), (*LOCKUP_BG, 255))
    mark_y = pad_y + (content_h - mark.height) // 2
    canvas.paste(mark, (pad_x, mark_y), mark)

    draw = ImageDraw.Draw(canvas)
    text_x = pad_x + mark.width + gap
    text_y = pad_y + (content_h - th) // 2 - tb[1]
    draw.text((text_x, text_y), "casa nigeria", font=title_font, fill=LOCKUP_GREEN)

    canvas.convert("RGB").save(path, "PNG", optimize=True)
    print(f"wrote {path}")


def make_app_icons() -> None:
    """Square icons from the master mark on black."""
    mark = load_mark()
    sizes = {
        PUBLIC / "icon-512.png": 512,
        PUBLIC / "icon-192.png": 192,
        PUBLIC / "apple-touch-icon.png": 180,
        PUBLIC / "favicon-32x32.png": 32,
        PUBLIC / "favicon-16x16.png": 16,
        PUBLIC / "favicon.png": 32,
    }
    for path, size in sizes.items():
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 255))
        inset = int(size * 0.12)
        icon = mark.copy()
        icon.thumbnail((size - inset * 2, size - inset * 2), Image.Resampling.LANCZOS)
        ox = (size - icon.width) // 2
        oy = (size - icon.height) // 2
        canvas.paste(icon, (ox, oy), icon)
        canvas.convert("RGB").save(path, "PNG", optimize=True)
        print(f"wrote {path}")

    # Admin favicons if present
    if ADMIN_PUBLIC.exists():
        for name in ("favicon.png", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png"):
            src = PUBLIC / name
            dst = ADMIN_PUBLIC / name
            if src.exists():
                Image.open(src).save(dst, "PNG", optimize=True)
                print(f"wrote {dst}")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)

    feature = ROOT / "casa_feature_graphic_1024x500.png"
    lockup = ROOT / "casa_logo_lockup_horizontal.png"
    make_feature_graphic(feature)
    make_horizontal_lockup(lockup)
    make_og(PUBLIC / "casa_og.png")

    # Sync copies into marketing public
    Image.open(feature).save(PUBLIC / "casa_feature_graphic_1024x500.png", "PNG", optimize=True)
    Image.open(lockup).save(PUBLIC / "casa_logo_lockup_horizontal.png", "PNG", optimize=True)
    print(f"wrote {PUBLIC / 'casa_feature_graphic_1024x500.png'}")
    print(f"wrote {PUBLIC / 'casa_logo_lockup_horizontal.png'}")

    make_app_icons()

    admin_lockup = ADMIN_PUBLIC / "casa_logo_lockup_horizontal.png"
    if ADMIN_PUBLIC.exists():
        Image.open(lockup).save(admin_lockup, "PNG", optimize=True)
        print(f"wrote {admin_lockup}")


if __name__ == "__main__":
    main()
