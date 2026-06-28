import { useMemo, useRef, useState, type CSSProperties } from "react";
import { FOOD_ITEMS, foodById, type FoodInventory } from "./ramen";
import { playHomeUiClickSound } from "./sound";
import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  WEEKLY_META_REWARD,
  WEAPON_CATALOG,
  getCurrentQuestProgress,
  getWeaponDamage,
  getWeaponUpgradeCost,
  type EconomyState,
  weekKey,
  type QuestDefinition,
} from "./economy";

export type HomeQuestStatus = "ACTIVE" | "COMPLETED" | "CLAIMED";
export type HomeSection = "HOME" | "WEAPON" | "PREPARATION" | "BESTIARY" | "INVENTORY";

type HomeSafeNodeProps = {
  playerName: string;
  avatarUrl: string;
  level: number;
  levelXp: number;
  requiredXp: number;
  riftCoins: number;
  foodInventory: FoodInventory;
  preparedMealId: string | null;
  preparedDrinkId: string | null;
  firstRiftQuestStatus: HomeQuestStatus;
  activeRiftProgress: number;
  oniKills: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onBack: () => void;
  onClaimQuest: () => void;
  economy: EconomyState;
  onClaimEconomyQuest: (quest: QuestDefinition) => void;
  onClaimWeeklyReward: () => void;
  onBuyWeapon: (weaponId: string) => { ok: boolean; message: string };
  onUpgradeWeapon: (weaponId: string) => { ok: boolean; message: string };
  onEquipWeapon: (weaponId: string) => { ok: boolean; message: string };
};

const HOME_VIDEO = "/assets/video/home-safe-node-v1.mp4?v=1";
const HOME_POSTER = "/assets/video/home-safe-node-poster-v1.jpg?v=1";

type HomeButtonConfig = {
  id: Exclude<HomeSection, "HOME">;
  image: string;
  label: string;
  x: number;
  y: number;
  width: number;
  ratio: string;
};

// Coordinates are centered on the exact UI already embedded in the 1920×1080 home video.
// The PNG stays in the DOM as the approved reference asset, but remains visually hidden so
// it cannot create a second semi-transparent copy over the original button in the video.
const HOME_BUTTONS: HomeButtonConfig[] = [
  { id: "WEAPON", image: "/assets/ui/home-reference/weapon.png?v=1", label: "Оружие", x: 22.6, y: 36.3, width: 13.9, ratio: "184 / 73" },
  { id: "BESTIARY", image: "/assets/ui/home-reference/bestiary.png?v=1", label: "Бестиарий", x: 75.8, y: 32.6, width: 14.5, ratio: "196 / 80" },
  { id: "PREPARATION", image: "/assets/ui/home-reference/preparation.png?v=1", label: "Подготовка", x: 55.8, y: 73.9, width: 14.8, ratio: "187 / 73" },
  { id: "INVENTORY", image: "/assets/ui/home-reference/inventory.png?v=1", label: "Инвентарь", x: 89.5, y: 87.2, width: 14.2, ratio: "204 / 82" },
];

const INVENTORY_FILTERS = ["ВСЕ", "ОРУЖИЕ", "ЭКИПИРОВКА", "ЕДА", "НАПИТКИ", "РАСХОДНИКИ", "КВЕСТОВЫЕ"] as const;
type InventoryFilter = typeof INVENTORY_FILTERS[number];

