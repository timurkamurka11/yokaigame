# PATCH: GLOBAL ECONOMY & MONETIZATION FOUNDATION V1

## Baseline and rollback

Before changing the project, a separate source backup was created:

```text
Yokai_WORKING_BACKUP_Pre_Global_Economy_V1_2026-06-28.zip
```

The patch does not overwrite or delete that backup. The previous working version remains available for rollback.

---

## 1. One soft currency

The project now uses one internal currency:

```text
Монеты Разлома / RIFT_COINS
```

Legacy `spiritCoins` and the existing `yokai.currency.riftCoins` value are migrated into the new economy snapshot.

New players receive once:

```text
100 Монет Разлома
1 Онигири
1 Содовая
Учебная катана Ур. 1
```

The visible balance is mirrored to the old localStorage key so a UI rollback does not hide the previous balance.

---

## 2. Transaction ledger and idempotency

Added `src/economy.ts` with:

- economy state schema;
- source/sink transactions;
- unique idempotency keys;
- first-clear records;
- daily repeat counters;
- quest progress by daily/weekly cycle;
- weapon ownership and upgrade levels;
- Ramen coupons and Stars catalog definitions.

All implemented soft-currency changes now pass through `applyTransaction()`.

Current prototype mode stores the snapshot under:

```text
yokai.economy.global.v1
```

Production backend requirements are documented separately and use an append-only database ledger.

---

## 3. Rift economy

A completed Rift contains:

```text
9 ordinary yokai
1 boss
completion bonus
optional first-clear bonus
```

Configured totals before anti-farm:

| Tier | Repeat clear | First clear |
|---|---:|---:|
| Purple | 180 | 240 |
| Green | 288 | 384 |
| Blue | 468 | 624 |
| Red | 738 | 984 |

Rewards are now granted once when all 10 encounters are completed, rather than as loose client-side coin additions after every enemy.

The result card shows:

- ordinary-enemy reward;
- boss reward;
- completion bonus;
- first-clear bonus;
- anti-farm coefficient when applicable;
- final coin total.

---

## 4. Anti-farm

Two coefficients are applied:

### Rift level gap from highest unlocked Rift

```text
0–5 levels: 100%
6–10 levels: 75%
11+ levels: 50%
```

### Repeats of the same Rift per UTC day

```text
1–3 clears: 100%
4–6 clears: 85%
7+ clears: 70%
```

Both coefficients are visible in the reward calculation and stored in the transaction context.

---

## 5. Daily and weekly contracts

The Hunter House Preparation section now includes live economy contracts.

Daily:

```text
Defeat 5 yokai — 50 coins
Use Digital Seal — 50 coins
Close 1 Rift — 100 coins
```

Weekly objectives:

```text
Defeat 50 yokai
Close 5 Rifts
Use 3 different dishes
```

Weekly series reward:

```text
500 coins
```

Progress resets by daily/weekly cycle keys. Claims are idempotent and cannot be granted twice during the same cycle.

---

## 6. Ramen Shop integration

Existing food prices remain aligned with the economy specification:

```text
50–150 coins
```

Food purchases now create sink transactions.

The patch preserves:

- one meal slot;
- one drink slot;
- consumption only after confirmed Rift start;
- buffs for the whole 10-battle run;
- inventory persistence.

Ramen coupon support is added:

- coupons are entitlements/items, not another currency;
- coupon quantity is shown in the Ramen Shop when available;
- one coupon purchases one dish or drink without spending coins.

---

## 7. Functional weapon economy

The Hunter House Weapon section is now functional.

Catalog:

- Training Katana — free starter weapon;
- Neon Tanto — Common;
- Spirit Nodachi — Rare;
- Rift Edge — Epic;
- Oni Executioner — Legendary.

Implemented:

- purchase prices by rarity range;
- ownership state;
- equip action;
- upgrade levels 1–6;
- upgrade cost formula `base × 2^(level-1)`;
- before/after damage preview;
- coin sinks for purchase and upgrades;
- active weapon damage modifier in battle.

---

## 8. Balance visibility

The Rift Coin balance is visible in:

- HUB top HUD;
- Ramen Shop;
- Hunter House;
- weapon shop;
- Rift reward/result UI.

The currency is visually distinct from Stars.

---

## 9. Telegram Stars foundation

Added the server-ready Stars catalog:

```text
Starter Pack KOI — 49 XTR
3 Ramen coupons — 25 XTR
10 Ramen coupons — 69 XTR
KOI skin — 99 XTR
Hunter skin — 129 XTR
Hunter House theme — 149 XTR
Extra preset — 39 XTR
Season Pass — 299 XTR
KOI Club — 199 XTR / 30 days
```

Added `src/economy-api.ts` with the server API client contract and two modes:

- `server` when `VITE_API_BASE_URL` exists;
- `local-preview` for the current client-only prototype.

A real XTR payment cannot be safely completed only inside the Mini App source. The archive includes the required backend API contract and PostgreSQL reference schema for:

- Telegram initData validation;
- order creation;
- XTR invoice creation;
- pre-checkout handling;
- successful-payment grant;
- refunds;
- entitlement revocation;
- reconciliation.

No product is granted from the client-side `invoice_closed` event alone.

---

## 10. Analytics

Added `src/analytics.ts`.

Implemented event queue and optional server delivery for:

- economy source/sink;
- Rift started/completed;
- Ramen purchase;
- weapon purchase/upgrade/equip;
- quest reward claims;
- Stars checkout/payment lifecycle event types;
- KOI tutorial events.

Analytics failures never block gameplay.

---

## 11. Migration safety

The migration preserves:

- legacy Rift Coin balance;
- existing closed Rifts;
- existing food inventory;
- character data;
- Rift progress;
- KOI tutorial flags;
- existing visual assets and looping backgrounds.

Legacy closed Rifts are marked as already first-cleared, preventing duplicate first-clear rewards after installing the patch.

---

## 12. Files changed

```text
miniapp/src/App.tsx
miniapp/src/home.tsx
miniapp/src/ramen.tsx
miniapp/src/styles.css
```

## Files added

```text
miniapp/src/economy.ts
miniapp/src/economy-api.ts
miniapp/src/analytics.ts
miniapp/public/config/economy.v1.json
server-reference/economy-schema.sql
ECONOMY_BACKEND_API_CONTRACT.md
ROLLBACK_AND_BACKUP.md
VALIDATION_GLOBAL_ECONOMY_V1.md
```

---

## 13. Installation

Extract the patch into the project root:

```text
D:\yokai_exe_codex_ready
```

Allow file replacement.

Then install dependencies on the target operating system and build:

```bash
cd miniapp
npm install
npm run build
```

Do not copy an old `node_modules` directory between Windows and Linux.

---

## 14. Production boundary

This patch fully implements the economy in the current local prototype and adds the contracts needed for production.

Production deployment still requires connecting the provided API client to an actual backend and Telegram bot webhook. The client intentionally does not pretend to securely verify payments, calculate authoritative prices or grant paid entitlements by itself.
