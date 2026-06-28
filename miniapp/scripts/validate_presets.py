from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageChops
import sys

MINIAPP = Path(__file__).resolve().parents[1]
ROOT = MINIAPP / "public" / "assets" / "creator_ready"
GENDERS = ("male", "female")
MODES = ("outfit", "full")
ERRORS: list[str] = []
CHECKED = 0


def fail(message: str) -> None:
    ERRORS.append(message)


def load(path: Path) -> Image.Image | None:
    global CHECKED
    if not path.exists():
        fail(f"MISSING: {path.relative_to(ROOT)}")
        return None
    try:
        image = Image.open(path)
        image.load()
    except Exception as exc:
        fail(f"BROKEN PNG: {path.relative_to(ROOT)} ({exc})")
        return None
    CHECKED += 1
    if image.format != "PNG":
        fail(f"NOT PNG: {path.relative_to(ROOT)}")
    if image.size != (512, 512):
        fail(f"WRONG SIZE: {path.relative_to(ROOT)} = {image.size}")
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    if alpha.getextrema() == (255, 255):
        fail(f"NO TRANSPARENCY: {path.relative_to(ROOT)}")
    for point in ((0, 0), (511, 0), (0, 511), (511, 511)):
        if rgba.getpixel(point)[3] != 0:
            fail(f"OPAQUE CORNER: {path.relative_to(ROOT)} at {point}")
            break
    return rgba


for gender in GENDERS:
    for index in range(1, 11):
        folder = ROOT / gender / f"{index:02d}"
        images = {mode: load(folder / f"{mode}.png") for mode in MODES}
        if any(image is None for image in images.values()):
            continue

        outfit = images["outfit"]
        full = images["full"]
        assert outfit is not None and full is not None

        # Full must be a distinct ready preset with an integrated accessory.
        full_diff = ImageChops.difference(outfit.convert("RGB"), full.convert("RGB"))
        changed = full_diff.getbbox()
        if changed is None:
            fail(f"NO ACCESSORY IN FULL: {gender}/{index:02d}")
        else:
            outfit_bbox = outfit.getchannel("A").getbbox()
            if outfit_bbox is None:
                fail(f"EMPTY OUTFIT: {gender}/{index:02d}")
            else:
                margin = 34
                allowed = (
                    max(0, outfit_bbox[0] - margin),
                    max(0, outfit_bbox[1] - margin),
                    min(512, outfit_bbox[2] + margin),
                    min(512, outfit_bbox[3] + margin),
                )
                if changed[0] < allowed[0] or changed[1] < allowed[1] or changed[2] > allowed[2] or changed[3] > allowed[3]:
                    fail(f"FLOATING ACCESSORY: {gender}/{index:02d} changed={changed} allowed={allowed}")

expected = 2 * 10 * 2
if CHECKED != expected:
    fail(f"EXPECTED {expected} ACTIVE PNG FILES, CHECKED {CHECKED}")


# Static source checks: one shared index and no legacy layer indexes.
app_source = (MINIAPP / "src" / "App.tsx").read_text(encoding="utf-8")
for forbidden in ("skinIndex", "eyeIndex", "hairIndex", "outfitIndex", "accessoryIndex", "basePreset", "outfitPreset", "fullPreset"):
    if forbidden in app_source:
        fail(f"LEGACY INDEX IN App.tsx: {forbidden}")
if "presetIndex: number" not in app_source:
    fail("SHARED presetIndex TYPE NOT FOUND")
if "presetSrc(character.gender, variant, character.presetIndex)" not in app_source:
    fail("SINGLE PRESET IMAGE SOURCE NOT FOUND")

if ERRORS:
    print("PRESET VALIDATION FAILED")
    for error in ERRORS:
        print(f"- {error}")
    sys.exit(1)

print("PRESET VALIDATION PASSED")
print(f"Core PNG files checked: {CHECKED}/{expected}")
print("All files: PNG, RGBA-compatible, 512x512, transparent corners")
print("One shared ID per outfit/full")
print("Full differs from outfit only by an integrated accessory near character bounds")
