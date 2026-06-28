import type {
  ConfigVersions,
  EconomyState,
  RiftRunSnapshot,
  RiftRunStatus,
  StarsProduct,
} from "./economy";

export type EconomyApiMode = "server" | "local-preview";

export type EconomyApiError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type CreateStarsInvoiceResult = {
  orderId: string;
  invoiceUrl: string;
  status: "CREATED" | "PENDING" | "PAID" | "GRANTED" | "FAILED" | "CANCELLED" | "REFUNDED";
};

export type StartRunRequest = {
  riftId: number;
  mealItemId: string | null;
  drinkItemId: string | null;
  weaponId: string;
  idempotencyKey: string;
};

export type StartRunResult = {
  run: RiftRunSnapshot;
  configVersions: ConfigVersions;
  authoritativeBalance: number;
};

export type CombatActionRequest = {
  runId: string;
  actionId: string;
  actionType: "QUICK" | "HEAVY" | "SEAL" | "SUMIBITO" | "HEAL" | "END_TURN";
  targetId?: string;
};

export type CombatActionResult = {
  run: RiftRunSnapshot;
  actionId: string;
  accepted: boolean;
  phase: string;
  playerHp: number;
  oniHp: number;
  oniDefeated: boolean;
  sealSucceeded: boolean | null;
};

export type SettleRunResult = {
  run: RiftRunSnapshot;
  outcome: Exclude<RiftRunStatus, "ACTIVE">;
  pendingCoins: number;
  settledCoins: number;
  firstClearCoins: number;
  walletBalance: number;
};

export interface EconomyApi {
  mode: EconomyApiMode;
  initTelegram(initData: string): Promise<{ playerId: string }>;
  getBalance(): Promise<EconomyState>;
  getStarsCatalog(): Promise<StarsProduct[]>;
  createStarsInvoice(productId: string): Promise<CreateStarsInvoiceResult>;
  getOrder(orderId: string): Promise<CreateStarsInvoiceResult>;
  startRiftRun(input: StartRunRequest): Promise<StartRunResult>;
  submitCombatAction(input: CombatActionRequest): Promise<CombatActionResult>;
  settleRiftRun(runId: string, outcome: Exclude<RiftRunStatus, "ACTIVE">, idempotencyKey: string): Promise<SettleRunResult>;
  claimContract(contractId: string, cycleKey: string, idempotencyKey: string): Promise<{ walletBalance: number; grantedCoins: number }>;
}

const API_BASE = (((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) || "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error("SERVER_API_NOT_CONFIGURED");
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP_${response.status}`);
    Object.assign(error, { code: payload?.code || `HTTP_${response.status}`, retryable: response.status >= 500 });
    throw error;
  }
  return payload as T;
}

export const economyApi: EconomyApi = {
  mode: API_BASE ? "server" : "local-preview",
  initTelegram(initData) {
    return request("/api/auth/telegram/init", { method: "POST", body: JSON.stringify({ initData }) });
  },
  getBalance() {
    return request("/api/economy/balance");
  },
  getStarsCatalog() {
    return request("/api/payments/stars/catalog");
  },
  createStarsInvoice(productId) {
    return request("/api/payments/stars/create-invoice", { method: "POST", body: JSON.stringify({ productId }) });
  },
  getOrder(orderId) {
    return request(`/api/payments/orders/${encodeURIComponent(orderId)}`);
  },
  startRiftRun(input) {
    return request("/api/rifts/start", { method: "POST", body: JSON.stringify(input) });
  },
  submitCombatAction(input) {
    return request("/api/rifts/action", { method: "POST", body: JSON.stringify(input) });
  },
  settleRiftRun(runId, outcome, idempotencyKey) {
    return request("/api/rifts/settle", {
      method: "POST",
      body: JSON.stringify({ runId, outcome, idempotencyKey }),
    });
  },
  claimContract(contractId, cycleKey, idempotencyKey) {
    return request("/api/contracts/claim", {
      method: "POST",
      body: JSON.stringify({ contractId, cycleKey, idempotencyKey }),
    });
  },
};
