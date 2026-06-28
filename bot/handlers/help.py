from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

router = Router()


@router.message(Command("help"))
async def help_handler(message: Message) -> None:
    text = (
        "📖 <b>Yokai.exe — помощь</b>\n\n"
        "<b>Команды:</b>\n"
        "• /start — регистрация охотника\n"
        "• /profile — профиль игрока\n"
        "• /top — рейтинг охотников\n"
        "• /rift — тестовый разлом с Oni-404\n"
        "• /app — открыть Mini App\n"
        "• /help — помощь\n\n"
        "<b>Суть:</b> временные разломы открываются в Telegram-чатах. "
        "Игроки сражаются с духами, закрывают разломы и собирают архив ёкаев."
    )
    await message.answer(text)
