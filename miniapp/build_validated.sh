#!/usr/bin/env bash
set -euo pipefail
python3 scripts/validate_presets.py
npm run build
