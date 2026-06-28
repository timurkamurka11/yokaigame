@echo off
python scripts\validate_presets.py || exit /b 1
npm run build || exit /b 1
