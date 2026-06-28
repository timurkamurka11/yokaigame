// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import "./battle-action-icons.css";
import {
  enableSound,
  unlockGameAudio,
  isSoundEnabled,
  playDeathSound,
  playHealSound,
  playHomeDoorSound,
  playKoiTutorialClickSound,
  playKoiTutorialPhrase,
  playKatanaSound,
  playPlayerHitSound,
  playPresetSwitchSound,
  playRandomOniAttackSound,
  playRandomOniHitSound,
  playOniRagePunchSound,
  playOniYellSound,
  playSealSound,
  playSummonSound,
  playUiClickSound,
  preloadGameAudio,
  startArenaSound,
  startCreatorSound,
  startHubSound,
  startHomeSound,
  startRamenSound,
  setMasterVolume,
  stopArenaSound,
  stopCreatorSound,
  stopHubSound,
  stopHomeSound,
  stopKoiTutorialAudio,
  resumePendingKoiTutorialPhrase,
  stopRamenSound,
} from "./sound";
import { getTelegramApp, setupTelegramApp } from "./telegram";
import { RamenShop, FOOD_ITEMS, foodById, isDrink, toFoodBuff, type FoodInventory, type FoodLoadout, type FoodItem, type RiftFoodBuffSnapshot } from "./ramen";
import { HomeSafeNode, type HomeQuestStatus } from "./home";
import { trackGameEvent } from "./analytics";
import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  STARTING_FOOD_GRANTS,
  applyRiftCompletion,
  applyTransaction,
  calculateRiftReward,
  claimQuest,
  claimWeeklyMetaReward,
  equipWeapon,
  getWeaponDefinition,
  getWeaponDamage,
  getWeaponUpgradeCost,
  incrementQuestMetric,
  loadEconomyState,
  purchaseWeapon,
  recordFoodUsage,
  saveEconomyState,
  upgradeWeapon,
  type EconomyState,
  type QuestDefinition,
  type RiftRewardBreakdown,
} from "./economy";

const MAX_ONI_HP = 120;
const MAX_PLAYER_HP = 100;
const MAX_AP = 4;
const MAX_ROUNDS = 10;
const MAX_FOCUS = 100;
const MAX_RIFTS = 40;
const RIFT_ENCOUNTERS = 10;
const BASE_RIFT_XP_REWARD = 100;
const RAGE_THRESHOLD = Math.floor(MAX_ONI_HP * 0.5);

type SpriteState = string;
type BattlePhase =
  | "PLAYER_TURN"
  | "ACTION_RESOLVING"
  | "ENEMY_TURN"
  | "ROUND_END"
  | "VICTORY"
  | "SEALED"
  | "DEFEAT";
type ActionKey = "quick" | "heavy" | "seal" | "sumibito" | "heal";
type EffectType = "positive" | "negative" | "neutral";
type EffectTarget = "player" | "enemy";
type BattleEffect = {
  id: string;
  name: string;
  icon: string;
  iconImage?: string;
  duration: number;
  type: EffectType;
  target: EffectTarget;
  description: string;
};
type BattleSettings = {
  volume: number;
  effectsQuality: "low" | "medium" | "high";
  vibration: boolean;
  animationSpeed: "slow" | "normal" | "fast";
  confirmEndTurn: boolean;
};
type MenuView = "menu" | "profile" | "archive";
type ScreenView = "intro" | "hub" | "home" | "rifts" | "ramen" | "creator" | "battle";
type HubLocation = "wardrobe" | "home" | "rifts" | "ramen";
type KoiTutorialMode = "FIRST" | "REPLAY" | null;
type Gender = "male" | "female";
type Animal = "cat" | "kitsune" | "crow" | "spirit";
type CreatorVariant = "outfit" | "full";

type CharacterState = {
  gender: Gender;
  name: string;
  clan: string;
  favoriteThing: string;
  presetIndex: number;
  animal: Animal | null;
  skipIntro: boolean;
};

const sprites: Record<string, string> = {
  idle: "/assets/creatures/oni_404/oni_404_idle.png?v=rage1",
  death: "/assets/creatures/oni_404/oni_404_death.png?v=rage1",
  attack1: "/assets/creatures/oni_404/oni_404_attack_1.png?v=rage1",
  attack2: "/assets/creatures/oni_404/oni_404_attack_2.png?v=rage1",
  attack3: "/assets/creatures/oni_404/oni_404_attack_3.png?v=rage1",
  attack4: "/assets/creatures/oni_404/oni_404_attack_4.png?v=rage1",
  attack5: "/assets/creatures/oni_404/oni_404_attack_5.png?v=rage1",
  rageEnter: "/assets/creatures/oni_404/oni_404_rage_enter.png?v=rage1",
  rageIdle: "/assets/creatures/oni_404/oni_404_rage_idle.png?v=rage1",
  rageAttack1: "/assets/creatures/oni_404/oni_404_rage_attack_1.png?v=rage1",
  rageAttack2: "/assets/creatures/oni_404/oni_404_rage_attack_2.png?v=rage1",
  rageAttack3: "/assets/creatures/oni_404/oni_404_rage_attack_3.png?v=rage1",
};

const ONI_QUEUE_ICON = "/assets/creatures/oni_404/oni_404_queue_icon.png?v=queue2";

const oniAttackVariants = [
  { key: "attack1", name: "рубящий выпад" },
  { key: "attack2", name: "удар клеймом" },
  { key: "attack3", name: "энергетический выброс" },
  { key: "attack4", name: "тяжёлый замах" },
  { key: "attack5", name: "рывок из разлома" },
];

const outfitOptions = [
  "Вариант 01",
  "Вариант 02",
  "Вариант 03",
  "Вариант 04",
  "Вариант 05",
  "Вариант 06",
  "Вариант 07",
  "Вариант 08",
  "Вариант 09",
  "Вариант 10",
];

const fullOptions = [
  "Вариант 01 + аксессуар",
  "Вариант 02 + аксессуар",
  "Вариант 03 + аксессуар",
  "Вариант 04 + аксессуар",
  "Вариант 05 + аксессуар",
  "Вариант 06 + аксессуар",
  "Вариант 07 + аксессуар",
  "Вариант 08 + аксессуар",
  "Вариант 09 + аксессуар",
  "Вариант 10 + аксессуар",
];

const animalCards: { id: Animal; title: string; subtitle: string; image: string }[] = [
  { id: "cat", title: "Кот-нэко", subtitle: "Тихий проводник", image: "/assets/ui/animals/cat.png?v=14" },
  { id: "kitsune", title: "Кицунэ", subtitle: "Ловкость и хитрость", image: "/assets/ui/animals/kitsune.png?v=14" },
  { id: "crow", title: "Ворон", subtitle: "Разведка разломов", image: "/assets/ui/animals/crow.png?v=14" },
  { id: "spirit", title: "Дух-кагами", subtitle: "Фиолетовый огонёк", image: "/assets/ui/animals/spirit.png?v=14" },
];

const clanOptions = [
  "Не выбран",
  "Клан Тории",
  "Сеть Суми",
  "Дом Кагами",
  "Орден Неона",
  "Блуждающие охотники",
];

const creatorVariantCards: { id: CreatorVariant; title: string; subtitle: string }[] = [
  { id: "outfit", title: "Одежда", subtitle: "Готовый сет одежды" },
  { id: "full", title: "Полный", subtitle: "Одежда + аксессуары" },
];

const CREATOR_BACKGROUND = "/assets/ui/creator_reference_screen_clean_v3.png?v=13";
const CREATOR_TITLE_IMAGE = "/assets/ui/creator_title_heading_ref.png?v=1";
const PRESET_ARROW_LEFT = "/assets/ui/preset_arrow_left.png?v=1";
const PRESET_ARROW_RIGHT = "/assets/ui/preset_arrow_right.png?v=1";
const INTRO_VIDEO = "/assets/video/yokai_intro.mp4?v=1";
const INTRO_POSTER = "/assets/video/yokai_intro_poster.jpg?v=1";
const HUB_MAP_IMAGE = "/assets/ui/hub/hub-map.png?v=1";
const HUB_MAP_VIDEO = "/assets/video/hub-map-animated-v15-compatible.mp4?v=15";

const KOI_TUTORIAL_ICON = "/assets/ui/koi-tutorial/koi-icon.png?v=1";
const KOI_TUTORIAL_GUIDE = "/assets/ui/koi-tutorial/koi-guide.png?v=1";
const KOI_TUTORIAL_PANEL = "/assets/ui/koi-tutorial/koi-dialog-panel-v14.png?v=14";
const KOI_TUTORIAL_RAMEN_SQUARE_PANEL = "/assets/ui/koi-tutorial/koi-ramen-square-panel-v144.png?v=144";
const KOI_TUTORIAL_HOME_MARKER = "/assets/ui/koi-tutorial/hunter-house-marker-v144.png?v=144";
const KOI_TUTORIAL_POSES = {
  intro: "/assets/ui/koi-tutorial/poses-v14/koi-intro.png?v=14",
  wardrobe: "/assets/ui/koi-tutorial/poses-v14/koi-wardrobe.png?v=14",
  ramen: "/assets/ui/koi-tutorial/poses-v14/koi-ramen.png?v=14",
  rifts: "/assets/ui/koi-tutorial/poses-v14/koi-rifts.png?v=14",
  home: "/assets/ui/koi-tutorial/poses-v14/koi-home.png?v=14",
} as const;

const KOI_TUTORIAL_STEPS = [
  {
    target: null,
    title: "Главный район",
    firstText: "Добро пожаловать, новый охотник!\nЯ — KOI, твой проводник в мире Yokai.exe.\nЯ покажу основные места района.",
    replayText: "Снова нужна моя помощь?\nЯ напомню тебе, что находится\nв главном районе Yokai.exe.",
  },
  {
    target: "wardrobe",
    title: "Примерочная",
    firstText: "Сначала зайди в Примерочную.\nТам ты создашь своего охотника\nи выберешь внешний вид.",
    replayText: "Здесь находится Примерочная.\nВ ней можно создать охотника\nили изменить его внешний вид.",
  },
  {
    target: "ramen",
    title: "Раменная",
    firstText: "Потом загляни в Раменную.\nТам можно купить еду и напитки,\nкоторые дают полезные баффы для боёв.",
    replayText: "В Раменной можно купить еду и напитки.\nОни дают временные баффы\nдля следующего прохождения разлома.",
  },
  {
    target: "rifts",
    title: "Разломы",
    firstText: "А здесь находятся Разломы.\nИменно тут начинаются битвы с ёкаями\nи другие опасные охоты.",
    replayText: "В Разломах начинаются битвы с ёкаями.\nВыбирай доступный разлом,\nподготавливайся и отправляйся на охоту.",
  },
  {
    target: "home",
    title: "Дом охотника",
    firstText: "Это Дом охотника.\nЗдесь находятся инвентарь, бестиарий,\nзадания и подготовка к следующей охоте.",
    replayText: "В Доме охотника можно открыть инвентарь,\nпосмотреть бестиарий, проверить задания\nи подготовиться к охоте.",
  },
] as const;

const BATTLE_EFFECT_ICONS = {
  focus: "/assets/ui/battle-reference/effect-focus-v73.png?v=73",
  rage: "/assets/ui/battle-reference/effect-rage-v73.png?v=73",
  stunned: "/assets/ui/battle-reference/effect-stun.png?v=7",
} as const;

const BATTLE_REFERENCE_ICONS = {
  sound: "/assets/ui/battle-reference/sound.png?v=7",
  info: "/assets/ui/battle-reference/info.png?v=7",
  settings: "/assets/ui/battle-reference/settings.png?v=7",
  round: "/assets/ui/battle-reference/round.png?v=7",
  retreat: "/assets/ui/battle-reference/retreat.png?v=7",
} as const;

const BATTLE_STATUS_BARS = {
  player: "/assets/ui/battle-status/status-player.png?v=75",
  action: "/assets/ui/battle-status/status-action.png?v=75",
  enemy: "/assets/ui/battle-status/status-enemy.png?v=75",
  update: "/assets/ui/battle-status/status-update.png?v=75",
  defeat: "/assets/ui/battle-status/status-defeat.png?v=75",
} as const;

const BATTLE_ACTION_ICONS = {
  quickStrike: "/assets/ui/battle-actions/quick-strike.png?v=1",
  heavyAttack: "/assets/ui/battle-actions/heavy-attack.png?v=1",
  seal: "/assets/ui/battle-actions/seal.png?v=1",
  sumibito: "/assets/ui/battle-actions/sumibito.png?v=1",
  heal: "/assets/ui/battle-actions/heal.png?v=1",
  endTurn: "/assets/ui/battle-actions/end-turn.png?v=1",
} as const;

const DEFAULT_BATTLE_SETTINGS: BattleSettings = {
  volume: 70,
  effectsQuality: "high",
  vibration: true,
  animationSpeed: "normal",
  confirmEndTurn: true,
};

const INITIAL_PLAYER_EFFECTS: BattleEffect[] = [
  {
    id: "focus",
    name: "Фокус",
    icon: "✦",
    iconImage: BATTLE_EFFECT_ICONS.focus,
    duration: 2,
    type: "positive",
    target: "player",
    description: "Повышает точность и шанс критического удара следующей атаки.",
  },
];

const INITIAL_ENEMY_EFFECTS: BattleEffect[] = [];

const ACTION_PREVIEWS: Record<ActionKey, { label: string; damage: string; detail: string }> = {
  quick: { label: "Быстрый удар", damage: "8–12", detail: "Высокая точность" },
  heavy: { label: "Сильная атака", damage: "17–29", detail: "25% шанс критического удара" },
  seal: { label: "Печать", damage: "—", detail: "Шанс зависит от оставшегося HP" },
  sumibito: { label: "Сумибито", damage: "10–16", detail: "Дополнительный случайный эффект" },
  heal: { label: "Лечение", damage: "+16–24 HP", detail: "Один раз за раунд" },
};


function getRiftTone(riftId: number) {
  if (riftId <= 10) return "violet";
  if (riftId <= 20) return "green";
  if (riftId <= 30) return "blue";
  return "red";
}

function getRiftPortalAsset(tone: ReturnType<typeof getRiftTone>, preview = false) {
  const suffix = preview ? "-preview" : "";
  const colorName = tone === "violet" ? "purple" : tone;
  return `/assets/rifts/reference/portal-${colorName}${suffix}.png?v=12`;
}

function getRiftTitle(riftId: number) {
  if (riftId <= 10) return "ТЕНЕВОЙ ONI";
  if (riftId <= 20) return "НЕФРИТОВЫЙ ONI";
  if (riftId <= 30) return "ЛАЗУРНЫЙ ONI";
  return "БАГРОВЫЙ ONI";
}

function getRiftDescription(riftId: number) {
  const tone = getRiftTone(riftId);
  if (tone === "violet") return "Oni, поглощённый цифровой тьмой. Искажает реальность и высасывает энергию из каждого входящего.";
  if (tone === "green") return "Oni, заражённый нестабильной нефритовой энергией. Усиливает защиту и восстанавливает часть силы.";
  if (tone === "blue") return "Oni из глубин холодного цифрового разлома. Быстро накапливает фокус и наносит точные удары.";
  return "Критически опасный Oni из багровой зоны. Его ярость активируется раньше и значительно усиливает атаки.";
}

function getRiftReward(riftId: number) {
  return 50 + (riftId - 1) * 10;
}

