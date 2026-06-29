from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import StrEnum
from math import floor
from typing import Iterable


class RunStatus(StrEnum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DEFEATED = "DEFEATED"
    ABANDONED = "ABANDONED"
    TECHNICAL_FAILURE = "TECHNICAL_FAILURE"


class ReservationStatus(StrEnum):
    RESERVED = "RESERVED"
    CONSUMED = "CONSUMED"
    RELEASED = "RELEASED"


@dataclass(frozen=True, slots=True)
class ConfigVersions:
    economy: str
    combat: str
    content: str


@dataclass(frozen=True, slots=True)
class RewardMultipliers:
    rift_of_day: float = 1.0
    anti_farm: float = 1.0
    event: float = 1.0

    def apply(self, base_reward: int) -> int:
        if base_reward < 0:
            raise ValueError("base_reward must be non-negative")
        if self.rift_of_day <= 0 or self.anti_farm <= 0 or self.event <= 0:
            raise ValueError("multipliers must be positive")
        # Mandatory V1.1 order: Rift of the Day -> anti-farm -> event -> floor.
        return floor(base_reward * self.rift_of_day * self.anti_farm * self.event)


@dataclass(frozen=True, slots=True)
class ConsumableReservation:
    reservation_id: str
    run_id: str
    item_id: str
    quantity: int
    status: ReservationStatus
    reserved_at: datetime
    activated_at: datetime | None = None
    released_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class OniReward:
    oni_index: int
    base_reward: int
    awarded_coins: int
    multipliers: RewardMultipliers
    idempotency_key: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class RiftRun:
    run_id: str
    player_id: str
    rift_id: int
    status: RunStatus
    pending_coins: int
    kills_count: int
    reset_period: str
    early_farm_attempt: int
    config_versions: ConfigVersions
    rift_of_day_multiplier: float
    event_multiplier: float
    reservations: tuple[ConsumableReservation, ...] = ()
    oni_rewards: tuple[OniReward, ...] = ()
    seal_activation_keys: frozenset[str] = frozenset()
    settled_coins: int = 0
    first_clear_coins: int = 0
    settlement_rate: float = 0.0
    settlement_idempotency_key: str | None = None
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    settled_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Settlement:
    run: RiftRun
    settled_coins: int
    first_clear_coins: int
    settlement_key: str
    requires_recovery: bool = False


@dataclass(frozen=True, slots=True)
class EconomyConfig:
    versions: ConfigVersions
    regular_oni_rewards: dict[str, int]
    boss_oni_rewards: dict[str, int]
    first_clear_rewards: dict[str, int]

    def tier(self, rift_id: int) -> str:
        if rift_id <= 10:
            return "purple"
        if rift_id <= 20:
            return "green"
        if rift_id <= 30:
            return "blue"
        return "red"


DEFAULT_CONFIG = EconomyConfig(
    versions=ConfigVersions("economy-1.1.0", "combat-1.1.0", "content-1.1.0"),
    regular_oni_rewards={"purple": 10, "green": 16, "blue": 26, "red": 41},
    boss_oni_rewards={"purple": 30, "green": 48, "blue": 78, "red": 123},
    first_clear_rewards={"purple": 60, "green": 96, "blue": 156, "red": 246},
)


def utc_cycle_key(now: datetime | None = None) -> str:
    value = now or datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).date().isoformat()


def early_farm_key(player_id: str, rift_id: int, reset_period: str) -> str:
    return f"{player_id}:{rift_id}:{reset_period}"


def start_run(
    *,
    player_id: str,
    run_id: str,
    rift_id: int,
    early_exit_count: int,
    consumable_item_ids: Iterable[str] = (),
    rift_of_day_multiplier: float = 1.0,
    event_multiplier: float = 1.0,
    config: EconomyConfig = DEFAULT_CONFIG,
    now: datetime | None = None,
) -> RiftRun:
    current = now or datetime.now(timezone.utc)
    reservations = tuple(
        ConsumableReservation(
            reservation_id=f"reservation:{player_id}:{run_id}:{item_id}",
            run_id=run_id,
            item_id=item_id,
            quantity=1,
            status=ReservationStatus.RESERVED,
            reserved_at=current,
        )
        for item_id in dict.fromkeys(item for item in consumable_item_ids if item)
    )
    return RiftRun(
        run_id=run_id,
        player_id=player_id,
        rift_id=rift_id,
        status=RunStatus.ACTIVE,
        pending_coins=0,
        kills_count=0,
        reset_period=utc_cycle_key(current),
        early_farm_attempt=early_exit_count + 1,
        config_versions=config.versions,
        rift_of_day_multiplier=rift_of_day_multiplier,
        event_multiplier=event_multiplier,
        reservations=reservations,
        started_at=current,
    )


