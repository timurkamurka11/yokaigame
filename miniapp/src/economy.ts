export type EconomyCurrency = "RIFT_COINS";
export type EconomyFlow = "SOURCE" | "SINK";
export type RiftTier = "purple" | "green" | "blue" | "red";
export type QuestPeriod = "DAILY" | "WEEKLY";
export type QuestMetric = "YOKAI_DEFEATED" | "SEAL_USED" | "RIFT_CLEARED" | "DISTINCT_FOOD_USED";
export type WeaponRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type RiftRunStatus = "ACTIVE" | "COMPLETED" | "DEFEATED" | "ABANDONED" | "TECHNICAL_FAILURE";
export type ReservationStatus = "RESERVED" | "CONSUMED" | "RELEASED";

export type ConfigVersions = {
  economy: string;
  combat: string;
  content: string;
};

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

export type ConsumableReservation = {
  reservationId: string;
  runId: string;
  itemId: string;
  quantity: number;
  status: ReservationStatus;
  reservedAt: string;
  activatedAt: string | null;
  releasedAt: string | null;
};

export type OniRewardRecord = {
  oniIndex: number;
  isBoss: boolean;
  baseReward: number;
  riftOfDayMultiplier: number;
  antiFarmMultiplier: number;
  eventMultiplier: number;
  awardedCoins: number;
  idempotencyKey: string;
  createdAt: string;
};

export type RiftRunSnapshot = {
  runId: string;
  playerId: string;
  riftId: number;
  status: RiftRunStatus;
  killsCount: number;
  pendingCoins: number;
  settledCoins: number;
  firstClearCoins: number;
  settlementRate: number;
  resetPeriod: string;
  earlyFarmAttempt: number;
  configVersions: ConfigVersions;
  riftOfDayMultiplier: number;
  eventMultiplier: number;
  reservations: ConsumableReservation[];
  oniRewards: OniRewardRecord[];
  sealActivationKeys: string[];
  startedAt: string;
  settledAt: string | null;
  settlementIdempotencyKey: string | null;
};

export type EarlyFarmCounter = {
  playerId: string;
  riftId: number;
  resetPeriod: string;
  earlyExitCount: number;
  updatedAt: string;
};

export type EconomyState = {
  schemaVersion: 2;
  playerId: string;
  balance: number;
  transactions: EconomyTransaction[];
  rifts: Record<string, RiftCompletionRecord>;
  questProgress: Record<string, QuestProgress>;
  weeklyFoodHistory: Record<string, string[]>;
  weapons: Record<string, PlayerWeapon>;
  activeWeaponId: string;
  activeRun: RiftRunSnapshot | null;
  runHistory: RiftRunSnapshot[];
  earlyFarmCounters: Record<string, EarlyFarmCounter>;
  contractClaimKeys: string[];
  tutorialGrantApplied: boolean;
  starterPackPurchased: boolean;
  ramenCoupons: number;
  sealTalismans: number;
  updatedAt: string;
};

export type RiftRewardBreakdown = {
  riftId: number;
  tier: RiftTier;
  oniIndex: number;
  isBoss: boolean;
  baseReward: number;
  riftOfDayMultiplier: number;
  antiFarmMultiplier: number;
  eventMultiplier: number;
  awardedCoins: number;
  pendingCoins: number;
  settledCoins: number;
  settlementRate: number;
  firstClearBonus: number;
  firstClear: boolean;
  multiplierOrder: "RIFT_OF_DAY>ANTI_FARM>EVENT>FLOOR";
};

export type StartRiftRunInput = {
  runId: string;
  playerId: string;
  riftId: number;
  consumableItemIds?: string[];
  configVersions?: Partial<ConfigVersions>;
  riftOfDayMultiplier?: number;
  eventMultiplier?: number;
  now?: Date;
};

export type RecordOniRewardInput = {
  runId: string;
  oniIndex: number;
  isBoss: boolean;
  now?: Date;
};

export const ECONOMY_STORAGE_KEY = "yokai.economy.global.v1.1";
export const LEGACY_ECONOMY_STORAGE_KEY = "yokai.economy.global.v1";
export const ECONOMY_SCHEMA_VERSION = 2 as const;
export const STARTING_RIFT_COINS = 100;
export const STARTING_SEAL_TALISMANS = 3;
export const STARTING_FOOD_GRANTS = {
  onigiri_hp_01: 1,
  soda_ap_01: 1,
} as const;

