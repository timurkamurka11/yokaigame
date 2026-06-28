import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand

from backend.database import init_db
from bot.config import get_settings
from bot.handlers.start import router as start_router
from bot.handlers.help import router as help_router
from bot.handlers.profile import router as profile_router
from bot.handlers.top import router as top_router
from bot.handlers.rift import router as rift_router
from bot.handlers.app import router as app_router


async def set_bot_commands(bot: Bot) -> None:
    commands = [
        BotCommand(command="start", description="Запустить Yokai.exe"),
        BotCommand(command="help", description="Помощь по игре"),
        BotCommand(command="profile", description="Профиль охотника"),
        BotCommand(command="top", description="Топ охотников"),
        BotCommand(command="rift", description="Открыть тестовый разлом"),
        BotCommand(command="app", description="Открыть Mini App"),
    ]
    await bot.set_my_commands(commands)


async def main() -> None:
    logging.basicConfig(level=logging.INFO)

    settings = get_settings()
    await init_db()

    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    dp = Dispatcher()
    dp.include_router(start_router)
    dp.include_router(help_router)
    dp.include_router(profile_router)
    dp.include_router(top_router)
    dp.include_router(rift_router)
    dp.include_router(app_router)

    await set_bot_commands(bot)
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
