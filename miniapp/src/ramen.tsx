import { useEffect, useMemo, useRef, useState } from "react";
import { playRamenDialogueSound, playRamenGoodbyeSound, playRamenGreetingSound, stopRamenSound } from "./sound";

export type FoodCategory = "MAIN" | "DRINK" | "SNACK" | "DESSERT";
export type BuffTrigger = "PASSIVE" | "RIFT_START" | "BATTLE_START" | "ENEMY_DEFEATED" | "SEAL_ATTEMPT" | "LETHAL_DAMAGE";
export type FoodBuffId =
  | "MAX_HP_PERCENT"
  | "ATTACK_PERCENT"
  | "START_AP"
  | "CRIT_CHANCE"
  | "DAMAGE_REDUCTION"
  | "POST_ENEMY_HEAL"
  | "STATUS_RESISTANCE"
  | "SEAL_CHANCE"
  | "SPEED_PERCENT"
  | "LETHAL_SAVE";

export type FoodItem = {
  id: string;
  name: string;
  description: string;
  category: FoodCategory;
  price: number;
  imageUrl: string;
  buffId: FoodBuffId;
  buffValue: number;
  buffTrigger: BuffTrigger;
  effectLabel: string;
  sortOrder: number;
};

export type FoodInventory = Record<string, number>;
export type FoodLoadout = { mealItemId: string | null; drinkItemId: string | null };
export type ActiveFoodBuff = {
  itemId: string;
  name: string;
  imageUrl: string;
  buffId: FoodBuffId;
  buffValue: number;
  trigger: BuffTrigger;
  effectLabel: string;
  category: FoodCategory;
  consumed?: boolean;
};
export type RiftFoodBuffSnapshot = {
  runId: string;
  mealItemId: string | null;
  drinkItemId: string | null;
  buffs: ActiveFoodBuff[];
  consumed: boolean;
  createdAt: string;
};

export const FOOD_ITEMS: FoodItem[] = [
  {
    id: "onigiri_hp_01",
    name: "Онигири",
    description: "Рисовый треугольник с печатью защиты. Даёт запас сил перед долгим заходом.",
    category: "MAIN",
    price: 50,
    imageUrl: "/assets/food/onigiri.svg?v=1",
    buffId: "MAX_HP_PERCENT",
    buffValue: 0.1,
    buffTrigger: "PASSIVE",
    effectLabel: "Максимальное HP +10%",
    sortOrder: 1,
  },
  {
    id: "ramen_attack_01",
    name: "Рамен",
    description: "Горячий бульон усиливает боевой дух охотника на весь забег.",
    category: "MAIN",
    price: 120,
    imageUrl: "/assets/food/ramen.svg?v=1",
    buffId: "ATTACK_PERCENT",
    buffValue: 0.1,
    buffTrigger: "PASSIVE",
    effectLabel: "Урон +10%",
    sortOrder: 2,
  },
  {
    id: "soda_ap_01",
    name: "Содовая",
    description: "Газированный напиток с частицами цифровых духов.",
    category: "DRINK",
    price: 60,
    imageUrl: "/assets/food/soda.svg?v=1",
    buffId: "START_AP",
    buffValue: 1,
    buffTrigger: "BATTLE_START",
    effectLabel: "+1 AP в начале боя",
    sortOrder: 3,
  },
  {
    id: "taiyaki_crit_01",
    name: "Таяки",
    description: "Сладкая выпечка в форме рыбы. Обостряет чувство момента.",
    category: "DESSERT",
    price: 80,
    imageUrl: "/assets/food/taiyaki.svg?v=1",
    buffId: "CRIT_CHANCE",
    buffValue: 0.1,
    buffTrigger: "PASSIVE",
    effectLabel: "Критический шанс +10%",
    sortOrder: 4,
  },
  {
    id: "katsu_defense_01",
    name: "Кацу-карри",
    description: "Плотное блюдо для охотников, которым предстоит выдержать тяжёлые атаки.",
    category: "MAIN",
    price: 150,
    imageUrl: "/assets/food/katsu-curry.svg?v=1",
    buffId: "DAMAGE_REDUCTION",
    buffValue: 0.15,
    buffTrigger: "PASSIVE",
    effectLabel: "Входящий урон −15%",
    sortOrder: 5,
  },
  {
    id: "miso_heal_01",
    name: "Мисо-суп",
    description: "Тёплый суп восстанавливает силы между последовательными боями.",
    category: "MAIN",
    price: 70,
    imageUrl: "/assets/food/miso-soup.svg?v=1",
    buffId: "POST_ENEMY_HEAL",
    buffValue: 0.05,
    buffTrigger: "ENEMY_DEFEATED",
    effectLabel: "+5% HP после каждого Oni",
    sortOrder: 6,
  },
  {
    id: "edamame_resist_01",
    name: "Эдамамэ",
    description: "Лёгкая закуска стабилизирует цифровую оболочку охотника.",
    category: "SNACK",
    price: 50,
    imageUrl: "/assets/food/edamame.svg?v=1",
    buffId: "STATUS_RESISTANCE",
    buffValue: 0.2,
    buffTrigger: "PASSIVE",
    effectLabel: "Сопротивление эффектам +20%",
    sortOrder: 7,
  },
  {
    id: "dango_seal_01",
    name: "Данго",
    description: "Сладкие шарики, покрытые символами цифровой печати.",
    category: "DESSERT",
    price: 90,
    imageUrl: "/assets/food/dango.svg?v=1",
    buffId: "SEAL_CHANCE",
    buffValue: 0.1,
    buffTrigger: "SEAL_ATTEMPT",
    effectLabel: "Шанс печати +10%",
    sortOrder: 8,
  },
  {
    id: "yakisoba_speed_01",
    name: "Якисоба",
    description: "Жареная лапша ускоряет реакцию и помогает начать бой первым.",
    category: "MAIN",
    price: 110,
    imageUrl: "/assets/food/yakisoba.svg?v=1",
    buffId: "SPEED_PERCENT",
    buffValue: 0.15,
    buffTrigger: "BATTLE_START",
    effectLabel: "Ускорение в начале боя",
    sortOrder: 9,
  },
  {
    id: "mochi_save_01",
    name: "Моти",
    description: "Редкий десерт с защитной печатью. Один раз не даёт охотнику погибнуть.",
    category: "DESSERT",
    price: 140,
    imageUrl: "/assets/food/mochi.svg?v=1",
    buffId: "LETHAL_SAVE",
    buffValue: 0.2,
    buffTrigger: "LETHAL_DAMAGE",
    effectLabel: "Спасение от смертельного урона 1 раз",
    sortOrder: 10,
  },
];

