import random

from sqlalchemy import select

from backend.database import async_session
from backend.models.group import Group


DISTRICT_NAMES = [
    "Kage Market",
    "Neon Shrine",
    "Hollow Station",
    "Red Lantern Block",
    "Sanzu Alley",
    "Ghostline Metro",
    "Shibuya Rift",
    "Rain District",
    "Black Torii Sector",
    "Kitsune Crossing",
]


def pick_district_name(telegram_chat_id: int) -> str:
    random.seed(abs(telegram_chat_id))
    return random.choice(DISTRICT_NAMES)


async def get_or_create_group(
    telegram_chat_id: int,
    title: str,
) -> Group:
    async with async_session() as session:
        result = await session.execute(
            select(Group).where(Group.telegram_chat_id == telegram_chat_id)
        )
        group = result.scalar_one_or_none()

        if group is None:
            group = Group(
                telegram_chat_id=telegram_chat_id,
                title=title,
                district_name=pick_district_name(telegram_chat_id),
                corruption_level=0,
            )
            session.add(group)
        else:
            group.title = title

        await session.commit()
        await session.refresh(group)
        return group
