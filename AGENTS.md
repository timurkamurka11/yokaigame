# Yokai.exe — instructions for Codex

## Project purpose

Yokai.exe is a Telegram Mini App game in a cyber-Japanese / neon-yokai style.
The current repository is the active project. Do not use assumptions from older repositories or patches.

## Repository structure

- `miniapp/` — React + TypeScript + Vite frontend.
- `miniapp/src/App.tsx` — main UI and game screen logic.
- `miniapp/src/styles.css` — desktop/mobile UI styles.
- `miniapp/src/sound.ts` — game audio helpers.
- `miniapp/src/telegram.ts` — Telegram WebApp integration.
- `miniapp/public/assets/` — images, sprites, sounds and videos.
- `bot/` — Telegram bot built with aiogram.
- `backend/` — SQLAlchemy/asyncpg database layer and models.
- `requirements.txt` — Python dependencies.

## Source-of-truth rules

1. The frontend source of truth is only `miniapp/`.
2. The Python source of truth is only the root `bot/` and `backend/` folders.
3. Do not create duplicate frontend, bot or backend folders.
4. Do not commit `node_modules`, `.venv`, `dist`, caches or `.env`.
5. Do not place secrets, bot tokens or database passwords in source files.

## Character creator rules

The character creator uses ready-made full PNG presets, not separate body/eyes/hair/outfit layers.

Expected state:

```ts
gender: "male" | "female";
presetIndex: number; // 0-9
mode: "outfit" | "full";
```

Expected asset path:

```text
/assets/creator_ready/${gender}/${id}/${mode}.png
```

Do not restore a layered character system unless explicitly requested.

## Change policy

Before editing:

1. Inspect the relevant React/TypeScript/CSS/Python files.
2. Identify the real cause of the bug.
3. State the exact files and selectors/functions to change.
4. Prefer minimal edits to existing rules.

Do not:

- rewrite all of `App.tsx` or `styles.css` for a local bug;
- stack repeated CSS override blocks with duplicate selectors;
- redesign the approved UI without an explicit request;
- remove working sounds, intro video, animations, presets or game mechanics;
- change both desktop and mobile behavior without checking both;
- claim a test passed unless the command was actually run.

## Responsive UI requirements

Treat desktop and mobile as two intentional layouts.

Check at minimum:

- 1920 × 1080
- 1280 × 800
- 390 × 844
- 360 × 800

Do not allow:

- horizontal page overflow;
- mobile media queries affecting desktop;
- UI panels leaving decorative frames;
- overlapping text/cards;
- desktop shrinking into a narrow centered mobile card;
- unintended clipping of interactive controls.

For pixel-art assets, do not add `image-rendering: pixelated` blindly. First inspect the source dimensions, CSS size, parent transforms and filtering.

## Intro and audio

- Intro is a separate screen before the creator.
- It must have a skip action and must not alter creator layout sizing.
- Creator/battle music must not play over intro.
- Preserve existing sound functions unless the task explicitly changes them.
- Account for browser and Telegram WebView autoplay restrictions.

## Required frontend checks

From repository root:

```bash
cd miniapp
npm ci
npm run build
npx tsc --noEmit
```

Run `npm run lint` only if that script exists.

Also inspect:

- broken imports;
- missing assets;
- console errors;
- duplicate CSS selectors introduced by the change;
- desktop and mobile behavior.

## Required Python checks

From repository root:

```bash
python -m compileall bot backend
```

When dependencies and environment variables are available, also verify the bot can import from the repository root.

## Response format

Before code changes:

```text
Cause:
Files to change:
Fix plan:
What will remain unchanged:
```

After code changes:

```text
Fixed:
Changed files:
Checks actually run:
Checks not run:
Remaining risks:
```
