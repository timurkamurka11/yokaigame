from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from bot.services.registration_service import register_message_context
from bot.services.user_service import get_top_users

router = Router()


@router.message(Command("top"))
async def top_handler(message: Message) -> None:
    await register_message_context(message)
    users = await get_top_users(limit=10)

    if not users:
        await message.answer("Топ охотников пока пуст.")
        return

    lines = ["🏆 <b>Топ охотников Yokai.exe</b>\n"]

    for index, user in enumerate(users, start=1):
        name = user.first_name or user.username or f"ID {user.telegram_id}"
        lines.append(
            f"{index}. <b>{name}</b> — {user.xp} XP, "
            f"ур. {user.level}, разломов: {user.rifts_closed}"
        )

    await message.answer("\n".join(lines))
