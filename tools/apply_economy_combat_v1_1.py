from __future__ import annotations

import re
from pathlib import Path


APP = Path("miniapp/src/App.tsx")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def replace_regex(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 regex match, found {count}")
    return updated


def main() -> None:
    text = APP.read_text(encoding="utf-8")
    if "ECONOMY_COMBAT_V1_1_INTEGRATED" in text:
        print("App.tsx is already integrated")
        return

    text = replace_once(
        text,
        "  applyRiftCompletion,\n  applyTransaction,\n  calculateRiftReward,",
        "  activateRunConsumables,\n  activateSealTalisman,\n  applyTransaction,\n  recordOniReward,\n  releaseRunReservations,\n  settleRiftRun,\n  startRiftRun,",
        "economy imports",
    )

    text = replace_once(
        text,
        "  const riftCoins = economy.balance;\n  const economyRef = useRef<EconomyState>(economy);",
        "  const riftCoins = economy.balance;\n  const sealTalismans = economy.sealTalismans;\n  const economyRef = useRef<EconomyState>(economy);\n  // ECONOMY_COMBAT_V1_1_INTEGRATED",
        "economy derived state",
    )

    clear_food = '''  function clearFoodRun() {
    setActiveFoodSnapshot(null);
    setMochiUsedThisRun(false);
    mochiUsedRef.current = false;
    setPlayerHp((current) => Math.min(MAX_PLAYER_HP, current));
  }
'''
    settle_helper = clear_food + '''
  function settleCurrentRun(status: "DEFEATED" | "ABANDONED" | "TECHNICAL_FAILURE") {
    const current = economyRef.current;
    const run = current.activeRun;
    if (!run || run.status !== "ACTIVE") {
      return { state: current, applied: false, settledCoins: run?.settledCoins || 0, firstClearCoins: run?.firstClearCoins || 0, totalWalletGrant: (run?.settledCoins || 0) + (run?.firstClearCoins || 0) };
    }
    const result = settleRiftRun(current, run.runId, status);
    commitEconomy(result.state);
    if (result.applied) {
      setRewardSummary({
        xp: 0,
        coins: result.totalWalletGrant,
        levelUp: false,
        breakdown: {
          riftId: run.riftId,
          tier: getRiftTier(run.riftId),
          oniIndex: run.killsCount,
          isBoss: run.killsCount >= RIFT_ENCOUNTERS,
          baseReward: 0,
          riftOfDayMultiplier: run.riftOfDayMultiplier,
          antiFarmMultiplier: 1,
          eventMultiplier: run.eventMultiplier,
          awardedCoins: 0,
          pendingCoins: run.pendingCoins,
          settledCoins: result.settledCoins,
          settlementRate: status === "ABANDONED" ? 0.5 : 1,
          firstClearBonus: result.firstClearCoins,
          firstClear: result.firstClearCoins > 0,
          multiplierOrder: "RIFT_OF_DAY>ANTI_FARM>EVENT>FLOOR",
        },
      });
    }
    return result;
  }
'''
    text = replace_once(text, clear_food, settle_helper, "settlement helper")

    start_run = '''  function startRiftRunWithFood(usePreparedFood: boolean) {
    if (riftEntryPending || !selectedRiftAvailable) return;

    setRiftEntryPending(true);
    setRiftFoodError(null);

    const snapshot = usePreparedFood ? createFoodSnapshot() : null;
    if (usePreparedFood && !snapshot) {
      setRiftFoodError("В подготовленных слотах нет доступной еды. Купите предмет или войдите без еды.");
      setRiftEntryPending(false);
      return;
    }

    const runId = snapshot?.runId || `rift-${selectedRift}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const usedFoodIds = [snapshot?.mealItemId, snapshot?.drinkItemId].filter(Boolean) as string[];
    const playerId = String(telegramUser?.id || economyRef.current.playerId || "local-preview-player");
    let nextEconomy = economyRef.current;
    const started = startRiftRun(nextEconomy, {
      runId,
      playerId,
      riftId: selectedRift,
      consumableItemIds: usedFoodIds,
    });
    if (!started.ok) {
      setRiftFoodError(started.message || "Не удалось создать забег.");
      setRiftEntryPending(false);
      return;
    }
    nextEconomy = started.state;

    if (!consumeFoodSnapshot(snapshot)) {
      nextEconomy = releaseRunReservations(nextEconomy, runId).state;
      commitEconomy(nextEconomy);
      setRiftFoodError("Не удалось списать подготовленную еду. Проверьте инвентарь.");
      setRiftEntryPending(false);
      return;
    }
    nextEconomy = activateRunConsumables(nextEconomy, runId).state;

    if (usePreparedFood) {
      setFoodLoadout((current) => ({
        mealItemId: snapshot?.mealItemId && (foodInventory[snapshot.mealItemId] || 0) > 1 ? snapshot.mealItemId : null,
        drinkItemId: snapshot?.drinkItemId && (foodInventory[snapshot.drinkItemId] || 0) > 1 ? snapshot.drinkItemId : null,
      }));
    }

    withUiFeedback(() => {
      const usedMealIds = [snapshot?.mealItemId].filter(Boolean) as string[];
      if (usedMealIds.length) nextEconomy = recordFoodUsage(nextEconomy, usedMealIds);
      commitEconomy(nextEconomy);
      setActiveRiftRunId(runId);
      setActiveFoodSnapshot(snapshot ? { ...snapshot, runId } : null);
      setMochiUsedThisRun(false);
      setRiftDefeatedCount(0);
      setRiftRunActive(true);
      setRiftRunComplete(false);
      setRewardSummary(null);
      resetBattle(1, false, snapshot);
      setPendingFoodConfirm(false);
      setScreen("battle");
      trackGameEvent("rift_started", {
        rift_id: selectedRift,
        tier: selectedRiftTone,
        food_loadout: usedFoodIds,
        weapon_id: economyRef.current.activeWeaponId,
        economy_config_version: nextEconomy.activeRun?.configVersions.economy,
        combat_config_version: nextEconomy.activeRun?.configVersions.combat,
        content_config_version: nextEconomy.activeRun?.configVersions.content,
      });
      window.setTimeout(() => setRiftEntryPending(false), 0);
    });
  }
'''
    text = replace_regex(
        text,
        r"  function startRiftRunWithFood\(usePreparedFood: boolean\) \{.*?\n  \}\n\n  function continueRiftRun",
        start_run + "\n  function continueRiftRun",
        "start run integration",
    )

    abandon = '''  function abandonRiftRun() {
    withUiFeedback(() => {
      const settlement = settleCurrentRun("ABANDONED");
      setRiftDefeatedCount(0);
      setRiftRunActive(false);
      setActiveRiftRunId(null);
      setRiftRunComplete(false);
      clearFoodRun();
      setSurrenderOpen(false);
      setMenuOpen(false);
      setScreen("rifts");
      if (settlement.applied) showHubToast(`Забег покинут: в кошелёк переведено ${settlement.settledCoins} монет (50%).`);
    });
  }
'''
    text = replace_regex(
        text,
        r"  function abandonRiftRun\(\) \{.*?\n  \}\n\n  function completeRiftEncounter",
        abandon + "\n  function completeRiftEncounter",
        "abandon settlement",
    )

    complete = '''  function completeRiftEncounter(method: "defeated" | "sealed") {
    if (encounterResolvedRef.current) return;
    encounterResolvedRef.current = true;

    const nextCount = Math.min(RIFT_ENCOUNTERS, riftDefeatedCount + 1);
    const enemyXpReward = nextCount === RIFT_ENCOUNTERS ? 20 : 10;
    const levelBefore = getPlayerLevelProgress(playerXp).level;
    const levelAfter = getPlayerLevelProgress(playerXp + enemyXpReward).level;
    const runId = activeRiftRunId || economyRef.current.activeRun?.runId || `rift-${selectedRift}-${Date.now()}`;
    let nextEconomy = incrementQuestMetric(economyRef.current, "YOKAI_DEFEATED", 1);

    if (!nextEconomy.activeRun || nextEconomy.activeRun.runId !== runId || nextEconomy.activeRun.status !== "ACTIVE") {
      const fallbackStart = startRiftRun(nextEconomy, {
        runId,
        playerId: String(telegramUser?.id || nextEconomy.playerId || "local-preview-player"),
        riftId: selectedRift,
      });
      if (!fallbackStart.ok) {
        addLog(fallbackStart.message || "Сервер не подтвердил активный забег.");
        return;
      }
      nextEconomy = fallbackStart.state;
    }

    const oniReward = recordOniReward(nextEconomy, {
      runId,
      oniIndex: nextCount,
      isBoss: nextCount === RIFT_ENCOUNTERS,
    });
    if (!oniReward.breakdown) {
      addLog(oniReward.error || "Награда Oni не подтверждена.");
      return;
    }
    nextEconomy = oniReward.state;

    setRiftDefeatedCount(nextCount);
    setPlayerXp((current) => current + enemyXpReward);
    setOniKills((current) => current + 1);

    if (nextCount < RIFT_ENCOUNTERS) {
      commitEconomy(nextEconomy);
      setRiftRunComplete(false);
      setRewardSummary({ xp: enemyXpReward, coins: 0, levelUp: levelAfter > levelBefore, breakdown: oniReward.breakdown });
      const miso = getFoodBuff("POST_ENEMY_HEAL");
      if (miso) {
        const heal = Math.max(1, Math.round(effectiveMaxPlayerHp * miso.buffValue));
        setPlayerHp((current) => Math.min(effectiveMaxPlayerHp, current + heal));
        addLog(`Мисо-суп восстановил ${heal} HP между боями.`);
      }
      addLog(`Ёкай ${nextCount} из ${RIFT_ENCOUNTERS} ${method === "sealed" ? "запечатан" : "побеждён"}. +${oniReward.breakdown.awardedCoins} в pendingCoins. Всего ожидает: ${oniReward.breakdown.pendingCoins}.`);
      return;
    }

    const settlement = settleRiftRun(nextEconomy, runId, "COMPLETED");
    nextEconomy = settlement.state;
    const finalBreakdown = {
      ...oniReward.breakdown,
      pendingCoins: settlement.pendingCoins || oniReward.breakdown.pendingCoins,
      settledCoins: settlement.settledCoins,
      settlementRate: 1,
      firstClearBonus: settlement.firstClearCoins,
      firstClear: settlement.firstClearCoins > 0,
    };
    commitEconomy(nextEconomy);
    setClosedRifts((current) => current.includes(selectedRift) ? current : [...current, selectedRift].sort((a, b) => a - b));
    if (selectedRift === 1 && firstRiftQuestStatus === "ACTIVE") setFirstRiftQuestStatus("COMPLETED");
    setRiftRunComplete(true);
    setRiftRunActive(false);
    setActiveRiftRunId(null);
    setRewardSummary({ xp: enemyXpReward, coins: settlement.totalWalletGrant, levelUp: levelAfter > levelBefore, breakdown: finalBreakdown });
    clearFoodRun();
    addLog(`Разлом ${selectedRift} закрыт. Из pendingCoins переведено ${settlement.settledCoins}; First Clear отдельно: ${settlement.firstClearCoins}.`);
    trackGameEvent("rift_completed", {
      rift_id: selectedRift,
      tier: oniReward.breakdown.tier,
      result: "COMPLETED",
      oni_count: RIFT_ENCOUNTERS,
      pending_coins: finalBreakdown.pendingCoins,
      settled_coins: settlement.settledCoins,
      first_clear_coins: settlement.firstClearCoins,
    });
  }
'''
    text = replace_regex(
        text,
        r"  function completeRiftEncounter\(method: \"defeated\" \| \"sealed\"\) \{.*?\n  \}\n\n  function claimFirstRiftQuestReward",
        complete + "\n  function claimFirstRiftQuestReward",
        "per-Oni rewards and completion settlement",
    )

    seal = '''  function sealRift() {
    const cost = 3;
    setSelectedAction("seal");
    setTargetSelected(true);
    if (sealBlocked) {
      triggerApError("Сначала ослабь Oni-404");
      return;
    }
    if (economyRef.current.sealTalismans < 1) {
      triggerApError("Нет талисманов печати");
      return;
    }
    if (!beginPlayerAction("seal", cost)) return;

    const runId = activeRiftRunId || economyRef.current.activeRun?.runId;
    if (!runId) {
      setAp((current) => Math.min(effectiveMaxAp, current + cost));
      triggerApError("Активный забег не найден");
      return;
    }
    const actionId = `seal-${runId}-${round}-${Date.now()}`;
    const activation = activateSealTalisman(economyRef.current, runId, actionId);
    if (!activation.ok) {
      setAp((current) => Math.min(effectiveMaxAp, current + cost));
      triggerApError(activation.message || "Талисман не активирован");
      return;
    }

    setFocus((current) => clamp(current - 12, 0, MAX_FOCUS));
    playSealSound();
    hapticImpact("medium");
    addLog(`${playerName}: талисман печати списан при активации. Шанс успеха ${sealChance}%. -${cost} AP`);
    commitEconomy(incrementQuestMetric(activation.state, "SEAL_USED", 1));

    window.setTimeout(() => {
      const success = randomInt(1, 100) <= sealChance;
      if (success) {
        showOniPopup("ЗАПЕЧАТАН");
        setPhase("SEALED");
        setActionLabel("Ёкай запечатан");
        setSprite("death");
        hapticNotify("success");
        completeRiftEncounter("sealed");
        addLog("Печать сработала. Oni-404 добавлен в коллекцию духов.");
        return;
      }

      showOniPopup("ПЕЧАТЬ СОРВАНА");
      hapticNotify("warning");
      addLog("Oni-404 вырвался из печати. Талисман и AP уже потрачены.");
      finishPlayerAction(980);
    }, scaledDelay(720));
  }
'''
    text = replace_regex(
        text,
        r"  function sealRift\(\) \{.*?\n  \}\n\n  function summonSumibito",
        seal + "\n  function summonSumibito",
        "seal talisman activation",
    )

    text = text.replace(
        'subtitle={sealBlocked ? "Ослабь противника" : `Шанс ${sealChance}%`}',
        'subtitle={economy.sealTalismans < 1 ? "Нет талисманов" : sealBlocked ? "Ослабь противника" : `Шанс ${sealChance}% · талисманы ${sealTalismans}`}',
    )

    text = text.replace(
        "              clearFoodRun();\n              addLog(\"Охотник пал под серией яростных ударов Oni-404.\");",
        "              settleCurrentRun(\"DEFEATED\");\n              clearFoodRun();\n              addLog(\"Охотник пал под серией яростных ударов Oni-404. pendingCoins переведены в кошелёк на 100%.\");",
    )
    text = text.replace(
        "              clearFoodRun();\n              addLog(\"Лимит раундов исчерпан. Разлом стал нестабильным.\");",
        "              settleCurrentRun(\"DEFEATED\");\n              clearFoodRun();\n              addLog(\"Лимит раундов исчерпан. pendingCoins переведены в кошелёк на 100%.\");",
    )
    text = text.replace(
        "          clearFoodRun();\n          addLog(\"Охотник пал. Разлом остался открытым.\");",
        "          settleCurrentRun(\"DEFEATED\");\n          clearFoodRun();\n          addLog(\"Охотник пал. pendingCoins переведены в кошелёк на 100%.\");",
    )

    text = text.replace(
        '<p>Прогресс текущего захода будет сброшен до 0/10.</p>',
        '<p>Забег завершится как ABANDONED. В кошелёк будет переведено 50% накопленных pendingCoins.</p>',
    )

    old_rows = '''                <div><span>9 обычных ёкаев</span><b>+{rewardSummary.breakdown.regularReward}</b></div>
                <div><span>Босс</span><b>+{rewardSummary.breakdown.bossReward}</b></div>
                <div><span>Полное закрытие</span><b>+{rewardSummary.breakdown.completionBonus}</b></div>
                {rewardSummary.breakdown.firstClearBonus > 0 && <div><span>Первое закрытие</span><b>+{rewardSummary.breakdown.firstClearBonus}</b></div>}
                {rewardSummary.breakdown.totalCoefficient < 1 && <div><span>Коэффициент антифарма</span><b>×{rewardSummary.breakdown.totalCoefficient.toFixed(2)}</b></div>}'''
    new_rows = '''                <div><span>Накоплено в pendingCoins</span><b>+{rewardSummary.breakdown.pendingCoins}</b></div>
                <div><span>Переведено в кошелёк</span><b>{Math.round(rewardSummary.breakdown.settlementRate * 100)}% · +{rewardSummary.breakdown.settledCoins}</b></div>
                <div><span>Последний Oni</span><b>+{rewardSummary.breakdown.awardedCoins}</b></div>
                {rewardSummary.breakdown.firstClearBonus > 0 && <div><span>First Clear отдельно</span><b>+{rewardSummary.breakdown.firstClearBonus}</b></div>}
                {(rewardSummary.breakdown.riftOfDayMultiplier !== 1 || rewardSummary.breakdown.antiFarmMultiplier !== 1 || rewardSummary.breakdown.eventMultiplier !== 1) && <div><span>Разлом дня → anti-farm → событие</span><b>×{rewardSummary.breakdown.riftOfDayMultiplier.toFixed(2)} → ×{rewardSummary.breakdown.antiFarmMultiplier.toFixed(2)} → ×{rewardSummary.breakdown.eventMultiplier.toFixed(2)}</b></div>}'''
    count = text.count(old_rows)
    if count != 2:
        raise RuntimeError(f"reward rows: expected 2 matches, found {count}")
    text = text.replace(old_rows, new_rows)

    text = text.replace(
        '`Осталось противников: ${RIFT_ENCOUNTERS - riftDefeatedCount}`',
        '`Осталось противников: ${RIFT_ENCOUNTERS - riftDefeatedCount} · pendingCoins: ${rewardSummary?.breakdown?.pendingCoins || economy.activeRun?.pendingCoins || 0}`',
    )

    text = replace_once(
        text,
        '''              <small>Прогресс {riftDefeatedCount}/{RIFT_ENCOUNTERS} будет сброшен.</small>
              <button onClick={restartRiftRun}>НАЧАТЬ ЗАНОВО — 0/10</button>''',
        '''              <small>DEFEATED переводит 100% pendingCoins в кошелёк: +{rewardSummary?.breakdown?.settledCoins || 0}.</small>
              <button onClick={restartRiftRun}>НАЧАТЬ НОВЫЙ ЗАБЕГ — 0/10</button>''',
        "defeat result",
    )

    APP.write_text(text, encoding="utf-8")
    print("Integrated Global Economy & Combat V1.1 into App.tsx")


if __name__ == "__main__":
    main()