function getPlayerLevelProgress(totalXp: number) {
  let level = 1;
  let currentXp = Math.max(0, Math.floor(totalXp));
  let requiredXp = 100;
  while (currentXp >= requiredXp) {
    currentXp -= requiredXp;
    level += 1;
    requiredXp = 100 + (level - 1) * 50;
  }
  return { level, currentXp, requiredXp };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function BattleSkillButton({
  className,
  icon,
  title,
  cost,
  subtitle,
  locked,
  unavailable,
  selected,
  onClick,
  onPreview,
}: {
  className: string;
  icon: string;
  title: string;
  cost?: number;
  subtitle?: string;
  locked: boolean;
  unavailable?: boolean;
  selected?: boolean;
  onClick: () => void;
  onPreview?: () => void;
}) {
  return (
    <button
      type="button"
      className={`battleSkillButton ${className} ${unavailable ? "unavailable" : ""} ${selected ? "selected" : ""}`}
      disabled={locked}
      aria-disabled={locked || unavailable}
      onClick={onClick}
      onMouseEnter={onPreview}
      onFocus={onPreview}
    >
      <span className="actionIcon"><img src={icon} alt="" aria-hidden="true" draggable={false} /></span>
      <span className="actionCopy">
        <b>{title}</b>
        <small>{cost ? `${cost} AP` : subtitle}</small>
        {cost && subtitle && <em>{subtitle}</em>}
      </span>
    </button>
  );
}

function BattleHudIcon({ type }: { type: "sound" | "muted" | "info" | "settings" | "round" }) {
  if (type === "sound" || type === "muted") {
    return (
      <svg className="battleHudSvg" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M9 20h8l9-8v24l-9-8H9z" />
        {type === "sound" ? (
          <>
            <path d="M31 18c3 3 3 9 0 12" />
            <path d="M36 13c7 6 7 16 0 22" />
          </>
        ) : (
          <>
            <path d="M31 18l10 12" />
            <path d="M41 18L31 30" />
          </>
        )}
      </svg>
    );
  }

  if (type === "info") {
    return (
      <svg className="battleHudSvg" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="15" />
        <path d="M24 21v11" />
        <circle cx="24" cy="15.5" r="1.5" className="battleHudFill" />
        <path d="M24 4v4M24 40v4M4 24h4M40 24h4" />
      </svg>
    );
  }

  if (type === "round") {
    return (
      <svg className="battleHudSvg battleHourglassSvg" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M15 7h18M15 41h18" />
        <path d="M18 9c0 7 2 10 6 15-4 5-6 8-6 15M30 9c0 7-2 10-6 15 4 5 6 8 6 15" />
        <path d="M20 15h8M20 34h8" />
      </svg>
    );
  }

  return (
    <svg className="battleHudSvg" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 5l4 4 6-1 2 6 6 2-1 6 4 4-4 4 1 6-6 2-2 6-6-1-4 4-4-4-6 1-2-6-6-2 1-6-4-4 4-4-1-6 6-2 2-6 6 1z" />
      <circle cx="24" cy="24" r="7" />
    </svg>
  );
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function percent(value: number, max: number) {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function formatTurnCount(value: number) {
  if (value >= 99) return "∞";
  return String(value);
}

function turnWord(value: number) {
  return value === 1 ? "ход" : "хода";
}

function effectSummary(effect: BattleEffect) {
  if (effect.id.startsWith("food:")) return effect.description.split(".")[0];
  switch (effect.id) {
    case "focus": return "Точность +20%";
    case "rage": return "Урон +30%";
    case "stunned": return "Невозможно действовать";
    case "shield": return "Входящий урон −35%";
    case "weakened": return "Атака и защита снижены";
    case "unstable-rage": return "Сила разлома возрастает";
    case "wound": return "Критически низкое здоровье";
    default: return effect.description;
  }
}

function wrapIndex(value: number, size: number) {
  if (value < 0) return size - 1;
  if (value >= size) return 0;
  return value;
}

function formatIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function presetSrc(gender: Gender, variant: CreatorVariant, index: number) {
  const id = String(index + 1).padStart(2, "0");
  return `/assets/creator_ready/${gender}/${id}/${variant}.png?v=11`;
}

function portraitSrc(gender: Gender, variant: CreatorVariant, index: number) {
  return presetSrc(gender, variant, index);
}

function getPresetLabels(variant: CreatorVariant) {
  return variant === "outfit" ? outfitOptions : fullOptions;
}

function CreatorPreview({
  character,
  playerName,
  variant,
  onPrev,
  onNext,
}: {
  character: CharacterState;
  playerName: string;
  variant: CreatorVariant;
  onPrev: () => void;
  onNext: () => void;
}) {
  const genderLabel = character.gender === "male" ? "Охотник" : "Охотница";
  const selectedAnimal = animalCards.find((item) => item.id === character.animal);
  const activeLabel = getPresetLabels(variant)[character.presetIndex];
  const selectorLabel = outfitOptions[character.presetIndex];

  return (
    <section className="refPreviewZone">
      <div className="refPreviewStage">
        <div className="refPreviewStageMask">
          <img
            src={presetSrc(character.gender, variant, character.presetIndex)}
            className="refPreviewSprite"
            alt={`${genderLabel} ${activeLabel}`}
          />
        </div>
      </div>

      <div className="refPreviewInfoCard">
        <h2>{playerName}</h2>
        <p>{genderLabel} • {character.clan === clanOptions[0] ? "Клан не выбран" : character.clan}</p>
        <strong>{activeLabel}</strong>
        <small className="refCompanionLine">
          {selectedAnimal ? (
            <>
              <img src={selectedAnimal.image} alt="" aria-hidden="true" />
              <span>{selectedAnimal.title}</span>
            </>
          ) : (
            "Спутник не выбран"
          )}
        </small>
      </div>

      <div className="refPreviewSelector">
        <div className="refPreviewSelectorTitleBlock">
          <span className="refPreviewSelectorLabel">Готовый образ</span>
          <small>Выбор 1–10</small>
        </div>

        <div className="refSelectorControls">
          <button type="button" onClick={onPrev} aria-label="Предыдущий вариант" className="refPresetArrowButton refPresetArrowButtonPrev">
            <img src={PRESET_ARROW_LEFT} alt="" aria-hidden="true" draggable={false} />
          </button>
          <div className="refSelectorCenter">
            <div className="refSelectorThumb">
              <img
                src={presetSrc(character.gender, variant, character.presetIndex)}
                alt={activeLabel}
              />
            </div>
            <div className="refSelectorMeta">
              <strong>{selectorLabel}</strong>
              <div className="refSelectorIndex">
                <b>{formatIndex(character.presetIndex)}</b>
                <small>/ 10</small>
              </div>
            </div>
          </div>
          <button type="button" onClick={onNext} aria-label="Следующий вариант" className="refPresetArrowButton refPresetArrowButtonNext">
            <img src={PRESET_ARROW_RIGHT} alt="" aria-hidden="true" draggable={false} />
          </button>
        </div>
      </div>
    </section>
  );
}

function BattlePortrait({ character, variant }: { character: CharacterState; variant: CreatorVariant }) {
  const activeIndex = character.presetIndex;
  return (
    <div className="battlePortrait">
      <img src={portraitSrc(character.gender, variant, activeIndex)} alt="Аватар охотника" />
    </div>
  );
}

export default function App() {
  const tg = useMemo(() => getTelegramApp(), []);
  const telegramUser = tg?.initDataUnsafe?.user;

  const [screen, setScreen] = useState<ScreenView>("intro");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("menu");
  const [infoOpen, setInfoOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [introMuted, setIntroMuted] = useState(false);
  const [introNeedsStart, setIntroNeedsStart] = useState(false);
  const [hubReady, setHubReady] = useState(false);
  const [hubVideoReady, setHubVideoReady] = useState(false);
  const [hubVideoFailed, setHubVideoFailed] = useState(false);
  const [hubLocation, setHubLocation] = useState<HubLocation | null>(null);
  const [hubToast, setHubToast] = useState<string | null>(null);
  const [koiTutorialCompleted, setKoiTutorialCompleted] = useState(() => {
    try { return localStorage.getItem("yokai.koiTutorial.completed") === "true"; } catch { return false; }
  });
  const [koiTutorialMode, setKoiTutorialMode] = useState<KoiTutorialMode>(null);
  const [koiTutorialStep, setKoiTutorialStep] = useState(0);
  const [koiReplayConfirmOpen, setKoiReplayConfirmOpen] = useState(false);
  const [selectedRift, setSelectedRift] = useState(1);
  const [riftDefeatedCount, setRiftDefeatedCount] = useState(0);
  const [riftRunActive, setRiftRunActive] = useState(false);
  const [activeRiftRunId, setActiveRiftRunId] = useState<string | null>(null);
  const [riftRunComplete, setRiftRunComplete] = useState(false);
  const [playerXp, setPlayerXp] = useState(() => {
    try {
      return Number(localStorage.getItem("yokai.player.xp") || 0);
    } catch {
      return 0;
    }
  });
  const [closedRifts, setClosedRifts] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem("yokai.rifts.closed");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [rewardSummary, setRewardSummary] = useState<{ xp: number; coins: number; levelUp: boolean; breakdown?: RiftRewardBreakdown } | null>(null);
  const [economy, setEconomy] = useState<EconomyState>(() => {
    try {
      const stored = localStorage.getItem("yokai.currency.riftCoins");
      const legacy = localStorage.getItem("yokai.currency.spiritCoins");
      const legacyBalance = stored !== null ? Number(stored || 0) : legacy !== null ? Number(legacy || 0) : undefined;
      return loadEconomyState(legacyBalance);
    } catch {
      return loadEconomyState();
    }
  });
  const riftCoins = economy.balance;
  const economyRef = useRef<EconomyState>(economy);
  const [oniKills, setOniKills] = useState(() => {
    try { return Number(localStorage.getItem("yokai.bestiary.oni404.kills") || 0); } catch { return 0; }
  });
  const [firstRiftQuestStatus, setFirstRiftQuestStatus] = useState<HomeQuestStatus>(() => {
    try {
      const stored = localStorage.getItem("yokai.quest.firstRift.status") as HomeQuestStatus | null;
      if (stored === "ACTIVE" || stored === "COMPLETED" || stored === "CLAIMED") return stored;
      const closed = JSON.parse(localStorage.getItem("yokai.rifts.closed") || "[]") as number[];
      return closed.includes(1) ? "COMPLETED" : "ACTIVE";
    } catch { return "ACTIVE"; }
  });
  const [homeOpening, setHomeOpening] = useState(false);
  const [foodInventory, setFoodInventory] = useState<FoodInventory>(() => {
    try {
      const stored = localStorage.getItem("yokai.food.inventory");
      if (stored) return JSON.parse(stored);
      return { ...STARTING_FOOD_GRANTS };
    } catch { return { ...STARTING_FOOD_GRANTS }; }
  });
  const [foodLoadout, setFoodLoadout] = useState<FoodLoadout>(() => {
    try { return { mealItemId: null, drinkItemId: null, ...JSON.parse(localStorage.getItem("yokai.food.loadout") || "{}") }; } catch { return { mealItemId: null, drinkItemId: null }; }
  });
  const [ramenShopIntroduced, setRamenShopIntroduced] = useState(() => {
    try { return localStorage.getItem("yokai.ramen.introduced") === "true"; } catch { return false; }
  });
  const [activeFoodSnapshot, setActiveFoodSnapshot] = useState<RiftFoodBuffSnapshot | null>(() => {
    try { return JSON.parse(localStorage.getItem("yokai.rift.foodSnapshot") || "null"); } catch { return null; }
  });
  const [pendingFoodConfirm, setPendingFoodConfirm] = useState(false);
  const [riftEntryPending, setRiftEntryPending] = useState(false);
  const [riftFoodError, setRiftFoodError] = useState<string | null>(null);
  const [mochiUsedThisRun, setMochiUsedThisRun] = useState(false);

  const [character, setCharacter] = useState<CharacterState>(() => {
    const fallback: CharacterState = {
      gender: "male",
      name: telegramUser?.first_name || "",
      clan: clanOptions[0],
      favoriteThing: "",
      presetIndex: 0,
      animal: "cat",
      skipIntro: false,
    };
    try {
      return { ...fallback, ...JSON.parse(localStorage.getItem("yokai.character") || "{}") };
    } catch {
      return fallback;
    }
  });

  const [creatorVariant, setCreatorVariant] = useState<CreatorVariant>("outfit");

  const [oniHp, setOniHp] = useState(MAX_ONI_HP);
  const [playerHp, setPlayerHp] = useState(MAX_PLAYER_HP);
  const [focus, setFocus] = useState(60);
  const [ap, setAp] = useState(MAX_AP);
  const [round, setRound] = useState(1);
  const [sprite, setSprite] = useState<SpriteState>("idle");
  const [oniEnraged, setOniEnraged] = useState(false);
  const [oniRageEntering, setOniRageEntering] = useState(false);
  const [phase, setPhase] = useState<BattlePhase>("PLAYER_TURN");
  const [actionLabel, setActionLabel] = useState("Твой ход");
  const [oniHit, setOniHit] = useState(false);
  const [oniCriticalFlash, setOniCriticalFlash] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);
  const [playerHealGlow, setPlayerHealGlow] = useState(false);
  const [apError, setApError] = useState(false);
  const [oniDamagePopup, setOniDamagePopup] = useState<string | null>(null);
  const [playerDamagePopup, setPlayerDamagePopup] = useState<string | null>(null);
  const [playerEffects, setPlayerEffects] = useState<BattleEffect[]>(INITIAL_PLAYER_EFFECTS);
  const [enemyEffects, setEnemyEffects] = useState<BattleEffect[]>(INITIAL_ENEMY_EFFECTS);
  const [selectedEffect, setSelectedEffect] = useState<BattleEffect | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionKey>("quick");
  const [targetSelected, setTargetSelected] = useState(false);
  const [summonedVisible, setSummonedVisible] = useState(false);
  const [sumibitoCooldown, setSumibitoCooldown] = useState(0);
  const [healUsedThisRound, setHealUsedThisRound] = useState(false);
  const [playerStatsOpen, setPlayerStatsOpen] = useState(false);
  const [enemyInfoOpen, setEnemyInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [surrenderOpen, setSurrenderOpen] = useState(false);
  const [endTurnConfirmOpen, setEndTurnConfirmOpen] = useState(false);
  const [mobileEffectsOpen, setMobileEffectsOpen] = useState(false);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [battleSettings, setBattleSettings] = useState<BattleSettings>(() => {
    try {
      const stored = localStorage.getItem("yokai.battle.settings");
      return stored ? { ...DEFAULT_BATTLE_SETTINGS, ...JSON.parse(stored) } : DEFAULT_BATTLE_SETTINGS;
    } catch {
      return DEFAULT_BATTLE_SETTINGS;
    }
  });

  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const hubVideoRef = useRef<HTMLVideoElement | null>(null);
  const hubToastTimerRef = useRef<number | null>(null);
  const koiTutorialActionLockRef = useRef(false);
  const hubAudioGestureUnlockedRef = useRef(false);
  const encounterResolvedRef = useRef(false);
  const mochiUsedRef = useRef(false);
  const playerName = character.name.trim() || telegramUser?.first_name || "Охотник";
  const playerProgress = getPlayerLevelProgress(playerXp);
  const playerLevel = playerProgress.level;
  const playerLevelXp = playerProgress.currentXp;
  const playerRequiredXp = playerProgress.requiredXp;
  const highestUnlockedRift = Math.min(MAX_RIFTS, Math.max(1, closedRifts.length ? Math.max(...closedRifts) + 1 : 1));
  const selectedRiftTone = getRiftTone(selectedRift);
  const selectedRiftClosed = closedRifts.includes(selectedRift);
  const selectedRiftAvailable = selectedRift <= highestUnlockedRift || selectedRiftClosed;
  const selectedRiftRewardPreview = calculateRiftReward(economy, selectedRift, highestUnlockedRift);
  const enemyTurn = phase === "ENEMY_TURN" || phase === "ROUND_END";
  const battleFinished = phase === "VICTORY" || phase === "SEALED" || phase === "DEFEAT";
  const actionLocked = phase !== "PLAYER_TURN";
  const koiTutorialOpen = koiTutorialMode !== null;
  const hubInteractionLocked = koiTutorialOpen || koiReplayConfirmOpen || homeOpening;
  const activeKoiStep = KOI_TUTORIAL_STEPS[koiTutorialStep] || KOI_TUTORIAL_STEPS[0];
  const activeKoiPoseKey = (activeKoiStep.target || "intro") as keyof typeof KOI_TUTORIAL_POSES;
  const activeKoiPose = KOI_TUTORIAL_POSES[activeKoiPoseKey];

  // Food-derived values must be initialized before any battle formula uses them.
  // The previous order referenced foodSealBonus before its const initialization,
  // which caused a runtime ReferenceError and a completely black screen on launch.
  const foodBuffs = activeFoodSnapshot?.buffs || [];
  const getFoodBuff = (buffId: string) => foodBuffs.find((buff) => buff.buffId === buffId);
  const foodAttackMultiplier = Math.min(1.5, 1 + (getFoodBuff("ATTACK_PERCENT")?.buffValue || 0));
  const activeWeaponState = economy.weapons[economy.activeWeaponId];
  const activeWeaponDamage = getWeaponDamage(economy.activeWeaponId, activeWeaponState?.level || 1);
  const weaponAttackMultiplier = 1 + Math.max(0, activeWeaponDamage - 10) / 50;
  const foodDamageReduction = Math.min(0.5, getFoodBuff("DAMAGE_REDUCTION")?.buffValue || 0);
  const foodCritBonus = Math.min(0.3, getFoodBuff("CRIT_CHANCE")?.buffValue || 0);
  const foodSealBonus = Math.min(0.3, getFoodBuff("SEAL_CHANCE")?.buffValue || 0);
  const effectiveMaxPlayerHp = Math.round(MAX_PLAYER_HP * (1 + (getFoodBuff("MAX_HP_PERCENT")?.buffValue || 0)));
  const effectiveMaxAp = Math.min(6, MAX_AP + Math.round(getFoodBuff("START_AP")?.buffValue || 0));

  const sealChance = clamp(12 + Math.round((1 - oniHp / MAX_ONI_HP) * 68) + (enemyEffects.some((effect) => effect.id === "weakened") ? 12 : 0) + Math.round(foodSealBonus * 100), 8, 92);
  const sealBlocked = oniHp > MAX_ONI_HP * 0.9;
  const activeEnemyPortrait = oniEnraged ? sprites.rageIdle : sprites.idle;

  useEffect(() => {
    setupTelegramApp();
    preloadGameAudio();

    Object.values(sprites).forEach((src) => {
      const image = new Image();
      image.src = src;
    });

    Object.values(BATTLE_STATUS_BARS).forEach((src) => {
      const image = new Image();
      image.src = src;
    });

    const hubImage = new Image();
    hubImage.src = HUB_MAP_IMAGE;

    ["male", "female"].forEach((gender) => {
      ["outfit", "full"].forEach((variant) => {
        for (let i = 1; i <= 10; i += 1) {
          const image = new Image();
          const id = String(i).padStart(2, "0");
          image.src = `/assets/creator_ready/${gender}/${id}/${variant}.png?v=11`;
        }
      });
    });

    const savedSound = localStorage.getItem("yokai.sound.enabled");
    if (savedSound !== "false") {
      enableSound()
        .then(() => setSoundEnabled(isSoundEnabled()))
        .catch(() => {});
    } else {
      setSoundEnabled(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("yokai.battle.settings", JSON.stringify(battleSettings));
    setMasterVolume(battleSettings.volume / 100);
  }, [battleSettings]);

  useEffect(() => {
    localStorage.setItem("yokai.player.xp", String(playerXp));
  }, [playerXp]);

  useEffect(() => {
    localStorage.setItem("yokai.rifts.closed", JSON.stringify(closedRifts));
  }, [closedRifts]);

  useEffect(() => {
    economyRef.current = economy;
    saveEconomyState(economy);
    localStorage.setItem("yokai.currency.riftCoins", String(economy.balance));
  }, [economy]);
  useEffect(() => { localStorage.setItem("yokai.bestiary.oni404.kills", String(oniKills)); }, [oniKills]);
  useEffect(() => { localStorage.setItem("yokai.quest.firstRift.status", firstRiftQuestStatus); }, [firstRiftQuestStatus]);
  useEffect(() => { localStorage.setItem("yokai.character", JSON.stringify(character)); }, [character]);
  useEffect(() => { localStorage.setItem("yokai.food.inventory", JSON.stringify(foodInventory)); }, [foodInventory]);
  useEffect(() => { localStorage.setItem("yokai.food.loadout", JSON.stringify(foodLoadout)); }, [foodLoadout]);
  useEffect(() => { localStorage.setItem("yokai.ramen.introduced", String(ramenShopIntroduced)); }, [ramenShopIntroduced]);
  useEffect(() => {
    if (activeFoodSnapshot) localStorage.setItem("yokai.rift.foodSnapshot", JSON.stringify(activeFoodSnapshot));
    else localStorage.removeItem("yokai.rift.foodSnapshot");
  }, [activeFoodSnapshot]);

  useEffect(() => {
    if (screen === "battle" && bgVideoRef.current) {
      bgVideoRef.current.muted = true;
      bgVideoRef.current.play().catch(() => {});
    }
  }, [screen]);

  useEffect(() => {
    if (screen !== "intro" || !introVideoRef.current) return;

    const video = introVideoRef.current;
    video.currentTime = 0;
    video.volume = 0.9;
    video.muted = false;
    setIntroNeedsStart(false);
    setIntroMuted(false);

    const attempt = video.play();
    if (!attempt) return;

    attempt.catch(() => {
      video.muted = true;
      setIntroMuted(true);
      video.play().catch(() => setIntroNeedsStart(true));
    });
  }, [screen]);

  useEffect(() => {
    if (screen !== "hub") {
      setHubReady(false);
      setHubVideoReady(false);
      setHubVideoFailed(false);
      setHubLocation(null);
      return;
    }

    const revealTimer = window.setTimeout(() => setHubReady(true), 120);
    const playbackTimer = window.setTimeout(() => {
      const video = hubVideoRef.current;
      if (!video) return;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {
        // The static high-resolution fallback remains visible until playback is allowed.
      });
    }, 120);

    const compatibilityTimer = window.setTimeout(() => {
      const video = hubVideoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        setHubVideoReady(false);
        setHubVideoFailed(true);
      }
    }, 8000);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(playbackTimer);
      window.clearTimeout(compatibilityTimer);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "hub" || !hubReady || koiTutorialCompleted || koiTutorialOpen || koiReplayConfirmOpen) return;
    const timer = window.setTimeout(() => {
      unlockGameAudio()
        .then(() => startHubSound())
        .catch(() => {});
      setKoiTutorialStep(0);
      setKoiTutorialMode("FIRST");
    }, 420);
    return () => window.clearTimeout(timer);
  }, [screen, hubReady, koiTutorialCompleted, koiTutorialOpen, koiReplayConfirmOpen]);

  useEffect(() => {
    if (screen !== "hub" || !koiTutorialOpen) {
      stopKoiTutorialAudio();
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      await unlockGameAudio();
      if (cancelled) return;
      startHubSound().catch(() => {});
      playKoiTutorialPhrase(koiTutorialStep);
    }, koiTutorialMode === "FIRST" ? 90 : 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopKoiTutorialAudio();
    };
  }, [screen, koiTutorialOpen, koiTutorialStep, koiTutorialMode, soundEnabled]);

  useEffect(() => {
    if (screen !== "hub" || !soundEnabled) {
      hubAudioGestureUnlockedRef.current = false;
      return;
    }

    const unlockHubAudioFromGesture = () => {
      if (hubAudioGestureUnlockedRef.current) return;
      hubAudioGestureUnlockedRef.current = true;
      unlockGameAudio()
        .then(async () => {
          await startHubSound();
          await resumePendingKoiTutorialPhrase();
        })
        .catch(() => {});
    };

    window.addEventListener("pointerdown", unlockHubAudioFromGesture, { capture: true });
    window.addEventListener("keydown", unlockHubAudioFromGesture, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlockHubAudioFromGesture, { capture: true });
      window.removeEventListener("keydown", unlockHubAudioFromGesture, { capture: true });
    };
  }, [screen, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled) {
      stopArenaSound();
      stopCreatorSound();
      stopHubSound();
      stopRamenSound();
      stopHomeSound();
      return;
    }

    if (screen === "intro") {
      stopArenaSound();
      stopCreatorSound();
      stopHubSound();
      stopRamenSound();
      stopHomeSound();
    } else if (screen === "hub" || screen === "rifts") {
      startHubSound().catch(() => {});
    } else if (screen === "ramen") {
      startRamenSound().catch(() => {});
    } else if (screen === "home") {
      startHomeSound().catch(() => {});
    } else if (screen === "creator") {
      startCreatorSound().catch(() => {});
    } else if (screen === "battle") {
      startArenaSound().catch(() => {});
    }
  }, [screen, soundEnabled]);

  function withUiFeedback(callback: () => void) {
    playUiClickSound();
    tg?.HapticFeedback?.impactOccurred("light");
    callback();
  }

  function addLog(text: string) {
    setLog((previous) => [text, ...previous].slice(0, 12));
  }

  function scaledDelay(milliseconds: number) {
    const factor = battleSettings.animationSpeed === "fast" ? 0.68 : battleSettings.animationSpeed === "slow" ? 1.35 : 1;
    return Math.round(milliseconds * factor);
  }

  function hapticImpact(style: "light" | "medium" | "heavy" | "soft") {
    if (battleSettings.vibration) tg?.HapticFeedback?.impactOccurred(style);
  }

  function hapticNotify(style: "success" | "warning" | "error") {
    if (battleSettings.vibration) tg?.HapticFeedback?.notificationOccurred(style);
  }

  function updateBattleSetting<K extends keyof BattleSettings>(key: K, value: BattleSettings[K]) {
    setBattleSettings((current) => ({ ...current, [key]: value }));
  }

  function commitEconomy(next: EconomyState) {
    const previousIds = new Set(economyRef.current.transactions.map((transaction) => transaction.id));
    next.transactions
      .filter((transaction) => !previousIds.has(transaction.id))
      .forEach((transaction) => trackGameEvent(transaction.flow === "SOURCE" ? "economy_source" : "economy_sink", {
        currency: transaction.currency,
        amount: transaction.amount,
        source_type: transaction.sourceType,
        source_id: transaction.sourceId,
      }));
    economyRef.current = next;
    setEconomy(next);
  }

  function purchaseFood(item: FoodItem) {
    const transaction = applyTransaction(economyRef.current, {
      flow: "SINK",
      amount: item.price,
      sourceType: "RAMEN_PURCHASE",
      sourceId: item.id,
      idempotencyKey: `ramen:${item.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      context: { itemName: item.name, category: item.category },
    });
    if (!transaction.applied) return { ok: false, message: transaction.error || "Не удалось выполнить покупку." };
    commitEconomy(transaction.state);
    setFoodInventory((current) => ({ ...current, [item.id]: (current[item.id] || 0) + 1 }));
    playUiClickSound();
    hapticNotify("success");
    trackGameEvent("ramen_purchased", { item_id: item.id, payment_type: "RIFT_COINS", price: item.price });
    return { ok: true, message: `${item.name} добавлен в инвентарь.` };
  }

  function purchaseFoodWithCoupon(item: FoodItem) {
    const current = economyRef.current;
    if (current.ramenCoupons < 1) return { ok: false, message: "Нет купонов Раменной." };
    const next = { ...current, ramenCoupons: current.ramenCoupons - 1, updatedAt: new Date().toISOString() };
    commitEconomy(next);
    setFoodInventory((inventory) => ({ ...inventory, [item.id]: (inventory[item.id] || 0) + 1 }));
    playUiClickSound();
    hapticNotify("success");
    trackGameEvent("ramen_purchased", { item_id: item.id, payment_type: "RAMEN_COUPON", price: 0 });
    return { ok: true, message: `${item.name} получен по купону.` };
  }

  function equipFood(item: FoodItem) {
    if (riftRunActive) return { ok: false, message: "Нельзя менять еду во время прохождения разлома." };
    if ((foodInventory[item.id] || 0) < 1) return { ok: false, message: "Блюдо отсутствует в инвентаре." };
    setFoodLoadout((current) => isDrink(item)
      ? { ...current, drinkItemId: item.id }
      : { ...current, mealItemId: item.id });
    playUiClickSound();
    return { ok: true, message: `${item.name} подготовлен для следующего разлома.` };
  }

  function unequipFood(slot: "meal" | "drink") {
    if (riftRunActive) return;
    setFoodLoadout((current) => slot === "drink"
      ? { ...current, drinkItemId: null }
      : { ...current, mealItemId: null });
  }

  function createFoodSnapshot(): RiftFoodBuffSnapshot | null {
    const meal = foodById(foodLoadout.mealItemId);
    const drink = foodById(foodLoadout.drinkItemId);
    const availableMeal = meal && (foodInventory[meal.id] || 0) > 0 ? meal : null;
    const availableDrink = drink && (foodInventory[drink.id] || 0) > 0 ? drink : null;
    const validItems = [availableMeal, availableDrink].filter(Boolean) as FoodItem[];

    // A missing item in one slot must not cancel another valid prepared item.
    // Example: meal ×0 + drink ×1 should still enter with the drink buff.
    if (!validItems.length) return null;

    return {
      runId: `rift-${selectedRift}-${Date.now()}`,
      mealItemId: availableMeal?.id || null,
      drinkItemId: availableDrink?.id || null,
      buffs: validItems.map(toFoodBuff),
      consumed: true,
      createdAt: new Date().toISOString(),
    };
  }

  function consumeFoodSnapshot(snapshot: RiftFoodBuffSnapshot | null) {
    if (!snapshot) return true;
    const ids = [snapshot.mealItemId, snapshot.drinkItemId].filter(Boolean) as string[];
    if (ids.some((id) => (foodInventory[id] || 0) < 1)) return false;
    setFoodInventory((current) => {
      const next = { ...current };
      ids.forEach((id) => { next[id] = Math.max(0, (next[id] || 0) - 1); });
      return next;
    });
    return true;
  }

  function clearFoodRun() {
    setActiveFoodSnapshot(null);
    setMochiUsedThisRun(false);
    mochiUsedRef.current = false;
    setPlayerHp((current) => Math.min(MAX_PLAYER_HP, current));
  }

  function resolveFoodProtectedDamage(currentHp: number, rawDamage: number) {
    const damage = Math.max(1, Math.round(rawDamage * (1 - foodDamageReduction)));
    let nextHp = Math.max(0, currentHp - damage);
    let mochiTriggered = false;
    if (nextHp <= 0 && getFoodBuff("LETHAL_SAVE") && !mochiUsedRef.current) {
      mochiUsedRef.current = true;
      setMochiUsedThisRun(true);
      nextHp = Math.max(1, Math.round(effectiveMaxPlayerHp * 0.2));
      mochiTriggered = true;
      addLog(`Моти активировал защитную печать. HP восстановлено до ${nextHp}.`);
    }
    return { damage, nextHp, mochiTriggered };
  }

  function resetBattle(encounterNumber = Math.min(riftDefeatedCount + 1, RIFT_ENCOUNTERS), preserveHp = false, snapshotOverride?: RiftFoodBuffSnapshot | null) {
    encounterResolvedRef.current = false;
    const snapshot = snapshotOverride === undefined ? activeFoodSnapshot : snapshotOverride;
    const snapshotBuffs = snapshot?.buffs || [];
    const maxHpForBattle = Math.round(MAX_PLAYER_HP * (1 + (snapshotBuffs.find((buff) => buff.buffId === "MAX_HP_PERCENT")?.buffValue || 0)));
    const startApForBattle = Math.min(6, MAX_AP + Math.round(snapshotBuffs.find((buff) => buff.buffId === "START_AP")?.buffValue || 0));
    setOniHp(MAX_ONI_HP);
    setPlayerHp((current) => preserveHp ? Math.min(maxHpForBattle, Math.max(1, current)) : maxHpForBattle);
    setFocus(60);
    setAp(startApForBattle);
    setRound(1);
    setSprite("idle");
    setOniEnraged(false);
    setOniRageEntering(false);
    setPhase("PLAYER_TURN");
    setActionLabel("Твой ход");
    setOniHit(false);
    setOniCriticalFlash(false);
    setPlayerShake(false);
    setPlayerHealGlow(false);
    setApError(false);
    setOniDamagePopup(null);
    setPlayerDamagePopup(null);
    setPlayerEffects(INITIAL_PLAYER_EFFECTS.map((effect) => ({ ...effect })));
    setEnemyEffects(INITIAL_ENEMY_EFFECTS.map((effect) => ({ ...effect })));
    setSelectedEffect(null);
    setSelectedAction("quick");
    setTargetSelected(false);
    setSummonedVisible(false);
    setSumibitoCooldown(0);
    setHealUsedThisRound(false);
    setPlayerStatsOpen(false);
    setEnemyInfoOpen(false);
    setSettingsOpen(false);
    setSurrenderOpen(false);
    setEndTurnConfirmOpen(false);
    setMobileEffectsOpen(false);
    setMobileQueueOpen(false);
    setLog([
      `Разлом ${selectedRift}. Противник ${encounterNumber} из ${RIFT_ENCOUNTERS}.`,
      `Раунд 1. ${playerName} встречает Oni-404.`,
      `Доступно ${startApForBattle} AP. Ослабь ёкая и используй печать.`,
    ]);
    setMenuOpen(false);
  }

  function beginBattle() {
    if (!selectedRiftAvailable || riftEntryPending) return;
    setRiftFoodError(null);
    const hasPreparedFood = Boolean(foodLoadout.mealItemId || foodLoadout.drinkItemId);
    if (hasPreparedFood) {
      setPendingFoodConfirm(true);
      return;
    }
    startRiftRunWithFood(false);
  }

  function startRiftRunWithFood(usePreparedFood: boolean) {
    if (riftEntryPending || !selectedRiftAvailable) return;

    setRiftEntryPending(true);
    setRiftFoodError(null);

    const snapshot = usePreparedFood ? createFoodSnapshot() : null;
    if (usePreparedFood && !snapshot) {
      setRiftFoodError("В подготовленных слотах нет доступной еды. Купите предмет или войдите без еды.");
      setRiftEntryPending(false);
      return;
    }

    if (!consumeFoodSnapshot(snapshot)) {
      setRiftFoodError("Не удалось списать подготовленную еду. Проверьте инвентарь.");
      setRiftEntryPending(false);
      return;
    }

    // Remove empty prepared slots, while keeping any valid item that was used.
    if (usePreparedFood) {
      setFoodLoadout((current) => ({
        mealItemId: snapshot?.mealItemId && (foodInventory[snapshot.mealItemId] || 0) > 1
          ? snapshot.mealItemId
          : null,
        drinkItemId: snapshot?.drinkItemId && (foodInventory[snapshot.drinkItemId] || 0) > 1
          ? snapshot.drinkItemId
          : null,
      }));
    }

    withUiFeedback(() => {
      const runId = snapshot?.runId || `rift-${selectedRift}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let nextEconomy = economyRef.current;
      const usedFoodIds = [snapshot?.mealItemId, snapshot?.drinkItemId].filter(Boolean) as string[];
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
      trackGameEvent("rift_started", { rift_id: selectedRift, tier: selectedRiftTone, food_loadout: usedFoodIds, weapon_id: economyRef.current.activeWeaponId });
      window.setTimeout(() => setRiftEntryPending(false), 0);
    });
  }

  function continueRiftRun() {
    withUiFeedback(() => {
      if (riftRunComplete) {
        setRiftRunActive(false);
        setScreen("rifts");
        return;
      }
      resetBattle(Math.min(riftDefeatedCount + 1, RIFT_ENCOUNTERS), true);
    });
  }

  function restartRiftRun() {
    withUiFeedback(() => {
      setRiftDefeatedCount(0);
      setRiftRunActive(true);
      setActiveRiftRunId(`rift-${selectedRift}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setRiftRunComplete(false);
      setRewardSummary(null);
      clearFoodRun();
      resetBattle(1, false, null);
    });
  }

  function abandonRiftRun() {
    withUiFeedback(() => {
      setRiftDefeatedCount(0);
      setRiftRunActive(false);
      setActiveRiftRunId(null);
      setRiftRunComplete(false);
      setRewardSummary(null);
      clearFoodRun();
      setSurrenderOpen(false);
      setMenuOpen(false);
      setScreen("rifts");
    });
  }

  function completeRiftEncounter(method: "defeated" | "sealed") {
    if (encounterResolvedRef.current) return;
    encounterResolvedRef.current = true;

    const nextCount = Math.min(RIFT_ENCOUNTERS, riftDefeatedCount + 1);
    const enemyXpReward = nextCount === RIFT_ENCOUNTERS ? 20 : 10;
    const levelBefore = getPlayerLevelProgress(playerXp).level;
    const levelAfter = getPlayerLevelProgress(playerXp + enemyXpReward).level;
    let nextEconomy = incrementQuestMetric(economyRef.current, "YOKAI_DEFEATED", 1);

    setRiftDefeatedCount(nextCount);
    setPlayerXp((current) => current + enemyXpReward);
    setOniKills((current) => current + 1);

    if (nextCount < RIFT_ENCOUNTERS) {
      commitEconomy(nextEconomy);
      setRiftRunComplete(false);
      const miso = getFoodBuff("POST_ENEMY_HEAL");
      if (miso) {
        const heal = Math.max(1, Math.round(effectiveMaxPlayerHp * miso.buffValue));
        setPlayerHp((current) => Math.min(effectiveMaxPlayerHp, current + heal));
        addLog(`Мисо-суп восстановил ${heal} HP между боями.`);
      }
      addLog(`Ёкай ${nextCount} из ${RIFT_ENCOUNTERS} ${method === "sealed" ? "запечатан" : "побеждён"}. Получено +${enemyXpReward} XP. Монеты будут начислены после закрытия Разлома.`);
      return;
    }

    const runId = activeRiftRunId || `rift-${selectedRift}-${Date.now()}`;
    const breakdown = calculateRiftReward(nextEconomy, selectedRift, highestUnlockedRift);
    const completion = applyRiftCompletion(nextEconomy, breakdown, runId);
    nextEconomy = completion.state;
    commitEconomy(nextEconomy);
    setClosedRifts((current) => current.includes(selectedRift) ? current : [...current, selectedRift].sort((a, b) => a - b));
    if (selectedRift === 1 && firstRiftQuestStatus === "ACTIVE") setFirstRiftQuestStatus("COMPLETED");
    setRiftRunComplete(true);
    setRiftRunActive(false);
    setActiveRiftRunId(null);
    setRewardSummary({ xp: enemyXpReward, coins: breakdown.awardedCoins, levelUp: levelAfter > levelBefore, breakdown });
    clearFoodRun();
    addLog(`Разлом ${selectedRift} закрыт. Получено +${breakdown.awardedCoins} Монет Разлома и +${enemyXpReward} XP.`);
    trackGameEvent("rift_completed", { rift_id: selectedRift, tier: breakdown.tier, result: "SUCCESS", oni_count: RIFT_ENCOUNTERS, coins: breakdown.awardedCoins, first_clear: breakdown.firstClear });
  }

  function claimFirstRiftQuestReward() {
    if (firstRiftQuestStatus !== "COMPLETED") return;
    const bonusXp = 50;
    const bonusCoins = 50;
    const levelBefore = getPlayerLevelProgress(playerXp).level;
    const levelAfter = getPlayerLevelProgress(playerXp + bonusXp).level;
    const transaction = applyTransaction(economyRef.current, {
      flow: "SOURCE",
      amount: bonusCoins,
      sourceType: "ACHIEVEMENT_REWARD",
      sourceId: "first_rift_quest",
      idempotencyKey: "achievement:first-rift:v1",
      context: { xp: bonusXp },
    });
    if (!transaction.applied) {
      setFirstRiftQuestStatus("CLAIMED");
      showHubToast("Награда первого Разлома уже была получена.");
      return;
    }
    commitEconomy(transaction.state);
    setPlayerXp((current) => current + bonusXp);
    setFirstRiftQuestStatus("CLAIMED");
    showHubToast(`Награда получена: +${bonusCoins} Монет Разлома и +${bonusXp} XP${levelAfter > levelBefore ? " · новый уровень" : ""}`);
    playUiClickSound();
    hapticNotify("success");
  }

  function claimEconomyQuest(quest: QuestDefinition) {
    const result = claimQuest(economyRef.current, quest);
    commitEconomy(result.state);
    showHubToast(result.message);
    if (result.ok) {
      hapticNotify("success");
      trackGameEvent("quest_reward_claimed", { quest_id: quest.id, reward: quest.rewardCoins });
    } else hapticNotify("warning");
  }

  function claimEconomyWeeklyReward() {
    const result = claimWeeklyMetaReward(economyRef.current);
    commitEconomy(result.state);
    showHubToast(result.message);
    if (result.ok) {
      hapticNotify("success");
      trackGameEvent("quest_reward_claimed", { quest_id: "weekly_meta", reward: 500 });
    } else hapticNotify("warning");
  }

  function buyWeapon(weaponId: string) {
    const result = purchaseWeapon(economyRef.current, weaponId);
    commitEconomy(result.state);
    showHubToast(result.message);
    if (result.ok) trackGameEvent("weapon_purchased", { weapon_id: weaponId, price: getWeaponDefinition(weaponId).purchasePrice, rarity: getWeaponDefinition(weaponId).rarity });
    return result;
  }

  function improveWeapon(weaponId: string) {
    const beforeLevel = economyRef.current.weapons[weaponId]?.level || 1;
    const price = getWeaponUpgradeCost(weaponId, beforeLevel);
    const result = upgradeWeapon(economyRef.current, weaponId);
    commitEconomy(result.state);
    showHubToast(result.message);
    if (result.ok) trackGameEvent("weapon_upgraded", { weapon_id: weaponId, from_level: beforeLevel, to_level: result.state.weapons[weaponId]?.level || beforeLevel, price });
    return result;
  }

  function selectWeapon(weaponId: string) {
    const result = equipWeapon(economyRef.current, weaponId);
    commitEconomy(result.state);
    showHubToast(result.message);
    if (result.ok) trackGameEvent("weapon_equipped", { weapon_id: weaponId });
    return result;
  }

  function runKoiTutorialAction(callback: () => void) {
    if (koiTutorialActionLockRef.current) return;
    koiTutorialActionLockRef.current = true;
    playKoiTutorialClickSound();
    window.setTimeout(() => {
      callback();
      window.setTimeout(() => { koiTutorialActionLockRef.current = false; }, 190);
    }, 105);
  }

  function openKoiReplayConfirm() {
    if (screen !== "hub" || koiTutorialOpen || koiReplayConfirmOpen) return;
    runKoiTutorialAction(() => setKoiReplayConfirmOpen(true));
  }

  function closeKoiReplayConfirm() {
    runKoiTutorialAction(() => setKoiReplayConfirmOpen(false));
  }

  function startKoiReplay() {
    runKoiTutorialAction(() => {
      stopKoiTutorialAudio();
      setKoiReplayConfirmOpen(false);
      setKoiTutorialStep(0);
      setKoiTutorialMode("REPLAY");
    });
  }

  function moveKoiTutorial(direction: -1 | 1) {
    const nextStep = Math.max(0, Math.min(KOI_TUTORIAL_STEPS.length - 1, koiTutorialStep + direction));
    if (nextStep === koiTutorialStep) return;
    runKoiTutorialAction(() => {
      stopKoiTutorialAudio();
      setKoiTutorialStep(nextStep);
    });
  }

  function finishKoiTutorial() {
    runKoiTutorialAction(() => {
      stopKoiTutorialAudio();
      if (koiTutorialMode === "FIRST") {
        setKoiTutorialCompleted(true);
        try { localStorage.setItem("yokai.koiTutorial.completed", "true"); } catch {}
      }
      setKoiTutorialMode(null);
      setKoiTutorialStep(0);
    });
  }

  function closeKoiTutorialReplay() {
    if (koiTutorialMode !== "REPLAY") return;
    runKoiTutorialAction(() => {
      stopKoiTutorialAudio();
      setKoiTutorialMode(null);
      setKoiTutorialStep(0);
    });
  }

  function backToHub() {
    withUiFeedback(() => {
      setScreen("hub");
      setMenuOpen(false);
      setInfoOpen(false);
      setLogOpen(false);
      setSettingsOpen(false);
      setSurrenderOpen(false);
    });
  }

  function showHubToast(message: string) {
    if (hubToastTimerRef.current !== null) window.clearTimeout(hubToastTimerRef.current);
    setHubToast(message);
    hubToastTimerRef.current = window.setTimeout(() => {
      setHubToast(null);
      hubToastTimerRef.current = null;
    }, 2400);
  }

  function openHubLocation(location: HubLocation) {
    if (hubInteractionLocked) return;
    playUiClickSound();
    tg?.HapticFeedback?.impactOccurred("medium");
    setHubLocation(location);

    if (location === "wardrobe") {
      window.setTimeout(() => setScreen("creator"), 180);
      return;
    }

    if (location === "home") {
      setHomeOpening(true);
      playHomeDoorSound();
      window.setTimeout(() => {
        setScreen("home");
        setHomeOpening(false);
      }, 620);
      return;
    }

    if (location === "rifts") {
      window.setTimeout(() => setScreen("rifts"), 180);
      return;
    }

    window.setTimeout(() => setScreen("ramen"), 180);
  }

  function backToCreator() {
    withUiFeedback(() => {
      if (screen === "battle") {
        setRiftDefeatedCount(0);
        setRiftRunActive(false);
        setRiftRunComplete(false);
        setRewardSummary(null);
        clearFoodRun();
      }
      setScreen("creator");
      setMenuOpen(false);
      setInfoOpen(false);
      setLogOpen(false);
      setSettingsOpen(false);
      setSurrenderOpen(false);
    });
  }

  function canSpend(cost: number) {
    return (
      screen === "battle" &&
      phase === "PLAYER_TURN" &&
      ap >= cost &&
      playerHp > 0 &&
      oniHp > 0
    );
  }

  function triggerApError(message = "Недостаточно AP") {
    setApError(true);
    setActionLabel(message);
    hapticNotify("warning");
    window.setTimeout(() => setApError(false), scaledDelay(420));
    window.setTimeout(() => {
      if (phase === "PLAYER_TURN") setActionLabel("Твой ход");
    }, scaledDelay(900));
  }

  function beginPlayerAction(action: ActionKey, cost: number) {
    setSelectedAction(action);
    setTargetSelected(true);
    if (phase !== "PLAYER_TURN" || battleFinished) return false;
    if (ap < cost) {
      triggerApError(`Нужно ${cost} AP`);
      return false;
    }

    setAp((current) => Math.max(0, current - cost));
    setPhase("ACTION_RESOLVING");
    setActionLabel("Выполнение действия");
    return true;
  }

  function showOniPopup(value: string) {
    setOniDamagePopup(value);
    window.setTimeout(() => setOniDamagePopup(null), scaledDelay(760));
  }

  function showPlayerPopup(value: string) {
    setPlayerDamagePopup(value);
    window.setTimeout(() => setPlayerDamagePopup(null), scaledDelay(760));
  }

  function flashOniHit(critical = false) {
    setOniHit(true);
    if (critical) setOniCriticalFlash(true);
    window.setTimeout(() => setOniHit(false), scaledDelay(340));
    window.setTimeout(() => setOniCriticalFlash(false), scaledDelay(500));
  }

  function getIdleSpriteKey() {
    return oniEnraged ? "rageIdle" : "idle";
  }

  function createRageEffect(): BattleEffect {
    return {
      id: "rage",
      name: "Ярость",
      icon: "⚔",
      iconImage: BATTLE_EFFECT_ICONS.rage,
      duration: 99,
      type: "negative",
      target: "enemy",
      description: "Oni-404 перешёл в режим ярости. Пока эффект активен, он использует только яростные атаки и совершает тройное комбо.",
    };
  }

  function triggerOniRageMode() {
    if (oniEnraged || oniRageEntering || oniHp <= 0) return;
    setOniEnraged(true);
    setOniRageEntering(true);
    setPhase("ACTION_RESOLVING");
    setActionLabel("Oni-404 впадает в ярость");
    setSprite("rageEnter");
    showOniPopup("ЯРОСТЬ");
    playOniYellSound();
    hapticImpact("heavy");
    setEnemyEffects((effects) => {
      const rest = effects.filter((effect) => effect.id !== "rage");
      return [...rest, createRageEffect()];
    });
    addLog("HP Oni-404 опустилось ниже 50%. Он переходит в режим ярости.");
    window.setTimeout(() => {
      setSprite("rageIdle");
      setOniRageEntering(false);
      setPhase("PLAYER_TURN");
      setActionLabel("Твой ход");
      addLog("На Oni-404 наложен эффект «Ярость». Теперь он атакует 3 раза за ход.");
    }, scaledDelay(1180));
  }

  function applyOniDamage(damage: number, critical = false) {
    const nextHp = Math.max(0, oniHp - damage);
    window.setTimeout(() => playRandomOniHitSound(), scaledDelay(80));
    flashOniHit(critical);
    showOniPopup(critical ? `КРИТ -${damage}` : `-${damage}`);
    setOniHp(nextHp);

    if (nextHp <= 0) {
      window.setTimeout(() => {
        setSprite("death");
        setPhase("VICTORY");
        setActionLabel("Победа");
        playDeathSound();
        hapticNotify("success");
        completeRiftEncounter("defeated");
        addLog("Oni-404 распался в фиолетовый глитч.");
      }, scaledDelay(420));
      return { defeated: true, nextHp };
    }
    return { defeated: false, nextHp };
  }

  function finishPlayerAction(delay = 680, nextOniHp?: number) {
    window.setTimeout(() => {
      if (typeof nextOniHp === "number" && nextOniHp > 0 && nextOniHp <= RAGE_THRESHOLD && !oniEnraged && !oniRageEntering) {
        triggerOniRageMode();
        return;
      }
      setSprite(getIdleSpriteKey());
      setPhase("PLAYER_TURN");
      setActionLabel("Твой ход");
    }, scaledDelay(delay));
  }

  function quickStrike() {

    const cost = 1;
    if (!beginPlayerAction("quick", cost)) return;

    setFocus((current) => clamp(current + 4, 0, MAX_FOCUS));
    playKatanaSound();
    hapticImpact("light");

    window.setTimeout(() => {
      const hit = Math.random() > 0.04;
      if (!hit) {
        showOniPopup("ПРОМАХ");
        addLog(`${playerName}: быстрый удар не достиг цели. -${cost} AP`);
        finishPlayerAction(420);
        return;
      }
      const damage = Math.round(randomInt(8, 12) * foodAttackMultiplier * weaponAttackMultiplier);
      const attackResult = applyOniDamage(damage);
      addLog(`${playerName}: быстрый удар — ${damage} урона. -${cost} AP`);
      if (!attackResult.defeated) finishPlayerAction(680, attackResult.nextHp);
    }, scaledDelay(130));
  }

  function heavyAttack() {
    const cost = 2;
    if (!beginPlayerAction("heavy", cost)) return;

    setFocus((current) => clamp(current + 7, 0, MAX_FOCUS));
    playKatanaSound();
    hapticImpact("medium");

    window.setTimeout(() => {
      const hit = Math.random() > 0.14;
      if (!hit) {
        showOniPopup("ПРОМАХ");
        addLog(`${playerName}: сильная атака промахнулась. -${cost} AP`);
        finishPlayerAction(520);
        return;
      }

      const focusBonus = playerEffects.some((effect) => effect.id === "focus") ? 0.1 : 0;
      const critical = Math.random() < Math.min(0.65, 0.25 + focusBonus + foodCritBonus);
      const baseDamage = Math.round(randomInt(17, 29) * foodAttackMultiplier * weaponAttackMultiplier);
      const damage = critical ? Math.round(baseDamage * 1.65) : baseDamage;
      const attackResult = applyOniDamage(damage, critical);
      setPlayerEffects((effects) => effects.filter((effect) => effect.id !== "focus"));
      addLog(`${playerName}: сильная атака — ${damage} урона${critical ? " (критический удар)" : ""}. -${cost} AP`);
      if (!attackResult.defeated) finishPlayerAction(820, attackResult.nextHp);
    }, scaledDelay(220));
  }

  function sealRift() {
    const cost = 3;
    setSelectedAction("seal");
    setTargetSelected(true);
    if (sealBlocked) {
      triggerApError("Сначала ослабь Oni-404");
      return;
    }
    if (!beginPlayerAction("seal", cost)) return;

    setFocus((current) => clamp(current - 12, 0, MAX_FOCUS));
    playSealSound();
    hapticImpact("medium");
    addLog(`${playerName}: активирована печать. Шанс успеха ${sealChance}%. -${cost} AP`);
    commitEconomy(incrementQuestMetric(economyRef.current, "SEAL_USED", 1));

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
      addLog("Oni-404 вырвался из печати. AP потрачены.");
      finishPlayerAction(980);
    }, scaledDelay(720));
  }

  function summonSumibito() {
    const cost = 2;
    setSelectedAction("sumibito");
    if (sumibitoCooldown > 0) {
      triggerApError(`Сумибито: перезарядка ${sumibitoCooldown} раунд`);
      return;
    }
    if (!beginPlayerAction("sumibito", cost)) return;

    setSummonedVisible(true);
    setSumibitoCooldown(2);
    playSummonSound();
    hapticImpact("soft");

    window.setTimeout(() => {
      const roll = randomInt(0, 4);
      const damage = Math.round(randomInt(10, 16) * foodAttackMultiplier * weaponAttackMultiplier);
      const attackResult = applyOniDamage(damage);
      let extra = "";

      if (roll === 0) {
        const weakened: BattleEffect = {
          id: "weakened",
          name: "Ослабление",
          icon: "⌁",
          duration: 2,
          type: "negative",
          target: "enemy",
          description: "Снижает атаку Oni-404 и повышает шанс успешной печати.",
        };
        setEnemyEffects((effects) => [...effects.filter((effect) => effect.id !== weakened.id), weakened]);
        extra = " и наложил Ослабление";
      } else if (roll === 1) {
        const shield: BattleEffect = {
          id: "shield",
          name: "Защита",
          icon: "🛡",
          duration: 2,
          type: "positive",
          target: "player",
          description: "Уменьшает входящий урон на 35%.",
        };
        setPlayerEffects((effects) => [...effects.filter((effect) => effect.id !== shield.id), shield]);
        extra = " и создал щит";
      } else if (roll === 2) {
        setAp((current) => Math.min(effectiveMaxAp, current + 1));
        extra = " и восстановил 1 AP";
      } else if (roll === 3) {
        const heal = randomInt(6, 10);
        setPlayerHp((current) => Math.min(effectiveMaxPlayerHp, current + heal));
        showPlayerPopup(`+${heal}`);
        extra = ` и восстановил ${heal} HP`;
      } else {
        const stunned: BattleEffect = {
          id: "stunned",
          name: "Оглушение",
          icon: "✹",
          iconImage: BATTLE_EFFECT_ICONS.stunned,
          duration: 1,
          type: "negative",
          target: "enemy",
          description: "Oni-404 пропустит следующее действие.",
        };
        setEnemyEffects((effects) => [...effects.filter((effect) => effect.id !== stunned.id), stunned]);
        extra = " и оглушил Oni-404";
      }

      addLog(`Сумибито нанёс ${damage} урона${extra}. -${cost} AP`);
      window.setTimeout(() => setSummonedVisible(false), scaledDelay(600));
      if (!attackResult.defeated) finishPlayerAction(860, attackResult.nextHp);
    }, scaledDelay(250));
  }

  function recover() {
    const cost = 2;
    setSelectedAction("heal");
    if (playerHp >= effectiveMaxPlayerHp) {
      triggerApError("Здоровье уже полное");
      return;
    }
    if (healUsedThisRound) {
      triggerApError("Лечение уже использовано");
      return;
    }
    if (!beginPlayerAction("heal", cost)) return;

    const heal = Math.min(randomInt(16, 24), effectiveMaxPlayerHp - playerHp);
    setHealUsedThisRound(true);
    setPlayerHealGlow(true);
    setPlayerHp((current) => Math.min(effectiveMaxPlayerHp, current + heal));
    showPlayerPopup(`+${heal}`);
    playHealSound();
    hapticImpact("soft");
    addLog(`${playerName}: восстановлено ${heal} HP. -${cost} AP`);
    window.setTimeout(() => setPlayerHealGlow(false), scaledDelay(620));
    finishPlayerAction(650);
  }

  function requestEndTurn() {
    if (phase !== "PLAYER_TURN" || battleFinished) return;
    if (ap > 0 && battleSettings.confirmEndTurn) {
      setEndTurnConfirmOpen(true);
      return;
    }
    performEndTurn();
  }

  function startNextRoundAfterEnemy() {
    setPhase("ROUND_END");
    setActionLabel("Обновление эффектов");
    setSprite(getIdleSpriteKey());
    setPlayerEffects((effects) => effects.map((effect) => ({ ...effect, duration: effect.duration - 1 })).filter((effect) => effect.duration > 0));
    setEnemyEffects((effects) => effects.map((effect) => effect.id === "rage" ? effect : ({ ...effect, duration: effect.duration - 1 })).filter((effect) => effect.id === "rage" || effect.duration > 0));

    window.setTimeout(() => {
      const nextRound = round + 1;
      setRound(nextRound);
      setAp(effectiveMaxAp);
      setFocus((current) => clamp(current + 8, 0, MAX_FOCUS));
      setHealUsedThisRound(false);
      setSumibitoCooldown((current) => Math.max(0, current - 1));
      if (nextRound >= 9) {
        const unstableRage: BattleEffect = {
          id: "unstable-rage",
          name: "Нестабильность",
          icon: "⚠",
          duration: 2,
          type: "negative",
          target: "enemy",
          description: "На последних раундах сила Oni-404 возрастает.",
        };
        setEnemyEffects((effects) => [...effects.filter((effect) => effect.id !== unstableRage.id), unstableRage]);
      }
      setPhase("PLAYER_TURN");
      setActionLabel("Твой ход");
      addLog(`Раунд ${nextRound}. AP восстановлены: ${effectiveMaxAp}/${effectiveMaxAp}.`);
    }, scaledDelay(420));
  }

  function performEndTurn() {
    if (phase !== "PLAYER_TURN" || oniHp <= 0) return;

    setEndTurnConfirmOpen(false);
    setAp(0);
    setPhase("ENEMY_TURN");
    setActionLabel("Ход противника");
    addLog(`Раунд ${round}: инициатива передана Oni-404.`);

    window.setTimeout(() => {
      if (enemyEffects.some((effect) => effect.id === "stunned")) {
        showOniPopup("ОГЛУШЕН");
        setSprite(getIdleSpriteKey());
        setEnemyEffects((effects) => effects.filter((effect) => effect.id !== "stunned"));
        addLog("Oni-404 оглушён и пропускает действие.");
        startNextRoundAfterEnemy();
        return;
      }

      const shieldMultiplier = playerEffects.some((effect) => effect.id === "shield") ? 0.65 : 1;
      const weaknessMultiplier = enemyEffects.some((effect) => effect.id === "weakened") ? 0.8 : 1;
      const unstableBonus = enemyEffects.some((effect) => effect.id === "unstable-rage") ? 8 : 0;

      if (oniEnraged) {
        const rageVariants = [
          { key: "rageAttack1", name: "яростный разрез", baseMin: 10, baseMax: 16 },
          { key: "rageAttack2", name: "рваный выпад", baseMin: 11, baseMax: 17 },
          { key: "rageAttack3", name: "разломный рёв", baseMin: 12, baseMax: 18 },
        ] as const;

        const performComboStrike = (index: number, currentHp: number) => {
          if (index >= rageVariants.length) {
            setSprite("rageIdle");
            if (currentHp <= 0) {
              setPhase("DEFEAT");
              setActionLabel("Поражение");
              hapticNotify("error");
              clearFoodRun();
              addLog("Охотник пал под серией яростных ударов Oni-404.");
              return;
            }
            if (round >= MAX_ROUNDS) {
              setPhase("DEFEAT");
              setActionLabel("Разлом нестабилен");
              hapticNotify("error");
              clearFoodRun();
              addLog("Лимит раундов исчерпан. Разлом стал нестабильным.");
              return;
            }
            startNextRoundAfterEnemy();
            return;
          }

          const variant = rageVariants[index];
          const rawDamage = Math.round((randomInt(variant.baseMin, variant.baseMax) + 5 + unstableBonus) * shieldMultiplier * weaknessMultiplier);
          const protectedHit = resolveFoodProtectedDamage(currentHp, rawDamage);
          const damage = protectedHit.damage;
          const nextPlayerHp = protectedHit.nextHp;

          setSprite(variant.key);
          playOniRagePunchSound();
          playPlayerHitSound();
          showPlayerPopup(protectedHit.mochiTriggered ? `МОТИ · ${nextPlayerHp} HP` : `-${damage}`);
          setPlayerHp(nextPlayerHp);
          setPlayerShake(true);
          window.setTimeout(() => setPlayerShake(false), scaledDelay(520));
          hapticImpact("heavy");
          addLog(`Oni-404 в ярости использует «${variant.name}» [${index + 1}/3]: -${damage} HP.`);

          window.setTimeout(() => performComboStrike(index + 1, nextPlayerHp), scaledDelay(1700));
        };

        performComboStrike(0, playerHp);
        return;
      }

      const attackVariant = oniAttackVariants[randomInt(0, oniAttackVariants.length - 1)];
      const rawIncomingDamage = Math.round((randomInt(14, 24) + unstableBonus) * shieldMultiplier * weaknessMultiplier);
      const protectedHit = resolveFoodProtectedDamage(playerHp, rawIncomingDamage);
      const shieldedDamage = protectedHit.damage;
      const nextPlayerHp = protectedHit.nextHp;

      setSprite(attackVariant.key);
      playRandomOniAttackSound();
      playPlayerHitSound();
      showPlayerPopup(protectedHit.mochiTriggered ? `МОТИ · ${nextPlayerHp} HP` : `-${shieldedDamage}`);
      setPlayerHp(nextPlayerHp);
      setPlayerShake(true);
      window.setTimeout(() => setPlayerShake(false), scaledDelay(420));
      hapticImpact("heavy");
      addLog(`Oni-404 использует «${attackVariant.name}»: -${shieldedDamage} HP.`);

      window.setTimeout(() => {
        if (nextPlayerHp <= 0) {
          setPhase("DEFEAT");
          setActionLabel("Поражение");
          hapticNotify("error");
          clearFoodRun();
          addLog("Охотник пал. Разлом остался открытым.");
          return;
        }

        if (round >= MAX_ROUNDS) {
          setPhase("DEFEAT");
          setActionLabel("Разлом нестабилен");
          hapticNotify("error");
          clearFoodRun();
          addLog("Лимит раундов исчерпан. Разлом стал нестабильным.");
          return;
        }

        startNextRoundAfterEnemy();
      }, scaledDelay(820));
    }, scaledDelay(360));
  }

  function restartBattle() {

    withUiFeedback(() => {
      // The existing looped background video remains mounted and is never replaced or rewound.
      resetBattle();
    });
  }

  async function toggleSound() {
    playUiClickSound();
    if (soundEnabled) {
      stopArenaSound();
      stopCreatorSound();
      stopHubSound();
      stopRamenSound();
      stopHomeSound();
      setSoundEnabled(false);
      localStorage.setItem("yokai.sound.enabled", "false");
      return;
    }

    await enableSound();
    setSoundEnabled(isSoundEnabled());
    localStorage.setItem("yokai.sound.enabled", "true");
  }

  function openMenu() {
    playUiClickSound();
    setMenuView("menu");
    setMenuOpen(true);
  }

  function cyclePreset(direction: -1 | 1) {
    playPresetSwitchSound();
    tg?.HapticFeedback?.impactOccurred("light");
    setCharacter((current) => ({
      ...current,
      presetIndex: wrapIndex(current.presetIndex + direction, 10),
    }));
  }

  function updateCharacter<K extends keyof CharacterState>(key: K, value: CharacterState[K]) {
    setCharacter((current) => ({ ...current, [key]: value }));
  }


  function finishIntro() {
    const video = introVideoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setIntroNeedsStart(false);
    unlockGameAudio()
      .then(() => startHubSound())
      .catch(() => {});
    setScreen("hub");
  }

  function startIntroManually() {
    const video = introVideoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 0.9;
    video.play()
      .then(() => {
        setIntroMuted(false);
        setIntroNeedsStart(false);
      })
      .catch(() => {});
  }

  function enableIntroSound() {
    const video = introVideoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 0.9;
    setIntroMuted(false);
    video.play().catch(() => setIntroNeedsStart(true));
  }

  if (screen === "intro") {
    return (
      <main className="gameIntroScreen">
        <div
          className="gameIntroAmbient"
          style={{ backgroundImage: `url(${INTRO_POSTER})` }}
          aria-hidden="true"
        />

        <div className="gameIntroStage">
          <video
            ref={introVideoRef}
            className="gameIntroVideo"
            src={INTRO_VIDEO}
            poster={INTRO_POSTER}
            playsInline
            preload="auto"
            onEnded={finishIntro}
            onError={finishIntro}
          />

          <div className="gameIntroTopControls">
            {introMuted && !introNeedsStart && (
              <button type="button" className="gameIntroSoundButton" onClick={enableIntroSound}>
                🔊 Включить звук
              </button>
            )}
            <button type="button" className="gameIntroSkipButton" onClick={finishIntro}>
              Пропустить
            </button>
          </div>

          {introNeedsStart && (
            <button type="button" className="gameIntroStartButton" onClick={startIntroManually}>
              <span>▶</span>
              Смотреть интро
            </button>
          )}
        </div>
      </main>
    );
  }

  if (screen === "hub") {
    return (
      <main className={`hubScreen hubAnimatedBg ${hubReady ? "hubReady" : "hubBooting"}`}>
        <div className="hubBackdrop" style={{ backgroundImage: `url(${HUB_MAP_IMAGE})` }} aria-hidden="true" />
        <div className="hubShade" aria-hidden="true" />
        <div className="hubGlitchLayer" aria-hidden="true" />

        <header className="hubTopHud">
          <div className="hubIdentity">
            <span>YOKAI.EXE // HUB NODE</span>
            <strong>НЕОНОВЫЙ РАЙОН</strong>
          </div>
          <div className="hubTopActions">
            <span className="hubEconomyBalance" aria-label={`Монеты Разлома: ${riftCoins}`}><i>◉</i><b>{riftCoins}</b><small>МОНЕТЫ РАЗЛОМА</small></span>
            <span className="hubOnline"><i /> ONLINE</span>
            <button type="button" onClick={toggleSound} aria-label="Звук хаба">{soundEnabled ? "🔊" : "🔇"}</button>
          </div>
        </header>

        <div className="hubViewport">
          <div className="hubMapCanvas">
            <img
              className="hubMapImage hubMapFallback"
              src={HUB_MAP_IMAGE}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            {!hubVideoFailed && (
              <video
                ref={hubVideoRef}
                className={`hubMapImage hubMapVideo ${hubVideoReady ? "isReady" : ""}`}
                poster={HUB_MAP_IMAGE}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                aria-hidden="true"
                tabIndex={-1}
                onCanPlay={(event) => {
                  event.currentTarget.muted = true;
                  event.currentTarget.play().catch(() => {});
                }}
                onPlaying={() => {
                  setHubVideoReady(true);
                  setHubVideoFailed(false);
                }}
                onError={() => {
                  setHubVideoReady(false);
                  setHubVideoFailed(true);
                }}
              >
                <source src={HUB_MAP_VIDEO} type="video/mp4" />
              </video>
            )}
            <div className="hubWaterGlow" aria-hidden="true" />
            <div className="hubMist hubMistOne" aria-hidden="true" />
            <div className="hubMist hubMistTwo" aria-hidden="true" />
            <div className="hubPortalPulse" aria-hidden="true" />
            <div className="hubRamenSteam hubRamenSteamOne" aria-hidden="true" />
            <div className="hubRamenSteam hubRamenSteamTwo" aria-hidden="true" />
            <span className="hubWisp hubWispOne" aria-hidden="true" />
            <span className="hubWisp hubWispTwo" aria-hidden="true" />
            <span className="hubWisp hubWispThree" aria-hidden="true" />

            <button
              type="button"
              className={`hubHotspot hubWardrobe ${hubLocation === "wardrobe" ? "selected" : ""} ${koiTutorialOpen && activeKoiStep.target === "wardrobe" ? "koiTutorialTarget" : ""}`}
              aria-label="Открыть Примерочную"
              disabled={hubInteractionLocked}
              onMouseEnter={() => setHubLocation("wardrobe")}
              onMouseLeave={() => setHubLocation(null)}
              onFocus={() => setHubLocation("wardrobe")}
              onBlur={() => setHubLocation(null)}
              onClick={() => openHubLocation("wardrobe")}
            >
              {koiTutorialOpen && activeKoiStep.target === "wardrobe" && <span className="koiTutorialMapArrow" aria-hidden="true" />}
              <span className="hubHotspotFrame" />
              <span className="hubTooltip"><b>ПРИМЕРОЧНАЯ</b><small>Создать или изменить охотника</small><em>ДОСТУПНО</em></span>
            </button>

            <button
              type="button"
              className={`hubHotspot hubHome ${hubLocation === "home" ? "selected" : ""} ${koiTutorialOpen && activeKoiStep.target === "home" ? "koiTutorialTarget" : ""}`}
              aria-label="Открыть Дом охотника"
              disabled={hubInteractionLocked}
              onMouseEnter={() => setHubLocation("home")}
              onMouseLeave={() => setHubLocation(null)}
              onFocus={() => setHubLocation("home")}
              onBlur={() => setHubLocation(null)}
              onClick={() => openHubLocation("home")}
            >
              <img
                className={`koiTutorialHomeMarker ${koiTutorialOpen && activeKoiStep.target === "home" ? "isTutorialActive" : "isPersistent"}`}
                src={KOI_TUTORIAL_HOME_MARKER}
                alt=""
                aria-hidden="true"
              />
              <span className="hubHotspotFrame" />
              <span className="hubTooltip"><b>ДОМ ОХОТНИКА</b><small>Инвентарь, задания и бестиарий</small><em>{homeOpening ? "ОТКРЫТИЕ..." : "ДОСТУПНО"}</em></span>
            </button>

            <button
              type="button"
              className={`hubHotspot hubRifts ${hubLocation === "rifts" ? "selected" : ""} ${koiTutorialOpen && activeKoiStep.target === "rifts" ? "koiTutorialTarget" : ""}`}
              aria-label="Открыть карту Разломов"
              disabled={hubInteractionLocked}
              onMouseEnter={() => setHubLocation("rifts")}
              onMouseLeave={() => setHubLocation(null)}
              onFocus={() => setHubLocation("rifts")}
              onBlur={() => setHubLocation(null)}
              onClick={() => openHubLocation("rifts")}
            >
              {koiTutorialOpen && activeKoiStep.target === "rifts" && <span className="koiTutorialMapArrow" aria-hidden="true" />}
              <span className="hubHotspotFrame" />
              <span className="hubTooltip"><b>РАЗЛОМЫ</b><small>Активные экспедиции и сражения</small><em>АКТИВНО</em></span>
            </button>

            <button
              type="button"
              className={`hubHotspot hubRamen ${hubLocation === "ramen" ? "selected" : ""} ${koiTutorialOpen && activeKoiStep.target === "ramen" ? "koiTutorialTarget" : ""}`}
              aria-label="Открыть раменную"
              disabled={hubInteractionLocked}
              onMouseEnter={() => setHubLocation("ramen")}
              onMouseLeave={() => setHubLocation(null)}
              onFocus={() => setHubLocation("ramen")}
              onBlur={() => setHubLocation(null)}
              onClick={() => openHubLocation("ramen")}
            >
              {koiTutorialOpen && activeKoiStep.target === "ramen" && <span className="koiTutorialMapArrow" aria-hidden="true" />}
              <span className="hubHotspotFrame" />
              <span className="hubTooltip"><b>РАМЕННАЯ</b><small>Еда и баффы перед разломом</small><em>ДОСТУПНО</em></span>
            </button>


            {koiTutorialCompleted && !koiTutorialOpen && !koiReplayConfirmOpen && (
              <button type="button" className="koiHubButton" onClick={openKoiReplayConfirm} aria-label="Открыть обучение KOI">
                <img src={KOI_TUTORIAL_ICON} alt="KOI" />
                <span>KOI</span>
                <small>Открыть обучение</small>
              </button>
            )}

            {koiTutorialOpen && activeKoiStep.target === "ramen" && (
              <section key={`koi-ramen-step-${koiTutorialStep}`} className="koiTutorialRamenSquareCard" role="dialog" aria-modal="true" aria-label="Обучение KOI: Раменная">
                <img className="koiTutorialRamenSquareFrame" src={KOI_TUTORIAL_RAMEN_SQUARE_PANEL} alt="" aria-hidden="true" />
                <div className="koiTutorialRamenSquareCopy">
                  <strong>KOI</strong>
                  <small>{activeKoiStep.title}</small>
                  <p>{koiTutorialMode === "REPLAY" ? activeKoiStep.replayText : activeKoiStep.firstText}</p>
                </div>
                <span className="koiTutorialRamenSquareStep">{koiTutorialStep + 1} / {KOI_TUTORIAL_STEPS.length}</span>
                <div className="koiTutorialRamenSquareControls">
                  <button type="button" onClick={() => moveKoiTutorial(-1)}>← Назад</button>
                  {koiTutorialMode === "REPLAY" && <button type="button" className="ghost" onClick={closeKoiTutorialReplay}>Закрыть</button>}
                  <button type="button" className="primary" onClick={() => moveKoiTutorial(1)}>Далее →</button>
                </div>
              </section>
            )}
          </div>
        </div>

        <footer className="hubBottomHud">
          <span><i className="cyan" /> Примерочная</span>
          <span><i className="pink" /> Дом охотника</span>
          <span><i className="violet" /> Разломы</span>
          <span><i className="orange" /> Раменная</span>
          <small>Нажмите на активную точку района</small>
        </footer>

        {koiReplayConfirmOpen && (
          <div className="koiReplayConfirmOverlay" role="dialog" aria-modal="true" aria-label="Обучение KOI">
            <div className="koiReplayConfirmCard">
              <img src={KOI_TUTORIAL_ICON} alt="KOI" />
              <div>
                <small>ПОМОЩНИЦА KOI</small>
                <h2>Обучение KOI</h2>
                <p>Повторить знакомство с основными локациями?</p>
              </div>
              <div className="koiReplayConfirmActions">
                <button type="button" className="primary" onClick={startKoiReplay}>Начать обучение</button>
                <button type="button" onClick={closeKoiReplayConfirm}>Отмена</button>
              </div>
            </div>
          </div>
        )}

        {koiTutorialOpen && activeKoiStep.target !== "ramen" && (
          <div className="koiTutorialOverlay" role="dialog" aria-modal="true" aria-label={`Обучение KOI: ${activeKoiStep.title}`}>
            <div className="koiTutorialSoftDim" aria-hidden="true" />
            <section key={`koi-step-${koiTutorialStep}`} className={`koiTutorialDialogueStage koiTutorialStep-${activeKoiStep.target || "intro"}`}>
              <div className={`koiTutorialPortrait koiTutorialPortrait-${activeKoiPoseKey}`} aria-hidden="true">
                <img key={activeKoiPose} className="koiTutorialGuide" src={activeKoiPose} alt="" />
              </div>
              <div className="koiTutorialPanel">
                <img src={KOI_TUTORIAL_PANEL} alt="" aria-hidden="true" />
                <div className="koiTutorialCopy">
                  <strong>KOI</strong>
                  <small>{activeKoiStep.title}</small>
                  <p>{koiTutorialMode === "REPLAY" ? activeKoiStep.replayText : activeKoiStep.firstText}</p>
                  <span>{koiTutorialStep + 1} / {KOI_TUTORIAL_STEPS.length}</span>
                </div>
                <div className="koiTutorialControls">
                  {koiTutorialStep > 0 && <button type="button" onClick={() => moveKoiTutorial(-1)}>← Назад</button>}
                  {koiTutorialMode === "REPLAY" && <button type="button" className="ghost" onClick={closeKoiTutorialReplay}>Закрыть</button>}
                  {koiTutorialStep < KOI_TUTORIAL_STEPS.length - 1 ? (
                    <button type="button" className="primary" onClick={() => moveKoiTutorial(1)}>Далее →</button>
                  ) : (
                    <button type="button" className="primary" onClick={finishKoiTutorial}>Завершить</button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {hubToast && <div className="hubToast" role="status"><strong>BETA NODE</strong><span>{hubToast}</span></div>}
        <div className="hubBootMask" aria-hidden="true"><span>YOKAI.EXE</span><b>СИНХРОНИЗАЦИЯ РАЙОНА</b></div>
      </main>
    );
  }

  if (screen === "home") {
    return (
      <HomeSafeNode
        playerName={playerName}
        avatarUrl={portraitSrc(character.gender, creatorVariant, character.presetIndex)}
        level={playerLevel}
        levelXp={playerLevelXp}
        requiredXp={playerRequiredXp}
        riftCoins={riftCoins}
        foodInventory={foodInventory}
        preparedMealId={foodLoadout.mealItemId}
        preparedDrinkId={foodLoadout.drinkItemId}
        firstRiftQuestStatus={firstRiftQuestStatus}
        activeRiftProgress={riftRunActive ? riftDefeatedCount : firstRiftQuestStatus === "ACTIVE" ? 0 : 10}
        oniKills={oniKills}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onBack={backToHub}
        onClaimQuest={claimFirstRiftQuestReward}
        economy={economy}
        onClaimEconomyQuest={claimEconomyQuest}
        onClaimWeeklyReward={claimEconomyWeeklyReward}
        onBuyWeapon={buyWeapon}
        onUpgradeWeapon={improveWeapon}
        onEquipWeapon={selectWeapon}
      />
    );
  }

  if (screen === "ramen") {
    return (
      <RamenShop
        playerName={playerName}
        balance={riftCoins}
        ramenCoupons={economy.ramenCoupons}
        inventory={foodInventory}
        loadout={foodLoadout}
        introduced={ramenShopIntroduced}
        soundEnabled={soundEnabled}
        activeRun={riftRunActive}
        onMarkIntroduced={() => setRamenShopIntroduced(true)}
        onBack={backToHub}
        onToggleSound={toggleSound}
        onPurchase={purchaseFood}
        onPurchaseWithCoupon={purchaseFoodWithCoupon}
        onEquip={equipFood}
        onUnequip={unequipFood}
      />
    );
  }

  if (screen === "rifts") {
    return (
      <main className="riftSelectionV1">
        <header className="riftSelectionTopbar">
          <div className="riftLogoMark">YOKAI<span>.EXE</span></div>
          <button type="button" className="riftBackButton" onClick={backToHub}>← ВЕРНУТЬСЯ В ХАБ</button>
        </header>

        <section className="riftSelectionLayout">
          <aside className="riftHunterPanel">
            <div className="riftHunterAvatar">
              <img src={portraitSrc(character.gender, creatorVariant, character.presetIndex)} alt={playerName} />
            </div>
            <strong>{playerName}</strong>
            <div className="riftHunterDivider" />
            <span>УРОВЕНЬ</span>
            <b>{playerLevel}</b>
            <div className="riftXpTrack" aria-label={`Опыт ${playerLevelXp} из ${playerRequiredXp}`}><i style={{ width: `${Math.min(100, (playerLevelXp / playerRequiredXp) * 100)}%` }} /></div>
            <small>{playerLevelXp}/{playerRequiredXp} XP</small>
            <div className="riftHunterStats">
              <span>Закрыто разломов</span>
              <b>{closedRifts.length}/{MAX_RIFTS}</b>
            </div>
          </aside>

          <section className="riftCatalogPanel">
            <div className="riftCatalogHeading">
              <div>
                <small>YOKAI.EXE // RIFT NETWORK</small>
                <h1>ВЫБОР РАЗЛОМА</h1>
              </div>
              <button type="button" className="riftSoundButton" onClick={toggleSound}>{soundEnabled ? "🔊" : "🔇"}</button>
            </div>

            <div className="riftFiltersRow">
              <button type="button" className="active">ВСЕ</button>
            </div>

            <div className="riftPortalGrid" role="list" aria-label="Список разломов">
              {Array.from({ length: MAX_RIFTS }).map((_, index) => {
                const riftId = index + 1;
                const tone = getRiftTone(riftId);
                const isClosed = closedRifts.includes(riftId);
                const isAvailable = riftId <= highestUnlockedRift || isClosed;
                const isSelected = selectedRift === riftId;
                return (
                  <button
                    type="button"
                    key={riftId}
                    className={`riftPortalCard tone-${tone} ${isSelected ? "selected" : ""} ${isClosed ? "closed" : ""} ${!isAvailable ? "locked" : ""}`}
                    onClick={() => isAvailable && setSelectedRift(riftId)}
                    disabled={!isAvailable}
                    aria-label={`Разлом ${riftId}${isClosed ? ", закрыт" : isAvailable ? ", доступен" : ", заблокирован"}`}
                  >
                    <span className="riftPortalNumber">{riftId}</span>
                    <span className="riftPortalVisual" aria-hidden="true" style={{ animationDelay: `${-(riftId % 7) * 0.19}s` }}>
                      <img src={getRiftPortalAsset(tone)} alt="" draggable={false} />
                    </span>
                    {isClosed && <span className="riftPortalState">✓</span>}
                    {!isAvailable && <span className="riftPortalLock">LOCK</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className={`riftDetailPanel tone-${selectedRiftTone}`}>
            <span className="riftDetailIndex">РАЗЛОМ {selectedRift}</span>
            <h2>{getRiftTitle(selectedRift)}</h2>
            <strong>РАЗЛОМ УР. {selectedRift}</strong>
            <div className="riftDetailPortal" aria-hidden="true">
              <span className="riftDetailPortalAura" />
              <img src={getRiftPortalAsset(selectedRiftTone, true)} alt="" draggable={false} />
            </div>
            <p>{getRiftDescription(selectedRift)}</p>

            <div className="riftDetailDivider" />
            <span className="riftDetailLabel">ОСОБЕННОСТЬ</span>
            <div className="riftFeatureRow rageFeature">
              <span className="riftFeatureIcon"><img src={BATTLE_EFFECT_ICONS.rage} alt="" aria-hidden="true" /></span>
              <span className="riftFeatureCopy"><strong>ЯРОСТЬ</strong><small>Урон +30% после 50% HP</small></span>
              <span className="riftFeatureState">ПОСТОЯННО</span>
            </div>

            <div className="riftRunRules">
              <span>УСЛОВИЕ ЗАКРЫТИЯ</span>
              <strong>Победить 10 ёкаев подряд</strong>
              <small>Поражение или выход сбрасывает прогресс текущего захода.</small>
            </div>

            <div className="riftRewardPreview">
              <span>НАГРАДА ЗА ЗАКРЫТИЕ</span>
              <strong>+{selectedRiftRewardPreview.awardedCoins} монет · XP за каждого ёкая</strong>
              <small>{selectedRiftRewardPreview.firstClear ? `Включён бонус первого закрытия: +${selectedRiftRewardPreview.firstClearBonus}.` : "Повторное прохождение без бонуса первого закрытия."}</small>
            </div>

            {selectedRiftClosed && <div className="riftClosedBadge">✓ РАЗЛОМ ЗАКРЫТ</div>}
            {!selectedRiftAvailable && <div className="riftLockedMessage">Закройте предыдущий разлом</div>}

            {(foodLoadout.mealItemId || foodLoadout.drinkItemId) && (
              <div className="riftFoodLoadoutPreview">
                <span>ПОДГОТОВКА ИЗ РАМЕННОЙ</span>
                {[foodById(foodLoadout.mealItemId), foodById(foodLoadout.drinkItemId)].filter(Boolean).map((item) => (
                  <div key={item!.id}><img src={item!.imageUrl} alt="" /><p><strong>{item!.name}</strong><small>{item!.effectLabel}</small></p><b>×{foodInventory[item!.id] || 0}</b></div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="riftEnterButtonV1"
              onClick={beginBattle}
              disabled={!selectedRiftAvailable}
            >
              {selectedRiftClosed ? "ВОЙТИ СНОВА" : "ВОЙТИ В РАЗЛОМ"}
            </button>
          </aside>
        </section>
        {pendingFoodConfirm && (
          <div className="riftFoodConfirmOverlay" role="dialog" aria-modal="true" aria-label="Подтверждение использования еды">
            <div className="riftFoodConfirmCard">
              <span>ПОДГОТОВКА К ЗАБЕГУ</span>
              <h2>Использовать подготовленную еду?</h2>
              <p>Предметы будут списаны после подтверждения и будут действовать на протяжении всех 10 боёв.</p>
              <div className="riftFoodConfirmItems">
                {[foodById(foodLoadout.mealItemId), foodById(foodLoadout.drinkItemId)].filter(Boolean).map((item) => (
                  <div key={item!.id}><img src={item!.imageUrl} alt="" /><div><strong>{item!.name}</strong><small>{item!.effectLabel}</small></div><b>×{foodInventory[item!.id] || 0}</b></div>
                ))}
              </div>
              {riftFoodError && <div className="riftFoodConfirmError" role="alert">{riftFoodError}</div>}
              <div className="riftFoodConfirmActions">
                <button type="button" disabled={riftEntryPending} onClick={() => { setRiftFoodError(null); setPendingFoodConfirm(false); }}>ОТМЕНА</button>
                <button type="button" disabled={riftEntryPending} onClick={() => startRiftRunWithFood(false)}>{riftEntryPending ? "ВХОД..." : "ВОЙТИ БЕЗ ЕДЫ"}</button>
                <button type="button" className="primary" disabled={riftEntryPending} onClick={() => startRiftRunWithFood(true)}>{riftEntryPending ? "ПОДГОТОВКА..." : "ИСПОЛЬЗОВАТЬ И ВОЙТИ"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (screen === "creator") {
    return (
      <main className="refCreatorShell">
        <div className="refCreatorViewport">
          <div className="refCreatorCanvas">
            <img
              className="refCanvasBg"
              src={CREATOR_BACKGROUND}
              alt=""
              aria-hidden="true"
              draggable={false}
            />

            <div className="refHeadingBlock">
              <span>YOKAI.EXE</span>
              <h1>Создание персонажа</h1>
              <img
                src={CREATOR_TITLE_IMAGE}
                alt="Создание персонажа"
                className="refHeadingImage"
                draggable={false}
                aria-hidden="true"
              />
            </div>

            <button className="refSoundButton" onClick={toggleSound}>
              {soundEnabled ? "🔊 Музыка" : "🔇 Без звука"}
            </button>

            <button className="refHubReturnButton" onClick={backToHub}>← Вернуться в хаб</button>

            <div className="refPreviewPanel">
              <CreatorPreview
                character={character}
                playerName={playerName}
                variant={creatorVariant}
                onPrev={() => cyclePreset(-1)}
                onNext={() => cyclePreset(1)}
              />
            </div>

            <section className="refFormPanel">
              <label className="refField refFieldBlock">
                <span className="refFieldLabel">Имя</span>
                <input
                  value={character.name}
                  onChange={(event) => updateCharacter("name", event.target.value)}
                  placeholder="Введите имя"
                />
              </label>

              <label className="refField refFieldBlock">
                <span className="refFieldLabel">Клан</span>
                <span className="refSelectWrap">
                  <select
                    value={character.clan}
                    onChange={(event) => {
                      playUiClickSound();
                      updateCharacter("clan", event.target.value);
                    }}
                  >
                    {clanOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <span className="refSelectChevron" aria-hidden="true">⌄</span>
                </span>
              </label>

              <label className="refField refFieldBlock">
                <span className="refFieldLabel">Любимая вещь</span>
                <input
                  value={character.favoriteThing}
                  onChange={(event) => updateCharacter("favoriteThing", event.target.value)}
                  placeholder="Введите вещь"
                />
              </label>

              <div className="refControlBlock">
                <span className="refFieldLabel">Пол</span>
                <div className="refChoiceRow refGenderRow">
                  <button
                    type="button"
                    className={character.gender === "male" ? "active" : ""}
                    aria-pressed={character.gender === "male"}
                    onClick={() => withUiFeedback(() => updateCharacter("gender", "male"))}
                  >
                    ♂ Мужской
                  </button>
                  <button
                    type="button"
                    className={character.gender === "female" ? "active" : ""}
                    aria-pressed={character.gender === "female"}
                    onClick={() => withUiFeedback(() => updateCharacter("gender", "female"))}
                  >
                    ♀ Женский
                  </button>
                </div>
              </div>

              <div className="refControlBlock refModeBlock">
                <span className="refFieldLabel">Набор отображения</span>
                <div className="refChoiceRow refModeRow">
                  {creatorVariantCards.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={creatorVariant === item.id ? "active" : ""}
                      aria-pressed={creatorVariant === item.id}
                      onClick={() => withUiFeedback(() => setCreatorVariant(item.id))}
                    >
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="refInfoPanel">
              <strong>Создай своего охотника</strong>
              <p>Подготовь персонажа перед первым входом в разлом.</p>
              <ul>
                <li>Укажи имя, клан и любимую вещь.</li>
                <li>Выбери пол и готовый образ персонажа.</li>
                <li>Выбери спутника, который отправится с тобой.</li>
              </ul>
              <p className="refInfoNote">Когда всё готово, нажми «Войти в разлом».</p>
            </section>

            <section className="refGuardianPanel" aria-label="Знак хранителя">
              <div>
                <strong>Знак хранителя</strong>
                <span>Функция в бете — пока нельзя выбрать</span>
              </div>
            </section>

            <section className="refAnimalsSection" aria-label="Выберите спутника">
              <div className="refAnimalsTitleBlock">
                <strong>Выберите спутника!</strong>
              </div>
              <div className="refAnimalsPanel">
                {animalCards.map((animal) => (
                  <button
                    key={animal.id}
                    data-animal={animal.id}
                    className={character.animal === animal.id ? "active" : ""}
                    aria-pressed={character.animal === animal.id}
                    onClick={() => withUiFeedback(() => updateCharacter("animal", animal.id))}
                    aria-label={animal.title}
                    title={animal.title}
                    type="button"
                  >
                    <span className="refAnimalArt">
                      <img src={animal.image} alt="" aria-hidden="true" draggable={false} />
                    </span>
                    <strong>{animal.title}</strong>
                    <span className={`refAnimalCheck ${character.animal === animal.id ? "checked" : ""}`}>
                      {character.animal === animal.id ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="refCreatorFooter">
            <label className="refSkipLabel">
              <input
                type="checkbox"
                checked={character.skipIntro}
                onChange={(event) => {
                  playUiClickSound();
                  updateCharacter("skipIntro", event.target.checked);
                }}
              />
              <span>Пропустить пролог</span>
            </label>

            <button className="refEnterButton" onClick={backToHub} aria-label="Сохранить персонажа и вернуться в хаб">Сохранить и вернуться</button>
          </div>
        </div>
      </main>
    );
  }

  const creatorCompanion = animalCards.find((item) => item.id === character.animal);
  const foodBattleEffects: BattleEffect[] = foodBuffs.map((buff) => ({
    id: `food:${buff.itemId}`,
    name: buff.name,
    icon: "🍜",
    iconImage: buff.imageUrl,
    duration: 99,
    type: "positive",
    target: "player",
    description: `${buff.effectLabel}. Источник: еда из раменной. Действует до конца текущего забега.`,
  }));
  const lowHealthEffect: BattleEffect | null = playerHp <= 45 ? {
    id: "wound",
    name: "Ранение",
    icon: "✚",
    duration: 1,
    type: "negative",
    target: "player",
    description: "HP ниже 45%. Лечение становится особенно важным.",
  } : null;
  const visibleEffects = [...playerEffects, ...enemyEffects, ...foodBattleEffects, ...(lowHealthEffect ? [lowHealthEffect] : [])];
  const panelEffects = [...playerEffects, ...enemyEffects, ...foodBattleEffects]
    .filter((effect) => effect.id === "focus" || effect.id === "rage" || effect.id.startsWith("food:"))
    .sort((a, b) => {
      const order = { focus: 0, rage: 1 } as const;
      if (a.id.startsWith("food:") && !b.id.startsWith("food:")) return 1;
      if (!a.id.startsWith("food:") && b.id.startsWith("food:")) return -1;
      return (order[a.id as keyof typeof order] ?? 9) - (order[b.id as keyof typeof order] ?? 9);
    });
  const actionPreview = ACTION_PREVIEWS[selectedAction];
  const statusBarAsset = phase === "ENEMY_TURN"
    ? BATTLE_STATUS_BARS.enemy
    : phase === "ROUND_END"
      ? BATTLE_STATUS_BARS.update
      : phase === "ACTION_RESOLVING"
        ? BATTLE_STATUS_BARS.action
        : phase === "DEFEAT"
          ? BATTLE_STATUS_BARS.defeat
          : phase === "PLAYER_TURN"
            ? BATTLE_STATUS_BARS.player
            : null;

  return (
    <main className={`gameShell battleShellV2 battlePhase-${phase.toLowerCase()} effects-${battleSettings.effectsQuality}`}>
      <div className="videoBackground">
        <video ref={bgVideoRef} autoPlay muted loop playsInline preload="auto">
          <source src="/assets/video/portal_bg.mp4?v=71" type="video/mp4" />
        </video>
      </div>
      <div className="darkOverlay" />

      <header className="battleTopGrid">
        <div className="battleLeftStack">
        <button
          type="button"
          className={`battlePlayerCard battleGlassPanel ${playerShake ? "takingDamage" : ""} ${playerHealGlow ? "healing" : ""}`}
          aria-label="Открыть характеристики охотника"
          onClick={() => setPlayerStatsOpen(true)}
        >
          <BattlePortrait character={character} variant={creatorVariant} />
          <div className="battlePlayerInfo">
            <div className="battleCardHeading">
              <div>
                <small>YOKAI.EXE // ОХОТНИК</small>
                <strong>{playerName}</strong>
              </div>
              <span>Ур. {playerLevel}</span>
            </div>

            <span className="battlePlayerJapanese">オハンター</span>

            <div className="battleStatRow playerHealthStat">
              <span className="battleStatGlyph">♥</span>
              <div className="battleStatTrack"><i style={{ width: `${percent(playerHp, effectiveMaxPlayerHp)}%` }} /></div>
              <b>{playerHp}/{effectiveMaxPlayerHp}</b>
            </div>

            <div className="battleStatRow playerEnergyStat">
              <span className="battleStatGlyph">◆</span>
              <div className="battleStatTrack"><i style={{ width: `${percent(focus, MAX_FOCUS)}%` }} /></div>
              <b>{focus}/{MAX_FOCUS}</b>
            </div>

            <div className="battleMiniEffects" aria-label="Активные эффекты">
              {playerEffects.slice(0, 3).map((effect) => (
                <span key={effect.id} title={effect.name}>
                  {effect.iconImage ? <img src={effect.iconImage} alt="" aria-hidden="true" /> : <b>{effect.icon}</b>}
                  <small>{effect.duration}</small>
                </span>
              ))}
              {playerEffects.length === 0 && <span className="emptyMiniEffect">—</span>}
            </div>
          </div>
        </button>

        <aside className={`battleSidePanel turnQueuePanel battleGlassPanel ${mobileQueueOpen ? "mobileOpen" : ""}`} aria-label="Очередь ходов">
          <div className="battleSideTitle"><span>Очередь ходов</span><button onClick={() => setMobileQueueOpen(false)}>✕</button></div>
          <div className="turnQueueList">
            <div className={`turnQueueUnit ${phase === "PLAYER_TURN" || phase === "ACTION_RESOLVING" ? "active player" : ""}`}>
              <img src={portraitSrc(character.gender, creatorVariant, character.presetIndex)} alt={playerName} /><span>{enemyTurn ? 2 : 1}</span>
            </div>
            {summonedVisible && creatorCompanion && (
              <div className="turnQueueUnit active companion"><img src={creatorCompanion.image} alt={creatorCompanion.title} /><span>+</span></div>
            )}
            <div className={`turnQueueUnit ${enemyTurn ? "active enemy" : ""}`}>
              <img src={ONI_QUEUE_ICON} alt="Oni-404" /><span>{enemyTurn ? 1 : 2}</span>
            </div>
          </div>
        </aside>

        </div>

        <section className={`battleEnemyCard battleGlassPanel ${oniHp <= 30 ? "lowHp" : ""} ${oniCriticalFlash ? "criticalFlash" : ""} ${oniEnraged ? "enraged" : ""}`} aria-label="Состояние Oni-404">
          <div className="enemyPortraitV2"><img src={activeEnemyPortrait} alt="Oni-404" /></div>
          <div className="battleEnemyInfo">
            <div className="battleCardHeading enemyHeading">
              <div>
                <small>КИБЕР-ОНИ // ЭЛИТНЫЙ ДУХ</small>
                <strong>Oni-404</strong>
              </div>
              <span className={`threatBadge ${oniEnraged ? "critical" : "high"}`}>{oniEnraged ? "Угроза: критическая" : "Угроза: высокая"}</span>
            </div>
            <div className="enemyMetaLine"><span>Ур. 1</span><span>Стихия: Разлом</span></div>
            <div className="battleEnemyHealthLine">
              <div className="battleEnemyTrack"><i style={{ width: `${percent(oniHp, MAX_ONI_HP)}%` }} /></div>
              <b>{oniHp}/{MAX_ONI_HP}</b>
            </div>
          </div>
          <button type="button" className="enemySealBadge" onClick={() => setEnemyInfoOpen(true)} aria-label="Информация о противнике">
            <img src={BATTLE_ACTION_ICONS.seal} alt="" />
          </button>
        </section>

        <div className="battleRightStack">
        <aside className="battleControlRail">
          <div className="battleControlIcons">
            <button className={`battleIconButton soundControl ${soundEnabled ? "" : "muted"}`} onClick={toggleSound} aria-label="Звук"><img src={BATTLE_REFERENCE_ICONS.sound} alt="" /></button>
            <button className="battleIconButton infoControl" onClick={() => setInfoOpen(true)} aria-label="Информация"><img src={BATTLE_REFERENCE_ICONS.info} alt="" /></button>
            <button className="battleIconButton settingsControl" onClick={() => setSettingsOpen(true)} aria-label="Настройки"><img src={BATTLE_REFERENCE_ICONS.settings} alt="" /></button>
          </div>
          <button className={`battleRoundPanel ${round >= 9 ? "urgent" : ""}`} onClick={() => setLogOpen(true)} aria-label="Открыть журнал боя">
            <span className="roundGlyph"><img src={BATTLE_REFERENCE_ICONS.round} alt="" /></span>
            <span className="roundCopy"><strong>РАУНД {round}</strong><em>{phase === "ENEMY_TURN" ? "ХОД ПРОТИВНИКА" : phase === "ACTION_RESOLVING" ? "ВЫПОЛНЕНИЕ ДЕЙСТВИЯ" : "ХОД ИГРОКА"}</em><i>РАЗЛОМ {selectedRift} · ONI {Math.min(riftDefeatedCount + 1, RIFT_ENCOUNTERS)}/{RIFT_ENCOUNTERS}</i></span>
            <small>{round}/{MAX_ROUNDS}</small>
          </button>
          <button className="battleSurrenderButton" disabled={phase !== "PLAYER_TURN"} onClick={() => setSurrenderOpen(true)}><img src={BATTLE_REFERENCE_ICONS.retreat} alt="" /><span>ОТСТУПИТЬ</span></button>
        </aside>

        <aside className={`battleSidePanel effectsPanel battleGlassPanel ${mobileEffectsOpen ? "mobileOpen" : ""}`} aria-label="Боевые эффекты">
          <div className="battleSideTitle"><span>Эффекты</span><button onClick={() => setMobileEffectsOpen(false)}>✕</button></div>
          <div className="battleEffectsList">
            {panelEffects.map((effect) => {
              const durationMeta = effect.id.startsWith("food:")
                ? "ДО КОНЦА ЗАБЕГА"
                : effect.id === "rage" && oniEnraged
                  ? "ПОСТОЯННО"
                  : `${formatTurnCount(effect.duration)} ${turnWord(effect.duration)}`.toUpperCase();
              return (
                <button key={`${effect.target}-${effect.id}`} className={`battleEffectItem ${effect.id} ${effect.type} active`} onClick={() => setSelectedEffect(effect)}>
                  <span className="battleEffectIcon">
                    {effect.iconImage ? <img src={effect.iconImage} alt="" aria-hidden="true" /> : effect.icon}
                  </span>
                  <span className="battleEffectCopy">
                    <strong>{effect.name.toUpperCase()}</strong>
                    <small>{effectSummary(effect)}</small>
                  </span>
                  <span className="battleEffectDuration"><b>{durationMeta}</b><i aria-hidden="true" /></span>
                </button>
              );
            })}
            {panelEffects.length === 0 && <p className="emptyEffects">Нет активных эффектов</p>}
          </div>
        </aside>
        </div>
      </header>

      <div className="battleMobileUtilityBar">
        <button type="button" onClick={() => setMobileQueueOpen((open) => !open)}>Очередь</button>
        <span className={`mobilePhaseBadge ${enemyTurn ? "enemy" : "player"}`}>{actionLabel}</span>
        <button type="button" onClick={() => setMobileEffectsOpen((open) => !open)}>Эффекты {visibleEffects.length}</button>
      </div>

      <section className="battleArenaGrid">
        <section className="battleStage">
          <div className={`battleTurnSignal ${phase === "ENEMY_TURN" ? "enemy" : phase === "ACTION_RESOLVING" || phase === "ROUND_END" ? "resolving" : "player"}`}>{actionLabel}</div>

          {oniDamagePopup && <div className={`damagePopup oniDamage ${oniDamagePopup.includes("КРИТ") ? "critical" : ""}`}>{oniDamagePopup}</div>}
          {playerDamagePopup && <div className={`damagePopup playerDamage ${playerDamagePopup.startsWith("+") ? "healingNumber" : ""}`}>{playerDamagePopup}</div>}

          {summonedVisible && creatorCompanion && <img className="sumibitoBattleSprite" src={creatorCompanion.image} alt={creatorCompanion.title} />}

          <button
            type="button"
            className={`monsterTarget ${targetSelected ? "selected" : ""}`}
            onClick={() => setTargetSelected((selected) => !selected)}
            aria-label="Выбрать Oni-404 целью"
          >
            <img
              key={sprite}
              className={`monster ${sprite} ${oniHit ? "hit" : ""} ${oniCriticalFlash ? "critical" : ""}`}
              src={sprites[sprite]}
              alt="Oni-404"
            />
          </button>

          {targetSelected && !battleFinished && (
            <div className="targetForecast battleGlassPanel">
              <div><strong>Oni-404</strong><span>{oniHp}/{MAX_ONI_HP} HP</span></div>
              <p>{actionPreview.label}: <b>{selectedAction === "seal" ? `${sealChance}%` : actionPreview.damage}</b></p>
              <small>{actionPreview.detail}</small>
              <small>Эффекты: {enemyEffects.length ? enemyEffects.map((effect) => effect.name).join(", ") : "нет"}</small>
            </div>
          )}

          {phase === "VICTORY" && (
            <div className="resultCard victoryCard riftResultCard">
              <strong>{riftRunComplete ? `Разлом ${selectedRift} закрыт` : `Ёкай ${riftDefeatedCount} из ${RIFT_ENCOUNTERS} побеждён`}</strong>
              <span>{riftRunComplete ? `+${rewardSummary?.coins || 0} монет · +${rewardSummary?.xp || 20} XP${rewardSummary?.levelUp ? " · НОВЫЙ УРОВЕНЬ" : ""}` : `Осталось противников: ${RIFT_ENCOUNTERS - riftDefeatedCount}`}</span>
              {riftRunComplete && rewardSummary?.breakdown && <div className="riftRewardBreakdown">
                <div><span>9 обычных ёкаев</span><b>+{rewardSummary.breakdown.regularReward}</b></div>
                <div><span>Босс</span><b>+{rewardSummary.breakdown.bossReward}</b></div>
                <div><span>Полное закрытие</span><b>+{rewardSummary.breakdown.completionBonus}</b></div>
                {rewardSummary.breakdown.firstClearBonus > 0 && <div><span>Первое закрытие</span><b>+{rewardSummary.breakdown.firstClearBonus}</b></div>}
                {rewardSummary.breakdown.totalCoefficient < 1 && <div><span>Коэффициент антифарма</span><b>×{rewardSummary.breakdown.totalCoefficient.toFixed(2)}</b></div>}
              </div>}
              {riftRunComplete && <small>Предметы и расходники появятся в будущих обновлениях.</small>}
              <button onClick={continueRiftRun}>{riftRunComplete ? "ВЕРНУТЬСЯ К РАЗЛОМАМ" : "СЛЕДУЮЩИЙ ЁКАЙ"}</button>
            </div>
          )}
          {phase === "SEALED" && (
            <div className="resultCard sealedCard riftResultCard">
              <strong>{riftRunComplete ? `Разлом ${selectedRift} закрыт` : `Ёкай ${riftDefeatedCount} из ${RIFT_ENCOUNTERS} запечатан`}</strong>
              <span>{riftRunComplete ? `+${rewardSummary?.coins || 0} монет · +${rewardSummary?.xp || 20} XP${rewardSummary?.levelUp ? " · НОВЫЙ УРОВЕНЬ" : ""}` : `Осталось противников: ${RIFT_ENCOUNTERS - riftDefeatedCount}`}</span>
              {riftRunComplete && rewardSummary?.breakdown && <div className="riftRewardBreakdown">
                <div><span>9 обычных ёкаев</span><b>+{rewardSummary.breakdown.regularReward}</b></div>
                <div><span>Босс</span><b>+{rewardSummary.breakdown.bossReward}</b></div>
                <div><span>Полное закрытие</span><b>+{rewardSummary.breakdown.completionBonus}</b></div>
                {rewardSummary.breakdown.firstClearBonus > 0 && <div><span>Первое закрытие</span><b>+{rewardSummary.breakdown.firstClearBonus}</b></div>}
                {rewardSummary.breakdown.totalCoefficient < 1 && <div><span>Коэффициент антифарма</span><b>×{rewardSummary.breakdown.totalCoefficient.toFixed(2)}</b></div>}
              </div>}
              {riftRunComplete && <small>Ёкай добавлен в коллекцию. Предметы и расходники — скоро.</small>}
              <button onClick={continueRiftRun}>{riftRunComplete ? "ВЕРНУТЬСЯ К РАЗЛОМАМ" : "СЛЕДУЮЩИЙ ЁКАЙ"}</button>
            </div>
          )}
          {phase === "DEFEAT" && (
            <div className="resultCard defeatCard riftResultCard">
              <strong>Заход провален</strong>
              <span>{round >= MAX_ROUNDS ? "Лимит раундов исчерпан." : "Oni-404 вытолкнул охотника из разлома."}</span>
              <small>Прогресс {riftDefeatedCount}/{RIFT_ENCOUNTERS} будет сброшен.</small>
              <button onClick={restartRiftRun}>НАЧАТЬ ЗАНОВО — 0/10</button>
            </div>
          )}
        </section>

      </section>

      <section className="battleBottomGrid">
        <div className="battleBottomLeftStack">
          {statusBarAsset && (
            <div key={phase} className={`battleDynamicStatusBar status-${phase.toLowerCase()}`} aria-live="polite">
              <img src={statusBarAsset} alt={actionLabel} draggable={false} />
            </div>
          )}
          <div className={`battleApPanel battleGlassPanel ${apError ? "apError" : ""}`} aria-label={`Очки действия ${ap} из ${effectiveMaxAp}`}>
          <div className="battleApRing" style={{ "--ap-angle": `${percent(ap, effectiveMaxAp) * 3.6}deg` }}><div><strong>{ap}</strong><small>AP</small></div></div>
          <div className="battleApDiamonds">{Array.from({ length: effectiveMaxAp }).map((_, index) => <span key={index} className={index < ap ? "filled" : ""} />)}</div>
          </div>
        </div>

        <section className="actionDock actionDockV2 battleGlassPanel">
          <div className="actionGrid battleActionGridV2">
            <BattleSkillButton className="quickSkill" icon={BATTLE_ACTION_ICONS.quickStrike} title="Быстрый удар" cost={1} subtitle="Стабильный урон" locked={actionLocked} unavailable={ap < 1} selected={selectedAction === "quick"} onClick={quickStrike} onPreview={() => setSelectedAction("quick")} />
            <BattleSkillButton className="heavySkill" icon={BATTLE_ACTION_ICONS.heavyAttack} title="Сильная атака" cost={2} subtitle="Шанс критического" locked={actionLocked} unavailable={ap < 2} selected={selectedAction === "heavy"} onClick={heavyAttack} onPreview={() => setSelectedAction("heavy")} />
            <BattleSkillButton className="sealSkill" icon={BATTLE_ACTION_ICONS.seal} title="Печать" cost={3} subtitle={sealBlocked ? "Ослабь противника" : `Шанс ${sealChance}%`} locked={actionLocked} unavailable={ap < 3 || sealBlocked} selected={selectedAction === "seal"} onClick={sealRift} onPreview={() => setSelectedAction("seal")} />
            <BattleSkillButton className="sumibitoSkill" icon={BATTLE_ACTION_ICONS.sumibito} title="Сумибито" cost={2} subtitle={sumibitoCooldown > 0 ? `Перезарядка ${sumibitoCooldown}` : creatorCompanion?.title || "Дух-помощник"} locked={actionLocked} unavailable={ap < 2 || sumibitoCooldown > 0} selected={selectedAction === "sumibito"} onClick={summonSumibito} onPreview={() => setSelectedAction("sumibito")} />
            <BattleSkillButton className="healSkill" icon={BATTLE_ACTION_ICONS.heal} title="Лечение" cost={2} subtitle={healUsedThisRound ? "Уже использовано" : "16–24 HP"} locked={actionLocked} unavailable={ap < 2 || playerHp >= effectiveMaxPlayerHp || healUsedThisRound} selected={selectedAction === "heal"} onClick={recover} onPreview={() => setSelectedAction("heal")} />
            <BattleSkillButton className="endTurnSkill" icon={BATTLE_ACTION_ICONS.endTurn} title={enemyTurn ? "Ход врага…" : "Завершить ход"} subtitle="Передать инициативу" locked={phase !== "PLAYER_TURN"} onClick={requestEndTurn} />
          </div>
        </section>
      </section>

      {menuOpen && (
        <div className="screenOverlay">
          <div className="overlayHeader">
            <button
              className="iconButton"
              onClick={() => menuView === "menu" ? setMenuOpen(false) : setMenuView("menu")}
            >
              {menuView === "menu" ? "✕" : "←"}
            </button>
            <strong>
              {menuView === "menu" && "Меню"}
              {menuView === "profile" && "Профиль"}
              {menuView === "archive" && "Архив"}
            </strong>
            <span />
          </div>

          {menuView === "menu" && (
            <div className="menuList">
              <button onClick={() => setMenuView("profile")}>👤 Профиль охотника <span>›</span></button>
              <button onClick={() => setMenuView("archive")}>🧿 Архив духов <span>›</span></button>
              <button onClick={backToCreator}>🎛 Редактор персонажа <span>›</span></button>
              <button onClick={toggleSound}>{soundEnabled ? "🔊 Выключить звук" : "🔇 Включить звук"}<span>›</span></button>
              <button onClick={() => setInfoOpen(true)}>ⓘ Правила боя <span>›</span></button>
              <button className="dangerMenu" onClick={restartRiftRun}>↻ Начать разлом заново <span>›</span></button>
            </div>
          )}

          {menuView === "profile" && (
            <div className="overlayContent">
              <div className="profileHero">
                <div className="avatar">{playerName.slice(0, 1).toUpperCase()}</div>
                <div><h2>{playerName}</h2><p>{character.gender === "male" ? "Охотник" : "Охотница"} разломов · уровень {playerLevel}</p></div>
              </div>
              <div className="statsGrid">
                <div><span>Макс. HP</span><strong>{effectiveMaxPlayerHp}</strong></div>
                <div><span>AP за ход</span><strong>{effectiveMaxAp}</strong></div>
                <div><span>Клан</span><strong>{character.clan === clanOptions[0] ? "—" : character.clan}</strong></div>
                <div><span>Спутник</span><strong>{creatorCompanion?.title || "—"}</strong></div>
              </div>
            </div>
          )}

          {menuView === "archive" && (
            <div className="overlayContent">
              <div className="archiveCard">
                <img src={activeEnemyPortrait} alt="Oni-404" />
                <div>
                  <span className="rarity">RARE</span>
                  <h2>Oni-404</h2>
                  <p>Oni / Cyber / Spirit</p>
                  <small>Статус: обнаружен</small>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {infoOpen && (
        <div className="modalBackdrop" onClick={() => setInfoOpen(false)}>
          <div className="modalCard battleHelpModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalTitle"><strong>Справка боя</strong><button onClick={() => setInfoOpen(false)}>✕</button></div>
            <div className="helpGrid">
              <section><b>AP</b><p>В начале хода доступно {effectiveMaxAp} AP. Неиспользованные очки сгорают после завершения хода.</p></section>
              <section><b>Способности</b><p>Быстрый удар стабилен, сильная атака может критовать, Сумибито даёт случайную поддержку.</p></section>
              <section><b>Печать</b><p>Ослабляй Oni-404. Чем меньше у него HP, тем выше шанс успешной печати.</p></section>
              <section><b>Эффекты</b><p>Нажми на эффект справа, чтобы увидеть точное описание и длительность.</p></section>
              <section><b>Победа</b><p>Победи или запечатай 10 Oni за один заход. После десятого противника разлом закрывается и выдаёт опыт.</p></section>
              <section><b>Поражение</b><p>Бой завершается, если HP охотника падает до нуля или исчерпан лимит раундов.</p></section>
            </div>
          </div>
        </div>
      )}

      {playerStatsOpen && (
        <div className="modalBackdrop" onClick={() => setPlayerStatsOpen(false)}>
          <div className="modalCard statsModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalTitle"><strong>Характеристики охотника</strong><button onClick={() => setPlayerStatsOpen(false)}>✕</button></div>
            <div className="profileHero battleProfileHero">
              <BattlePortrait character={character} variant={creatorVariant} />
              <div><h2>{playerName}</h2><p>Охотник разломов · уровень {playerLevel}</p></div>
            </div>
            <div className="statsGrid detailedStats">
              <div><span>Атака</span><strong>42</strong></div>
              <div><span>Защита</span><strong>31</strong></div>
              <div><span>Критический шанс</span><strong>18%</strong></div>
              <div><span>Сопротивление разлому</span><strong>24%</strong></div>
              <div><span>HP</span><strong>{playerHp}/{effectiveMaxPlayerHp}</strong></div>
              <div><span>Фокус</span><strong>{focus}/{MAX_FOCUS}</strong></div>
            </div>
            <div className="modalEffectSummary">
              <b>Активные эффекты</b>
              <p>{playerEffects.length ? playerEffects.map((effect) => `${effect.name} (${effect.duration})`).join(" · ") : "Нет активных эффектов"}</p>
            </div>
          </div>
        </div>
      )}

      {enemyInfoOpen && (
        <div className="modalBackdrop" onClick={() => setEnemyInfoOpen(false)}>
          <div className="modalCard enemyIntelModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalTitle"><strong>Данные Oni-404</strong><button onClick={() => setEnemyInfoOpen(false)}>✕</button></div>
            <div className="enemyIntelHero"><img src={sprites.idle} alt="Oni-404" /><div><span className={`threatBadge ${oniEnraged ? "critical" : "high"}`}>{oniEnraged ? "Угроза: критическая" : "Угроза: высокая"}</span><h2>Oni-404</h2><p>Кибер-они · элитный дух разлома</p></div></div>
            <div className="intelRows">
              <div><span>Слабости</span><strong>Печати · духовный урон</strong></div>
              <div><span>Сопротивления</span><strong>Физическое оглушение</strong></div>
              <div><span>Возможные атаки</span><strong>Рывок, клеймо, выброс энергии</strong></div>
              <div><span>Шанс запечатывания</span><strong>{sealBlocked ? "Слишком рано" : `${sealChance}%`}</strong></div>
              <div><span>Награды</span><strong>{getRiftReward(selectedRift)} XP · предметы и расходники — скоро</strong></div>
            </div>
          </div>
        </div>
      )}

      {selectedEffect && (
        <div className="modalBackdrop" onClick={() => setSelectedEffect(null)}>
          <div className="modalCard effectDetailModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalTitle"><strong>{selectedEffect.iconImage ? <img className="effectModalIcon" src={selectedEffect.iconImage} alt="" /> : selectedEffect.icon} {selectedEffect.name}</strong><button onClick={() => setSelectedEffect(null)}>✕</button></div>
            <p>{selectedEffect.description}</p>
            <div className="effectDetailMeta"><span>Цель: {selectedEffect.target === "player" ? playerName : "Oni-404"}</span><strong>{selectedEffect.id.startsWith("food:") ? "До конца текущего забега" : `Осталось: ${selectedEffect.duration} ${selectedEffect.duration === 1 ? "ход" : "хода"}`}</strong></div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modalBackdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modalCard settingsModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalTitle"><strong>Настройки боя</strong><button onClick={() => setSettingsOpen(false)}>✕</button></div>
            <label className="settingRow rangeRow"><span>Громкость <b>{battleSettings.volume}%</b></span><input type="range" min="0" max="100" value={battleSettings.volume} onChange={(event) => updateBattleSetting("volume", Number(event.target.value))} /></label>
            <label className="settingRow"><span>Качество эффектов</span><select value={battleSettings.effectsQuality} onChange={(event) => updateBattleSetting("effectsQuality", event.target.value as BattleSettings["effectsQuality"])}><option value="low">Низкое</option><option value="medium">Среднее</option><option value="high">Высокое</option></select></label>
            <label className="settingRow"><span>Скорость анимаций</span><select value={battleSettings.animationSpeed} onChange={(event) => updateBattleSetting("animationSpeed", event.target.value as BattleSettings["animationSpeed"])}><option value="slow">Медленно</option><option value="normal">Обычно</option><option value="fast">Быстро</option></select></label>
            <label className="settingRow toggleRow"><span>Вибрация</span><input type="checkbox" checked={battleSettings.vibration} onChange={(event) => updateBattleSetting("vibration", event.target.checked)} /></label>
            <label className="settingRow toggleRow"><span>Подтверждать завершение хода</span><input type="checkbox" checked={battleSettings.confirmEndTurn} onChange={(event) => updateBattleSetting("confirmEndTurn", event.target.checked)} /></label>
          </div>
        </div>
      )}

      {surrenderOpen && (
        <div className="modalBackdrop" onClick={() => setSurrenderOpen(false)}>
          <div className="modalCard confirmationModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalTitle"><strong>Покинуть бой?</strong><button onClick={() => setSurrenderOpen(false)}>✕</button></div>
            <p>Прогресс текущего захода будет сброшен до 0/10.</p>
            <div className="confirmationActions"><button onClick={() => setSurrenderOpen(false)}>Остаться</button><button className="dangerConfirm" onClick={abandonRiftRun}>Покинуть разлом</button></div>
          </div>
        </div>
      )}

      {endTurnConfirmOpen && (
        <div className="modalBackdrop" onClick={() => setEndTurnConfirmOpen(false)}>
          <div className="modalCard confirmationModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalTitle"><strong>Завершить ход?</strong><button onClick={() => setEndTurnConfirmOpen(false)}>✕</button></div>
            <p>У вас осталось {ap} AP. После передачи инициативы они сгорят.</p>
            <div className="confirmationActions"><button onClick={() => setEndTurnConfirmOpen(false)}>Продолжить ход</button><button className="primaryConfirm" onClick={performEndTurn}>Передать инициативу</button></div>
          </div>
        </div>
      )}

      {logOpen && (
        <div className="modalBackdrop" onClick={() => setLogOpen(false)}>
          <div className="logSheet" onClick={(event) => event.stopPropagation()}>
            <div className="modalTitle"><strong>Журнал боя</strong><button onClick={() => setLogOpen(false)}>✕</button></div>
            <div className="logEntries">
              {log.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
