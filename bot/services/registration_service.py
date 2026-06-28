from aiogram.types import CallbackQuery, Message

from bot.services.group_service import get_or_create_group
from bot.services.user_service import get_or_create_user


async def register_message_context(message: Message):
    tg_user = message.from_user

    user = await get_or_create_user(
        telegram_id=tg_user.id,
        username=tg_user.username,
        first_name=tg_user.first_name,
    )

    group = None
    if message.chat.type in ("group", "supergroup"):
        group = await get_or_create_group(
            telegram_chat_id=message.chat.id,
            title=message.chat.title or "Unnamed district",
        )

    return user, group


async def register_callback_context(callback: CallbackQuery):
    tg_user = callback.from_user
    chat = callback.message.chat

    user = await get_or_create_user(
        telegram_id=tg_user.id,
        username=tg_user.username,
        first_name=tg_user.first_name,
    )

    group = None
    if chat.type in ("group", "supergroup"):
        group = await get_or_create_group(
            telegram_chat_id=chat.id,
            title=chat.title or "Unnamed district",
        )

    return user, group
