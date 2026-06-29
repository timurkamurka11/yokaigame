# Yokai.exe — Master GDD: Global Economy & Combat Integration V1.1

Status: **FINAL / AUTHORITATIVE**  
Effective date: **2026-06-28**  
Config family: `economy/combat/content`  
Reset timezone: **UTC**

## 1. Precedence

This document is the authoritative design source for Global Economy & Combat Integration V1.1.

Precedence, from highest to lowest:

1. live server configs (`economy`, `combat`, `content`);
2. this Master GDD;
3. database migrations and persisted snapshots;
4. API contracts;
5. implementation notes and review documents;
6. Global Economy V1 and all older documents.

When an older document conflicts with V1.1, the V1.1 rule replaces it. Older files remain reference material only.

## 2. Server authority

The client is never authoritative for:

- run outcome;
- `pendingCoins`;
- Oni reward value;
- reward multipliers;
- wallet settlement;
- First Clear state;
- contract completion or reward claims;
- consumable reservation or consumption;
- active config versions.

Client requests describe intent and combat actions. The server validates actions, advances the run, calculates rewards and returns the authoritative snapshot.

Local preview mode may simulate the same state machine for development, but it is not a production trust boundary.

## 3. Rift run state

Every Rift attempt creates one persistent run with a unique `runId`.

Required run fields:

```text
runId
playerId
riftId
status
killsCount
pendingCoins
resetPeriod
economyConfigVersion
combatConfigVersion
contentConfigVersion
riftOfDayMultiplier
antiFarmContext
eventMultiplier
reservedConsumables
startedAt
settledAt
settlementIdempotencyKey
```

Allowed terminal outcomes:

```text
COMPLETED
DEFEATED
ABANDONED
TECHNICAL_FAILURE
```

An active run cannot be settled more than once.

## 4. Oni rewards and pendingCoins

Every server-confirmed Oni defeat produces an Oni reward. The reward is added only to:

```text
run.pendingCoins
```

It is not added directly to the player wallet.

There is no separate completion bonus in V1.1. Any V1 field, UI row, config value or calculation named `completionBonus` / `completion` must be removed from active logic.

## 5. Multiplier order

For each Oni, the server calculates the reward in this exact order:

```text
floor(baseReward
  × riftOfDayMultiplier
  × antiFarmMultiplier
  × eventMultiplier)
```

Rules:

1. Rift of the Day multiplier is applied first.
2. Anti-farm multiplier is applied second.
3. Event multiplier is applied third.
4. Rounding down happens once, after all multipliers.
5. The client does not send any multiplier or final reward value.

First Clear, tasks and contracts are calculated separately and are never included inside the Oni multiplier chain.

## 6. Settlement by outcome

Wallet settlement is based on the final authoritative `run.pendingCoins`:

| Outcome | Wallet transfer |
|---|---:|
| `COMPLETED` | 100% |
| `DEFEATED` | 100% |
| `ABANDONED` | 50%, rounded down |
| `TECHNICAL_FAILURE` | server recovery or compensation flow |

Settlement must be atomic and idempotent.

Recommended settlement key:

```text
rift:settle:<playerId>:<runId>
```

Repeated requests return the original settlement result and never create another wallet transaction.

`COMPLETED` updates Rift completion and First Clear eligibility. `DEFEATED` and `ABANDONED` do not mark the Rift as completed.

## 7. First Clear

First Clear is a separate source transaction.

Recommended key:

```text
rift:first-clear:<playerId>:<riftId>
```

First Clear is granted only after the server commits a valid `COMPLETED` result and confirms that the player has not previously completed that Rift.

It is not multiplied by Rift of the Day, anti-farm or event multipliers.

## 8. Early-farm protection

Early-farm tracking key:

```text
playerId + riftId + resetPeriod
```

`resetPeriod` is the UTC daily cycle beginning at `00:00 UTC`.

An early exit is a terminal `DEFEATED` or `ABANDONED` run with:

```text
killsCount <= 3
```

Rules:

- the first 3 attempts in the reset period have no early-farm penalty;
- from attempt 4 onward, Oni 1–3 use `antiFarmMultiplier = 0.25`;
- Oni 4–10 use `antiFarmMultiplier = 1.0`;
- a full `COMPLETED` Rift clears the early-farm counter for that player and Rift;
- all remaining counters expire at `00:00 UTC`.

Older level-gap and same-Rift repeat coefficients from Global Economy V1 are not active V1.1 rules.

## 9. Consumable reservation

Consumables use explicit states:

```text
AVAILABLE -> RESERVED -> CONSUMED
                    \-> RELEASED
```

Reservation requirements:

- reservation happens inside the successful run-start transaction;
- a unit reserved by one active run cannot be reserved by another run;
- the run snapshot stores the reserved item IDs and quantities;
- activation consumes the corresponding reservation atomically;
- cancellation before activation releases the reservation;
- terminal recovery handles remaining reservations deterministically.

Inventory quantity and reservations must be locked during run start and consumption.

## 10. Seal talisman

A seal talisman is consumed immediately when the seal action is activated, before the success roll is resolved.

A failed seal does not return the talisman.

Recommended activation key:

```text
seal:activate:<playerId>:<runId>:<actionId>
```

Repeating the same action request returns the original result and never consumes a second talisman.

## 11. Config snapshots

At run creation, the server stores immutable versions:

```text
economyConfigVersion
combatConfigVersion
contentConfigVersion
```

A run continues using its captured versions even if live configs change while the run is active.

Live server configs take precedence over migration defaults, client constants and API examples.

## 12. Daily systems

All daily systems reset strictly at:

```text
00:00 UTC
```

This includes at minimum:

- Rift of the Day;
- early-farm periods;
- daily tasks;
- daily contracts;
- daily claim limits;
- any daily event counters.

Clients may display local time, but cycle keys and eligibility are generated by the server in UTC.

## 13. Contracts and claims

Contract rewards are separate from `pendingCoins` and Oni rewards.

Every claim requires a globally unique idempotency key containing the player, contract and cycle.

Recommended key:

```text
contract:claim:<playerId>:<contractId>:<cycleKey>
```

The claim transaction, wallet grant and claimed state are committed atomically.

## 14. Technical failure

`TECHNICAL_FAILURE` is not treated as a voluntary abandonment.

The server must use a deterministic recovery policy based on persisted run actions and snapshots. The result may restore the run or create an auditable compensation transaction. It must not silently discard earned `pendingCoins` or duplicate rewards.

Recommended compensation key:

```text
rift:technical-compensation:<playerId>:<runId>
```

## 15. Required replacement of V1 conflicts

The V1.1 implementation must replace, not layer over, conflicting V1 behavior involving:

- completion bonus;
- Rift reward totals;
- anti-farm rules;
- task and contract claim keys;
- Stars catalog authority;
- weapon price authority;
- Rift start and settlement logic;
- client-calculated results or rewards.

Numeric catalog values not defined by this document must come from versioned server config. They must not be inferred from obsolete V1 documents.

## 16. Audit invariants

The following invariants must always hold:

```text
wallet grant for one run <= one normal settlement + one eligible First Clear grant
pendingCoins never decreases before terminal settlement
one terminal settlement per run
one consumable unit cannot be RESERVED by two active runs
one seal activation cannot consume two talismans
all reward transactions have unique idempotency keys
all daily cycle keys are UTC-derived
all run calculations use captured config versions
```
