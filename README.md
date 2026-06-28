# Yokai.exe

Clean source repository prepared for GitHub and Codex.

## Structure

```text
yokai_exe_codex_ready/
├── AGENTS.md
├── .gitignore
├── .env.example
├── requirements.txt
├── bot/
├── backend/
├── docs/
└── miniapp/
    ├── package.json
    ├── package-lock.json
    ├── src/
    └── public/
```

The active frontend is only inside `miniapp/`. The active Python bot/backend are in the repository root.

## Local Mini App start

Install Node.js 20 or newer, then open PowerShell in the repository root:

```powershell
cd miniapp
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

For testing on another device in the same Wi-Fi network:

```powershell
npm run dev -- --host 0.0.0.0
```

Use the `Network` URL shown by Vite.

## Local bot start

Install Python 3.11 or newer. From the repository root:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Fill in the real values in `.env`, then run:

```powershell
python -m bot.main
```

The current bot uses polling, so it can run locally without a public bot webhook. The Mini App itself needs a public HTTPS URL only when opening it inside Telegram.

## Frontend build check

```powershell
cd miniapp
npm ci
npm run build
npx tsc --noEmit
```

## Uploading to GitHub

Do not upload a real `.env`. The included `.gitignore` excludes credentials, dependencies, environments and generated builds.

Suggested new private repository name:

```text
yokai-exe
```

After publishing the repository, select it in Codex and ask Codex to read `AGENTS.md` before changing code.
