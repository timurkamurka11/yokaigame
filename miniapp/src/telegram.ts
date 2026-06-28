export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  colorScheme?: "light" | "dark";
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegramApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function setupTelegramApp() {
  const tg = getTelegramApp();

  if (!tg) return null;

  tg.ready();
  tg.expand();
  tg.setHeaderColor?.("#05030d");
  tg.setBackgroundColor?.("#05030d");

  return tg;
}
