from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from bot.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args={"ssl": False},
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    from backend.models.user import User  # noqa: F401
    from backend.models.group import Group  # noqa: F401
    from backend.models.creature import Creature  # noqa: F401
    from backend.models.rift import Rift  # noqa: F401
    from backend.models.rift_action import RiftAction  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