export const foodById = (id: string | null | undefined) => FOOD_ITEMS.find((item) => item.id === id) || null;

export function isDrink(item: FoodItem) {
  return item.category === "DRINK";
}

export function toFoodBuff(item: FoodItem): ActiveFoodBuff {
  return {
    itemId: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    buffId: item.buffId,
    buffValue: item.buffValue,
    trigger: item.buffTrigger,
    effectLabel: item.effectLabel,
    category: item.category,
  };
}

type RamenShopProps = {
  playerName: string;
  balance: number;
  ramenCoupons: number;
  inventory: FoodInventory;
  loadout: FoodLoadout;
  introduced: boolean;
  soundEnabled: boolean;
  activeRun: boolean;
  onMarkIntroduced: () => void;
  onBack: () => void;
  onToggleSound: () => void;
  onPurchase: (item: FoodItem) => { ok: boolean; message: string };
  onPurchaseWithCoupon: (item: FoodItem) => { ok: boolean; message: string };
  onEquip: (item: FoodItem) => { ok: boolean; message: string };
  onUnequip: (slot: "meal" | "drink") => void;
};

const introLines = [
  "Добро пожаловать в «Рамен Юрино»!",
  "Горячий бульон, тёплая улыбка!",
  "Что будем готовить сегодня?",
];

const returnLines = [
  "С возвращением, охотник!",
  "Перед разломом нужно хорошо поесть.",
  "Сегодня бульон особенно хорош.",
  "Не сражайся с ёкаями на пустой желудок.",
];

const shopBranchLines = [
  "Конечно! У меня сегодня всё свежее. Выбирай, что поможет тебе в следующем разломе.",
  "Блюдо и напиток можно подготовить заранее. Они будут действовать до конца всего забега.",
];

const worldBranchLines = [
  "Этот район лежит между обычным городом и цифровым слоем, где просачиваются ёкаи.",
  "Когда открывается разлом, граница истончается, и духи начинают искажать всё вокруг.",
  "Не каждый ёкай враждебен. Некоторые помогают охотникам, если заслужить их доверие.",
  "Но Oni из глубоких разломов почти невозможно остановить обычным оружием.",
];

