from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Rift(Base):
    __tablename__ = "rifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    telegram_chat_id: Mapped[int] = mapped_column(BigInteger, index=True, nullable=False)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id"), nullable=True)

    creature_id: Mapped[int] = mapped_column(ForeignKey("creatures.id"), nullable=False)

    hp: Mapped[int] = mapped_column(Integer, nullable=False)
    max_hp: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[str] = mapped_column(String(50), index=True, default="active", nullable=False)

    message_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    closed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
