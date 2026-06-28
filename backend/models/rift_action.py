from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class RiftAction(Base):
    __tablename__ = "rift_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    rift_id: Mapped[int] = mapped_column(ForeignKey("rifts.id"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
