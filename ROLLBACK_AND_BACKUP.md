# Yokai.exe — Backup and rollback policy

## Mandatory rule before every patch

Before modifying the next working version:

1. create a source snapshot ZIP;
2. exclude only generated `node_modules` and `dist`;
3. include all source code, public assets, config and patch documentation;
4. name the snapshot with the last working version and ISO date;
5. calculate SHA-256;
6. keep the snapshot alongside the new patch archive.

## Current baseline

Backup created before this patch:

```text
Yokai_WORKING_BACKUP_Pre_Global_Economy_V1_2026-06-28.zip
```

## Rollback procedure

1. Stop the dev server.
2. Move the current project directory out of the way.
3. Extract the backup into the original project root.
4. Restore dependencies with `npm install` on the target OS.
5. Run `npm run build`.
6. Start the app and verify HUB, Ramen Shop, Rifts, battle and Hunter House.

## Economy data rollback

Do not delete player balances to roll back a production backend.

Preferred production rollback:

- deploy the previous application build;
- keep append-only transactions;
- rebuild materialized balances from the ledger if needed;
- use compensating transactions for incorrect grants/sinks;
- never edit or delete paid order history.

The local prototype stores the new economy snapshot under:

```text
yokai.economy.global.v1
```

Legacy balance remains mirrored to:

```text
yokai.currency.riftCoins
```

This mirror allows reverting the UI build without losing the visible soft-currency balance.
