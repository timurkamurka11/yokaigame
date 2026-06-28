# First Codex task

Copy the text below into Codex after connecting this repository:

```text
Read AGENTS.md and inspect the current Yokai.exe repository.

Do not modify code yet.

1. Map the frontend, bot and backend structure.
2. Identify the files and CSS media queries responsible for the character creator on desktop and mobile.
3. Find duplicated or conflicting CSS selectors related to the creator screen.
4. Verify asset paths for character presets, companions, audio and intro video.
5. Run the available checks:
   cd miniapp
   npm ci
   npm run build
   npx tsc --noEmit
   cd ..
   python -m compileall bot backend
6. Report exact failures without fixing them.

Return:
- project structure;
- relevant files/selectors;
- build/type-check results;
- confirmed problems;
- a minimal repair plan.
```
