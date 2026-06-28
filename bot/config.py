from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    bot_token: str
    database_url: str
    mini_app_url: str


def get_settings() -> Settings:
    bot_token = os.getenv("BOT_TOKEN", "").strip()
    database_url = os.getenv("DATABASE_URL", "").strip()
    mini_app_url = os.getenv("MINI_APP_URL", "").strip()

    if not bot_token or bot_token == "put_your_telegram_bot_token_here":
        raise RuntimeError("BOT_TOKEN is empty. Add your Telegram bot token to .env")

    if not database_url:
        raise RuntimeError("DATABASE_URL is empty. Add database URL to .env")

    return Settings(
        bot_token=bot_token,
        database_url=database_url,
        mini_app_url=mini_app_url,
    )
