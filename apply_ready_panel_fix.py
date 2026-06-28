from __future__ import annotations

from pathlib import Path
import shutil
import sys

CSS_PATH = Path("miniapp/src/styles.css")
BACKUP_PATH = Path("miniapp/src/styles.css.before_ready_panel_fix")

REPLACEMENTS = [
    (
        "refPreviewSelector padding/gap",
        """  padding: 2.6% 2.2% 2.2%;
  gap: 2.2%;""",
        """  padding: 2.1% 2.0% 2.0%;
  gap: 2.0%;""",
    ),
    (
        "refPreviewSelector::before inset",
        """  inset: 3.2% 1.6% 2.8%;""",
        """  inset: 0.35% 0.45% 0.45%;""",
    ),
    (
        "refSelectorControls layout",
        """.refSelectorControls {
  width: 100%;
  height: 100%;
  grid-template-columns: 10% minmax(0, 1fr) 10%;
  gap: 1.6%;
}""",
        """.refSelectorControls {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-columns: 8% minmax(0, 1fr) 8%;
  gap: 1%;
}""",
    ),
    (
        "refSelectorControls default button size",
        """.refSelectorControls > button {
  width: 92%;
  height: 76%;""",
        """.refSelectorControls > button {
  width: 100%;
  height: 84%;""",
    ),
    (
        "refSelectorCenter layout",
        """.refSelectorCenter {
  min-width: 0;
  height: 100%;
  grid-template-columns: minmax(72px, 40%) minmax(0, 1fr);
  gap: 5%;
}""",
        """.refSelectorCenter {
  min-width: 0;
  min-height: 0;
  height: 100%;
  grid-template-columns: minmax(78px, 44%) minmax(0, 1fr);
  gap: 4%;
}""",
    ),
    (
        "refSelectorThumb height",
        """.refSelectorThumb {
  height: 94%;""",
        """.refSelectorThumb {
  height: 98%;""",
    ),
    (
        "refSelectorThumb image",
        """.refSelectorThumb img {
  width: 194%;
  max-height: 128%;
  object-fit: contain;
}""",
        """.refSelectorThumb img {
  display: block;
  width: 190%;
  max-height: 126%;
  object-fit: contain;
}""",
    ),
    (
        "refPresetArrowButton visibility/size",
        """.refSelectorControls > .refPresetArrowButton {
  width: 78%;
  height: 72%;
  min-width: 30px;
  min-height: 34px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
  display: grid;
  place-items: center;
}""",
        """.refSelectorControls > .refPresetArrowButton {
  width: 100%;
  height: 84%;
  min-width: 30px;
  min-height: 34px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
  display: grid;
  opacity: 1;
  visibility: visible;
  place-items: center;
}""",
    ),
]


def main() -> int:
    if not CSS_PATH.exists():
        print(f"ERROR: file not found: {CSS_PATH}")
        print("Run this script from the repository root.")
        return 1

    text = CSS_PATH.read_text(encoding="utf-8")
    updated = text
    changes = []
    already = []
    missing = []

    for label, old, new in REPLACEMENTS:
        if new in updated:
            already.append(label)
            continue
        if old in updated:
            updated = updated.replace(old, new, 1)
            changes.append(label)
            continue
        missing.append(label)

    if missing:
        print("ERROR: some expected CSS blocks were not found:")
        for label in missing:
            print(f"  - {label}")
        print("\nNo files were changed.")
        print("The local styles.css probably differs from PR #2.")
        return 2

    if updated == text:
        print("Fix is already applied. No changes needed.")
        return 0

    shutil.copy2(CSS_PATH, BACKUP_PATH)
    CSS_PATH.write_text(updated, encoding="utf-8", newline="\n")

    print("Applied ready-panel desktop fix.")
    print(f"Backup: {BACKUP_PATH}")
    if changes:
        print("\nChanged:")
        for label in changes:
            print(f"  + {label}")
    if already:
        print("\nAlready present:")
        for label in already:
            print(f"  = {label}")

    print("\nNext:")
    print("  cd miniapp")
    print("  npm run build")
    print("  npx tsc --noEmit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
