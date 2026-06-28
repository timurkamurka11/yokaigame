# Validation results

Prepared and checked in the sandbox.

Passed:

- `cd miniapp && npm ci`
- `cd miniapp && npm run build`
- `cd miniapp && npx tsc --noEmit`
- `python -m compileall bot backend`

Notes:

- npm reported one low-severity dependency vulnerability. No automatic dependency update was applied because that could alter the project unexpectedly.
- Generated `node_modules`, `dist` and Python caches were removed again before packaging; they are intentionally excluded by `.gitignore`.
