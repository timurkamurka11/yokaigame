from sqlalchemy import select

from backend.database import async_session
from backend.models.user import User


async def get_or_create_user(
    telegram_id: int,
    username: str | None,
    first_name: str | None,
) -> User:
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                telegram_id=telegram_id,
                username=username,
                first_name=first_name,
                level=1,
                xp=0,
                creatures_caught=0,
                rifts_closed=0,
            )
            session.add(user)
        else:
            user.username = username
            user.first_name = first_name

        await session.commit()
        await session.refresh(user)
        return user


async def get_top_users(limit: int = 10) -> list[User]:
    async with async_session() as session:
        result = await session.execute(
            select(User)
            .order_by(User.xp.desc(), User.rifts_closed.desc(), User.creatures_caught.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
