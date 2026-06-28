from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from bot.services.registration_service import register_message_context

router = Router()


@router.message(CommandStart())
async def start_handler(message: Message) -> None:
    user, group = await register_message_context(message)

    district_line = ""
    if group:
        district_line = f"\nРайон чата: <b>{group.district_name}</b>\nЗаражение: <b>{group.corruption_level}%</b>\n"

    text = (
        "🌑 <b>Yokai.exe</b>\n\n"
        f"Охотник <b>{user.first_name or 'Unknown'}</b> подключён к сети разломов.\n"
        f"Уровень: <b>{user.level}</b>\n"
        f"Опыт: <b>{user.xp} XP</b>\n"
        f"{district_line}\n"
        "Доступные команды:\n"
        "• /profile — профиль охотника\n"
        "• /top — топ охотников\n"
        "• /rift — открыть тестовый разлом\n"
        "• /app — открыть Mini App\n"
        "• /help — помощь"
    )
    await message.answer(text)
