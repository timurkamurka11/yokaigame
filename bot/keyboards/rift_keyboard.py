from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def rift_actions_keyboard(rift_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="⚔️ Атаковать",
                    callback_data=f"rift:attack:{rift_id}",
                ),
                InlineKeyboardButton(
                    text="🔮 Запечатать",
                    callback_data=f"rift:seal:{rift_id}",
                ),
            ],
            [
                InlineKeyboardButton(
                    text="⚫ Призвать Сумибито",
                    callback_data=f"rift:summon:{rift_id}",
                ),
            ],
        ]
    )
