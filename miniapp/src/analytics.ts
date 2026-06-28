export type YokaiAnalyticsEventName =
  | "economy_source"
  | "economy_sink"
  | "rift_started"
  | "rift_completed"
  | "ramen_purchased"
  | "weapon_purchased"
  | "weapon_upgraded"
  | "weapon_equipped"
  | "quest_reward_claimed"
  | "xtr_checkout_opened"
  | "xtr_checkout_closed"
  | "xtr_payment_granted"
  | "xtr_payment_refunded"
  | "koi_tutorial_step_viewed"
  | "koi_replay_opened";

export type YokaiAnalyticsEvent = {
  id: string;
  name: YokaiAnalyticsEventName;
  payload: Record<string, string | number | boolean | null | string[]>;
  createdAt: string;
};

const ANALYTICS_QUEUE_KEY = "yokai.analytics.queue.v1";
const API_BASE = (((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) || "").replace(/\/$/, "");

function eventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function readQueue(): YokaiAnalyticsEvent[] {
  try {
    const value = localStorage.getItem(ANALYTICS_QUEUE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function saveQueue(events: YokaiAnalyticsEvent[]) {
  try {
    localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(events.slice(-500)));
  } catch {
    // Analytics must never break gameplay.
  }
}

export function trackGameEvent(name: YokaiAnalyticsEventName, payload: YokaiAnalyticsEvent["payload"] = {}) {
  const event: YokaiAnalyticsEvent = { id: eventId(), name, payload, createdAt: new Date().toISOString() };
  saveQueue([...readQueue(), event]);

  if (!API_BASE) return;
  const body = JSON.stringify(event);
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/api/analytics/events`, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(`${API_BASE}/api/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Local queue remains available for later upload.
  }
}

export function getQueuedAnalyticsEvents() {
  return readQueue();
}
