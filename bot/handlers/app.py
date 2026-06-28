from aiogram import Router
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from bot.config import get_settings

router = Router()


@router.message(Command("app"))
async def app_handler(message: Message) -> None:
    settings = get_settings()

    if not settings.mini_app_url:
        await message.answer(
            "Mini App URL ещё не настроен.\n\n"
            "Добавь в .env строку:\n"
            "<code>MINI_APP_URL=https://your-ngrok-url.ngrok-free.dev</code>"
        )
        return

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🌑 Открыть Yokai.exe",
                    web_app=WebAppInfo(url=settings.mini_app_url),
                )
            ]
        ]
    )

    await message.answer(
        "🌑 <b>Yokai.exe Mini App</b>\n\n"
        "Открой интерфейс охотника: бой с Oni-404, портал, звук и архив.",
        reply_markup=keyboard,
    )