export const CONFIG_VERSIONS: ConfigVersions = {
  economy: "economy-1.1.0",
  combat: "combat-1.1.0",
  content: "content-1.1.0",
};

// Local preview fallback only. Production prices and rewards are resolved by the server config.
export const RIFT_TIER_CONFIG: Record<RiftTier, { min: number; max: number; regular: number; boss: number; firstClear: number }> = {
  purple: { min: 1, max: 10, regular: 10, boss: 30, firstClear: 60 },
  green: { min: 11, max: 20, regular: 16, boss: 48, firstClear: 96 },
  blue: { min: 21, max: 30, regular: 26, boss: 78, firstClear: 156 },
  red: { min: 31, max: 40, regular: 41, boss: 123, firstClear: 246 },
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

// Local preview fallback only. Server catalog is authoritative in production.
export const WEAPON_CATALOG: WeaponDefinition[] = [
  { id: "training_katana", name: "Учебная катана", rarity: "COMMON", purchasePrice: 0, baseUpgradePrice: 150, baseDamage: 10, description: "Стартовое оружие охотника." },
  { id: "neon_tanto", name: "Неоновый танто", rarity: "COMMON", purchasePrice: 900, baseUpgradePrice: 150, baseDamage: 13, description: "Быстрый клинок для ранних сборок." },
  { id: "spirit_nodachi", name: "Нодати духов", rarity: "RARE", purchasePrice: 2400, baseUpgradePrice: 250, baseDamage: 18, description: "Тяжёлый клинок с усиленным уроном." },
  { id: "rift_edge", name: "Кромка Разлома", rarity: "EPIC", purchasePrice: 5200, baseUpgradePrice: 450, baseDamage: 26, description: "Эпический клинок энергии Разлома." },
  { id: "oni_executioner", name: "Палач Oni", rarity: "LEGENDARY", purchasePrice: 9800, baseUpgradePrice: 700, baseDamage: 38, description: "Легендарное оружие для высокоуровневых охот." },
];

// No client-owned Stars prices in V1.1. The server endpoint supplies the live catalog.
export const STARS_CATALOG: StarsProduct[] = [];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function positiveMultiplier(value: number | undefined, fallback = 1) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
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

export function earlyFarmKey(playerId: string, riftId: number, resetPeriod: string) {
  return `${playerId}:${riftId}:${resetPeriod}`;
}

export function createInitialEconomyState(legacyBalance?: number, playerId = "local-preview-player"): EconomyState {
  const now = new Date().toISOString();
  const startingBalance = Number.isFinite(legacyBalance) && Number(legacyBalance) > 0 ? Number(legacyBalance) : STARTING_RIFT_COINS;
  const initialGrant: EconomyTransaction = {
    id: createId("tx"),
    currency: "RIFT_COINS",
    flow: "SOURCE",
    amount: startingBalance,
    sourceType: legacyBalance && legacyBalance > 0 ? "LEGACY_MIGRATION" : "TUTORIAL_GRANT",
    sourceId: legacyBalance && legacyBalance > 0 ? "legacy_balance" : "onboarding",
    idempotencyKey: legacyBalance && legacyBalance > 0 ? `migration:${playerId}:legacy-balance:v1.1` : `tutorial:${playerId}:initial-coins:v1.1`,
    createdAt: now,
  };
  return {
    schemaVersion: ECONOMY_SCHEMA_VERSION,
    playerId,
    balance: startingBalance,
    transactions: [initialGrant],
    rifts: {},
    questProgress: {},
    weeklyFoodHistory: {},
    weapons: { training_katana: { weaponId: "training_katana", level: 1, acquiredAt: now } },
    activeWeaponId: "training_katana",
    activeRun: null,
    runHistory: [],
    earlyFarmCounters: {},
    contractClaimKeys: [],
    tutorialGrantApplied: true,
    starterPackPurchased: false,
    ramenCoupons: 0,
    sealTalismans: STARTING_SEAL_TALISMANS,
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

function migrateLegacyState(parsed: Record<string, unknown>, legacyBalance?: number): EconomyState {
  const base = createInitialEconomyState(Number(parsed.balance ?? legacyBalance), String(parsed.playerId || "local-preview-player"));
  return {
    ...base,
    balance: Math.max(0, Number(parsed.balance ?? base.balance)),
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions as EconomyTransaction[] : base.transactions,
    rifts: { ...legacyClosedRiftRecords(), ...((parsed.rifts || {}) as Record<string, RiftCompletionRecord>) },
    questProgress: (parsed.questProgress || {}) as Record<string, QuestProgress>,
    weeklyFoodHistory: (parsed.weeklyFoodHistory || {}) as Record<string, string[]>,
    weapons: {
      training_katana: base.weapons.training_katana,
      ...((parsed.weapons || {}) as Record<string, PlayerWeapon>),
    },
    activeWeaponId: typeof parsed.activeWeaponId === "string" ? parsed.activeWeaponId : "training_katana",
    starterPackPurchased: Boolean(parsed.starterPackPurchased),
    ramenCoupons: Math.max(0, Number(parsed.ramenCoupons || 0)),
    sealTalismans: Math.max(0, Number(parsed.sealTalismans ?? STARTING_SEAL_TALISMANS)),
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
  };
}

export function loadEconomyState(legacyBalance?: number): EconomyState {
  try {
    const stored = localStorage.getItem(ECONOMY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<EconomyState>;
      if (parsed.schemaVersion !== ECONOMY_SCHEMA_VERSION) return migrateLegacyState(parsed as Record<string, unknown>, legacyBalance);
      const base = createInitialEconomyState(parsed.balance ?? legacyBalance, parsed.playerId || "local-preview-player");
      return {
        ...base,
        ...parsed,
        schemaVersion: ECONOMY_SCHEMA_VERSION,
        balance: Math.max(0, Number(parsed.balance || 0)),
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        rifts: { ...legacyClosedRiftRecords(), ...(parsed.rifts || {}) },
        questProgress: parsed.questProgress || {},
        weeklyFoodHistory: parsed.weeklyFoodHistory || {},
        weapons: { training_katana: base.weapons.training_katana, ...(parsed.weapons || {}) },
        runHistory: Array.isArray(parsed.runHistory) ? parsed.runHistory : [],
        earlyFarmCounters: parsed.earlyFarmCounters || {},
        contractClaimKeys: Array.isArray(parsed.contractClaimKeys) ? parsed.contractClaimKeys : [],
        sealTalismans: Math.max(0, Number(parsed.sealTalismans ?? STARTING_SEAL_TALISMANS)),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }

    const legacyStored = localStorage.getItem(LEGACY_ECONOMY_STORAGE_KEY);
    if (legacyStored) return migrateLegacyState(JSON.parse(legacyStored), legacyBalance);
    const initial = createInitialEconomyState(legacyBalance);
    return { ...initial, rifts: legacyClosedRiftRecords() };
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
      transactions: [...state.transactions, transaction].slice(-2000),
      updatedAt: transaction.createdAt,
    },
  };
}

export function startRiftRun(state: EconomyState, input: StartRiftRunInput) {
  const now = input.now || new Date();
  const existing = state.activeRun;
  if (existing?.status === "ACTIVE") return { state, ok: false, message: "Другой забег уже активен." };

  const resetPeriod = dateKey(now);
  const counterKey = earlyFarmKey(input.playerId, input.riftId, resetPeriod);
  const earlyFarmAttempt = (state.earlyFarmCounters[counterKey]?.earlyExitCount || 0) + 1;
  const itemIds = Array.from(new Set((input.consumableItemIds || []).filter(Boolean)));
  const reservations: ConsumableReservation[] = itemIds.map((itemId) => ({
    reservationId: `reservation:${input.playerId}:${input.runId}:${itemId}`,
    runId: input.runId,
    itemId,
    quantity: 1,
    status: "RESERVED",
    reservedAt: now.toISOString(),
    activatedAt: null,
    releasedAt: null,
  }));

  const run: RiftRunSnapshot = {
    runId: input.runId,
    playerId: input.playerId,
    riftId: input.riftId,
    status: "ACTIVE",
    killsCount: 0,
    pendingCoins: 0,
    settledCoins: 0,
    firstClearCoins: 0,
    settlementRate: 0,
    resetPeriod,
    earlyFarmAttempt,
    configVersions: {
      economy: input.configVersions?.economy || CONFIG_VERSIONS.economy,
      combat: input.configVersions?.combat || CONFIG_VERSIONS.combat,
      content: input.configVersions?.content || CONFIG_VERSIONS.content,
    },
    riftOfDayMultiplier: positiveMultiplier(input.riftOfDayMultiplier),
    eventMultiplier: positiveMultiplier(input.eventMultiplier),
    reservations,
    oniRewards: [],
    sealActivationKeys: [],
    startedAt: now.toISOString(),
    settledAt: null,
    settlementIdempotencyKey: null,
  };

  return { state: { ...state, playerId: input.playerId, activeRun: run, updatedAt: now.toISOString() }, ok: true, run };
}

export function activateRunConsumables(state: EconomyState, runId: string, now = new Date()) {
  const run = state.activeRun;
  if (!run || run.runId !== runId || run.status !== "ACTIVE") return { state, ok: false, message: "Активный забег не найден." };
  const reservations = run.reservations.map((reservation) => reservation.status === "RESERVED"
    ? { ...reservation, status: "CONSUMED" as const, activatedAt: now.toISOString() }
    : reservation);
  const activeRun = { ...run, reservations };
  return { state: { ...state, activeRun, updatedAt: now.toISOString() }, ok: true };
}

export function releaseRunReservations(state: EconomyState, runId: string, now = new Date()) {
  const run = state.activeRun;
  if (!run || run.runId !== runId) return { state, ok: false };
  const reservations = run.reservations.map((reservation) => reservation.status === "RESERVED"
    ? { ...reservation, status: "RELEASED" as const, releasedAt: now.toISOString() }
    : reservation);
  return { state: { ...state, activeRun: { ...run, reservations }, updatedAt: now.toISOString() }, ok: true };
}

export function activateSealTalisman(state: EconomyState, runId: string, actionId: string, now = new Date()) {
  const run = state.activeRun;
  if (!run || run.runId !== runId || run.status !== "ACTIVE") return { state, ok: false, message: "Активный забег не найден." };
  const key = `seal:activate:${state.playerId}:${runId}:${actionId}`;
  if (run.sealActivationKeys.includes(key)) return { state, ok: true, idempotent: true };
  if (state.sealTalismans < 1) return { state, ok: false, message: "Нет талисманов печати." };

  const activeRun = { ...run, sealActivationKeys: [...run.sealActivationKeys, key] };
  return {
    state: { ...state, sealTalismans: state.sealTalismans - 1, activeRun, updatedAt: now.toISOString() },
    ok: true,
    idempotent: false,
  };
}

function antiFarmMultiplierFor(run: RiftRunSnapshot, oniIndex: number) {
  return run.earlyFarmAttempt >= 4 && oniIndex <= 3 ? 0.25 : 1;
}

export function recordOniReward(state: EconomyState, input: RecordOniRewardInput) {
  const now = input.now || new Date();
  const run = state.activeRun;
  if (!run || run.runId !== input.runId || run.status !== "ACTIVE") {
    return { state, applied: false, error: "Активный забег не найден." };
  }
  const rewardKey = `oni:reward:${run.playerId}:${run.runId}:${input.oniIndex}`;
  const existing = run.oniRewards.find((reward) => reward.idempotencyKey === rewardKey);
  if (existing) {
    const breakdown: RiftRewardBreakdown = {
      riftId: run.riftId,
      tier: getRiftTier(run.riftId),
      oniIndex: existing.oniIndex,
      isBoss: existing.isBoss,
      baseReward: existing.baseReward,
      riftOfDayMultiplier: existing.riftOfDayMultiplier,
      antiFarmMultiplier: existing.antiFarmMultiplier,
      eventMultiplier: existing.eventMultiplier,
      awardedCoins: existing.awardedCoins,
      pendingCoins: run.pendingCoins,
      settledCoins: run.settledCoins,
      settlementRate: run.settlementRate,
      firstClearBonus: run.firstClearCoins,
      firstClear: run.firstClearCoins > 0,
      multiplierOrder: "RIFT_OF_DAY>ANTI_FARM>EVENT>FLOOR",
    };
    return { state, applied: false, breakdown };
  }

  const tier = getRiftTier(run.riftId);
  const cfg = RIFT_TIER_CONFIG[tier];
  const baseReward = input.isBoss ? cfg.boss : cfg.regular;
  const antiFarmMultiplier = antiFarmMultiplierFor(run, input.oniIndex);
  // Mandatory order: Rift of the Day -> anti-farm -> event -> floor.
  const awardedCoins = Math.max(0, Math.floor(
    baseReward
      * run.riftOfDayMultiplier
      * antiFarmMultiplier
      * run.eventMultiplier,
  ));

  const reward: OniRewardRecord = {
    oniIndex: input.oniIndex,
    isBoss: input.isBoss,
    baseReward,
    riftOfDayMultiplier: run.riftOfDayMultiplier,
    antiFarmMultiplier,
    eventMultiplier: run.eventMultiplier,
    awardedCoins,
    idempotencyKey: rewardKey,
    createdAt: now.toISOString(),
  };
  const activeRun: RiftRunSnapshot = {
    ...run,
    killsCount: Math.max(run.killsCount, input.oniIndex),
    pendingCoins: run.pendingCoins + awardedCoins,
    oniRewards: [...run.oniRewards, reward],
  };
  const next = { ...state, activeRun, updatedAt: now.toISOString() };
  const breakdown: RiftRewardBreakdown = {
    riftId: run.riftId,
    tier,
    oniIndex: input.oniIndex,
    isBoss: input.isBoss,
    baseReward,
    riftOfDayMultiplier: run.riftOfDayMultiplier,
    antiFarmMultiplier,
    eventMultiplier: run.eventMultiplier,
    awardedCoins,
    pendingCoins: activeRun.pendingCoins,
    settledCoins: 0,
    settlementRate: 0,
    firstClearBonus: 0,
    firstClear: false,
    multiplierOrder: "RIFT_OF_DAY>ANTI_FARM>EVENT>FLOOR",
  };
  return { state: next, applied: true, breakdown };
}

export function settleRiftRun(state: EconomyState, runId: string, status: Exclude<RiftRunStatus, "ACTIVE">, now = new Date()) {
  const run = state.activeRun;
  if (!run || run.runId !== runId) return { state, applied: false, error: "Забег не найден.", settledCoins: 0, firstClearCoins: 0, totalWalletGrant: 0 };
  if (run.status !== "ACTIVE") {
    return {
      state,
      applied: false,
      settledCoins: run.settledCoins,
      firstClearCoins: run.firstClearCoins,
      totalWalletGrant: run.settledCoins + run.firstClearCoins,
    };
  }

  if (status === "TECHNICAL_FAILURE") {
    const failedRun: RiftRunSnapshot = {
      ...run,
      status,
      settledAt: now.toISOString(),
      settlementIdempotencyKey: `rift:technical-compensation:${run.playerId}:${run.runId}`,
      reservations: run.reservations.map((reservation) => reservation.status === "RESERVED"
        ? { ...reservation, status: "RELEASED", releasedAt: now.toISOString() }
        : reservation),
    };
    return {
      state: { ...state, activeRun: failedRun, runHistory: [...state.runHistory, failedRun].slice(-100), updatedAt: now.toISOString() },
      applied: true,
      settledCoins: 0,
      firstClearCoins: 0,
      totalWalletGrant: 0,
      requiresRecovery: true,
    };
  }

  const settlementRate = status === "ABANDONED" ? 0.5 : 1;
  const settledCoins = Math.floor(run.pendingCoins * settlementRate);
  const settlementKey = `rift:settle:${run.playerId}:${run.runId}`;
  let next = state;
  if (settledCoins > 0) {
    const settlementTx = applyTransaction(next, {
      flow: "SOURCE",
      amount: settledCoins,
      sourceType: "RIFT_SETTLEMENT",
      sourceId: run.runId,
      idempotencyKey: settlementKey,
      context: {
        riftId: run.riftId,
        status,
        pendingCoins: run.pendingCoins,
        settlementRate,
        economyConfigVersion: run.configVersions.economy,
        combatConfigVersion: run.configVersions.combat,
        contentConfigVersion: run.configVersions.content,
      },
    });
    next = settlementTx.state;
  }

  let firstClearCoins = 0;
  const riftKey = String(run.riftId);
  const previous = next.rifts[riftKey];
  if (status === "COMPLETED" && !previous?.firstClearCompleted) {
    firstClearCoins = RIFT_TIER_CONFIG[getRiftTier(run.riftId)].firstClear;
    const firstClearTx = applyTransaction(next, {
      flow: "SOURCE",
      amount: firstClearCoins,
      sourceType: "RIFT_FIRST_CLEAR",
      sourceId: `rift_${run.riftId}`,
      idempotencyKey: `rift:first-clear:${run.playerId}:${run.riftId}`,
      context: { runId: run.runId, riftId: run.riftId },
    });
    next = firstClearTx.state;
  }

  const counterKey = earlyFarmKey(run.playerId, run.riftId, run.resetPeriod);
  const earlyFarmCounters = { ...next.earlyFarmCounters };
  if (status === "COMPLETED") {
    delete earlyFarmCounters[counterKey];
  } else if ((status === "DEFEATED" || status === "ABANDONED") && run.killsCount <= 3) {
    const previousCounter = earlyFarmCounters[counterKey];
    earlyFarmCounters[counterKey] = {
      playerId: run.playerId,
      riftId: run.riftId,
      resetPeriod: run.resetPeriod,
      earlyExitCount: (previousCounter?.earlyExitCount || 0) + 1,
      updatedAt: now.toISOString(),
    };
  }

  let rifts = next.rifts;
  if (status === "COMPLETED") {
    rifts = {
      ...next.rifts,
      [riftKey]: {
        riftId: run.riftId,
        firstClearCompleted: true,
        completionCount: (previous?.completionCount || 0) + 1,
        lastCompletedAt: now.toISOString(),
        dailyRepeatDate: null,
        dailyRepeatCount: 0,
      },
    };
  }

  const terminalRun: RiftRunSnapshot = {
    ...run,
    status,
    settledCoins,
    firstClearCoins,
    settlementRate,
    settledAt: now.toISOString(),
    settlementIdempotencyKey: settlementKey,
    reservations: run.reservations.map((reservation) => reservation.status === "RESERVED"
      ? { ...reservation, status: "RELEASED", releasedAt: now.toISOString() }
      : reservation),
  };
  next = {
    ...next,
    rifts,
    earlyFarmCounters,
    activeRun: terminalRun,
    runHistory: [...next.runHistory, terminalRun].slice(-100),
    updatedAt: now.toISOString(),
  };
  if (status === "COMPLETED") next = incrementQuestMetric(next, "RIFT_CLEARED", 1, now);

  return {
    state: next,
    applied: true,
    pendingCoins: run.pendingCoins,
    settledCoins,
    firstClearCoins,
    totalWalletGrant: settledCoins + firstClearCoins,
    settlementRate,
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
  return { ...state, weeklyFoodHistory: { ...state.weeklyFoodHistory, [cycle]: unique }, questProgress, updatedAt: now.toISOString() };
}

export function claimQuest(state: EconomyState, quest: QuestDefinition, now = new Date()) {
  const cycle = getQuestCycle(quest, now);
  const progress = getCurrentQuestProgress(state, quest, now);
  if (progress.progress < quest.target) return { state, ok: false, message: "Задание ещё не выполнено." };
  if (progress.claimedCycle === cycle) return { state, ok: false, message: "Награда уже получена." };
  if (quest.rewardCoins <= 0) return { state, ok: false, message: "Это часть недельной серии." };
  const claimKey = `contract:claim:${state.playerId}:${quest.id}:${cycle}`;
  const tx = applyTransaction(state, {
    flow: "SOURCE",
    amount: quest.rewardCoins,
    sourceType: "CONTRACT_REWARD",
    sourceId: quest.id,
    idempotencyKey: claimKey,
    context: { period: quest.period, cycle },
  });
  if (!tx.applied) return { state: tx.state, ok: false, message: tx.error || "Награда уже обработана." };
  return {
    state: {
      ...tx.state,
      contractClaimKeys: [...tx.state.contractClaimKeys, claimKey],
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
  const claimKey = `contract:claim:${state.playerId}:weekly_meta:${cycle}`;
  const tx = applyTransaction(state, {
    flow: "SOURCE",
    amount: WEEKLY_META_REWARD,
    sourceType: "CONTRACT_REWARD",
    sourceId: "weekly_meta",
    idempotencyKey: claimKey,
    context: { cycle },
  });
  return {
    state: tx.applied ? { ...tx.state, contractClaimKeys: [...tx.state.contractClaimKeys, claimKey] } : tx.state,
    ok: tx.applied,
    message: tx.applied ? `Получено ${WEEKLY_META_REWARD} Монет Разлома.` : "Награда уже получена.",
  };
}

// Compatibility preview helper. It never grants currency and has no completion bonus.
export function calculateRiftReward(state: EconomyState, riftId: number, _highestUnlockedRift: number, now = new Date()): RiftRewardBreakdown {
  const run = state.activeRun && state.activeRun.riftId === riftId
    ? state.activeRun
    : startRiftRun(state, { runId: `preview-${riftId}`, playerId: state.playerId, riftId, now }).run!;
  const oniIndex = Math.min(10, run.killsCount + 1);
  const isBoss = oniIndex === 10;
  const tier = getRiftTier(riftId);
  const baseReward = isBoss ? RIFT_TIER_CONFIG[tier].boss : RIFT_TIER_CONFIG[tier].regular;
  const antiFarmMultiplier = antiFarmMultiplierFor(run, oniIndex);
  const awardedCoins = Math.floor(baseReward * run.riftOfDayMultiplier * antiFarmMultiplier * run.eventMultiplier);
  return {
    riftId,
    tier,
    oniIndex,
    isBoss,
    baseReward,
    riftOfDayMultiplier: run.riftOfDayMultiplier,
    antiFarmMultiplier,
    eventMultiplier: run.eventMultiplier,
    awardedCoins,
    pendingCoins: run.pendingCoins + awardedCoins,
    settledCoins: 0,
    settlementRate: 0,
    firstClearBonus: 0,
    firstClear: false,
    multiplierOrder: "RIFT_OF_DAY>ANTI_FARM>EVENT>FLOOR",
  };
}

export function applyRiftCompletion(state: EconomyState, _breakdown: RiftRewardBreakdown, runId: string, now = new Date()) {
  const result = settleRiftRun(state, runId, "COMPLETED", now);
  return { state: result.state, applied: result.applied };
}

export function purchaseWeapon(state: EconomyState, weaponId: string) {
  const weapon = getWeaponDefinition(weaponId);
  if (state.weapons[weaponId]) return { state, ok: false, message: "Оружие уже куплено." };
  const tx = applyTransaction(state, {
    flow: "SINK",
    amount: weapon.purchasePrice,
    sourceType: "WEAPON_PURCHASE",
    sourceId: weaponId,
    idempotencyKey: `weapon:purchase:${state.playerId}:${weaponId}`,
    context: { rarity: weapon.rarity, configVersion: CONFIG_VERSIONS.economy },
  });
  if (!tx.applied) return { state: tx.state, ok: false, message: tx.error || "Покупка уже обработана." };
  const now = new Date().toISOString();
  return { state: { ...tx.state, weapons: { ...tx.state.weapons, [weaponId]: { weaponId, level: 1, acquiredAt: now } }, activeWeaponId: weaponId }, ok: true, message: `${weapon.name} куплено и экипировано.` };
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
    idempotencyKey: `weapon:upgrade:${state.playerId}:${weaponId}:${owned.level + 1}`,
    context: { fromLevel: owned.level, toLevel: owned.level + 1, configVersion: CONFIG_VERSIONS.economy },
  });
  if (!tx.applied) return { state: tx.state, ok: false, message: tx.error || "Улучшение уже обработано." };
  return { state: { ...tx.state, weapons: { ...tx.state.weapons, [weaponId]: { ...owned, level: owned.level + 1 } } }, ok: true, message: `Оружие улучшено до уровня ${owned.level + 1}.` };
}

export function equipWeapon(state: EconomyState, weaponId: string) {
  if (!state.weapons[weaponId]) return { state, ok: false, message: "Оружие не куплено." };
  return { state: { ...state, activeWeaponId: weaponId, updatedAt: new Date().toISOString() }, ok: true, message: `${getWeaponDefinition(weaponId).name} экипировано.` };
}