const newsBranchSets = [
  [
    "Говорят, возле старого моста появился новый разлом.",
    "Оттуда доносится звон, хотя рядом нет ни одного храма.",
  ],
  [
    "Сегодня маленький дух пытался украсть мои онигири.",
    "Оставил после себя только фиолетовую пыль и очень довольную улыбку.",
  ],
  [
    "Несколько охотников видели красное свечение в глубине разлома.",
    "Похоже, сильные Oni становятся активнее.",
  ],
  [
    "В последнее время цифровые печати работают нестабильно.",
    "Перед охотой лучше взять данго — оно усиливает запечатывание.",
  ],
];

type RamenDialogueBranch = "INTRO" | "ROOT" | "SHOP" | "WORLD" | "NEWS";

export function RamenShop(props: RamenShopProps) {
  const [view, setView] = useState<"DIALOG" | "SHOP">("DIALOG");
  const [dialogBranch, setDialogBranch] = useState<RamenDialogueBranch>(props.introduced ? "ROOT" : "INTRO");
  const [dialogIndex, setDialogIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(FOOD_ITEMS[0].id);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const purchaseBusyRef = useRef(false);
  const dialogSoundCursorRef = useRef(0);
  const greetingPlayedRef = useRef(false);
  const exitBusyRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [returnLine] = useState(() => returnLines[Math.floor(Math.random() * returnLines.length)]);
  const [newsLines] = useState(() => newsBranchSets[Math.floor(Math.random() * newsBranchSets.length)]);
  const selectedItem = foodById(selectedId) || FOOD_ITEMS[0];
  const meal = foodById(props.loadout.mealItemId);
  const drink = foodById(props.loadout.drinkItemId);

  const currentLines = useMemo(() => {
    switch (dialogBranch) {
      case "INTRO":
        return introLines;
      case "ROOT":
        return [props.introduced ? returnLine : introLines[introLines.length - 1]];
      case "SHOP":
        return shopBranchLines;
      case "WORLD":
        return worldBranchLines;
      case "NEWS":
        return newsLines;
      default:
        return introLines;
    }
  }, [dialogBranch, props.introduced, returnLine, newsLines]);

  const categoryLabel = useMemo(() => ({ MAIN: "Основное блюдо", DRINK: "Напиток", SNACK: "Закуска", DESSERT: "Десерт" }), []);

  useEffect(() => {
    if (!props.soundEnabled || greetingPlayedRef.current) return;
    const timer = window.setTimeout(() => {
      if (greetingPlayedRef.current) return;
      greetingPlayedRef.current = true;
      playRamenGreetingSound();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [props.soundEnabled]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function playNextDialogueAudio() {
    playRamenDialogueSound(dialogSoundCursorRef.current);
    dialogSoundCursorRef.current = (dialogSoundCursorRef.current + 1) % 3;
  }

  function openBranch(branch: Exclude<RamenDialogueBranch, "INTRO">) {
    playNextDialogueAudio();
    if (branch === "ROOT") {
      setDialogBranch("ROOT");
      setDialogIndex(0);
      return;
    }
    if (!props.introduced) props.onMarkIntroduced();
    setDialogBranch(branch);
    setDialogIndex(0);
  }

  function nextDialog() {
    if (dialogIndex >= currentLines.length - 1) return;
    playNextDialogueAudio();
    setDialogIndex((value) => Math.min(currentLines.length - 1, value + 1));
  }

  function previousDialog() {
    if (dialogIndex <= 0) return;
    playNextDialogueAudio();
    setDialogIndex((value) => Math.max(0, value - 1));
  }

  function proceedFromIntro() {
    if (!props.introduced) props.onMarkIntroduced();
    setDialogBranch("ROOT");
    setDialogIndex(0);
  }

  function reopenDialog() {
    setDialogBranch("ROOT");
    setDialogIndex(0);
    setView("DIALOG");
  }

  function openShopFromDialogue() {
    playNextDialogueAudio();
    setView("SHOP");
  }

  function exitToMap() {

    if (exitBusyRef.current) return;
    exitBusyRef.current = true;
    stopRamenSound();
    if (props.soundEnabled) {
      playRamenGoodbyeSound();
      window.setTimeout(() => props.onBack(), 850);
    } else {
      props.onBack();
    }
  }

  function purchase(item: FoodItem) {
    if (purchaseBusyRef.current) return;
    purchaseBusyRef.current = true;
    setBusyItem(item.id);
    window.setTimeout(() => {
      const result = props.onPurchase(item);
      notify(result.message);
      setBusyItem(null);
      purchaseBusyRef.current = false;
    }, 260);
  }

  function purchaseWithCoupon(item: FoodItem) {
    if (purchaseBusyRef.current) return;
    purchaseBusyRef.current = true;
    setBusyItem(item.id);
    window.setTimeout(() => {
      const result = props.onPurchaseWithCoupon(item);
      notify(result.message);
      setBusyItem(null);
      purchaseBusyRef.current = false;
    }, 260);
  }

  function equip(item: FoodItem) {
    const result = props.onEquip(item);
    notify(result.message);
  }

  return (
    <main className={`ramenShopScreen ${view === "DIALOG" ? "ramenDialogueMode" : "ramenStoreMode"}`}>
      <img className="ramenPosterFallback" src="/assets/video/ramen-shop-poster-v1.jpg" alt="" aria-hidden="true" />
      <video
        className={`ramenVideoBg ${videoReady ? "ready" : ""}`}
        src="/assets/video/ramen-shop-bg-v1.mp4"
        poster="/assets/video/ramen-shop-poster-v1.jpg"
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
      <div className="ramenShade" aria-hidden="true" />
      <div className="ramenSteamOverlay" aria-hidden="true" />

      <header className="ramenTopbar">
        <div className="ramenBrand"><small>YOKAI.EXE // SAFE NODE</small><strong>РАМЕН ЮРИНО</strong></div>
        <div className="ramenTopActions">
          {view === "SHOP" && <div className="spiritCoinBalance"><span>◉</span><b>{props.balance}</b><small>МОНЕТ РАЗЛОМА</small></div>}
          {view === "SHOP" && props.ramenCoupons > 0 && <div className="ramenCouponBalance"><span>券</span><b>{props.ramenCoupons}</b><small>КУПОНЫ</small></div>}
          {view === "SHOP" && <button type="button" className="ramenTalkButton" onClick={reopenDialog}>ЮРИНО</button>}
          <button type="button" onClick={props.onToggleSound}>{props.soundEnabled ? "🔊" : "🔇"}</button>
          <button type="button" className="ramenExitButton" onClick={exitToMap}>ВЕРНУТЬСЯ НА КАРТУ</button>
        </div>
      </header>

      {view === "SHOP" && (
        <section className="ramenShopLayout ramenShopLayoutVisible">
          <aside className="ramenChefPanel">
            <div className="ramenChefStatus"><i /> ЮРИНО · ПОВАР</div>
            <div className="ramenChefSpacer" />
            <div className="ramenPrepPanel">
              <span>ПОДГОТОВКА К РАЗЛОМУ</span>
              <div className={`ramenPrepSlot ${meal ? "filled" : ""}`}>
                {meal ? <img src={meal.imageUrl} alt="" /> : <em>🍱</em>}
                <div><small>БЛЮДО</small><strong>{meal?.name || "Не выбрано"}</strong><span>{meal?.effectLabel || "Выберите еду"}</span></div>
                {meal && <button type="button" onClick={() => props.onUnequip("meal")} disabled={props.activeRun}>Снять</button>}
              </div>
              <div className={`ramenPrepSlot ${drink ? "filled" : ""}`}>
                {drink ? <img src={drink.imageUrl} alt="" /> : <em>🥤</em>}
                <div><small>НАПИТОК</small><strong>{drink?.name || "Не выбрано"}</strong><span>{drink?.effectLabel || "Выберите напиток"}</span></div>
                {drink && <button type="button" onClick={() => props.onUnequip("drink")} disabled={props.activeRun}>Снять</button>}
              </div>
              {props.activeRun && <p>Нельзя менять подготовку во время активного забега.</p>}
            </div>
          </aside>

          <section className="ramenMenuPanel">
            <div className="ramenMenuHeading"><div><small>МЕНЮ ДЛЯ ОХОТНИКА</small><h1>ГОРЯЧАЯ ЕДА · ВРЕМЕННЫЕ БАФФЫ</h1></div><span>10 БЛЮД</span></div>
            <div className="ramenFoodGrid">
              {FOOD_ITEMS.map((item) => {
                const count = props.inventory[item.id] || 0;
                const selected = selectedId === item.id;
                const equipped = props.loadout.mealItemId === item.id || props.loadout.drinkItemId === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`ramenFoodCard ${selected ? "selected" : ""} ${equipped ? "equipped" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="ramenFoodImage"><img src={item.imageUrl} alt={item.name} /></span>
                    <span className="ramenFoodCopy"><strong>{item.name}</strong><small>{item.effectLabel}</small></span>
                    <span className="ramenFoodMeta"><b>◉ {item.price}</b><em>×{count}</em></span>
                    {equipped && <span className="ramenEquippedBadge">ВЫБРАНО</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="ramenDetailPanel">
            <div className="ramenDetailImage"><img src={selectedItem.imageUrl} alt={selectedItem.name} /></div>
            <small>{categoryLabel[selectedItem.category]}</small>
            <h2>{selectedItem.name}</h2>
            <p>{selectedItem.description}</p>
            <div className="ramenEffectBox"><span>ЭФФЕКТ ДО КОНЦА ЗАБЕГА</span><strong>{selectedItem.effectLabel}</strong><small>{selectedItem.buffTrigger.split("_").join(" ")}</small></div>
            <div className="ramenDetailStats"><span>В наличии <b>{props.inventory[selectedItem.id] || 0}</b></span><span>Цена <b>◉ {selectedItem.price}</b></span></div>
            <button type="button" className="ramenBuyButton" disabled={busyItem === selectedItem.id || props.balance < selectedItem.price} onClick={() => purchase(selectedItem)}>
              {busyItem === selectedItem.id ? "ПОКУПКА..." : props.balance < selectedItem.price ? "НЕДОСТАТОЧНО МОНЕТ" : "КУПИТЬ"}
            </button>
            {props.ramenCoupons > 0 && <button type="button" className="ramenCouponButton" disabled={busyItem === selectedItem.id} onClick={() => purchaseWithCoupon(selectedItem)}>ИСПОЛЬЗОВАТЬ КУПОН · {props.ramenCoupons}</button>}
            <button type="button" className="ramenUseButton" disabled={(props.inventory[selectedItem.id] || 0) < 1 || props.activeRun} onClick={() => equip(selectedItem)}>ИСПОЛЬЗОВАТЬ</button>
          </aside>
        </section>
      )}

      {view === "DIALOG" && (
        <div className="ramenDialogLayer ramenReferenceDialogLayer" role="dialog" aria-modal="false" aria-label="Диалог с Юрино">
          <div className="ramenReferenceDialog">
            <img src="/assets/ui/ramen-dialog-reference/dialog-frame-reference.png?v=2" alt="" aria-hidden="true" />
            <p>{currentLines[dialogIndex]}</p>

            {dialogBranch === "ROOT" && (
              <div className="ramenDialogOptions">
                <button type="button" className="ramenDialogTopicButton" onClick={() => openBranch("SHOP")}>МАГАЗИН</button>
                <button type="button" className="ramenDialogTopicButton" onClick={() => openBranch("WORLD")}>УЗНАТЬ ПРО МИР</button>
                <button type="button" className="ramenDialogTopicButton" onClick={() => openBranch("NEWS")}>ЧТО НОВОГО РАССКАЖЕШЬ?</button>
              </div>
            )}

            {dialogBranch === "INTRO" && dialogIndex === currentLines.length - 1 && (
              <div className="ramenDialogOptions ramenDialogOptionsSingle">
                <button type="button" className="ramenDialogTopicButton" onClick={proceedFromIntro}>ПРОДОЛЖИТЬ</button>
              </div>
            )}

            {dialogBranch === "SHOP" && dialogIndex === currentLines.length - 1 && (
              <div className="ramenDialogOptions ramenDialogOptionsRow">
                <button type="button" className="ramenDialogTopicButton primary" onClick={openShopFromDialogue}>ОТКРЫТЬ МАГАЗИН</button>
                <button type="button" className="ramenDialogTopicButton" onClick={() => openBranch("ROOT")}>НАЗАД К ТЕМАМ</button>
              </div>
            )}

            {(dialogBranch === "WORLD" || dialogBranch === "NEWS") && dialogIndex === currentLines.length - 1 && (
              <div className="ramenDialogOptions ramenDialogOptionsSingle">
                <button type="button" className="ramenDialogTopicButton" onClick={() => openBranch("ROOT")}>НАЗАД К ТЕМАМ</button>
              </div>
            )}

            <button type="button" className="ramenDialogArrow ramenDialogArrowUp" onClick={previousDialog} disabled={dialogIndex === 0} aria-label="Предыдущая реплика" />
            <button
              type="button"
              className="ramenDialogArrow ramenDialogArrowDown"
              onClick={nextDialog}
              disabled={dialogIndex >= currentLines.length - 1}
              aria-label="Следующая реплика"
            />
          </div>
        </div>
      )}
      {toast && <div className="ramenToast">{toast}</div>}
    </main>
  );
}
