from backend.economy_v1_1 import (
    RunStatus,
    RewardMultipliers,
    activate_reserved_consumables,
    add_oni_reward,
    contract_claim_key,
    settle_run,
    start_run,
)


def test_multiplier_order_finishes_with_floor() -> None:
    multipliers = RewardMultipliers(rift_of_day=1.5, anti_farm=0.25, event=1.1)
    assert multipliers.apply(10) == 4


def test_per_oni_rewards_accumulate_in_pending_coins() -> None:
    run = start_run(player_id="p1", run_id="r1", rift_id=1, early_exit_count=0)
    run = add_oni_reward(run, oni_index=1, is_boss=False)
    run = add_oni_reward(run, oni_index=2, is_boss=False)
    assert run.pending_coins == 20
    assert run.kills_count == 2


def test_duplicate_oni_reward_is_idempotent() -> None:
    run = start_run(player_id="p1", run_id="r1", rift_id=1, early_exit_count=0)
    first = add_oni_reward(run, oni_index=1, is_boss=False)
    duplicate = add_oni_reward(first, oni_index=1, is_boss=False)
    assert duplicate.pending_coins == first.pending_coins
    assert len(duplicate.oni_rewards) == 1


def test_completed_and_defeated_settle_100_percent() -> None:
    run = start_run(player_id="p1", run_id="completed", rift_id=1, early_exit_count=0)
    run = add_oni_reward(run, oni_index=1, is_boss=False)
    completed = settle_run(run, outcome=RunStatus.COMPLETED, first_clear_eligible=False)
    assert completed.settled_coins == run.pending_coins

    run = start_run(player_id="p1", run_id="defeated", rift_id=1, early_exit_count=0)
    run = add_oni_reward(run, oni_index=1, is_boss=False)
    defeated = settle_run(run, outcome=RunStatus.DEFEATED, first_clear_eligible=False)
    assert defeated.settled_coins == run.pending_coins


def test_abandoned_settles_half_rounded_down() -> None:
    run = start_run(
        player_id="p1",
        run_id="r1",
        rift_id=1,
        early_exit_count=0,
        rift_of_day_multiplier=1.1,
    )
    run = add_oni_reward(run, oni_index=1, is_boss=False)
    assert run.pending_coins == 11
    settlement = settle_run(run, outcome=RunStatus.ABANDONED, first_clear_eligible=False)
    assert settlement.settled_coins == 5


def test_first_clear_is_separate_from_pending_coins() -> None:
    run = start_run(player_id="p1", run_id="r1", rift_id=1, early_exit_count=0)
    run = add_oni_reward(run, oni_index=1, is_boss=False)
    settlement = settle_run(run, outcome=RunStatus.COMPLETED, first_clear_eligible=True)
    assert settlement.settled_coins == run.pending_coins
    assert settlement.first_clear_coins == 60


def test_fourth_early_farm_attempt_penalizes_only_oni_one_to_three() -> None:
    run = start_run(player_id="p1", run_id="r1", rift_id=1, early_exit_count=3)
    run = add_oni_reward(run, oni_index=1, is_boss=False)
    run = add_oni_reward(run, oni_index=4, is_boss=False)
    assert run.oni_rewards[0].multipliers.anti_farm == 0.25
    assert run.oni_rewards[1].multipliers.anti_farm == 1.0


def test_consumables_move_from_reserved_to_consumed() -> None:
    run = start_run(
        player_id="p1",
        run_id="r1",
        rift_id=1,
        early_exit_count=0,
        consumable_item_ids=["food-a", "drink-b"],
    )
    assert all(item.status == "RESERVED" for item in run.reservations)
    run = activate_reserved_consumables(run)
    assert all(item.status == "CONSUMED" for item in run.reservations)


def test_contract_claim_key_contains_player_contract_and_cycle() -> None:
    assert contract_claim_key("p1", "daily-1", "2026-06-28") == "contract:claim:p1:daily-1:2026-06-28"
