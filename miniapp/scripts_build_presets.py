from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw
import shutil

PATCH = Path(__file__).resolve().parent
PUBLIC = PATCH / "public" / "assets" / "creator_ready"
DIST = PATCH / "dist" / "assets" / "creator_ready"

BLACK = (15, 10, 22, 255)
DARK = (30, 19, 38, 255)
RED = (210, 45, 70, 255)
DARK_RED = (92, 18, 35, 255)
VIOLET = (188, 70, 255, 255)
LIGHT_VIOLET = (232, 171, 255, 255)
CREAM = (239, 226, 207, 255)
GOLD = (239, 184, 59, 255)


def alpha_bbox(img: Image.Image):
    return img.getchannel("A").getbbox()


def clean_base(base: Image.Image, outfit: Image.Image, gender: str, idx: int) -> Image.Image:
    """Keep one baked image while removing known neck/shoulder garbage from old composites."""
    result = base.convert("RGBA").copy()
    px = result.load()
    bbox = alpha_bbox(result) or (170, 58, 342, 408)
    cx = (bbox[0] + bbox[2]) // 2

    # Replace the upper face/hair area with the exact head used by outfit.
    # This guarantees matching face, eyes and hairstyle across all three modes.
    outfit_rgba = outfit.convert("RGBA")
    head = outfit_rgba.crop((0, 0, 512, 205))
    result.alpha_composite(head, (0, 0))
    px = result.load()

    # Remove pale/skin-coloured horizontal remnants around the neck/shoulders.
    for y in range(192, 248):
        for x in range(0, 512):
            r, g, b, a = px[x, y]
            if not a:
                continue
            outside_core = x < cx - 48 or x > cx + 48
            if outside_core:
                brightness = (r + g + b) / 3
                saturation = max(r, g, b) - min(r, g, b)
                if brightness > 76 or saturation < 30:
                    px[x, y] = (0, 0, 0, 0)

    # Targeted cleanup for the documented problematic bases.
    if gender == "female" and idx in (5, 6):
        for y in range(202, 248):
            for x in range(0, 512):
                if cx - 48 <= x <= cx + 48:
                    continue
                r, g, b, a = px[x, y]
                if a and ((r + g + b) / 3 > 66):
                    px[x, y] = (0, 0, 0, 0)

    if gender == "male" and idx == 10:
        # Remove scarf/shoulder pieces that accidentally leaked into base mode.
        for y in range(196, 246):
            for x in list(range(0, cx - 43)) + list(range(cx + 44, 512)):
                px[x, y] = (0, 0, 0, 0)

    return result


def line(draw: ImageDraw.ImageDraw, pts, fill, width=4):
    draw.line(pts, fill=fill, width=width, joint="curve")