def activate_reserved_consumables(run: RiftRun, now: datetime | None = None) -> RiftRun:
    if run.status is not RunStatus.ACTIVE:
        raise ValueError("only active runs can activate consumables")
    current = now or datetime.now(timezone.utc)
    reservations = tuple(
        replace(item, status=ReservationStatus.CONSUMED, activated_at=current)
        if item.status is ReservationStatus.RESERVED
        else item
        for item in run.reservations
    )
    return replace(run, reservations=reservations)


def activate_seal_talisman(run: RiftRun, action_id: str) -> tuple[RiftRun, str, bool]:
    if run.status is not RunStatus.ACTIVE:
        raise ValueError("seal can only be activated in an active run")
    key = f"seal:activate:{run.player_id}:{run.run_id}:{action_id}"
    if key in run.seal_activation_keys:
        return run, key, False
    return replace(run, seal_activation_keys=run.seal_activation_keys | {key}), key, True


def anti_farm_multiplier(run: RiftRun, oni_index: int) -> float:
    if run.early_farm_attempt >= 4 and oni_index <= 3:
        return 0.25
    return 1.0


def add_oni_reward(
    run: RiftRun,
    *,
    oni_index: int,
    is_boss: bool,
    config: EconomyConfig = DEFAULT_CONFIG,
    now: datetime | None = None,
) -> RiftRun:
    if run.status is not RunStatus.ACTIVE:
        raise ValueError("cannot reward a terminal run")
    if not 1 <= oni_index <= 10:
        raise ValueError("oni_index must be between 1 and 10")
    key = f"oni:reward:{run.player_id}:{run.run_id}:{oni_index}"
    if any(reward.idempotency_key == key for reward in run.oni_rewards):
        return run

    tier = config.tier(run.rift_id)
    base_reward = config.boss_oni_rewards[tier] if is_boss else config.regular_oni_rewards[tier]
    multipliers = RewardMultipliers(
        rift_of_day=run.rift_of_day_multiplier,
        anti_farm=anti_farm_multiplier(run, oni_index),
        event=run.event_multiplier,
    )
    awarded = multipliers.apply(base_reward)
    reward = OniReward(
        oni_index=oni_index,
        base_reward=base_reward,
        awarded_coins=awarded,
        multipliers=multipliers,
        idempotency_key=key,
        created_at=now or datetime.now(timezone.utc),
    )
    return replace(
        run,
        kills_count=max(run.kills_count, oni_index),
        pending_coins=run.pending_coins + awarded,
        oni_rewards=run.oni_rewards + (reward,),
    )


def settle_run(
    run: RiftRun,
    *,
    outcome: RunStatus,
    first_clear_eligible: bool,
    config: EconomyConfig = DEFAULT_CONFIG,
    now: datetime | None = None,
) -> Settlement:
    if outcome is RunStatus.ACTIVE:
        raise ValueError("ACTIVE is not a settlement outcome")
    if run.status is not RunStatus.ACTIVE:
        return Settlement(
            run=run,
            settled_coins=run.settled_coins,
            first_clear_coins=run.first_clear_coins,
            settlement_key=run.settlement_idempotency_key or f"rift:settle:{run.player_id}:{run.run_id}",
        )

    current = now or datetime.now(timezone.utc)
    if outcome is RunStatus.TECHNICAL_FAILURE:
        key = f"rift:technical-compensation:{run.player_id}:{run.run_id}"
        released = tuple(
            replace(item, status=ReservationStatus.RELEASED, released_at=current)
            if item.status is ReservationStatus.RESERVED
            else item
            for item in run.reservations
        )
        terminal = replace(
            run,
            status=outcome,
            settlement_idempotency_key=key,
            settled_at=current,
            reservations=released,
        )
        return Settlement(terminal, 0, 0, key, requires_recovery=True)

    rate = 0.5 if outcome is RunStatus.ABANDONED else 1.0
    settled_coins = floor(run.pending_coins * rate)
    first_clear_coins = 0
    if outcome is RunStatus.COMPLETED and first_clear_eligible:
        first_clear_coins = config.first_clear_rewards[config.tier(run.rift_id)]

    key = f"rift:settle:{run.player_id}:{run.run_id}"
    released = tuple(
        replace(item, status=ReservationStatus.RELEASED, released_at=current)
        if item.status is ReservationStatus.RESERVED
        else item
        for item in run.reservations
    )
    terminal = replace(
        run,
        status=outcome,
        settled_coins=settled_coins,
        first_clear_coins=first_clear_coins,
        settlement_rate=rate,
        settlement_idempotency_key=key,
        settled_at=current,
        reservations=released,
    )
    return Settlement(terminal, settled_coins, first_clear_coins, key)


def contract_claim_key(player_id: str, contract_id: str, cycle_key: str) -> str:
    return f"contract:claim:{player_id}:{contract_id}:{cycle_key}"
