# Validation — Global Economy & Monetization Foundation V1

## Static TypeScript validation

Command:

```bash
./node_modules/.bin/tsc --noEmit
```

Result:

```text
PASS
```

## Economy-domain executable validation

Validated with an emitted CommonJS copy of `src/economy.ts` and Node assertions.

Covered:

- new-player starting balance = 100;
- first Purple Rift reward = 240;
- repeat Purple Rift reward = 180;
- duplicate run completion grants nothing;
- low-level farming coefficient = 0.5 at a gap above 10;
- weapon purchase subtracts the configured price;
- weapon upgrade increments level and subtracts cost;
- daily quest grants once;
- repeated daily claim is blocked.

Result:

```text
ECONOMY_VALIDATION_OK
```

## Full Vite build in this container

TypeScript succeeds. Vite/Rollup cannot complete in this Linux container because the existing project dependency folder contains Windows-native optional packages:

```text
@rollup/rollup-win32-x64-gnu
@rollup/rollup-win32-x64-msvc
```

The Linux package `@rollup/rollup-linux-x64-gnu` is absent. This is an environment/dependency issue, not a TypeScript error in the patch.

On the user's Windows target, run a clean platform-local install:

```bash
rmdir /s /q node_modules
npm install
npm run build
```

## Manual acceptance checklist

- Existing player retains balance and closed Rifts.
- New player starts with 100 coins, Онигири and Soda.
- HUB shows Rift Coin balance.
- Ramen purchase decreases coins once and adds one inventory item.
- Coupon purchase decreases coupon quantity without decreasing coins.
- Rift 1 first clear grants 240 before optional achievement reward.
- Rift 1 repeat grants 180 before anti-farm reductions.
- Result card shows reward breakdown.
- Daily quests update from battle actions.
- Weekly different-food objective counts unique meal items, not drinks.
- Weapon purchase and upgrade alter balance once.
- Equipped weapon changes battle damage.
- Reopening the app restores economy state.