def draw_accessory(outfit: Image.Image, idx: int) -> Image.Image:
    """Bake an attached accessory directly into outfit.png to create full.png."""
    result = outfit.convert("RGBA").copy()
    bbox = alpha_bbox(result) or (170, 58, 342, 496)
    cx = (bbox[0] + bbox[2]) // 2
    layer = Image.new("RGBA", result.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    if idx == 1:  # cyber implant attached to right temple
        x, y = cx + 48, 156
        d.rounded_rectangle((x, y, x + 22, y + 30), radius=5, fill=BLACK, outline=VIOLET, width=4)
        d.ellipse((x + 6, y + 8, x + 16, y + 18), fill=LIGHT_VIOLET)
        line(d, [(x, y + 17), (x - 10, y + 17)], VIOLET, 3)

    elif idx == 2:  # talisman fixed to hair/ear
        x, y = cx + 38, 157
        line(d, [(cx + 42, 145), (x + 10, y)], DARK_RED, 4)
        d.rounded_rectangle((x, y, x + 25, y + 54), radius=2, fill=CREAM, outline=RED, width=3)
        line(d, [(x + 6, y + 12), (x + 18, y + 12)], RED, 2)
        line(d, [(x + 7, y + 21), (x + 17, y + 31)], RED, 2)
        line(d, [(x + 17, y + 21), (x + 7, y + 31)], RED, 2)
        line(d, [(x + 12, y + 35), (x + 12, y + 45)], RED, 2)

    elif idx == 3:  # kitsune half mask sitting on side of head
        x, y = cx + 15, 103
        points = [(x + 8, y), (x + 43, y + 8), (x + 50, y + 43), (x + 34, y + 68), (x + 4, y + 57), (x, y + 24)]
        d.polygon(points, fill=CREAM, outline=BLACK)
        line(d, [(x + 9, y + 18), (x + 24, y + 23)], RED, 3)
        line(d, [(x + 31, y + 18), (x + 42, y + 25)], RED, 3)
        line(d, [(x + 13, y + 40), (x + 39, y + 40)], RED, 3)
        d.polygon([(x + 9, y + 2), (x + 14, y - 12), (x + 22, y + 6)], fill=CREAM, outline=BLACK)
        d.polygon([(x + 31, y + 6), (x + 40, y - 10), (x + 44, y + 12)], fill=CREAM, outline=BLACK)

    elif idx == 4:  # visor on eyes
        x1, y1, x2, y2 = cx - 58, 149, cx + 58, 184
        d.rounded_rectangle((x1, y1, x2, y2), radius=10, fill=BLACK, outline=VIOLET, width=5)
        line(d, [(x1 + 13, y1 + 17), (x2 - 13, y1 + 17)], LIGHT_VIOLET, 4)
        line(d, [(x1, y1 + 17), (x1 - 12, y1 + 22)], DARK, 5)
        line(d, [(x2, y1 + 17), (x2 + 12, y1 + 22)], DARK, 5)

    elif idx == 5:  # earrings attached to ears
        for x in (cx - 51, cx + 51):
            line(d, [(x, 184), (x, 205)], CREAM, 3)
            d.ellipse((x - 7, 202, x + 7, 216), fill=VIOLET, outline=BLACK, width=2)
            d.ellipse((x - 3, 206, x + 3, 212), fill=LIGHT_VIOLET)

    elif idx == 6:  # pendant on chest
        line(d, [(cx - 15, 226), (cx, 255), (cx + 15, 226)], GOLD, 3)
        d.polygon([(cx, 250), (cx + 10, 263), (cx, 278), (cx - 10, 263)], fill=VIOLET, outline=BLACK)
        d.ellipse((cx - 4, 258, cx + 4, 266), fill=LIGHT_VIOLET)

    elif idx == 7:  # scarf correctly wrapped around neck
        d.rounded_rectangle((cx - 45, 213, cx + 45, 242), radius=12, fill=DARK_RED, outline=BLACK, width=3)
        line(d, [(cx - 34, 228), (cx + 35, 228)], RED, 4)
        d.polygon([(cx + 25, 235), (cx + 52, 242), (cx + 45, 286), (cx + 28, 268)], fill=DARK_RED, outline=BLACK)
        line(d, [(cx + 35, 246), (cx + 39, 274)], RED, 3)

    elif idx == 8:  # monocle over right eye
        ex, ey = cx + 25, 169
        d.ellipse((ex - 20, ey - 20, ex + 20, ey + 20), fill=(20, 10, 30, 150), outline=VIOLET, width=5)
        d.ellipse((ex - 8, ey - 8, ex + 8, ey + 8), outline=LIGHT_VIOLET, width=3)
        line(d, [(ex + 17, ey + 15), (cx + 54, 226)], VIOLET, 3)

    elif idx == 9:  # omamori attached to belt
        x, y = cx + 32, 318
        line(d, [(cx + 28, 298), (x + 10, y)], RED, 3)
        d.rounded_rectangle((x, y, x + 28, y + 48), radius=3, fill=DARK_RED, outline=GOLD, width=3)
        line(d, [(x + 6, y + 15), (x + 22, y + 15)], CREAM, 2)
        line(d, [(x + 8, y + 25), (x + 20, y + 36)], CREAM, 2)

    elif idx == 10:  # spirit medallion on chest
        line(d, [(cx - 14, 226), (cx, 249), (cx + 14, 226)], VIOLET, 3)
        d.ellipse((cx - 17, 245, cx + 17, 279), fill=(54, 21, 76, 255), outline=VIOLET, width=4)
        d.ellipse((cx - 7, 255, cx + 7, 269), fill=LIGHT_VIOLET)
        d.arc((cx - 13, 249, cx + 13, 275), 35, 310, fill=CREAM, width=2)

    result.alpha_composite(layer)
    return result


def clean_small_speckles(img: Image.Image) -> Image.Image:
    # Remove only isolated 1–2 pixel alpha components; preserve decorative tassels.
    import cv2
    import numpy as np

    arr = np.array(img.convert("RGBA"))
    mask = (arr[:, :, 3] > 0).astype("uint8")
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] <= 2:
            arr[labels == label] = 0
    return Image.fromarray(arr, "RGBA")


def build_tree(tree: Path):
    for gender in ("male", "female"):
        for idx in range(1, 11):
            folder = tree / gender / f"{idx:02d}"
            base_path = folder / "base.png"
            outfit_path = folder / "outfit.png"
            base = Image.open(base_path).convert("RGBA")
            outfit = Image.open(outfit_path).convert("RGBA")

            base = clean_small_speckles(clean_base(base, outfit, gender, idx))
            outfit = clean_small_speckles(outfit)
            full = clean_small_speckles(draw_accessory(outfit, idx))

            for name, image in (("base", base), ("outfit", outfit), ("full", full)):
                if image.size != (512, 512):
                    image = image.resize((512, 512), Image.Resampling.NEAREST)
                image.save(folder / f"{name}.png", "PNG", optimize=True)



def build_avatars(tree: Path):
    for gender in ("male", "female"):
        for idx in range(1, 11):
            id_folder = tree / gender / f"{idx:02d}"
            avatar_folder = tree / gender / "avatars" / f"{idx:02d}"
            avatar_folder.mkdir(parents=True, exist_ok=True)
            for mode in ("base", "outfit", "full"):
                image = Image.open(id_folder / f"{mode}.png").convert("RGBA")
                bbox = alpha_bbox(image) or (170, 58, 342, 496)
                cx = (bbox[0] + bbox[2]) // 2
                left = max(0, cx - 112)
                right = min(512, cx + 112)
                top = max(0, bbox[1] - 8)
                bottom = min(512, top + 285)
                crop = image.crop((left, top, right, bottom))
                canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
                ratio = min(240 / crop.width, 240 / crop.height)
                resized = crop.resize((int(crop.width * ratio), int(crop.height * ratio)), Image.Resampling.NEAREST)
                canvas.alpha_composite(resized, ((256 - resized.width) // 2, (256 - resized.height) // 2))
                canvas.save(avatar_folder / f"{mode}.png", "PNG", optimize=True)


build_tree(PUBLIC)
build_avatars(PUBLIC)

# Replace dist assets with exact validated public assets.
if DIST.exists():
    shutil.rmtree(DIST)
shutil.copytree(PUBLIC, DIST)
print("Built 60 linked presets in public and dist")
