# Yokai.exe — Economy Backend API Contract V1

## Runtime modes

The Mini App now supports two economy modes:

- `server` — enabled when `VITE_API_BASE_URL` is configured;
- `local-preview` — deterministic localStorage fallback for current prototype builds.

Production must use the server as the source of truth. The client must never be trusted for prices, rewards, balances, payment results, first-clear flags or inventory grants.

## Authentication

### `POST /api/auth/telegram/init`

Request:

```json
{ "initData": "<Telegram.WebApp.initData>" }
```

Server requirements:

- validate Telegram `initData` HMAC;
- reject expired data;
- derive player identity from validated data only;
- never trust `initDataUnsafe` as authentication;
- create or resume the player session.

## Economy

### `GET /api/economy/balance`

Returns materialized balance, entitlements and economy version.

```json
{
  "playerId": "uuid",
  "riftCoins": 1280,
  "ramenCoupons": 3,
  "version": 42,
  "entitlements": {
    "koiClubActive": false,
    "seasonPassSeasonId": null,
    "starterPackPurchased": false
  }
}
```

### `GET /api/economy/catalog`

Returns live remote configuration:

- Ramen prices;
- weapon prices and upgrade formulas;
- Rift reward values;
- anti-farm coefficients;
- quest definitions;
- current experiment variant.

The client may cache the response, but the server must re-check every value during a write operation.

## Ramen shop

### `POST /api/ramen/purchase`

```json
{
  "itemId": "ramen_attack_01",
  "paymentType": "RIFT_COINS",
  "idempotencyKey": "ramen:player:item:client-action-id"
}
```

Alternative payment type:

```json
{
  "itemId": "ramen_attack_01",
  "paymentType": "RAMEN_COUPON",
  "idempotencyKey": "ramen-coupon:player:item:client-action-id"
}
```

Server transaction:

1. lock player balance/inventory row;
2. validate item and current catalog price;
3. validate sufficient coins or coupon quantity;
4. append sink/entitlement transaction;
5. update materialized balance and inventory;
6. commit atomically;
7. return the new authoritative state.

## Weapons

### `POST /api/weapons/purchase`

```json
{
  "weaponId": "neon_tanto",
  "idempotencyKey": "weapon:purchase:player:neon_tanto"
}
```

### `POST /api/weapons/upgrade`

```json
{
  "weaponId": "neon_tanto",
  "expectedCurrentLevel": 2,
  "idempotencyKey": "weapon:upgrade:player:neon_tanto:3"
}
```

The server calculates the price from the rarity config and current persisted level.

## Rift run

### `POST /api/rifts/start`

```json
{
  "riftId": 1,
  "mealItemId": "ramen_attack_01",
  "drinkItemId": "soda_ap_01",
  "weaponId": "training_katana",
  "idempotencyKey": "rift:start:player:client-run-id"
}
```

The server:

- validates Rift availability;
- reserves the loadout;
- consumes food only inside the successful start transaction;
- creates immutable food-buff and weapon snapshots;
- returns a unique `runId`.

### `POST /api/rifts/complete`

```json
{
  "runId": "run_uuid",
  "result": "SUCCESS",
  "defeatedCount": 10,
  "bossDefeated": true,
  "durationSec": 412
}
```

The server calculates:

- tier reward;
- first-clear bonus;
- low-level farming coefficient;
- same-Rift daily-repeat coefficient;
- quest progress;
- final award.

The server uses `riftclear:<playerId>:<runId>` as the idempotency key. Repeated completion requests return the original result and never grant currency twice.

## Quests

### `POST /api/quests/claim-daily`

```json
{ "questId": "daily_yokai_5", "cycleKey": "2026-06-28" }
```

### `POST /api/quests/claim-weekly`

```json
{ "cycleKey": "2026-W26" }
```

Claims are idempotent by player, quest and cycle.

## Telegram Stars

### `GET /api/payments/stars/catalog`

Returns active products and server-defined XTR prices.

### `POST /api/payments/stars/create-invoice`

The client sends only:

```json
{ "productId": "koi_skin_01" }
```

The server:

1. resolves the server price;
2. creates unique `orderId`;
3. creates an XTR invoice with `payload = orderId`;
4. returns `invoiceUrl` and `orderId`.

### `POST /api/telegram/webhook`

Required flow:

- answer `pre_checkout_query` within Telegram's deadline;
- on `successful_payment`, find order by payload;
- persist unique `telegram_payment_charge_id`;
- set order `PAID`;
- grant product in the same idempotent operation;
- append ledger/entitlement records;
- set order `GRANTED`.

`invoice_closed = paid` is only a client UX signal. It must not grant the product.

### `GET /api/payments/orders/:orderId`

Returns `CREATED`, `PENDING`, `PAID`, `GRANTED`, `CANCELLED`, `FAILED` or `REFUNDED`.

### Refund

Use Telegram `refundStarPayment`, then revoke reversible entitlements and append an audit record. Never silently change only the local inventory.

## Analytics

### `POST /api/analytics/events`

Accepts the event names implemented in `src/analytics.ts`.

Minimum server dashboards:

- faucet total;
- sink total;
- net flow;
- median balance;
- first Rift clear rate;
- food attach rate;
- weapon shop conversion;
- checkout fail rate;
- refund rate.
