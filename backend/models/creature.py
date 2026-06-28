from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Creature(Base):
    __tablename__ = "creatures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    creature_type: Mapped[str] = mapped_column(String(255), nullable=False)
    rarity: Mapped[str] = mapped_column(String(50), nullable=False)

    description: Mapped[str] = mapped_column(Text, nullable=False)

    max_hp: Mapped[int] = mapped_column(Integer, nullable=False)
    attack: Mapped[int] = mapped_column(Integer, nullable=False)

    xp_reward: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    catch_chance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    sprite_idle: Mapped[str] = mapped_column(String(500), nullable=False)
    sprite_attack: Mapped[str] = mapped_column(String(500), nullable=False)
    sprite_death: Mapped[str] = mapped_column(String(500), nullable=False)

    is_hostile: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_helper: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
