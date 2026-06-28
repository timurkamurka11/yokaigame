import type { EconomyState, StarsProduct } from "./economy";

export type EconomyApiMode = "server" | "local-preview";

export type EconomyApiError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type CreateStarsInvoiceResult = {
  orderId: string;
  invoiceUrl: string;
  status: "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";
};

export interface EconomyApi {
  mode: EconomyApiMode;
  initTelegram(initData: string): Promise<{ playerId: string }>;
  getBalance(): Promise<EconomyState>;
  getStarsCatalog(): Promise<StarsProduct[]>;
  createStarsInvoice(productId: string): Promise<CreateStarsInvoiceResult>;
  getOrder(orderId: string): Promise<CreateStarsInvoiceResult>;
}

const API_BASE = (((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) || "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error("SERVER_API_NOT_CONFIGURED");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP_${response.status}`);
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
};
