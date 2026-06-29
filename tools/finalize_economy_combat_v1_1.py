from __future__ import annotations

import re
from pathlib import Path


APP = Path("miniapp/src/App.tsx")


def main() -> None:
    text = APP.read_text(encoding="utf-8")
    if "ECONOMY_COMBAT_V1_1_INTEGRATED" not in text:
        raise RuntimeError("base V1.1 integration marker is missing")

    # The rift selection screen still uses the pure preview helper. V1.1 keeps
    # this helper read-only; omitting its import causes a render-time ReferenceError
    # and leaves the Mini App on a black screen.
    if "  calculateRiftReward,\n" not in text:
        text = text.replace(
            "  claimWeeklyMetaReward,\n",
            "  calculateRiftReward,\n  claimWeeklyMetaReward,\n",
            1,
        )

    if "  getRiftTier,\n" not in text:
        text = text.replace("  getWeaponDefinition,\n", "  getRiftTier,\n  getWeaponDefinition,\n", 1)

    restart_pattern = r"  function restartRiftRun\(\) \{.*?\n  \}\n\n  function abandonRiftRun"
    restart_replacement = '''  function restartRiftRun() {
    withUiFeedback(() => {
      if (economyRef.current.activeRun?.status === "ACTIVE") settleCurrentRun("DEFEATED");
      const runId = `rift-${selectedRift}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const started = startRiftRun(economyRef.current, {
        runId,
        playerId: String(telegramUser?.id || economyRef.current.playerId || "local-preview-player"),
        riftId: selectedRift,
      });
      if (!started.ok) {
        showHubToast(started.message || "Не удалось начать новый забег.");
        return;
      }
      commitEconomy(started.state);
      setRiftDefeatedCount(0);
      setRiftRunActive(true);
      setActiveRiftRunId(runId);
      setRiftRunComplete(false);
      setRewardSummary(null);
      clearFoodRun();
      resetBattle(1, false, null);
    });
  }

  function abandonRiftRun'''
    text, count = re.subn(restart_pattern, restart_replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"restartRiftRun patch expected 1 match, found {count}")

    old_back = '''      if (screen === "battle") {
        setRiftDefeatedCount(0);
        setRiftRunActive(false);
        setRiftRunComplete(false);
        setRewardSummary(null);
        clearFoodRun();
      }'''
    new_back = '''      if (screen === "battle") {
        settleCurrentRun("ABANDONED");
        setRiftDefeatedCount(0);
        setRiftRunActive(false);
        setRiftRunComplete(false);
        clearFoodRun();
      }'''
    if old_back in text:
        text = text.replace(old_back, new_back, 1)

    APP.write_text(text, encoding="utf-8")
    print("Finalized V1.1 run lifecycle integration")


if __name__ == "__main__":
    main()
