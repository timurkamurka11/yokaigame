from __future__ import annotations

import importlib.util
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "miniapp" / "src" / "AppLegacy.tsx"
INTEGRATED = ROOT / "miniapp" / "src" / "AppIntegrated.tsx"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    if not LEGACY.exists():
        raise FileNotFoundError(LEGACY)

    shutil.copyfile(LEGACY, INTEGRATED)

    base = load_module("yokai_apply_v11", ROOT / "tools" / "apply_economy_combat_v1_1.py")
    base.APP = INTEGRATED
    base.main()

    final = load_module("yokai_finalize_v11", ROOT / "tools" / "finalize_economy_combat_v1_1.py")
    final.APP = INTEGRATED
    final.main()

    print(f"Materialized {INTEGRATED.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
