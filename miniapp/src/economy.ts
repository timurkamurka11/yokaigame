export type EconomyCurrency = "RIFT_COINS";
export type EconomyFlow = "SOURCE" | "SINK";
export type RiftTier = "purple" | "green" | "blue" | "red";
export type QuestPeriod = "DAILY" | "WEEKLY";
export type QuestMetric = "YOKAI_DEFEATED" | "SEAL_USED" | "RIFT_CLEARED" | "DISTINCT_FOOD_USED";
export type WeaponRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type EconomyTransaction = {
  id: string;
  currency: EconomyCurrency;
  flow: EconomyFlow;
  amount: number;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  context?: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type RiftCompletionRecord = {
  riftId: number;
  firstClearCompleted: boolean;
  completionCount: number;
  lastCompletedAt: string | null;
  dailyRepeatDate: string | null;
  dailyRepeatCount: number;
};

export type QuestDefinition = {
  id: string;
  period: QuestPeriod;
  title: string;
  metric: QuestMetric;
  target: number;
  rewardCoins: number;
};

export type QuestProgress = {
  questId: string;
  cycleKey: string;
  progress: number;
  claimedCycle: string | null;
};

export type WeaponDefinition = {
  id: string;
  name: string;
  rarity: WeaponRarity;
  purchasePrice: number;
  baseUpgradePrice: number;
  baseDamage: number;
  description: string;
};

export type PlayerWeapon = {
  weaponId: string;
  level: number;
  acquiredAt: string;
};

export type StarsProduct = {
  id: string;
  type: "ONE_TIME" | "CONSUMABLE" | "COSMETIC" | "UTILITY" | "SEASON_PASS" | "SUBSCRIPTION";
  title: string;
  priceXtr: number;
  repeatable: boolean;
  grantLabel: string;
};

export type EconomyState = {
  schemaVersion: 1;
  balance: number;
  transactions: EconomyTransaction[];
  rifts: Record<string, RiftCompletionRecord>;
  questProgress: Record<string, QuestProgress>;
  weeklyFoodHistory: Record<string, string[]>;
  weapons: Record<string, PlayerWeapon>;
  activeWeaponId: string;
  tutorialGrantApplied: boolean;
  starterPackPurchased: boolean;
  ramenCoupons: number;
  updatedAt: string;
};

export type RiftRewardBreakdown = {
  riftId: number;
  tier: RiftTier;
  regularEnemies: number;
  regularReward: number;
  bossReward: number;
  completionBonus: number;
  firstClearBonus: number;
  levelCoefficient: number;
  repeatCoefficient: number;
  totalCoefficient: number;
  grossCoins: number;
  awardedCoins: number;
  firstClear: boolean;
  repeatNumberToday: number;
};

export const ECONOMY_STORAGE_KEY = "yokai.economy.global.v1";
export const ECONOMY_SCHEMA_VERSION = 1 as const;
export const STARTING_RIFT_COINS = 100;
export const STARTING_FOOD_GRANTS = {
  onigiri_hp_01: 1,
  soda_ap_01: 1,
} as const;

export const RIFT_TIER_CONFIG: Record<RiftTier, { min: number; max: number; regular: number; boss: number; completion: number; firstClear: number }> = {
  purple: { min: 1, max: 10, regular: 10, boss: 30, completion: 60, firstClear: 60 },
  green: { min: 11, max: 20, regular: 16, boss: 48, completion: 96, firstClear: 96 },
  blue: { min: 21, max: 30, regular: 26, boss: 78, completion: 156, firstClear: 156 },
  red: { min: 31, max: 40, regular: 41, boss: 123, completion: 246, firstClear: 246 },
};

export const DAILY_QUESTS: QuestDefinition[] = [
  { id: "daily_yokai_5", period: "DAILY", title: "Победить 5 ёкаев", metric: "YOKAI_DEFEATED", target: 5, rewardCoins: 50 },
  { id: "daily_seal_1", period: "DAILY", title: "Использовать цифровую печать", metric: "SEAL_USED", target: 1, rewardCoins: 50 },
  { id: "daily_rift_1", period: "DAILY", title: "Закрыть 1 Разлом", metric: "RIFT_CLEARED", target: 1, rewardCoins: 100 },
];

export const WEEKLY_QUESTS: QuestDefinition[] = [
  { id: "weekly_yokai_50", period: "WEEKLY", title: "Победить 50 ёкаев", metric: "YOKAI_DEFEATED", target: 50, rewardCoins: 0 },
  { id: "weekly_rift_5", period: "WEEKLY", title: "Закрыть 5 Разломов", metric: "RIFT_CLEARED", target: 5, rewardCoins: 0 },
  { id: "weekly_food_3", period: "WEEKLY", title: "Использовать 3 разных блюда", metric: "DISTINCT_FOOD_USED", target: 3, rewardCoins: 0 },
];

export const WEEKLY_META_REWARD = 500;

export const WEAPON_CATALOG: WeaponDefinition[] = [
  {
    id: "training_katana",
    name: "Учебная катана",
    rarity: "COMMON",
    purchasePrice: 0,
    baseUpgradePrice: 150,
    baseDamage: 10,
    description: "Стартовое оружие охотника. Надёжная основа для первых Разломов.",
  },
  {
    id: "neon_tanto",
    name: "Неоновый танто",
    rarity: "COMMON",
    purchasePrice: 900,
    baseUpgradePrice: 150,
    baseDamage: 13,
    description: "Быстрый клинок для точных атак и ранних сборок.",
  },
  {
    id: "spirit_nodachi",
    name: "Нодати духов",
    rarity: "RARE",
    purchasePrice: 2400,
    baseUpgradePrice: 250,
    baseDamage: 18,
    description: "Тяжёлый клинок с усиленным уроном по ёкаям.",
  },
  {
    id: "rift_edge",
    name: "Кромка Разлома",
    rarity: "EPIC",
    purchasePrice: 5200,
    baseUpgradePrice: 450,
    baseDamage: 26,
    description: "Эпический клинок, стабилизированный энергией Разлома.",
  },
  {
    id: "oni_executioner",
    name: "Палач Oni",
    rarity: "LEGENDARY",
    purchasePrice: 9800,
    baseUpgradePrice: 700,
    baseDamage: 38,
    description: "Легендарное оружие для высокоуровневых охот.",
  },
];

export const STARS_CATALOG: StarsProduct[] = [
  { id: "starter_pack_01", type: "ONE_TIME", title: "Набор новичка KOI", priceXtr: 49, repeatable: false, grantLabel: "Рамка профиля, декор Дома, 250 монет, 3 купона" },
  { id: "ramen_coupons_3", type: "CONSUMABLE", title: "3 купона Раменной", priceXtr: 25, repeatable: true, grantLabel: "3 бесплатных блюда или напитка" },
  { id: "ramen_coupons_10", type: "CONSUMABLE", title: "10 купонов Раменной", priceXtr: 69, repeatable: true, grantLabel: "10 бесплатных блюд или напитков" },
  { id: "koi_skin_01", type: "COSMETIC", title: "Облик KOI", priceXtr: 99, repeatable: true, grantLabel: "Новый образ и анимация KOI" },
  { id: "hunter_skin_01", type: "COSMETIC", title: "Облик охотника", priceXtr: 129, repeatable: true, grantLabel: "Скин персонажа" },
  { id: "home_theme_01", type: "COSMETIC", title: "Тема Дома охотника", priceXtr: 149, repeatable: true, grantLabel: "Визуальная тема комнаты" },
  { id: "preset_slot_01", type: "UTILITY", title: "Дополнительный пресет", priceXtr: 39, repeatable: true, grantLabel: "Ещё один слот loadout/look" },
  { id: "season_pass_s01", type: "SEASON_PASS", title: "Сезонный пропуск", priceXtr: 299, repeatable: false, grantLabel: "Премиум-линия сезона" },
  { id: "koi_club_30d", type: "SUBSCRIPTION", title: "KOI Club", priceXtr: 199, repeatable: true, grantLabel: "30 дней косметики и удобства без P2W" },
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getRiftTier(riftId: number): RiftTier {
  if (riftId <= 10) return "purple";
  if (riftId <= 20) return "green";
  if (riftId <= 30) return "blue";
  return "red";
}

export function getWeaponDefinition(id: string) {
  return WEAPON_CATALOG.find((weapon) => weapon.id === id) || WEAPON_CATALOG[0];
}

export function getWeaponUpgradeCost(weaponId: string, level: number) {
  const weapon = getWeaponDefinition(weaponId);
  return Math.round(weapon.baseUpgradePrice * 2 ** Math.max(0, level - 1));
}

export function getWeaponDamage(weaponId: string, level: number) {
  const weapon = getWeaponDefinition(weaponId);
  return Math.round(weapon.baseDamage * (1 + 0.18 * Math.max(0, level - 1)));
}

export function createInitialEconomyState(legacyBalance?: number): EconomyState {
  const now = new Date().toISOString();
  const startingBalance = Number.isFinite(legacyBalance) && Number(legacyBalance) > 0 ? Number(legacyBalance) : STARTING_RIFT_COINS;
  const initialGrant: EconomyTransaction = {
    id: createId("tx"),
    currency: "RIFT_COINS",
    flow: "SOURCE",
    amount: startingBalance,
    sourceType: legacyBalance && legacyBalance > 0 ? "LEGACY_MIGRATION" : "TUTORIAL_GRANT",
    sourceId: legacyBalance && legacyBalance > 0 ? "legacy_balance" : "onboarding",
    idempotencyKey: legacyBalance && legacyBalance > 0 ? "migration:legacy-balance:v1" : "tutorial:initial-coins:v1",
    createdAt: now,
  };
  return {
    schemaVersion: ECONOMY_SCHEMA_VERSION,
    balance: startingBalance,
    transactions: [initialGrant],
    rifts: {},
    questProgress: {},
    weeklyFoodHistory: {},
    weapons: {
      training_katana: { weaponId: "training_katana", level: 1, acquiredAt: now },
    },
    activeWeaponId: "training_katana",
    tutorialGrantApplied: true,
    starterPackPurchased: false,
    ramenCoupons: 0,
    updatedAt: now,
  };
}

function legacyClosedRiftRecords(): Record<string, RiftCompletionRecord> {
  try {
    const closed = JSON.parse(localStorage.getItem("yokai.rifts.closed") || "[]") as number[];
    const now = new Date().toISOString();
    return Object.fromEntries(closed.map((riftId) => [String(riftId), {
      riftId,
      firstClearCompleted: true,
      completionCount: 1,
      lastCompletedAt: now,
      dailyRepeatDate: null,
      dailyRepeatCount: 0,
    }]));
  } catch {
    return {};
  }
}

export function loadEconomyState(legacyBalance?: number): EconomyState {
  try {
    const stored = localStorage.getItem(ECONOMY_STORAGE_KEY);
    if (!stored) {
      const initial = createInitialEconomyState(legacyBalance);
      return { ...initial, rifts: legacyClosedRiftRecords() };
    }
    const parsed = JSON.parse(stored) as Partial<EconomyState>;
    if (parsed.schemaVersion !== ECONOMY_SCHEMA_VERSION) return createInitialEconomyState(parsed.balance ?? legacyBalance);
    return {
      ...createInitialEconomyState(parsed.balance ?? legacyBalance),
      ...parsed,
      schemaVersion: ECONOMY_SCHEMA_VERSION,
      balance: Math.max(0, Number(parsed.balance || 0)),
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      rifts: { ...legacyClosedRiftRecords(), ...(parsed.rifts || {}) },
      questProgress: parsed.questProgress || {},
      weeklyFoodHistory: parsed.weeklyFoodHistory || {},
      weapons: {
        training_katana: { weaponId: "training_katana", level: 1, acquiredAt: parsed.updatedAt || new Date().toISOString() },
        ...(parsed.weapons || {}),
      },
      activeWeaponId: parsed.activeWeaponId && (parsed.weapons?.[parsed.activeWeaponId] || parsed.activeWeaponId === "training_katana")
        ? parsed.activeWeaponId
        : "training_katana",
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return createInitialEconomyState(legacyBalance);
  }
}

export function saveEconomyState(state: EconomyState) {
  localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(state));
}

export type TransactionInput = Omit<EconomyTransaction, "id" | "createdAt" | "currency">;

export function applyTransaction(state: EconomyState, input: TransactionInput): { state: EconomyState; applied: boolean; error?: string } {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { state, applied: false, error: "Некорректная сумма транзакции." };
  if (state.transactions.some((tx) => tx.idempotencyKey === input.idempotencyKey)) return { state, applied: false };
  if (input.flow === "SINK" && state.balance < input.amount) return { state, applied: false, error: "Недостаточно Монет Разлома." };

  const transaction: EconomyTransaction = {
    ...input,
    id: createId("tx"),
    currency: "RIFT_COINS",
    createdAt: new Date().toISOString(),
  };
  const balance = input.flow === "SOURCE" ? state.balance + input.amount : state.balance - input.amount;
  return {
    applied: true,
    state: {
      ...state,
      balance,
      transactions: [...state.transactions, transaction].slice(-1000),
      updatedAt: transaction.createdAt,
    },
  };
}

export function getQuestCycle(quest: QuestDefinition, now = new Date()) {
  return quest.period === "DAILY" ? dateKey(now) : weekKey(now);
}

export function getCurrentQuestProgress(state: EconomyState, quest: QuestDefinition, now = new Date()): QuestProgress {
  const cycleKey = getQuestCycle(quest, now);
  const stored = state.questProgress[quest.id];
  if (!stored || stored.cycleKey !== cycleKey) return { questId: quest.id, cycleKey, progress: 0, claimedCycle: null };
  return stored;
}

export function incrementQuestMetric(state: EconomyState, metric: QuestMetric, amount = 1, now = new Date()): EconomyState {
  const definitions = [...DAILY_QUESTS, ...WEEKLY_QUESTS].filter((quest) => quest.metric === metric);
  if (!definitions.length) return state;
  const progress = { ...state.questProgress };
  definitions.forEach((quest) => {
    const current = getCurrentQuestProgress(state, quest, now);
    progress[quest.id] = { ...current, progress: Math.min(quest.target, current.progress + amount) };
  });
  return { ...state, questProgress: progress, updatedAt: now.toISOString() };
}

export function recordFoodUsage(state: EconomyState, itemIds: string[], now = new Date()): EconomyState {
  const cycle = weekKey(now);
  const current = state.weeklyFoodHistory[cycle] || [];
  const unique = Array.from(new Set([...current, ...itemIds.filter(Boolean)]));
  const weeklyFoodQuest = WEEKLY_QUESTS.find((quest) => quest.metric === "DISTINCT_FOOD_USED");
  const questProgress = { ...state.questProgress };
  if (weeklyFoodQuest) {
    const previous = getCurrentQuestProgress(state, weeklyFoodQuest, now);
    questProgress[weeklyFoodQuest.id] = { ...previous, progress: Math.min(weeklyFoodQuest.target, unique.length) };
  }
  return {
    ...state,
    weeklyFoodHistory: { ...state.weeklyFoodHistory, [cycle]: unique },
    questProgress,
    updatedAt: new Date().toISOString(),
  };
}

export function claimQuest(state: EconomyState, quest: QuestDefinition, now = new Date()) {
  const cycle = getQuestCycle(quest, now);
  const progress = getCurrentQuestProgress(state, quest, now);
  if (progress.progress < quest.target) return { state, ok: false, message: "Задание ещё не выполнено." };
  if (progress.claimedCycle === cycle) return { state, ok: false, message: "Награда уже получена." };
  if (quest.rewardCoins <= 0) return { state, ok: false, message: "Это часть недельной серии." };
  const tx = applyTransaction(state, {
    flow: "SOURCE",
    amount: quest.rewardCoins,
    sourceType: "QUEST_REWARD",
    sourceId: quest.id,
    idempotencyKey: `quest:${quest.id}:${cycle}`,
    context: { period: quest.period },
  });
  if (!tx.applied) return { state: tx.state, ok: false, message: tx.error || "Награда уже обработана." };
  return {
    state: {
      ...tx.state,
      questProgress: { ...tx.state.questProgress, [quest.id]: { ...progress, claimedCycle: cycle } },
    },
    ok: true,
    message: `Получено ${quest.rewardCoins} Монет Разлома.`,
  };
}

export function claimWeeklyMetaReward(state: EconomyState, now = new Date()) {
  const cycle = weekKey(now);
  const complete = WEEKLY_QUESTS.every((quest) => getCurrentQuestProgress(state, quest, now).progress >= quest.target);
  if (!complete) return { state, ok: false, message: "Недельная серия ещё не выполнена." };
  const tx = applyTransaction(state, {
    flow: "SOURCE",
    amount: WEEKLY_META_REWARD,
    sourceType: "WEEKLY_REWARD",
    sourceId: "weekly_meta",
    idempotencyKey: `quest:weekly-meta:${cycle}`,
    context: { cycle },
  });
  return { state: tx.state, ok: tx.applied, message: tx.applied ? `Получено ${WEEKLY_META_REWARD} Монет Разлома.` : "Награда уже получена." };
}

export function calculateRiftReward(state: EconomyState, riftId: number, highestUnlockedRift: number, now = new Date()): RiftRewardBreakdown {
  const tier = getRiftTier(riftId);
  const cfg = RIFT_TIER_CONFIG[tier];
  const key = String(riftId);
  const record = state.rifts[key];
  const today = dateKey(now);
  const repeatsToday = record?.dailyRepeatDate === today ? record.dailyRepeatCount : 0;
  const repeatNumberToday = repeatsToday + 1;
  const gap = Math.max(0, highestUnlockedRift - riftId);
  const levelCoefficient = gap <= 5 ? 1 : gap <= 10 ? 0.75 : 0.5;
  const repeatCoefficient = repeatNumberToday <= 3 ? 1 : repeatNumberToday <= 6 ? 0.85 : 0.7;
  const firstClear = !record?.firstClearCompleted;
  const regularReward = 9 * cfg.regular;
  const bossReward = cfg.boss;
  const completionBonus = cfg.completion;
  const firstClearBonus = firstClear ? cfg.firstClear : 0;
  const grossCoins = regularReward + bossReward + completionBonus + firstClearBonus;
  const totalCoefficient = levelCoefficient * repeatCoefficient;
  return {
    riftId,
    tier,
    regularEnemies: 9,
    regularReward,
    bossReward,
    completionBonus,
    firstClearBonus,
    levelCoefficient,
    repeatCoefficient,
    totalCoefficient,
    grossCoins,
    awardedCoins: Math.max(1, Math.round(grossCoins * totalCoefficient)),
    firstClear,
    repeatNumberToday,
  };
}

export function applyRiftCompletion(state: EconomyState, breakdown: RiftRewardBreakdown, runId: string, now = new Date()) {
  const tx = applyTransaction(state, {
    flow: "SOURCE",
    amount: breakdown.awardedCoins,
    sourceType: "RIFT_CLEAR",
    sourceId: `rift_${breakdown.riftId}`,
    idempotencyKey: `riftclear:${breakdown.riftId}:${runId}`,
    context: {
      tier: breakdown.tier,
      firstClear: breakdown.firstClear,
      grossCoins: breakdown.grossCoins,
      levelCoefficient: breakdown.levelCoefficient,
      repeatCoefficient: breakdown.repeatCoefficient,
    },
  });
  if (!tx.applied) return { state: tx.state, applied: false };
  const key = String(breakdown.riftId);
  const previous = state.rifts[key];
  const today = dateKey(now);
  const dailyRepeatCount = previous?.dailyRepeatDate === today ? previous.dailyRepeatCount + 1 : 1;
  const rifts = {
    ...tx.state.rifts,
    [key]: {
      riftId: breakdown.riftId,
      firstClearCompleted: true,
      completionCount: (previous?.completionCount || 0) + 1,
      lastCompletedAt: now.toISOString(),
      dailyRepeatDate: today,
      dailyRepeatCount,
    },
  };
  let next = { ...tx.state, rifts };
  next = incrementQuestMetric(next, "RIFT_CLEARED", 1);
  return { state: next, applied: true };
}

export function purchaseWeapon(state: EconomyState, weaponId: string) {
  const weapon = getWeaponDefinition(weaponId);
  if (state.weapons[weaponId]) return { state, ok: false, message: "Оружие уже куплено." };
  const tx = applyTransaction(state, {
    flow: "SINK",
    amount: weapon.purchasePrice,
    sourceType: "WEAPON_PURCHASE",
    sourceId: weaponId,
    idempotencyKey: `weapon:purchase:${weaponId}`,
    context: { rarity: weapon.rarity },
  });
  if (!tx.applied) return { state: tx.state, ok: false, message: tx.error || "Покупка уже обработана." };
  const now = new Date().toISOString();
  return {
    state: {
      ...tx.state,
      weapons: { ...tx.state.weapons, [weaponId]: { weaponId, level: 1, acquiredAt: now } },
      activeWeaponId: weaponId,
    },
    ok: true,
    message: `${weapon.name} куплено и экипировано.`,
  };
}

export function upgradeWeapon(state: EconomyState, weaponId: string) {
  const owned = state.weapons[weaponId];
  if (!owned) return { state, ok: false, message: "Сначала купите оружие." };
  if (owned.level >= 6) return { state, ok: false, message: "Достигнут максимальный уровень." };
  const cost = getWeaponUpgradeCost(weaponId, owned.level);
  const tx = applyTransaction(state, {
    flow: "SINK",
    amount: cost,
    sourceType: "WEAPON_UPGRADE",
    sourceId: weaponId,
    idempotencyKey: `weapon:upgrade:${weaponId}:${owned.level + 1}`,
    context: { fromLevel: owned.level, toLevel: owned.level + 1 },
  });
  if (!tx.applied) return { state: tx.state, ok: false, message: tx.error || "Улучшение уже обработано." };
  return {
    state: {
      ...tx.state,
      weapons: { ...tx.state.weapons, [weaponId]: { ...owned, level: owned.level + 1 } },
    },
    ok: true,
    message: `Оружие улучшено до уровня ${owned.level + 1}.`,
  };
}

export function equipWeapon(state: EconomyState, weaponId: string) {
  if (!state.weapons[weaponId]) return { state, ok: false, message: "Оружие не куплено." };
  return { state: { ...state, activeWeaponId: weaponId, updatedAt: new Date().toISOString() }, ok: true, message: `${getWeaponDefinition(weaponId).name} экипировано.` };
}