export function HomeSafeNode(props: HomeSafeNodeProps) {
  const [section, setSection] = useState<HomeSection>("HOME");
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("ВСЕ");
  const [videoReady, setVideoReady] = useState(false);
  const [selectedWeaponId, setSelectedWeaponId] = useState(props.economy.activeWeaponId);
  const navigationBusyRef = useRef(false);

  const inventoryItems = useMemo(() => {
    return FOOD_ITEMS
      .filter((item) => (props.foodInventory[item.id] || 0) > 0)
      .filter((item) => {
        if (inventoryFilter === "ВСЕ") return true;
        if (inventoryFilter === "ЕДА") return item.category !== "DRINK";
        if (inventoryFilter === "НАПИТКИ") return item.category === "DRINK";
        return false;
      });
  }, [inventoryFilter, props.foodInventory]);

  const preparedMeal = foodById(props.preparedMealId);
  const preparedDrink = foodById(props.preparedDrinkId);
  const xpPercent = Math.max(0, Math.min(100, (props.levelXp / Math.max(1, props.requiredXp)) * 100));
  const selectedWeapon = WEAPON_CATALOG.find((weapon) => weapon.id === selectedWeaponId) || WEAPON_CATALOG[0];
  const selectedOwnedWeapon = props.economy.weapons[selectedWeapon.id] || null;
  const selectedWeaponLevel = selectedOwnedWeapon?.level || 1;
  const selectedWeaponDamage = getWeaponDamage(selectedWeapon.id, selectedWeaponLevel);
  const selectedWeaponNextDamage = getWeaponDamage(selectedWeapon.id, Math.min(6, selectedWeaponLevel + 1));
  const selectedWeaponUpgradeCost = getWeaponUpgradeCost(selectedWeapon.id, selectedWeaponLevel);
  const dailyCycle = new Date().toISOString().slice(0, 10);
  const currentWeek = weekKey();
  const weeklyComplete = WEEKLY_QUESTS.every((quest) => getCurrentQuestProgress(props.economy, quest).progress >= quest.target);
  const weeklyClaimed = props.economy.transactions.some((tx) => tx.idempotencyKey === `quest:weekly-meta:${currentWeek}`);

  function openHomeSection(nextSection: Exclude<HomeSection, "HOME">) {
    if (navigationBusyRef.current) return;
    navigationBusyRef.current = true;
    playHomeUiClickSound();
    window.setTimeout(() => {
      setSection(nextSection);
      navigationBusyRef.current = false;
    }, 90);
  }

  function exitHome() {
    if (navigationBusyRef.current) return;
    navigationBusyRef.current = true;
    playHomeUiClickSound();
    window.setTimeout(() => props.onBack(), 90);
  }

  return (
    <main className="homeSafeNodeScreen">
      <div className="homeAmbientBackdrop" style={{ backgroundImage: `url(${HOME_POSTER})` }} aria-hidden="true" />
      <section className="homeStageShell">
        <div className="homeStage">
          <img className="homePoster" src={HOME_POSTER} alt="" aria-hidden="true" />
          <video
            className={`homeVideo ${videoReady ? "ready" : ""}`}
            src={HOME_VIDEO}
            poster={HOME_POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onCanPlay={(event) => event.currentTarget.play().catch(() => {})}
            onPlaying={() => setVideoReady(true)}
            onError={() => setVideoReady(false)}
            aria-hidden="true"
          />

          <div className="homeProfileCard">
            <img src={props.avatarUrl} alt={props.playerName} />
            <div className="homeProfileCopy">
              <strong>{props.playerName}</strong>
              <span>Уровень {props.level}</span>
              <div className="homeXpTrack" aria-label={`Опыт ${props.levelXp} из ${props.requiredXp}`}><i style={{ width: `${xpPercent}%` }} /></div>
              <small>Опыт: {props.levelXp} / {props.requiredXp}</small>
            </div>
          </div>

          <div className="homeCoinsCard" aria-label={`Монеты разлома: ${props.riftCoins}`}>
            <span>◉</span><div><small>МОНЕТЫ РАЗЛОМА</small><strong>{props.riftCoins}</strong></div>
          </div>

          <div className="homeTopControls">
            <button type="button" onClick={props.onToggleSound} aria-label="Звук дома">{props.soundEnabled ? "🔊" : "🔇"}</button>
            <button type="button" className="homeExitButton" onClick={exitHome}>ВЫХОД</button>
          </div>

          <div className="homeInteractiveLayer" aria-label="Разделы дома охотника">
            {HOME_BUTTONS.map((button) => {
              const buttonStyle: CSSProperties = {
                left: `${button.x}%`,
                top: `${button.y}%`,
                width: `${button.width}%`,
                aspectRatio: button.ratio,
              };

              return (
                <button
                  type="button"
                  key={button.id}
                  className={`homeReferenceButton homeReferenceButton${button.id}`}
                  style={buttonStyle}
                  onClick={() => openHomeSection(button.id)}
                  aria-label={button.label}
                >
                  <img src={button.image} alt="" aria-hidden="true" draggable={false} />
                </button>
              );
            })}
          </div>

          {section !== "HOME" && (
            <div className="homePanelOverlay" role="dialog" aria-modal="true">
              <section className="homePanel">
                <header>
                  <div><small>YOKAI.EXE // HOME SAFE NODE</small><h1>{section === "WEAPON" ? "ОРУЖИЕ" : section === "BESTIARY" ? "БЕСТИАРИЙ" : section === "PREPARATION" ? "ПОДГОТОВКА" : "ИНВЕНТАРЬ"}</h1></div>
                  <button type="button" onClick={() => setSection("HOME")}>✕</button>
                </header>

                {section === "WEAPON" && (
                  <div className="homeWeaponEconomyView">
                    <aside className="homeWeaponCatalog">
                      <div className="homeWeaponCatalogHeader"><span>АРСЕНАЛ</span><b>◉ {props.riftCoins}</b></div>
                      {WEAPON_CATALOG.map((weapon) => {
                        const owned = props.economy.weapons[weapon.id];
                        const active = props.economy.activeWeaponId === weapon.id;
                        return (
                          <button
                            type="button"
                            key={weapon.id}
                            className={`${selectedWeaponId === weapon.id ? "selected" : ""} ${active ? "active" : ""}`}
                            onClick={() => setSelectedWeaponId(weapon.id)}
                          >
                            <span className={`weaponRarity rarity-${weapon.rarity.toLowerCase()}`}>{weapon.rarity}</span>
                            <strong>{weapon.name}</strong>
                            <small>{owned ? `Ур. ${owned.level} · Урон ${getWeaponDamage(weapon.id, owned.level)}` : `Цена ◉ ${weapon.purchasePrice}`}</small>
                            {active && <em>ЭКИПИРОВАНО</em>}
                          </button>
                        );
                      })}
                    </aside>
                    <article className="homeWeaponEconomyDetail">
                      <div className={`homeWeaponVisual rarity-${selectedWeapon.rarity.toLowerCase()}`}><span>刀</span></div>
                      <small>{selectedWeapon.rarity} // ОРУЖИЕ</small>
                      <h2>{selectedWeapon.name}</h2>
                      <p>{selectedWeapon.description}</p>
                      <dl>
                        <div><dt>Уровень</dt><dd>{selectedOwnedWeapon ? selectedWeaponLevel : "—"}</dd></div>
                        <div><dt>Урон</dt><dd>{selectedOwnedWeapon ? selectedWeaponDamage : selectedWeapon.baseDamage}</dd></div>
                        <div><dt>Статус</dt><dd>{props.economy.activeWeaponId === selectedWeapon.id ? "Активно" : selectedOwnedWeapon ? "Куплено" : "Не куплено"}</dd></div>
                      </dl>
                      {!selectedOwnedWeapon ? (
                        <button type="button" className="homeEconomyPrimary" onClick={() => props.onBuyWeapon(selectedWeapon.id)} disabled={props.riftCoins < selectedWeapon.purchasePrice}>
                          КУПИТЬ · ◉ {selectedWeapon.purchasePrice}
                        </button>
                      ) : (
                        <div className="homeWeaponActions">
                          <button type="button" onClick={() => props.onEquipWeapon(selectedWeapon.id)} disabled={props.economy.activeWeaponId === selectedWeapon.id}>ЭКИПИРОВАТЬ</button>
                          <button type="button" className="homeEconomyPrimary" onClick={() => props.onUpgradeWeapon(selectedWeapon.id)} disabled={selectedWeaponLevel >= 6 || props.riftCoins < selectedWeaponUpgradeCost}>
                            {selectedWeaponLevel >= 6 ? "МАКС. УРОВЕНЬ" : `УЛУЧШИТЬ ${selectedWeaponDamage} → ${selectedWeaponNextDamage} · ◉ ${selectedWeaponUpgradeCost}`}
                          </button>
                        </div>
                      )}
                    </article>
                  </div>
                )}

                {section === "BESTIARY" && (
                  <div className="homeBestiaryView">
                    <aside className="homeBestiaryList"><button type="button" className="active"><img src="/assets/creatures/oni_404/oni_404_queue_icon.png?v=queue2" alt="" /><span><strong>Oni-404</strong><small>Кибер-Oni · Ур. 1</small></span></button><button type="button" disabled><span className="unknownYokai">?</span><span><strong>НЕИЗВЕСТНО</strong><small>Запись заблокирована</small></span></button></aside>
                    <article className="homeBestiaryEntry">
                      <div className="homeBestiaryHero"><img src="/assets/creatures/oni_404/oni_404_rage_idle.png?v=rage1" alt="Oni-404" /><span>Побед: {props.oniKills}</span></div>
                      <h2>Oni-404</h2>
                      <p>Oni, заражённый энергией цифрового разлома. После получения большого количества урона входит в режим ярости.</p>
                      <div className="homeBestiaryStats"><span><small>ТИП</small><b>Кибер-Oni</b></span><span><small>УРОВЕНЬ</small><b>1</b></span><span><small>ЗДОРОВЬЕ</small><b>120 HP</b></span></div>
                      <div className="homeBestiarySection"><strong>АТАКИ</strong><p>Удар когтями · Сильный удар · Кровавый рывок · Оглушающий рёв</p></div>
                      <div className="homeBestiarySection rage"><strong>РЕЖИМ ЯРОСТИ</strong><p>Активируется при снижении HP ниже 50%. Oni усиливает урон и выполняет серию из трёх атак.</p></div>
                      <div className="homeBestiarySection"><strong>СЛАБОСТИ И СОПРОТИВЛЕНИЯ</strong><p>Слабость: цифровая печать · Сопротивление: оглушение</p></div>
                    </article>
                  </div>
                )}

                {section === "PREPARATION" && (
                  <div className="homePreparationEconomyView">
                    <section className="homePreparationMainColumn">
                      <article className={`homeQuestCard status-${props.firstRiftQuestStatus.toLowerCase()}`}>
                        <div className="homeQuestHeading"><span>ГЛАВНОЕ ЗАДАНИЕ</span><b>{props.firstRiftQuestStatus === "CLAIMED" ? "ВЫПОЛНЕНО" : props.firstRiftQuestStatus === "COMPLETED" ? "НАГРАДА ДОСТУПНА" : "АКТИВНО"}</b></div>
                        <h2>Закрыть первый разлом</h2>
                        <p>Победить 10 ёкаев за один заход.</p>
                        <div className="homeQuestProgress"><span><i style={{ width: `${Math.min(100, props.activeRiftProgress * 10)}%` }} /></span><b>{props.activeRiftProgress} / 10</b></div>
                        <div className="homeQuestRewards"><span><small>НАГРАДА</small><b>◉ 50 Монет Разлома</b></span><span><small>ОПЫТ</small><b>+50 XP</b></span></div>
                        {props.firstRiftQuestStatus === "COMPLETED" && <button type="button" onClick={props.onClaimQuest}>ПОЛУЧИТЬ НАГРАДУ</button>}
                        {props.firstRiftQuestStatus === "ACTIVE" && <small className="homeQuestHint">Прогресс текущего захода сбрасывается после поражения или выхода. Экономическая награда за закрытие начисляется отдельно.</small>}
                      </article>

                      <section className="homeContractsPanel">
                        <header><div><small>КОНТРАКТЫ KOI</small><h2>ЕЖЕДНЕВНЫЕ ЗАДАНИЯ</h2></div><span>{dailyCycle}</span></header>
                        <div className="homeContractList">
                          {DAILY_QUESTS.map((quest) => {
                            const questState = getCurrentQuestProgress(props.economy, quest);
                            const progress = questState.progress;
                            const claimed = questState.claimedCycle === dailyCycle;
                            const complete = progress >= quest.target;
                            return (
                              <article key={quest.id} className={`${complete ? "complete" : ""} ${claimed ? "claimed" : ""}`}>
                                <div><strong>{quest.title}</strong><small>{Math.min(progress, quest.target)} / {quest.target}</small></div>
                                <span>◉ {quest.rewardCoins}</span>
                                <button type="button" disabled={!complete || claimed} onClick={() => props.onClaimEconomyQuest(quest)}>{claimed ? "ПОЛУЧЕНО" : complete ? "ЗАБРАТЬ" : "В ПРОЦЕССЕ"}</button>
                              </article>
                            );
                          })}
                        </div>
                      </section>

                      <section className="homeContractsPanel weekly">
                        <header><div><small>НЕДЕЛЬНАЯ СЕРИЯ</small><h2>ПОДГОТОВКА ОХОТНИКА</h2></div><span>◉ {WEEKLY_META_REWARD}</span></header>
                        <div className="homeWeeklyObjectives">
                          {WEEKLY_QUESTS.map((quest) => {
                            const progress = getCurrentQuestProgress(props.economy, quest).progress;
                            return <div key={quest.id}><span>{quest.title}</span><b>{Math.min(progress, quest.target)} / {quest.target}</b></div>;
                          })}
                        </div>
                        <button type="button" className="homeEconomyPrimary" disabled={!weeklyComplete || weeklyClaimed} onClick={props.onClaimWeeklyReward}>{weeklyClaimed ? "НАГРАДА ПОЛУЧЕНА" : weeklyComplete ? `ПОЛУЧИТЬ ◉ ${WEEKLY_META_REWARD}` : "ВЫПОЛНИТЕ ВСЕ ЦЕЛИ"}</button>
                      </section>
                    </section>

                    <aside className="homePreparationSideColumn">
                      <div className="homePreparedFood">
                        <span>ПОДГОТОВКА ИЗ РАМЕННОЙ</span>
                        <div>{preparedMeal ? <img src={preparedMeal.imageUrl} alt="" /> : <em>🍱</em>}<p><small>БЛЮДО</small><strong>{preparedMeal?.name || "Не выбрано"}</strong><span>{preparedMeal?.effectLabel || "Выберите еду в раменной"}</span></p></div>
                        <div>{preparedDrink ? <img src={preparedDrink.imageUrl} alt="" /> : <em>🥤</em>}<p><small>НАПИТОК</small><strong>{preparedDrink?.name || "Не выбрано"}</strong><span>{preparedDrink?.effectLabel || "Выберите напиток в раменной"}</span></p></div>
                      </div>
                      <div className="homeEconomyLedgerSummary">
                        <span>ЭКОНОМИКА</span>
                        <strong>◉ {props.riftCoins}</strong>
                        <small>Транзакций: {props.economy.transactions.length}</small>
                        <small>Закрыто разломов: {Object.keys(props.economy.rifts).length}</small>
                      </div>
                    </aside>
                  </div>
                )}

                {section === "INVENTORY" && (
                  <div className="homeInventoryView">
                    <nav className="homeInventoryFilters">{INVENTORY_FILTERS.map((filter) => <button type="button" key={filter} className={inventoryFilter === filter ? "active" : ""} onClick={() => setInventoryFilter(filter)}>{filter}</button>)}</nav>
                    <div className="homeInventoryGrid">
                      {inventoryItems.length ? inventoryItems.map((item) => {
                        const prepared = props.preparedMealId === item.id || props.preparedDrinkId === item.id;
                        return <article key={item.id} className={prepared ? "prepared" : ""}><div><img src={item.imageUrl} alt={item.name} /><b>×{props.foodInventory[item.id] || 0}</b></div><h3>{item.name}</h3><p>{item.effectLabel}</p><small>{item.category === "DRINK" ? "НАПИТОК" : "ЕДА"}</small>{prepared && <span>ПОДГОТОВЛЕНО</span>}</article>;
                      }) : <div className="homeInventoryEmpty"><strong>В этой категории пока пусто</strong><span>Еда, купленная у Юрино, автоматически появится здесь.</span></div>}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
