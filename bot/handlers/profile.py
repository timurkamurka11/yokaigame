from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from bot.services.registration_service import register_message_context

router = Router()


@router.message(Command("profile"))
async def profile_handler(message: Message) -> None:
    user, group = await register_message_context(message)

    progress_to_next_level = user.xp % 100
    next_level_xp = 100

    group_text = ""
    if group:
        group_text = (
            f"\n<b>Текущий район:</b> {group.district_name}\n"
            f"<b>Заражение района:</b> {group.corruption_level}%\n"
        )

    text = (
        "🧿 <b>Профиль охотника</b>\n\n"
        f"<b>Имя:</b> {user.first_name or 'Unknown'}\n"
        f"<b>Username:</b> @{user.username if user.username else 'нет'}\n"
        f"<b>Уровень:</b> {user.level}\n"
        f"<b>Опыт:</b> {user.xp} XP\n"
        f"<b>Прогресс уровня:</b> {progress_to_next_level}/{next_level_xp} XP\n"
        f"<b>Поймано духов:</b> {user.creatures_caught}\n"
        f"<b>Закрыто разломов:</b> {user.rifts_closed}\n"
        f"{group_text}"
    )
    await message.answer(text)
