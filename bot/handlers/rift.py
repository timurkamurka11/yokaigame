from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from bot.keyboards.rift_keyboard import rift_actions_keyboard
from bot.services.registration_service import register_callback_context, register_message_context
from bot.services.rift_service import (
    build_closed_rift_caption,
    build_rift_caption,
    open_rift,
    process_rift_action,
    set_rift_message_id,
)

router = Router()


@router.message(Command("rift"))
async def rift_handler(message: Message) -> None:
    user, group = await register_message_context(message)

    rift, creature, district_name, created = await open_rift(
        telegram_chat_id=message.chat.id,
        group_id=group.id if group else None,
    )

    if not created:
        await message.answer(
            "⚠️ В этом чате уже открыт активный разлом. "
            "Закройте текущий разлом, прежде чем открывать новый."
        )
        return

    caption = build_rift_caption(
        rift=rift,
        creature=creature,
        district_name=district_name,
        last_event=f"Охотник <b>{user.first_name or 'Unknown'}</b> обнаружил разлом.",
    )

    sent = await message.answer(
        caption,
        reply_markup=rift_actions_keyboard(rift.id),
    )

    await set_rift_message_id(rift_id=rift.id, message_id=sent.message_id)


@router.callback_query(F.data.startswith("rift:"))
async def rift_action_callback(callback: CallbackQuery) -> None:
    user, group = await register_callback_context(callback)

    parts = callback.data.split(":")
    if len(parts) != 3:
        await callback.answer("Некорректное действие.", show_alert=True)
        return

    action_type = parts[1]
    rift_id = int(parts[2])

    result = await process_rift_action(
        rift_id=rift_id,
        user_id=user.id,
        user_name=user.first_name or user.username or "Охотник",
        action_type=action_type,
    )

    if result["error"]:
        await callback.answer(result["error"], show_alert=True)
        return

    await callback.answer(result["short_event"])

    if result["closed"]:
        caption = build_closed_rift_caption(result)
        try:
            await callback.message.edit_text(caption, reply_markup=None)
        except Exception:
            await callback.message.answer(caption)
        return

    caption = build_rift_caption(
        rift=result["rift"],
        creature=result["creature"],
        district_name=result["district_name"],
        last_event=result["event_text"],
    )

    try:
        await callback.message.edit_text(
            caption,
            reply_markup=rift_actions_keyboard(rift_id),
        )
    except Exception:
        await callback.message.answer(
            caption,
            reply_markup=rift_actions_keyboard(rift_id),
        )
